/** Read-only local preview from a minimal server snapshot stored outside the repository. */
import express from 'express';
import { readFile,writeFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { provisionSupportCrmOperators } from '../../server/services/supportCrmOperators.service';
import { runWithSupportCrmScope } from '../../server/services/supportCrmScope';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
process.env.DATABASE_URL='';process.env.REDIS_URL='';
const {getPremiumActivityCalendar,getStudentActivityCalendar}=await import('../../server/services/supportCrmCalendar.service');
const {getSupportCrmStats,listSupportCrmQueue}=await import('../../server/services/supportCrm.service');
const snapshotPath=process.env.SUPPORT_CALENDAR_SNAPSHOT||'/tmp/falarus-crm-calendar-snapshot.raw';
const raw=await readFile(snapshotPath,'utf8');
const snapshot=JSON.parse(raw.split('\n').find(line=>line.startsWith('CRM_SNAPSHOT='))!.slice('CRM_SNAPSHOT='.length));
const db=await PGlite.create();
for(const [table,data] of Object.entries(snapshot.tables) as [string,any][]){
  await db.exec(`CREATE TABLE ${table} (${table==='support_crm_agents'?'password_hash text,':''}${data.columns.map((c:any)=>`${c.name} ${c.type}${(table==='users'||table==='support_crm_agents')&&c.name==='id'?' PRIMARY KEY':''}`).join(',')})`);
  // Batch inserts keep the sensitive snapshot in memory only.
  const columns=data.columns.map((c:any)=>c.name);
  for(let start=0;start<data.rows.length;start+=200){
    const rows=data.rows.slice(start,start+200),args:any[]=[];
    const values=rows.map((row:any)=>`(${columns.map((name:string)=>{args.push(row[name]);return '$'+args.length;}).join(',')})`);
    await db.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${values.join(',')}`,args);
  }
}
await db.exec(await readFile(new URL('../../db/migrations/205_support_crm_activity_calendar.sql',import.meta.url),'utf8'));
// Snapshot omits credentials and nonstudent flags; add only the schema needed for isolated provisioning.
await db.exec("ALTER TABLE users ADD COLUMN is_golden boolean DEFAULT false; ALTER TABLE users ADD COLUMN account_type text DEFAULT 'student'; CREATE UNIQUE INDEX preview_agent_login ON support_crm_agents(lower(login)); CREATE SEQUENCE preview_agent_id; ALTER TABLE support_crm_agents ALTER COLUMN id SET DEFAULT nextval('preview_agent_id'); SELECT setval('preview_agent_id',coalesce((SELECT max(id) FROM support_crm_agents),1)); ALTER TABLE support_crm_agents ALTER COLUMN active SET DEFAULT true;");
await db.exec(await readFile(new URL('../../db/migrations/206_support_crm_assignments.sql',import.meta.url),'utf8'));
await db.exec('ALTER TABLE users ADD COLUMN first_name text; ALTER TABLE users ADD COLUMN last_name text; ALTER TABLE users ADD COLUMN phone text; ALTER TABLE users ADD COLUMN email text; ALTER TABLE users ADD COLUMN plan_name text; ALTER TABLE users ADD COLUMN created_at timestamptz; ALTER TABLE users ADD COLUMN total_time_seconds bigint DEFAULT 0; ALTER TABLE user_kunlik_day_progress ADD COLUMN updated_at timestamptz;');
await db.exec('ALTER TABLE user_daily_time ADD COLUMN IF NOT EXISTS updated_at timestamptz');
const details=JSON.stringify(Object.values(snapshot.details).map((detail:any)=>detail.user));
await db.query(`UPDATE users u SET first_name=d.first_name,last_name=d.last_name,phone=d.phone,email=d.email,plan_name=d.plan_name,created_at=d.created_at,total_time_seconds=d.total_time_seconds FROM jsonb_to_recordset($1::jsonb) AS d(id bigint,first_name text,last_name text,phone text,email text,plan_name text,created_at timestamptz,total_time_seconds bigint) WHERE u.id=d.id`,[details]);
await db.query(`UPDATE user_kunlik_day_progress p SET updated_at=d.last_kunlik_at FROM jsonb_to_recordset($1::jsonb) AS d(id bigint,last_kunlik_at timestamptz) WHERE p.user_id=d.id`,[details]);

const credentialsPath='/tmp/falarus-crm-operators.json';
let credentials:{login:string;name:string;password:string}[];
try{credentials=JSON.parse(await readFile(credentialsPath,'utf8'));}catch(e){
  if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
  credentials=[1,2].map(index=>({login:`operator${index}`,name:`Оператор ${index}`,password:Array.from({length:12},()=>randomInt(0,10)).join('')}));
  await writeFile(credentialsPath,JSON.stringify(credentials),{mode:0o600,flag:'wx'});
}
await db.exec('BEGIN');
const distribution=await provisionSupportCrmOperators({query:async(sql:string,args:any[]=[])=>{const r=await db.query(sql,args);return {...r,rowCount:r.rows.length};}} as any,await Promise.all(credentials.map(async entry=>({login:entry.login,name:entry.name,passwordHash:await bcrypt.hash(entry.password,12)}))));
await db.exec('COMMIT');
console.log('Local distribution:',JSON.stringify(distribution));

const adapter={query:async(sql:string,args:any[]=[])=>{const result=await db.query(sql,args);return {...result,rowCount:result.rows.length};}};
const now=()=>new Date();
const app=express();app.use(express.json());
const token='read-only-support-calendar-preview';
const localSessions=new Map<string,{id:number;login:string;name:string;is_manager:boolean}>([[token,{id:0,login:'preview-manager',name:'Просмотр CRM',is_manager:true}]]);
const firstId=snapshot.premiumUsers.rows[0]?.id;
const entry=(target:string)=>`<script>localStorage.setItem('supportCrmToken',${JSON.stringify(token)});location.replace(${JSON.stringify(target)})</script>`;
app.get('/preview',(_req,res)=>res.type('html').send(entry('/support-crm/dashboard')));
app.get('/preview-student',(_req,res)=>res.type('html').send(entry(`/support-crm/users/${firstId}`)));

app.post('/api/support-crm/login',async(req,res)=>{
  const agent=(await db.query<any>('SELECT * FROM support_crm_agents WHERE login=$1 AND active=true',[String(req.body.login||'').trim().toLowerCase()])).rows[0];
  if(!agent?.password_hash||!await bcrypt.compare(String(req.body.password||''),agent.password_hash))return res.status(401).json({error:'Login yoki parol noto‘g‘ri'});
  const session=`local-operator-${agent.id}-${randomInt(100000000,999999999)}`;
  localSessions.set(session,agent);res.json({token:session,agent:{id:agent.id,login:agent.login,name:agent.name}});
});
app.use('/api/support-crm',(req,res,next)=>{
  const agent=localSessions.get(req.headers.authorization?.replace(/^Bearer /,'')||'');
  if(!agent)return res.status(401).json({error:'Local preview only'});
  (req as any).crmAgent=agent;runWithSupportCrmScope(agent.is_manager?null:Number(agent.id),()=>next(),adapter as any);
});
async function canView(req:express.Request,id:number){
 const agent=(req as any).crmAgent;
 return agent.is_manager||Boolean((await db.query('SELECT user_id FROM support_crm_assignments WHERE agent_id=$1 AND user_id=$2',[agent.id,id])).rows.length);
}

async function visibleRows(req:express.Request){
 const agent=(req as any).crmAgent;
 const owned=agent.is_manager?null:new Set((await db.query<any>('SELECT user_id FROM support_crm_assignments WHERE agent_id=$1',[agent.id])).rows.map(row=>Number(row.user_id)));
 return snapshot.premiumUsers.rows.filter((row:any)=>(!owned||owned.has(Number(row.id)))&&new Date(row.plan_expires_at).getTime()>Date.now()).map((row:any)=>{
  const detail=snapshot.details[row.id],contact=detail.contacts[0];
  return {...row,...detail.user,last_contact_at:contact?.created_at??null,last_contact_channel:contact?.channel??null,last_contact_outcome:contact?.outcome??null};
 });
}
app.get('/api/support-crm/queue',async(req,res)=>{
 try{const filter=String(req.query.filter||'needs_contact');if(!['needs_contact','contacted','no_contact_needed'].includes(filter))return res.status(400).json({error:'Invalid queue filter'});
 res.json(await listSupportCrmQueue({filter:filter as any,q:String(req.query.q||''),limit:Number(req.query.limit)||100,offset:Number(req.query.offset)||0,now:now()}));
 }catch(e){res.status(500).json({error:(e as Error).message});}
});
app.get('/api/support-crm/search',async(req,res)=>{
 const query=String(req.query.q||'').trim().toLowerCase();
 const rows=query.length<2?[]:(await visibleRows(req)).filter((row:any)=>[row.first_name,row.last_name,row.phone,row.email].join(' ').toLowerCase().includes(query));
 res.json({rows:rows.slice(0,80),limit:80});
});
app.get('/api/support-crm/me',(req,res)=>{const agent=(req as any).crmAgent;res.json({agent:{id:agent.id,login:agent.login,name:agent.name}});});
app.get('/api/support-crm/stats',async(_req,res)=>{
 try{res.json(await getSupportCrmStats(now()));}catch(e){res.status(500).json({error:(e as Error).message});}
});
app.get('/api/support-crm/calendar',async(req,res)=>{try{res.json(await getPremiumActivityCalendar(req.query.month,'historical',adapter as any,now()));}catch(e){res.status(400).json({error:(e as Error).message});}});
app.get('/api/support-crm/users/:id/calendar',async(req,res)=>{try{const result=await getStudentActivityCalendar(Number(req.params.id),req.query.month,adapter as any,now());res.status(result?200:404).json(result??{error:'Not found'});}catch(e){res.status(400).json({error:(e as Error).message});}});
app.get('/api/support-crm/users/:id',async(req,res)=>{const detail=await canView(req,Number(req.params.id))?snapshot.details[req.params.id]:null;res.status(detail?200:404).json(detail??{error:'Not found'});});
app.get('/api/support-crm/premium-users',async(req,res)=>{
 const offset=Math.max(0,Number(req.query.offset)||0),limit=Math.min(500,Math.max(1,Number(req.query.limit)||200));
 const visible=await visibleRows(req);res.json({total:visible.length,rows:visible.slice(offset,offset+limit)});
});
// Local form checks modify only this in-memory snapshot; nothing is sent to the server.
app.post('/api/support-crm/contacts',async(req,res)=>{
  const userId=Number(req.body.userId),channel=req.body.channel;
  if(!await canView(req,userId))return res.status(404).json({error:'Not found'});
  if(!snapshot.details[userId]||!['phone','telegram','whatsapp','max','imo','email','other'].includes(channel))return res.status(400).json({error:'Kanal yoki foydalanuvchi noto‘g‘ri'});
  const channelOther=channel==='other'?String(req.body.channelOther||'').trim():null;
  if(channel==='other'&&!channelOther)return res.status(400).json({error:'Boshqa kanal nomini yozing'});
  const id=1+Number((await db.query<any>('SELECT coalesce(max(id),0) id FROM support_crm_contacts')).rows[0].id);
  const sessionAgent=(req as any).crmAgent;
  const agent=sessionAgent.id?sessionAgent:snapshot.tables.support_crm_agents.rows[0];
  const contact={id,user_id:userId,agent_id:agent.id,agent_name:agent.name,channel,channel_other:channelOther,outcome:'other',result:null,comment_text:null,created_at:now().toISOString()};
  await db.query('INSERT INTO support_crm_contacts(id,agent_id,user_id,channel,channel_other,outcome,result,comment_text,created_at) VALUES($1,$2,$3,$4,$5,$6,NULL,NULL,$7)',[id,agent.id,userId,channel,channelOther,'other',contact.created_at]);
  snapshot.details[userId].contacts.unshift(contact);res.status(201).json({contact,nextUserId:null});
});
app.get('/api/health',(_req,res)=>res.json({ok:true,preview:true,synthetic:false,captured_at:snapshot.captured_at}));
app.use('/api',(_req,res)=>res.status(404).json({error:'Read-only calendar preview'}));
const vite=await createServer({configFile:false,root:process.cwd(),envDir:'/tmp/falarus-support-calendar-preview-env',plugins:[react(),tailwindcss(),{
  name:'preview-label',transformIndexHtml(html){return html.replace('<body>','<body><div style="position:fixed;bottom:8px;left:8px;z-index:9999;padding:8px 12px;background:#fef3c7;color:#78350f;border-radius:12px;font:12px sans-serif">Локальный показ · реальные данные · снимок сервера · новые связи только локально</div>');}
}],define:{'import.meta.env.VITE_API_URL':'""','import.meta.env.VITE_SUPPORT_CRM_PATH':'"/support-crm"'},server:{middlewareMode:true,hmr:false},appType:'spa'});
app.use(vite.middlewares);
const port=Number(process.env.SUPPORT_CALENDAR_PREVIEW_PORT||4187);
const server=app.listen(port,'127.0.0.1',()=>console.log(`Local CRM preview: http://127.0.0.1:${port}/preview\nStudent calendars: http://127.0.0.1:${port}/preview-student\nReal server snapshot. Read-only preview; server data is never modified.`));
process.once('SIGTERM',()=>{server.close();void vite.close();});
process.once('SIGINT',()=>{server.close();void vite.close();});
