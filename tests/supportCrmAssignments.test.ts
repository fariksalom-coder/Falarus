import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import express from 'express';
import {provisionSupportCrmOperators} from '../server/services/supportCrmOperators.service';

test('CRM operators: permanent assignments, scoped API, exclusive queue groups, exact cooldown boundaries and sorting',async()=>{
 const db=await PGlite.create();let server:any;
 const adapter={query:async(sql:string,args:any[]=[])=>{const r=await db.query(sql,args);return {...r,rowCount:r.rows.length||r.affectedRows||0};}};
 try{
 await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY,first_name text DEFAULT 'Student',last_name text,phone text,email text,plan_name text DEFAULT '3 OY',plan_expires_at timestamptz,last_seen_at timestamptz DEFAULT now()-interval '10 days',created_at timestamptz DEFAULT now()-interval '30 days',total_time_seconds bigint DEFAULT 0,is_golden boolean DEFAULT false,account_type text DEFAULT 'student');
 CREATE TABLE support_crm_agents(id bigserial PRIMARY KEY,login text UNIQUE,password_hash text,name text,active boolean DEFAULT true);
 CREATE TABLE subscriptions(user_id bigint,started_at timestamptz,expires_at timestamptz,status text,plan_type text);
 CREATE TABLE payments(id bigserial,user_id bigint,status text,product_code text,approved_at timestamptz,payment_time timestamptz,created_at timestamptz,tariff_type text);
 CREATE TABLE user_kunlik_day_progress(user_id bigint,day_number int,grammar_1 boolean,grammar_2 boolean,grammar_3 boolean,words_match boolean,phrases_done boolean,oqish_done boolean,suhbat_done boolean,speaking_level int,speaking_tasks_done int,updated_at timestamptz);
 CREATE TABLE user_tasks(user_id bigint,task_id bigint,status text,completed_at timestamptz);
 CREATE TABLE user_activity_dates(user_id bigint,activity_date date);
 CREATE TABLE user_daily_time(user_id bigint,activity_date date,seconds int,updated_at timestamptz);
 CREATE TABLE support_crm_contacts(id bigserial PRIMARY KEY,agent_id bigint,user_id bigint,channel text,channel_other text,outcome text,result text,comment_text text,created_at timestamptz DEFAULT now());
 INSERT INTO users(id,plan_expires_at) SELECT n,now()+interval '3 months' FROM generate_series(1,5) n;
 INSERT INTO users(id,plan_expires_at,is_golden,account_type) VALUES(6,now()+interval '3 months',true,'student'),(7,now()+interval '3 months',false,'teacher');
 INSERT INTO support_crm_agents(login,password_hash,name) VALUES('manager','unused','Manager');`);
 for(const n of ['205_support_crm_activity_calendar.sql','206_support_crm_assignments.sql'])await db.exec(await readFile(new URL('../db/migrations/'+n,import.meta.url),'utf8'));
 const operators=await Promise.all([1,2].map(async n=>({login:`operator${n}`,name:`Оператор ${n}`,passwordHash:await bcrypt.hash(`12345678900${n}`,4)})));
 await db.exec('BEGIN');const distribution=await provisionSupportCrmOperators(adapter as any,operators);await db.exec('COMMIT');
 assert.deepEqual(distribution.map(r=>r.active_premium),[3,2]);
 const before=(await db.query('SELECT * FROM support_crm_assignments ORDER BY user_id')).rows;
 await db.exec(await readFile(new URL('../db/migrations/206_support_crm_assignments.sql',import.meta.url),'utf8'));
 await db.exec('BEGIN');await provisionSupportCrmOperators(adapter as any,operators.map(o=>({...o,passwordHash:'must-not-overwrite'})));await db.exec('COMMIT');
 assert.deepEqual((await db.query('SELECT * FROM support_crm_assignments ORDER BY user_id')).rows,before);
 assert.equal((await db.query<any>("SELECT password_hash FROM support_crm_agents WHERE login='operator1'")).rows[0].password_hash,operators[0].passwordHash);
 await db.exec("INSERT INTO users(id,plan_expires_at) VALUES(8,now()+interval '1 month'); UPDATE users SET plan_expires_at=now()+interval '6 months' WHERE id=1;");
 assert.equal((await db.query<any>('SELECT agent_id FROM support_crm_assignments WHERE user_id=8')).rows[0].agent_id,3);
 assert.equal((await db.query<any>('SELECT agent_id FROM support_crm_assignments WHERE user_id=1')).rows[0].agent_id,2);
 await db.exec("INSERT INTO users(id,plan_expires_at) VALUES(9,NULL),(10,NULL)");
 await Promise.all([9,10].map(id=>db.query("UPDATE users SET plan_expires_at=now()+interval '1 month' WHERE id=$1",[id])));
 assert.deepEqual((await db.query<any>('SELECT agent_id FROM support_crm_assignments WHERE user_id IN (9,10) ORDER BY user_id')).rows.map(r=>r.agent_id),[2,3]);
 process.env.SUPPORT_CRM_JWT_SECRET='crm-assignment-test-secret-32-characters-long';
 const {createSupportCrmRoutes}=await import('../server/routes/supportCrmRoutes');
 const {createPostgresFacade}=await import('../server/lib/postgresFacade');
 const app=express();app.use(express.json());app.use(createSupportCrmRoutes(createPostgresFacade(adapter as any),adapter as any));
 server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const login=async(n:number)=>{const r=await fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:`operator${n}`,password:`12345678900${n}`})});assert.equal(r.status,200);return (await r.json()).token;};
 const tokens=await Promise.all([login(1),login(2)]);
 const request=(path:string,operator=0,body?:any)=>fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${tokens[operator]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 for(let repeat=0;repeat<3;repeat++){
 const lists=await Promise.all(tokens.map((_,i)=>request('/premium-users',i).then(r=>r.json())));
 assert.deepEqual(lists.map(l=>l.total),[4,4]);
 assert.ok(lists[0].rows.every((r:any)=>[1,3,5,9].includes(Number(r.id))));assert.ok(lists[1].rows.every((r:any)=>[2,4,8,10].includes(Number(r.id))));
 }
 assert.equal((await request('/users/1')).status,200);
 for(const path of ['/users/2','/users/2/calendar','/users/2/parol-tiklash'])assert.equal((await request(path,0,path.endsWith('parol-tiklash')?{}:undefined)).status,404);
 assert.equal((await request('/contacts',0,{userId:2,channel:'telegram',outcome:'other'})).status,400);
 assert.equal((await db.query<any>('SELECT count(*)::int n FROM support_crm_contacts')).rows[0].n,0);
 assert.equal((await request('/contacts',0,{userId:1,channel:'telegram',outcome:'other'})).status,201);
 assert.equal((await request('/contacts',1,{userId:2,channel:'phone',outcome:'other'})).status,201);
 assert.equal((await request('/contacts',0,{userId:1,channel:'whatsapp',outcome:'other'})).status,201); // Repeated contacts do not duplicate a student in a bucket.
 for(const [i,allowed] of [[0,[1,3,5,9]],[1,[2,4,8,10]]] as const){
 for(const path of ['/queue','/search?q=Student','/contacted']){
  const response=await request(path,i);assert.equal(response.status,200,path);const result=await response.json();assert.ok(result.rows.every((r:any)=>(allowed as readonly number[]).includes(Number(r.id))),path);
 }
 const stats=await(await request('/stats',i)).json();assert.equal(stats.contacted_count,1);assert.equal(stats.total_premium,4);
 const calendar=await(await request('/calendar',i)).json();assert.equal(calendar.current_premium,4);
 }
 // Supervisory accounts keep their overview; operators cannot promote themselves via query parameters.
 const jwt=(await import('jsonwebtoken')).default;const managerToken=jwt.sign({agentId:1,role:'support_crm'},process.env.SUPPORT_CRM_JWT_SECRET);
 const manager=await(await fetch(base+'/premium-users',{headers:{Authorization:`Bearer ${managerToken}`}})).json();assert.equal(manager.total,8);
 const forgedScope=await(await request('/premium-users?agentId=3&is_manager=true')).json();assert.equal(forgedScope.total,4);
 assert.equal((await request('/return-tracking')).status,404);
 assert.equal((await request('/queue?filter=in_progress')).status,400);
 assert.equal((await request('/contacts',0,{userId:1,channel:'phone',outcome:'in_progress'})).status,400);
 const {runWithSupportCrmScope}=await import('../server/services/supportCrmScope');
 const {listSupportCrmQueue,getSupportCrmStats}=await import('../server/services/supportCrm.service');
 const reference=new Date('2026-10-07T12:00:00Z');
 const date=(milliseconds:number)=>new Date(reference.getTime()-milliseconds).toISOString();
 const hour=3600000;
 await db.query('UPDATE users SET last_seen_at=$1',[date(10*24*hour)]);
 await db.query('UPDATE users SET last_seen_at=NULL WHERE id=9');
 await db.query('UPDATE users SET last_seen_at=$1 WHERE id=3',[date(15*60000)]);
 await db.query('UPDATE users SET last_seen_at=$1 WHERE id=5',[date(5*24*hour)]);
 await db.query('UPDATE users SET last_seen_at=$1 WHERE id=8',[date(72*hour)]);
 await db.query('UPDATE users SET last_seen_at=$1 WHERE id=10',[date(72*hour-1)]);
 await db.query('UPDATE users SET last_seen_at=$1 WHERE id=4',[date(hour)]);
 await db.query('UPDATE support_crm_contacts SET created_at=$1 WHERE user_id=1',[date(24*hour-1)]);
 await db.query('UPDATE support_crm_contacts SET created_at=$1 WHERE user_id=2',[date(24*hour)]);
 await db.query("INSERT INTO support_crm_contacts(user_id,agent_id,channel,outcome,created_at) VALUES(4,3,'telegram','other',$1),(9,2,'phone','in_progress',$2)",[date(24*hour-1),date(hour)]);
 for(const [agent,expected] of [[2,[2,1,1]],[3,[2,1,1]]] as const){
  await runWithSupportCrmScope(agent,async()=>{
   const counts=await getSupportCrmStats(reference);assert.equal(counts.total_premium,4);assert.deepEqual([counts.needs_contact_count,counts.contacted_count,counts.no_contact_needed_count],expected);
   const lists=await Promise.all((['needs_contact','contacted','no_contact_needed'] as const).map(filter=>listSupportCrmQueue({filter,now:reference})));
   const all=lists.flatMap(list=>list.rows.map(row=>Number(row.id)));assert.equal(all.length,4);assert.equal(new Set(all).size,4);
   if(agent===2)assert.deepEqual(lists[0].rows.map(row=>Number(row.id)),[9,5]);
  },adapter as any);
 }
 await runWithSupportCrmScope(2,async()=>{
  // At exactly 24 hours the student returns to the queue without any background mutation.
  const future=new Date(reference.getTime()+1);
  const contacted=await listSupportCrmQueue({filter:'contacted',now:future});assert.equal(contacted.total,0);
  const needed=await listSupportCrmQueue({filter:'needs_contact',now:future});assert.ok(needed.rows.some(row=>Number(row.id)===1));
  const owner=(await db.query<any>('SELECT agent_id FROM support_crm_assignments WHERE user_id=1')).rows[0].agent_id;assert.equal(owner,2);
 },adapter as any);
 await runWithSupportCrmScope(3,async()=>{
  const active=await listSupportCrmQueue({filter:'no_contact_needed',now:new Date(reference.getTime()+1)});assert.ok(active.rows.some(row=>Number(row.id)===4));
 },adapter as any);

 // A legacy student with six completed days must not be shown as having never visited.
 await db.query("INSERT INTO user_kunlik_day_progress(user_id,day_number,grammar_1,updated_at) VALUES(9,6,true,$1)",[date(5*24*hour)]);
 await runWithSupportCrmScope(2,async()=>{
  const needed=await listSupportCrmQueue({filter:'needs_contact',now:reference});const row=needed.rows.find(r=>Number(r.id)===9)!;
  assert.equal(new Date(row.last_activity_at!).toISOString(),date(5*24*hour));assert.equal(row.idle_hours,120);
  assert.equal(row.contact_activity,null); // The old in-progress record is not a contact.
  const contacted=await listSupportCrmQueue({filter:'contacted',now:reference});assert.equal(contacted.rows.find(r=>Number(r.id)===1)!.contact_activity,'not_recorded');
  await db.query('INSERT INTO user_daily_time(user_id,activity_date,seconds,updated_at) VALUES(1,$1,60,$2)',[reference.toISOString().slice(0,10),date(1000)]);
  const after=await listSupportCrmQueue({filter:'contacted',now:reference});assert.equal(after.rows.find(r=>Number(r.id)===1)!.contact_activity,'after_contact');
 },adapter as any);
 }finally{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();}
});
