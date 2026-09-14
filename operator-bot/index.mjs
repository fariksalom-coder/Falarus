import { readFile, writeFile, rename, mkdir, open } from 'node:fs/promises';
const token=process.env.OPERATOR_BOT_TOKEN;
const secret=process.env.OPERATOR_SERVICE_SECRET;
const base=process.env.OPERATOR_API_URL||'http://127.0.0.1:3001/api/operator-bot';
const dir=process.env.OPERATOR_STATE_DIR||'/var/lib/falarus-operator-bot';
if(!token||!secret||secret.length<32)throw new Error('Operator bot configuration missing');
if(!/^http:\/\/127\.0\.0\.1:\d+\/api\/operator-bot$/.test(base))throw new Error('Only the local platform API is allowed');
await mkdir(dir,{recursive:true,mode:0o700});
// systemd prevents parallel instances; exclusive file additionally protects manual starts.
const lock=await open(`${dir}/running.lock`,'wx').catch(()=>{throw new Error('Bot already running or stale lock: inspect service before clearing running.lock');});
let stopping=false;const controllers=new Set();
const stop=()=>{stopping=true;for(const c of controllers)c.abort();};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
async function request(url,options,timeout=45000){
 const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),timeout);
 try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);controllers.delete(controller);}
}
async function telegram(method,payload){
 try{
  const r=await request(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await r.json();if(!data.ok){const e=new Error('Telegram request failed');e.status=data.error_code;e.retry=data.parameters?.retry_after;throw e;}return data.result;
 }catch(e){const safe=new Error('Telegram unavailable');safe.status=e.status;safe.retry=e.retry;throw safe;}
}
async function api(path,body){
 const r=await request(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!r.ok)throw new Error(`Platform API status ${r.status}`);return r.json();
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function deliver(){
 while(!stopping){
  try{
   const rows=await api('/outbox',{});
   for(const row of rows){if(stopping)break;
    if(!['sendMessage','deleteMessage','answerCallbackQuery'].includes(row.method))throw new Error('Unsupported outbox method');
    try{await telegram(row.method,row.payload);await api(`/outbox/${row.id}/ack`,{ok:true});}
    catch(e){await api(`/outbox/${row.id}/ack`,{ok:false,permanent:[400,403].includes(e.status),retry_after:e.retry||60});}
   }
  }catch{if(!stopping)console.warn('Outbox temporarily unavailable; retrying');}
  await delay(1500);
 }
}
let worker;
try{
 const me=await telegram('getMe',{});
 if(String(me.id)!==token.split(':')[0])throw new Error('Bot identity mismatch');
 const webhook=await telegram('getWebhookInfo',{});if(webhook.url)throw new Error('Webhook already configured; refusing to disturb it');
 await api('/health');
 await telegram('setMyCommands',{commands:[{command:'start',description:'Operator menyusi / kirish'},{command:'cancel',description:'Jarayonni bekor qilish'}]});
 console.log(`Operator bot @${me.username} ready; existing bot is separate`);
 let offset=Number(await readFile(`${dir}/offset`,'utf8').catch(()=> '0'));
 worker=deliver();
 while(!stopping){
  try{
   const updates=await telegram('getUpdates',{offset,timeout:25,allowed_updates:['message','callback_query']});
   for(const u of updates){if(stopping)break;await api('/update',u);offset=u.update_id+1;await writeFile(`${dir}/offset.tmp`,String(offset),{mode:0o600});await rename(`${dir}/offset.tmp`,`${dir}/offset`);}
  }catch(e){if(e.status===409)throw new Error('Another receiver is using this bot token; stopping to prevent interference');if(!stopping){console.warn('Polling temporarily unavailable; retrying');await delay(3000);}}
 }
}catch(e){console.error(e.message?.includes('token')?'Bot receiver conflict':e.message?.startsWith('Webhook')?e.message:'Operator bot stopped: configuration or connectivity failure');process.exitCode=1;}
finally{stop();if(worker)await worker;await lock.close();const {unlink}=await import('node:fs/promises');await unlink(`${dir}/running.lock`).catch(()=>{});}
