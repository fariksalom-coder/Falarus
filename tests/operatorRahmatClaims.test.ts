import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import express from 'express';
import type { PoolClient } from 'pg';
import { summarizeAnalytics } from '../shared/salesLedger';

test('Rahmat attribution: authenticated submission, admin approval, single revenue/salary, refunds and unchanged premium',async()=>{
  process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:1/test';
  process.env.OPERATOR_BOT_ENABLED='true';process.env.OPERATOR_BOT_TOKEN='synthetic-bot-token';
  const db=await PGlite.create();
  const migration=await readFile(new URL('../db/migrations/204_operator_rahmat_attribution.sql',import.meta.url),'utf8');
  await db.exec(migration); // optional operator module may be absent
  const {pool}=await import('../server/lib/db.js');assert.ok(pool);
  const originalQuery=pool.query,originalConnect=pool.connect;
  const adapter=async(sql:string,args:any[]=[])=>{const r=await db.query(sql,args);return {...r,rowCount:r.rows.length||r.affectedRows||0};};
  (pool as any).query=adapter;(pool as any).connect=async()=>({query:adapter,release(){}});
  const dir=await mkdtemp(join(tmpdir(),'rahmat-claims-'));process.env.OPERATOR_RECEIPT_DIR=dir;
  const app=express();app.use(express.json());let server:ReturnType<typeof app.listen>|undefined;
  try{
    await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY,first_name text,last_name text,phone text,email text,plan_name text,plan_expires_at timestamptz,created_at timestamptz DEFAULT now());
      CREATE TABLE admins(id bigint PRIMARY KEY);CREATE TABLE subscriptions(id bigint,user_id bigint,status text,expires_at timestamptz);
      CREATE TABLE payments(id bigint PRIMARY KEY,user_id bigint REFERENCES users(id),amount numeric,currency text,tariff_type text,payment_channel text,status text,product_code text,payment_time timestamptz,created_at timestamptz DEFAULT now());
      INSERT INTO users VALUES(1,'Test','Client','+998901234567','test@example.invalid','3 OY',now()+interval '90 days',now()),(2,'Free','Client',NULL,NULL,NULL,NULL,now());
      INSERT INTO admins VALUES(1);`);
    await db.exec(await readFile(new URL('../server/operator/schema.sql',import.meta.url),'utf8'));
    await db.exec(migration);await db.exec(migration);
    await db.exec(`INSERT INTO operator_accounts(login,name,password_hash,telegram_id) VALUES('one','One','hash',123),('two','Two','hash',456);
      INSERT INTO payments(id,user_id,amount,currency,tariff_type,payment_channel,status,product_code,payment_time)
      VALUES(1,1,530000,'UZS','three_month','rahmat','approved','russian','2026-10-02T20:00:00Z'),
      (2,1,4000,'RUB','month','rahmat','pending','russian',now()),
      (3,1,4000,'RUB','month','manual','approved','russian',now()),
      (4,1,4000,'RUB','month','rahmat','approved','patent',now()),
      (5,2,4000,'RUB','month','rahmat','approved','russian',now());`);
    const before=(await db.query('SELECT * FROM users ORDER BY id')).rows;
    const {operatorMiniAppRoutes}=await import('../server/operator/miniApp.js');
    const {operatorAdminRoutes}=await import('../server/operator/admin.js');
    const {createAdminSalesLedgerRoutes}=await import('../server/routes/salesLedgerRoutes.js');
    const {submitRahmatClaim,decideRahmatClaim}=await import('../server/operator/rahmatClaims.js');
    app.use('/mini',operatorMiniAppRoutes());
    app.use('/admin',(req:any,_res,next)=>{req.adminId=1;next();},operatorAdminRoutes());
    app.use('/analytics',createAdminSalesLedgerRoutes(pool));
    server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server!.once('listening',resolve));
    const base=`http://127.0.0.1:${(server.address() as any).port}`;
    const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:123})});
    const check=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
    params.set('hash',createHmac('sha256',createHmac('sha256','WebAppData').update(process.env.OPERATOR_BOT_TOKEN).digest()).update(check).digest('hex'));
    const headers={Authorization:`tma ${params}`};
    const get=async(path:string,auth=true)=>fetch(base+path,{headers:auth?headers:{}});
    assert.equal((await get('/mini/customers/1/rahmat-payments',false)).status,401);
    const list=await (await get('/mini/customers/1/rahmat-payments')).json();assert.deepEqual(list.items.map((p:any)=>p.id),[1]);
    const receipt={fileId:'miniapp:proof',uniqueId:'proof',mime:'image/png'};
    const c={query:adapter} as unknown as PoolClient;
    for(const id of [2,3,4])await assert.rejects(submitRahmatClaim(c,1,1,id,receipt));
    await assert.rejects(submitRahmatClaim(c,1,2,1,receipt));
    await assert.rejects(submitRahmatClaim(c,1,2,5,receipt),/premium/);
    const body=new FormData();body.set('userId','1');body.set('paymentId','1');body.set('amount','999999');body.set('receipt',new Blob([new Uint8Array([137,80,78,71,13,10,26,10])],{type:'image/png'}),'proof.png');
    const upload=await fetch(base+'/mini/rahmat-claims',{method:'POST',headers,body});assert.equal(upload.status,200);const {claimId}=await upload.json();
    const retry=await fetch(base+'/mini/rahmat-claims',{method:'POST',headers,body});assert.equal((await retry.json()).claimId,claimId);
    await assert.rejects(submitRahmatClaim(c,2,1,1,{...receipt,uniqueId:'other'}),/biriktirilgan/);
    const pending=await (await get('/mini/stats?period=all')).json();assert.equal(pending.salary.soldCourses,0);assert.equal(pending.rahmatClaims.length,1);
    const review=await (await get('/admin/rahmat-claims')).json();assert.equal(review.rows[0].amount,'530000');
    const file=await get(`/admin/rahmat-claims/${claimId}/file`);assert.equal(file.status,200);assert.equal(file.headers.get('content-type'),'image/png');
    const period=async()=>{const r=await get('/analytics/period?from=2026-10-03&to=2026-10-03');assert.equal(r.status,200);return r.json();};
    const unassigned=await period();assert.equal(unassigned.sales.length,1);assert.equal(unassigned.sales[0].source,'rahmat');
    await decideRahmatClaim(c,claimId,1,'approved','');
    await assert.rejects(decideRahmatClaim(c,claimId,1,'approved',''),/oldin/);
    const assigned=await period();assert.equal(assigned.sales.length,1);assert.equal(assigned.payments.length,1);assert.equal(assigned.sales[0].source,'operator');assert.equal(assigned.sales[0].lead_source,'Rahmat');assert.equal(assigned.sales[0].operator_id,1);
    assert.deepEqual(summarizeAnalytics(assigned).received,summarizeAnalytics(unassigned).received);
    const stats=await (await get('/mini/stats?period=custom&from=2026-10-03&to=2026-10-03')).json();
    assert.equal(stats.salary.soldCourses,1);assert.equal(stats.salary.totalAmount,30000);assert.equal(stats.salesDays[0].amount,'530000');assert.equal(stats.payments[0].amount,'530000');
    assert.deepEqual((await db.query('SELECT * FROM users ORDER BY id')).rows,before);assert.equal((await db.query<any>('SELECT count(*) n FROM subscriptions')).rows[0].n,0);
    assert.equal((await db.query<any>('SELECT count(*) n FROM payments')).rows[0].n,5);assert.equal((await db.query<any>('SELECT count(*) n FROM operator_contracts')).rows[0].n,0);
    assert.equal((await db.query<any>('SELECT count(*) n FROM operator_outbox')).rows[0].n,2);
    await db.exec("UPDATE payments SET status='refunded' WHERE id=1");
    assert.equal((await period()).payments.length,0);
    assert.equal((await (await get('/mini/stats?period=all')).json()).salary.soldCourses,0);
    // Rejection releases the payment for a fresh claim, but approval rechecks payment state.
    await db.exec("UPDATE payments SET status='approved' WHERE id=1; UPDATE operator_rahmat_claims SET status='pending' WHERE id=1");
    await assert.rejects(decideRahmatClaim(c,1,1,'rejected','x'));
    await decideRahmatClaim(c,1,1,'rejected','Wrong operator');
    const second=await submitRahmatClaim(c,2,1,1,{...receipt,uniqueId:'fresh-proof'});
    await db.exec("UPDATE payments SET status='refunded' WHERE id=1");await assert.rejects(decideRahmatClaim(c,second,1,'approved',''),/holati/);
    await decideRahmatClaim(c,second,1,'rejected','Payment refunded');
  }finally{
    if(server)await new Promise<void>((resolve,reject)=>server!.close(e=>e?reject(e):resolve()));
    (pool as any).query=originalQuery;(pool as any).connect=originalConnect;await db.close();await rm(dir,{recursive:true,force:true});
  }
});
