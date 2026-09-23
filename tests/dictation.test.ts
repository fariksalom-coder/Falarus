import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import type {Pool} from 'pg';
import {DictationService} from '../server/dictation/service';
import {normalizeDictation,dictationMistakes,dictationPoints,pickDictationItems} from '../shared/dictation';
import {validateContent} from '../server/scripts/seedDictation';
test('strict dictation normalization, typo distance, scoring and priority',()=>{
 assert.equal(normalizeDictation('  Я   сегодня работаю. ','sentence'),'я сегодня работаю');
 assert.equal(dictationMistakes('Зарплата','зарплата','word'),0);assert.equal(dictationMistakes('зарплаты','зарплата','word'),1);
 assert.notEqual(dictationMistakes('все','всё','word'),0);assert.notEqual(dictationMistakes('Как дела','Как дела?','sentence'),0);
 assert.equal(dictationPoints('word',1),10);assert.equal(dictationPoints('sentence',1),15);assert.equal(dictationPoints('word',3),14);
 const items=[{id:'a'},{id:'b'},{id:'c'}];assert.equal(pickDictationItems(items,1,new Map([['b',2]]),()=>.5)[0].id,'b');assert.equal(new Set(pickDictationItems(items,3,new Map()).map(x=>x.id)).size,3);
});
test('20 curated topics, exactly 25 words and 25 sentences each',async()=>{const data=JSON.parse(await readFile('content/dictation/dictation_content.json','utf8'));assert.deepEqual(validateContent(data),{topics:20,items:1000});for(const t of data.topics){assert.equal(t.items.filter(i=>i.type==='word').length,25);assert.equal(t.items.filter(i=>i.type==='sentence').length,25);}});
test('migration, grading, idempotency, lives, progress, review and owner isolation',async()=>{
 const db=await PGlite.create();const q=(sql:string,params?:unknown[])=>db.query(sql,params);
 await db.exec('CREATE TABLE users(id BIGINT PRIMARY KEY); INSERT INTO users VALUES(1),(2);');
 const migration=await readFile('db/migrations/187_dictation.sql','utf8');await db.exec(migration);await db.exec(migration);
 await q(`INSERT INTO dictation_topics(id,title_ru,title_uz) VALUES('work','Работа','Ish')`);
 for(let i=0;i<12;i++)await q(`INSERT INTO dictation_items(id,topic_id,type,text,translation_uz,audio_url,difficulty) VALUES($1,'work','word',$2,'ish',$3,1)`,['w'+i,'работа'+i,'/uploads/dictation/a'+i+'.mp3']);
 const adapter={query:q,connect:async()=>({query:q,release(){}})} as unknown as Pool;const service=new DictationService(adapter);
 try{
 const request=randomUUID();let round=await service.start(1,'work',10,false,request);assert.equal(round.total,10);assert.equal((await service.start(1,'work',10,false,request)).id,round.id);assert.ok(!('text' in round.question!));
 await assert.rejects(()=>service.get(2,round.id),/не найдена/);
 const answer='работа'+round.question!.id.slice(1);
 const first=await service.answer(1,round.id,0,answer);assert.equal(first.feedback.is_correct,true);assert.equal(first.round.score,10);assert.equal(first.round.combo,1);
 assert.deepEqual(await service.answer(1,round.id,0,'different'),first);round=first.round;
 for(let i=1;i<=3;i++){const r=await service.answer(1,round.id,i,'ошибка');round=r.round;assert.equal(round.lives,3-i);assert.equal(round.combo,0);}
 assert.equal(round.finished,true);assert.equal(round.correct,1);assert.equal(round.wrong,3);assert.equal(round.best_combo,1);
 const topics=await service.topics(1);assert.equal(topics[0].completed_items,4);assert.equal(topics[0].wrong_items,3);assert.equal(topics[0].best_score,10);
 const review=await service.start(1,'work',10,true,randomUUID());assert.equal(review.total,3);
 for(let i=0;i<3;i++){const current=await service.get(1,review.id);await service.answer(1,review.id,i,'работа'+current.question!.id.slice(1));}
 await assert.rejects(()=>service.start(1,'work',10,true,randomUUID()),/Нет ошибок/);
 const progress=(await service.topics(1))[0];assert.equal(progress.completed_items,4);assert.equal(progress.correct_items,4);assert.equal(progress.wrong_items,0);assert.equal(progress.best_combo,3);assert.equal(progress.best_score,36);
 assert.equal((await db.query<{n:number}>('SELECT count(*)::int n FROM dictation_attempts')).rows[0].n,7);
 const played=(await db.query<{item_id:string}>('SELECT item_id FROM dictation_attempts LIMIT 1')).rows[0].item_id;
 await q('UPDATE dictation_items SET is_active=false WHERE id=$1',[played]);
 assert.equal((await service.topics(1))[0].completed_items,3);
 assert.equal((await service.topics(2))[0].completed_items,0);
 }finally{await db.close();}
});
