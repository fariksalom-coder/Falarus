import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { LessonStore } from '../server/videoLessons/store';
import { VideoLessonService } from '../server/videoLessons/service';
import { createAdminVideoLessonRoutes, createPublicVideoLessonRoutes } from '../server/routes/videoLessonRoutes';
import { lessonIssues, type VideoLessonRecord } from '../shared/videoLesson';
const sentence = {text:'Меня зовут Алише.',translation:'Mening ismim Alishe.',start:1.2,end:2.8,words:[{text:'Меня',start:1.2,end:1.65},{text:'зовут',start:1.7,end:2.1},{text:'Алише.',start:2.15,end:2.8}]};
test('upload → async processing → correction → preview → publish; auth and version protection',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'video-lessons-'));const store=new LessonStore(root);
  let unlock!:()=>void;const gate=new Promise<void>(resolve=>{unlock=resolve;});
  const service=new VideoLessonService(store,{probe:async()=>4,recognize:async()=>{await gate;return [structuredClone(sentence)];},translate:async s=>s.map(x=>({...x,translation:sentence.translation}))});
  const app=express();app.use(express.json());app.use('/api/admin/video-lessons',(req,res,next)=>req.headers.authorization==='Bearer test-admin'?next():res.sendStatus(401),createAdminVideoLessonRoutes(service));app.use('/api/video-lessons',createPublicVideoLessonRoutes(service));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as {port:number};const origin=`http://127.0.0.1:${address.port}`;
  const request=async(url:string,method='GET',body?:unknown,admin=true)=>fetch(origin+url,{method,headers:{...(admin?{Authorization:'Bearer test-admin'}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  try{
    assert.equal((await request('/api/admin/video-lessons','GET',undefined,false)).status,401);
    const form=new FormData();form.append('video',new Blob(['test bytes'],{type:'video/mp4'}),'test.mp4');
    const upload=await fetch(origin+'/api/admin/video-lessons/upload',{method:'POST',headers:{Authorization:'Bearer test-admin'},body:form});assert.equal(upload.status,201);let record=await upload.json() as VideoLessonRecord;const url='/api/admin/video-lessons/'+record.id;
    assert.equal((await request('/api/video-lessons/'+record.id,'GET',undefined,false)).status,404);
    assert.equal((await request('/api/video-lessons/'+record.id+'/video','GET',undefined,false)).status,404);
    const started=await request(url+'/process','POST',{revision:record.revision,kind:'recognize'});assert.equal(started.status,202);record=await started.json() as VideoLessonRecord;
    assert.equal((await request(url+'/process','POST',{revision:record.revision,kind:'recognize'})).status,409);
    assert.equal((await request(url,'PUT',{revision:record.revision,lesson:record.lesson})).status,409);
    unlock();for(let i=0;i<100;i++){record=await(await request(url)).json() as VideoLessonRecord;if(record.phase==='ready')break;await new Promise(r=>setTimeout(r,10));}assert.equal(record.phase,'ready');assert.equal(record.lesson.sentences[0].translation,sentence.translation);
    const revision=record.revision;record.lesson.title='Знакомство';const saved=await request(url,'PUT',{revision,lesson:record.lesson});assert.equal(saved.status,200);record=await saved.json() as VideoLessonRecord;
    assert.equal((await request(url,'PUT',{revision,lesson:record.lesson})).status,409);
    assert.equal((await request(url+'/publish','POST',{revision:record.revision})).status,200);
    const published=await request('/api/video-lessons/'+record.id,'GET',undefined,false);assert.equal(published.status,200);assert.deepEqual((await published.json()).sentences,[sentence]);
    const media=await fetch(origin+'/api/video-lessons/'+record.id+'/video',{headers:{Range:'bytes=0-3'}});assert.equal(media.status,206);
    record=await(await request(url)).json() as VideoLessonRecord;record.lesson.sentences[0].words[1].start=null;
    record=await(await request(url,'PUT',{revision:record.revision,lesson:record.lesson})).json() as VideoLessonRecord;
    assert.equal(record.status,'draft');assert.equal((await request(url+'/publish','POST',{revision:record.revision})).status,400);
    assert.equal((await request('/api/video-lessons/'+record.id,'GET',undefined,false)).status,404);
    assert.throws(()=>store.dir('../../etc/passwd'));
  }finally{unlock();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});}
});
test('publication validates missing times, ordering, text edits and Cyrillic translation',()=>{
  const doc={id:'a',title:'Lesson',video:'/video',language:'ru' as const,translationLanguage:'uz' as const,sentences:[structuredClone(sentence)]};assert.deepEqual(lessonIssues(doc,4),[]);
  doc.sentences[0].words[0].end=1.2;assert.ok(lessonIssues(doc,4).some(s=>s.includes('start/end')));
  doc.sentences[0]=structuredClone(sentence);doc.sentences[0].words.reverse();assert.ok(lessonIssues(doc,4).some(s=>s.includes('порядок')));
  doc.sentences[0]=structuredClone(sentence);doc.sentences[0].text='Другой текст';assert.ok(lessonIssues(doc,4).some(s=>s.includes('не совпадает')));
  doc.sentences[0]=structuredClone(sentence);doc.sentences[0].translation='Узбек кириллица';assert.ok(lessonIssues(doc,4).some(s=>s.includes('Latin')));
});
test('translation failure preserves transcript; retry works without re-running WhisperX',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'video-lessons-retry-'));let calls=0;let fail=true;
 const service=new VideoLessonService(new LessonStore(root),{probe:async()=>4,recognize:async()=>{calls++;return [structuredClone(sentence)];},translate:async s=>{if(fail)throw Error('Translator unavailable');return s;}});
 try{const file=path.join(root,'incoming');await writeFile(file,'video');let r=await service.upload({path:file,originalname:'a.mp4',size:5,mimetype:'video/mp4'});
 await service.start(r.id,r.revision,'recognize');for(let i=0;i<100;i++){r=await service.get(r.id);if(r.phase==='error')break;await new Promise(resolve=>setTimeout(resolve,10));}
 assert.equal(r.phase,'error');assert.equal(r.lesson.sentences[0].text,sentence.text);fail=false;await service.start(r.id,r.revision,'translate');for(let i=0;i<100;i++){r=await service.get(r.id);if(r.phase==='ready')break;await new Promise(resolve=>setTimeout(resolve,10));}assert.equal(r.phase,'ready');assert.equal(calls,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
