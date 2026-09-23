import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { KioskService, KioskError, normalizeKioskPhone, validateKioskConfig, type KioskDb } from '../server/kiosk/service';
import { KIOSK_QUESTIONS } from '../server/kiosk/questions';

const token=()=>randomBytes(32).toString('hex');
const contact=(phone='+998901234567')=>({name:'Азиз',phone,locale:'ru',consent:true,marketingConsent:false,source:'test'});

test('phone validation requires a valid international number',()=>{
  assert.equal(normalizeKioskPhone('+998 90 123-45-67'),'+998901234567');
  for(const phone of ['123','901234567','+7 123','',null]) assert.throws(()=>normalizeKioskPhone(phone),KioskError);
});

test('kiosk: private answers, server deadlines, retries, snapshots, coupons and dashboard',async()=>{
  const db=await PGlite.create();
  let lock=Promise.resolve();
  const adapter:KioskDb={query:(sql,args)=>db.query(sql,args),connect:async()=>{
    const previous=lock;let release!:()=>void;lock=new Promise(resolve=>{release=resolve;});await previous;
    return {query:(sql,args)=>db.query(sql,args),release};
  }};
  let time=new Date('2026-09-19T10:00:00Z');
  const service=new KioskService(adapter,()=>time);
  try{
    await db.exec('CREATE TABLE admins(id BIGINT PRIMARY KEY); INSERT INTO admins VALUES(1);');
    const sql=await readFile(new URL('../db/migrations/185_kiosk_quiz.sql',import.meta.url),'utf8');
    await db.exec(sql);await db.exec(sql);
    const audiencesSql=await readFile(new URL('../db/migrations/186_kiosk_audience.sql',import.meta.url),'utf8');
    await db.exec(audiencesSql);await db.exec(audiencesSql);
    const config=await service.config();
    assert.equal(config.discountPercent,20);
    for(const patch of [{discountPercent:100},{minimumCorrect:11},{originalPrice:NaN},{validityHours:0},{questionSeconds:0},{campaignKey:"x'; DROP TABLE users;--"}]) assert.throws(()=>validateKioskConfig({...config,...patch}),KioskError);
    await assert.rejects(service.start(token(),{...contact(),consent:false}),KioskError);
    await assert.rejects(service.start('short',contact()),KioskError);
    const first=token();const started=await service.start(first,contact());
    assert.equal(started.index,0);assert.equal(started.total,10);
    assert.ok(!JSON.stringify(started).includes('correctIndex'));assert.ok(!JSON.stringify(started).includes('explanation'));
    assert.equal((await service.start(first,contact())).id,started.id);
    await assert.rejects(service.answer(first,{index:2,selected:0}),KioskError);
    await assert.rejects(service.answer(first,{index:0,selected:9}),KioskError);
    const [a,b]=await Promise.all([service.answer(first,{index:0,selected:0}),service.answer(first,{index:0,selected:3})]);
    assert.equal(a.index,1);assert.equal(b.index,1);assert.equal(b.correctCount,1);
    // The offer snapshot remains stable if an admin changes the current campaign.
    await service.updateConfig({...config,discountPercent:35});
    let result=a;
    for(let i=1;i<10;i++)result=await service.answer(first,{index:i,selected:KIOSK_QUESTIONS[i].correctIndex});
    assert.equal(result.correctCount,10);assert.equal(result.status,'completed');assert.equal(result.coupon?.discountPercent,20);
    const coupon=result.coupon!;assert.match(coupon.code,/^FR-[A-F0-9]{12}$/);
    assert.equal((await service.answer(first,{index:9,selected:0})).coupon?.expiresAt,coupon.expiresAt);
    assert.equal((await service.state(first)).question,null);
    assert.equal((await service.state(first)).coupon?.code,coupon.code);
    await assert.rejects(service.state(token()),KioskError);
    time=new Date(time.getTime()+60000);
    const second=token();await service.start(second,contact());
    for(let i=0;i<10;i++)result=await service.answer(second,{index:i,selected:KIOSK_QUESTIONS[i].correctIndex});
    assert.equal(result.coupon?.id,coupon.id);assert.equal(result.coupon?.expiresAt,coupon.expiresAt);assert.equal(result.coupon?.discountPercent,20);
    const late=token();await service.start(late,contact('+998901234568'));
    time=new Date(time.getTime()+21000);
    const missed=await service.answer(late,{index:0,selected:0});assert.equal(missed.correctCount,0);assert.equal(missed.feedback?.timedOut,true);
    await service.updateConfig({...config,minimumCorrect:10});
    const fail=token();await service.start(fail,contact('+998901234569'));
    for(let i=0;i<10;i++)result=await service.answer(fail,{index:i,selected:null});
    assert.equal(result.coupon,null);assert.equal(result.status,'completed');
    await assert.rejects(service.redeem(coupon.id,1,''),KioskError);
    const used=await service.redeem(coupon.id,1,'Заказ 123');assert.ok(used.redeemedAt);
    await assert.rejects(service.redeem(coupon.id,1,'Повтор'),KioskError);
    const stats=await service.dashboard({days:30,page:1,search:'',status:'all'});
    assert.deepEqual(stats.summary,{started:4,completed:3,contacts:3,averageScore:6.7,issued:1,redeemed:1});
    assert.equal(stats.participants.length,4);assert.equal(stats.daily.length,1);
    assert.equal((await service.dashboard({days:30,page:1,search:coupon.code,status:'redeemed'})).total,2);
    assert.equal((await service.dashboard({days:30,page:1,search:"' OR 1=1 --",status:'all'})).total,0);
    assert.equal((await service.dashboard({days:30,page:2,search:'',status:'all'})).participants.length,0);
    // Expiration is checked by the server, regardless of the visitor's clock.
    await service.updateConfig({...config,campaignKey:'second-campaign',originalPrice:3000});
    const third=token();await service.start(third,contact());
    for(let i=0;i<10;i++)result=await service.answer(third,{index:i,selected:0});
    assert.equal(result.coupon?.finalPrice,2400);
    time=new Date(time.getTime()+16*3600000);
    await assert.rejects(service.redeem(result.coupon!.id,1,'Поздний заказ'),KioskError);
    const childToken=token();
    const child=await service.start(childToken,{...contact('+998901234570'),audience:'child'});
    const teen=await service.start(token(),{...contact('+998901234571'),audience:'teen'});
    assert.equal(child.audience,'child');assert.equal(teen.audience,'teen');
    assert.equal((await service.state(childToken)).audience,'child');
    assert.equal(started.audience,'adult');
    await assert.rejects(service.start(token(),{...contact(),audience:'invalid'}),KioskError);
    const childStats=await service.dashboard({days:30,page:1,search:'',status:'all',audience:'child'});
    assert.equal(childStats.summary.started,1);assert.equal(childStats.total,1);
    assert.equal(childStats.participants[0].audience,'child');
    assert.equal(childStats.audiences.find(x=>x.audience==='child')?.started,1);
    assert.equal(childStats.audiences.find(x=>x.audience==='teen')?.started,1);
    const noMatch=await service.dashboard({days:30,page:1,search:coupon.code,status:'all',audience:'teen'});
    assert.equal(noMatch.total,0);
    await assert.rejects(service.dashboard({days:30,page:1,search:'',status:'all',audience:'invalid'}),KioskError);
    await service.updateConfig({...config,enabled:false});
    await assert.rejects(service.start(token(),contact()),KioskError);
    assert.equal((await service.state(third)).status,'completed');
  }finally{await db.close();}
});
