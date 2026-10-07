import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import express from 'express';
import jwt from 'jsonwebtoken';
import { calendarMonth,calendarDates,shiftCalendarMonth,crmToday,completedKunlikTaskKeys,participationPercent } from '../shared/supportCrmCalendar';
import { getPremiumActivityCalendar,getStudentActivityCalendar } from '../server/services/supportCrmCalendar.service';

test('CRM calendar: real months, Tashkent midnight, percentage and completion/retry keys',()=>{
  assert.equal(crmToday(new Date('2026-10-06T19:00:00Z')),'2026-10-07');
  assert.equal(calendarMonth(undefined,new Date('2026-10-06T19:00:00Z')),'2026-10');
  assert.equal(calendarDates('2024-02').length,29);assert.equal(calendarDates('2026-02').length,28);
  assert.equal(shiftCalendarMonth('2026-01',-1),'2025-12');assert.equal(shiftCalendarMonth('2026-12',1),'2027-01');
  for(const month of ['2026-00','2026-13','2026-1','1800-01','2026-10-01'])assert.throws(()=>calendarMonth(month));
  assert.equal(participationPercent(100,475),21.05);assert.equal(participationPercent(0,0),null);
  assert.deepEqual(completedKunlikTaskKeys(0,{grammar_1:true}),[]);
  assert.deepEqual(completedKunlikTaskKeys(1,{grammar_1:true,grammar_2:'true',words_correct:10,words_match:true,speaking_level:2}),['kunlik:1:grammar_1','kunlik:1:words_match','kunlik:1:speaking_level:2']);
});

test('CRM calendars: historical premium, unique students/tasks, contacts, partial history, access and no progress changes',async()=>{
  const db=await PGlite.create();
  const adapter={query:async(sql:string,args:any[]=[])=>{const r=await db.query(sql,args);return {...r,rowCount:r.rows.length||r.affectedRows||0};}};
  let server:ReturnType<typeof express.application.listen>|undefined;
  try{
    await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY,plan_expires_at timestamptz,last_seen_at timestamptz);
      CREATE TABLE subscriptions(user_id bigint,started_at timestamptz,expires_at timestamptz,status text,plan_type text);
      CREATE TABLE payments(user_id bigint,status text,product_code text,approved_at timestamptz,payment_time timestamptz,created_at timestamptz);
      CREATE TABLE user_kunlik_day_progress(user_id bigint,day_number int,grammar_1 boolean DEFAULT false,grammar_2 boolean DEFAULT false,grammar_3 boolean DEFAULT false,words_match boolean DEFAULT false,phrases_done boolean DEFAULT false,oqish_done boolean DEFAULT false,suhbat_done boolean DEFAULT false,speaking_level int DEFAULT 0,speaking_tasks_done int DEFAULT 0,review_unlocked boolean DEFAULT false,PRIMARY KEY(user_id,day_number));
      CREATE TABLE user_tasks(user_id bigint,task_id bigint,status text,completed_at timestamptz);
      CREATE TABLE user_activity_dates(user_id bigint,activity_date date);
      CREATE TABLE user_daily_time(user_id bigint,activity_date date,seconds int);
      CREATE TABLE support_crm_agents(id bigint PRIMARY KEY,login text,name text,active boolean,is_manager boolean DEFAULT true);
      CREATE TABLE support_crm_contacts(id bigint PRIMARY KEY,agent_id bigint,user_id bigint,channel text,channel_other text,outcome text,result text,comment_text text,created_at timestamptz);
      INSERT INTO users VALUES(1,'2026-12-01',NULL),(2,'2026-10-03',NULL),(3,'2026-12-01',NULL),(4,NULL,NULL);
      INSERT INTO subscriptions VALUES(1,'2026-09-01','2026-12-01','active','three_month'),(2,'2026-09-01','2026-10-03','expired','monthly'),(3,'2026-10-03T19:00:00Z','2026-12-01','active','three_month');
      INSERT INTO support_crm_agents VALUES(1,'operator1','Оператор 1',true,true),(2,'operator2','Оператор 2',true,true);
      INSERT INTO support_crm_contacts VALUES(1,1,1,'telegram',NULL,'reached',NULL,'Помог войти','2026-10-01T19:30:00Z'),(2,2,1,'whatsapp',NULL,'no_pickup',NULL,NULL,'2026-10-02T15:00:00Z');
      INSERT INTO user_activity_dates VALUES(1,'2026-10-01');INSERT INTO user_daily_time VALUES(1,'2026-10-01',60);
      INSERT INTO user_tasks VALUES(1,77,'PASSED','2026-09-30T19:30:00Z');`);
    const migration=await readFile(new URL('../db/migrations/205_support_crm_activity_calendar.sql',import.meta.url),'utf8');
    await db.exec(migration);const since=(await db.query<any>('SELECT tracking_since FROM support_crm_calendar_meta')).rows[0].tracking_since;
    await db.exec(migration);assert.deepEqual((await db.query<any>('SELECT tracking_since FROM support_crm_calendar_meta')).rows[0].tracking_since,since);
    // Freeze initial known subscription history; same user's overlapping records count once.
    await db.exec(`INSERT INTO support_crm_premium_periods(user_id,started_at,expires_at,source) VALUES(1,'2026-09-01','2026-12-01','legacy');
      INSERT INTO learning_task_completions(user_id,activity_date,task_key,completed_at) VALUES
      (1,'2026-10-01','kunlik:1:grammar_1','2026-10-01T06:00:00Z'),(1,'2026-10-01','kunlik:1:words_match','2026-10-01T07:00:00Z'),
      (2,'2026-10-01','kunlik:2:grammar_1','2026-10-01T07:00:00Z'),(4,'2026-10-01','kunlik:1:grammar_1','2026-10-01T07:00:00Z');`);
    const now=new Date('2026-10-07T10:00:00Z');
    const calendar=await getPremiumActivityCalendar('2026-10','historical',adapter as any,now);
    const first=calendar.days[0];assert.equal(first.premium,2);assert.equal(first.active,2);assert.equal(first.percent,100);
    assert.equal(calendar.days[3].premium,2); // user 2 expired; user 3 started Tashkent October 4
    assert.equal(calendar.days[1].active,0);assert.equal(calendar.days[1].percent,0); // Explicit zero from the saved completion journal, coverage remains partial.assert.equal(calendar.days[7].percent,null);assert.equal(calendar.days[7].future,true);
    assert.equal((await getPremiumActivityCalendar('2025-01','historical',adapter as any,now)).days[0].percent,0);
    const student=await getStudentActivityCalendar(1,'2026-10',adapter as any,now);assert.ok(student);
    assert.equal(student.days[0].tasks,3);assert.equal(student.days[0].visited,true);assert.equal(student.days[0].coverage,'partial');
    assert.equal(student.days[1].contacts.length,2);assert.deepEqual(student.days[1].contacts.map(c=>c.agent_name),['Оператор 1','Оператор 2']);assert.equal(student.days[1].contacts[1].outcome,'no_pickup');
    // Progress transitions are recorded once, review flags/time-only writes never count as tasks.
    await db.exec("INSERT INTO user_kunlik_day_progress(user_id,day_number,grammar_1,speaking_level) VALUES(1,8,true,2)");
    const count=async()=>(await db.query<any>("SELECT count(*)::int n FROM learning_task_completions WHERE task_key LIKE 'kunlik:8:%'")).rows[0].n;
    assert.equal(await count(),3);
    await db.exec("UPDATE user_kunlik_day_progress SET review_unlocked=true WHERE user_id=1 AND day_number=8");assert.equal(await count(),3);
    await db.exec("UPDATE user_kunlik_day_progress SET grammar_1=true,speaking_level=2 WHERE user_id=1 AND day_number=8");assert.equal(await count(),3);
    await db.exec("UPDATE user_kunlik_day_progress SET speaking_tasks_done=2 WHERE user_id=1 AND day_number=8");assert.equal(await count(),5);
    await db.exec("UPDATE users SET last_seen_at='2026-10-06T19:01:00Z' WHERE id=1");
    assert.equal((await getStudentActivityCalendar(1,'2026-10',adapter as any,now))!.days[6].visited,true);
    const before=(await db.query('SELECT * FROM user_kunlik_day_progress')).rows;
    await getPremiumActivityCalendar('2026-10','historical',adapter as any,now);await getStudentActivityCalendar(1,'2026-10',adapter as any,now);
    assert.deepEqual((await db.query('SELECT * FROM user_kunlik_day_progress')).rows,before);
    // Expiring a current account leaves the observed/historical old periods intact.
    const previous=(await getPremiumActivityCalendar('2026-10','historical',adapter as any,now)).days[0].premium;
    await db.exec("UPDATE users SET plan_expires_at=NULL WHERE id=1");
    assert.equal((await getPremiumActivityCalendar('2026-10','historical',adapter as any,now)).days[0].premium,previous);
    process.env.SUPPORT_CRM_JWT_SECRET='calendar-test-secret-32-characters-long';
    const {createSupportCrmAuthMiddleware}=await import('../server/middleware/supportCrmAuth');
    const {createSupportCrmCalendarRoutes}=await import('../server/routes/supportCrmCalendarRoutes');
    const {createPostgresFacade}=await import('../server/lib/postgresFacade');
    const app=express();app.use(createSupportCrmAuthMiddleware(createPostgresFacade(adapter as any)));app.use(createSupportCrmCalendarRoutes(adapter as any,()=>now));
    server=app.listen(0,'127.0.0.1');await new Promise<void>((resolve,reject)=>{server!.once('listening',resolve);server!.once('error',reject);});
    const base=`http://127.0.0.1:${(server.address() as any).port}`;
    const token=jwt.sign({agentId:1,login:'operator1',role:'support_crm'},process.env.SUPPORT_CRM_JWT_SECRET);
    const get=(path:string,auth=token)=>fetch(base+path,{headers:{Authorization:`Bearer ${auth}`}});
    assert.equal((await get('/calendar?month=2026-10','invalid')).status,401);
    const ordinary=jwt.sign({userId:1,role:'user'},process.env.SUPPORT_CRM_JWT_SECRET);assert.equal((await get('/calendar',ordinary)).status,401);
    assert.equal((await get('/calendar?month=2026-99')).status,400);assert.equal((await get('/users/0/calendar')).status,400);assert.equal((await get('/users/999/calendar')).status,404);
    const response=await get('/users/1/calendar?month=2026-10');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
    assert.equal((await response.json()).days.length,31);
  } finally {if(server)await new Promise<void>((resolve,reject)=>server!.close(e=>e?reject(e):resolve()));await db.close();}
});
