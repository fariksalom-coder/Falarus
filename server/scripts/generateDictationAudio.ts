import 'dotenv/config';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pool} from '../lib/db';
import {speak} from '../services/tts.service';
let stopping=false;process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
async function main(){
 if(!pool)throw Error('DATABASE_URL is required');const lock=await pool.connect();
 const shardArg=process.argv.find(a=>a.startsWith('--shard='));const shard=shardArg?Number(shardArg.slice(8)):null;
 if(shard!==null&&![0,1,2].includes(shard))throw Error('Shard must be 0, 1 or 2');
 const lockFn=shard===null?'pg_try_advisory_lock':'pg_try_advisory_lock_shared';
 try{if(!(await lock.query(`SELECT ${lockFn}(187001) locked`)).rows[0].locked)throw Error('Incompatible audio generator already running');
 if(shard!==null&&!(await lock.query('SELECT pg_try_advisory_lock($1) locked',[187010+shard])).rows[0].locked)throw Error('This shard is already running');
 const topic=process.argv.find(a=>a.startsWith('--topic='))?.slice(8)||null;
 const limit=Number(process.argv.find(a=>a.startsWith('--limit='))?.slice(8)||1000);if(!Number.isInteger(limit)||limit<1||limit>10000)throw Error('Invalid limit');
 const items=(await pool.query(`SELECT id,text,audio_url FROM dictation_items WHERE is_active AND ($1::text IS NULL OR topic_id=$1) ORDER BY topic_id,sort_order`,[topic])).rows;
 let generated=0,skipped=0;
 for(const item of items){
  if(stopping)break;
  if(shard!==null&&parseInt(createHash('sha256').update(item.text).digest('hex').slice(0,8),16)%3!==shard)continue;
  if(item.audio_url?.startsWith('/uploads/dictation/')&&await fs.stat(path.resolve('.'+item.audio_url)).then(s=>s.size>0).catch(()=>false)){skipped++;continue;}
  if(generated>=limit)break;
  const hash=createHash('sha256').update(item.text+'|dictation-ru-natural-v1').digest('hex').slice(0,20);
  const dir=path.resolve('uploads/dictation',item.id);await fs.mkdir(dir,{recursive:true});const name=`generated-${hash}.mp3`,file=path.join(dir,name);
  if(!await fs.stat(file).then(s=>s.size>0).catch(()=>false)){
   const result=await speak(item.text,{speed:1,ohang:'sozlar'});if(result.mime!=='audio/mpeg'&&result.mime!=='audio/mp3')throw Error('Expected MP3 for '+item.id);
   const temp=path.join(dir,randomUUID()+'.tmp');await fs.writeFile(temp,result.audio);
   try{const {stdout}=await promisify(execFile)('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name','-of','json',temp],{timeout:10000});const meta=JSON.parse(stdout);if(!meta.streams?.some((s:any)=>s.codec_name==='mp3')||!(Number(meta.format.duration)>0&&Number(meta.format.duration)<=60))throw Error('Invalid MP3 '+item.id);await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}
  }
  await pool.query('UPDATE dictation_items SET audio_url=$2 WHERE id=$1 AND text=$3',[item.id,`/uploads/dictation/${item.id}/${name}`,item.text]);generated++;console.log(JSON.stringify({id:item.id,generated,skipped,total:items.length}));
 }
 console.log(JSON.stringify({complete:!stopping,stopped:stopping,shard,generated,skipped}));
 }finally{await lock.query('SELECT pg_advisory_unlock_all()').catch(()=>{});lock.release();}
}
main().catch(e=>{console.error('Audio preparation stopped:',e.message);process.exitCode=1;}).finally(()=>pool?.end());
