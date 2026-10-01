import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { createPostgresFacade } from '../server/lib/postgresFacade';
import { createWelcomeVideoOfferRoutes } from '../server/routes/welcomeVideoOfferRoutes';

test('repeat offer: old registrations, refresh, concurrent requests, expiry and claimed payments',async()=>{
  const db=await PGlite.create();
  await db.exec("CREATE TABLE users(id bigint PRIMARY KEY,created_at timestamptz);CREATE TABLE payments(id bigint PRIMARY KEY);INSERT INTO users VALUES(1,now()-interval '30 days');");
  await db.exec(await readFile('db/migrations/188_welcome_video_bonus_offer.sql','utf8'));
  const app=express();app.use(express.json());
  const facade=createPostgresFacade({query:(sql:string,args?:unknown[])=>db.query(sql,args)} as unknown as Pool);
  app.use(createWelcomeVideoOfferRoutes(facade,(req:any,_res,next)=>{req.userId=1;next();}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const replay=async()=>{const r=await fetch(url+'/welcome-video-offer/replay',{method:'POST'});assert.equal(r.status,200);return r.json();};
  try {
    const first=await replay();assert.equal(first.mode,'offer');
    const calls=await Promise.all([replay(),replay(),replay()]);
    for(const call of calls)assert.equal(call.offerExpiresAt,first.offerExpiresAt);
    await db.exec("UPDATE welcome_video_offers SET offer_expires_at=now()-interval '1 second'");
    const again=await replay();assert.equal(again.mode,'offer');assert.notEqual(again.offerExpiresAt,first.offerExpiresAt);
    await db.exec("INSERT INTO payments VALUES(5);UPDATE welcome_video_offers SET status='claimed',payment_id=5");
    assert.equal((await replay()).mode,'standard');
    assert.equal((await db.query<any>('SELECT payment_id FROM welcome_video_offers')).rows[0].payment_id,5);
  } finally {await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await db.close();}
});
