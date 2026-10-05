import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import type {Pool} from 'pg';
import {loadDialogueContent,seedDialogueContent} from '../server/situations/content';
import {DialogueService} from '../server/situations/service';
import type {DialogueRound} from '../shared/situations';

test('all supplied complete topics follow the turn plan and have distinct answers',()=>{
  const topics=loadDialogueContent();assert.equal(topics.length,11);
  assert.equal(topics.reduce((n,t)=>n+t.situations.length,0),88);
  assert.equal(topics.reduce((n,t)=>n+t.situations.reduce((m,s)=>m+s.steps.length,0),0),1034);
  assert.equal(new Set(topics.flatMap(t=>t.situations.map(s=>s.id))).size,88);
});

test('isolated migration, repeatable import, grading, replay, quota, resume and user isolation',async()=>{
  const db=await PGlite.create();
  const q=(sql:string,args?:any[])=>db.query<any>(sql,args);
  try {
    await db.exec('CREATE TABLE users(id integer PRIMARY KEY, access_frozen_at timestamptz); INSERT INTO users(id) VALUES(1),(2),(3); CREATE TABLE user_game_plays(id serial PRIMARY KEY,user_id integer REFERENCES users(id),game text);');
    const migration=await readFile('db/migrations/203_situations_game.sql','utf8');await db.exec(migration);await db.exec(migration);
    const adapter={query:q,connect:async()=>({query:q,release(){}})} as unknown as Pool;
    const seeder={query:q} as any;
    assert.deepEqual(await seedDialogueContent(seeder),{topics:11,situations:88,turns:1034});
    const paid=new Set<number>([1]);const service=new DialogueService(adapter,async u=>paid.has(u));
    const catalog=await service.catalog(1);assert.equal(catalog.topics.length,11);assert.equal(catalog.stars,0);
    assert.ok(!JSON.stringify(catalog).includes('correct'));
    const startRequest=randomUUID();let round=await service.start(1,'street-01',startRequest);
    assert.equal(round.id,(await service.start(1,'street-01',startRequest)).id);
    assert.ok(!JSON.stringify(round).includes('correct'));
    await assert.rejects(()=>service.start(1,'street-02',startRequest),/ishlatilgan/);
    await assert.rejects(()=>service.answer(2,round.id,0,round.question!.options[0].id,randomUUID()),/topilmadi/);
    const source=loadDialogueContent()[0].situations[0];
    const wrong=round.question!.options.find(o=>o.text!==source.steps[0].correct)!;
    const wrongRequest=randomUUID();const miss=await service.answer(1,round.id,0,wrong.id,wrongRequest);
    assert.equal(miss.correct,false);assert.equal(miss.round.mistakes,1);
    assert.deepEqual(await service.answer(1,round.id,0,wrong.id,wrongRequest),miss);
    assert.equal((await service.answer(1,round.id,0,wrong.id,randomUUID())).round.mistakes,1);
    assert.equal((await service.start(1,'street-01',randomUUID())).mistakes,1);
    await assert.rejects(()=>service.answer(1,round.id,1,wrong.id,randomUUID()),/o‘zgargan/);
    await assert.rejects(()=>service.answer(1,round.id,0,randomUUID(),randomUUID()),/tanlang/);
    let finalRequest='',finalOption='',finalPosition=0;
    const finish=async(current:DialogueRound)=>{
      while(!current.finished){
        const answer=current.question!.options.find(o=>o.text===source.steps[current.position].correct)!;
        finalRequest=randomUUID();finalOption=answer.id;finalPosition=current.position;
        current=(await service.answer(1,current.id,current.position,answer.id,finalRequest)).round;
      }
      return current;
    };
    round=await finish(round);assert.equal(round.stars,2);assert.equal(round.earned,2);
    assert.equal((await service.answer(1,round.id,finalPosition,finalOption,finalRequest)).totalStars,2);
    assert.equal((await q('SELECT attempts FROM dialogue_progress WHERE user_id=1')).rows[0].attempts,1);
    await seedDialogueContent(seeder);
    assert.equal((await q('SELECT count(*)::int n FROM dialogue_situations')).rows[0].n,88);
    assert.equal((await service.catalog(1)).stars,2);
    let replay=await service.start(1,'street-01',randomUUID());replay=await finish(replay);
    assert.equal(replay.stars,3);assert.equal(replay.earned,1);
    replay=await finish(await service.start(1,'street-01',randomUUID()));assert.equal(replay.earned,0);
    assert.equal((await service.catalog(1)).stars,3);assert.equal((await service.catalog(2)).completed.length,0);
    await assert.rejects(()=>service.start(2,'missing-01',randomUUID()),/topilmadi/);
    assert.equal((await q('SELECT count(*)::int n FROM user_game_plays')).rows[0].n,0);
    const free=await service.start(2,'street-01',randomUUID());
    assert.equal((await service.start(2,'street-01',randomUUID())).id,free.id);
    await service.start(2,'street-02',randomUUID());await service.start(2,'street-03',randomUUID());
    await assert.rejects(()=>service.start(2,'street-04',randomUUID()),/tugadi/);
    assert.equal((await q('SELECT count(*)::int n FROM user_game_plays WHERE user_id=2')).rows[0].n,3);
    // A paid round cannot bypass subscription expiry; free rounds remain resumable.
    const paidRound=await service.start(1,'street-02',randomUUID());paid.delete(1);
    await assert.rejects(()=>service.answer(1,paidRound.id,0,paidRound.question!.options[0].id,randomUUID()),/premium/);
    await assert.rejects(()=>service.start(1,'street-02',randomUUID()),/premium/);
    await service.answer(2,free.id,0,free.question!.options[0].id,randomUUID());
    await q('UPDATE users SET access_frozen_at=now() WHERE id=2');
    await assert.rejects(()=>service.start(2,'street-01',randomUUID()),/cheklangan/);
    await assert.rejects(()=>service.answer(2,free.id,0,free.question!.options[0].id,randomUUID()),/cheklangan/);
    // Existing game opens share the same aggregate three-play limit.
    await q("INSERT INTO user_game_plays(user_id,game) VALUES(3,'other'),(3,'other'),(3,'other')");
    await assert.rejects(()=>service.start(3,'street-01',randomUUID()),/tugadi/);
  } finally {await db.close();}
});
