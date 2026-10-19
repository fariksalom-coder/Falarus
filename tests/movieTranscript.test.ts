import test from 'node:test';
import assert from 'node:assert/strict';
import {movieChunkSentences, normalizeMovieTimeline} from '../server/videoLessons/movieTranscript';
import {parseDocument} from '../server/videoLessons/store';
import {lessonIssues} from '../shared/videoLesson';
const raw={segments:[{start:0,end:4,text:'Первая фраза.'}],words:[{word:'Первая',start:.2,end:1},{word:'фраза.',start:1,end:2}]};
test('subtitle timestamps use the full film clock',()=>{
 const s=movieChunkSentences(raw,3600,3600,3900)[0];assert.equal(s.start,3600.2);assert.equal(s.words[1].end,3602);assert.equal(s.text,'Первая фраза.');
});
test('overlap words belong to one chunk only',()=>{
 const r={segments:[{start:0,end:5,text:'Один два три'}],words:[{word:'Один',start:0,end:1},{word:'два',start:2,end:3},{word:'три',start:4,end:5}]};
 const a=movieChunkSentences(r,298,0,300),b=movieChunkSentences(r,298,300,600);assert.deepEqual([...a,...b].flatMap(s=>s.words.map(w=>w.text)),['Один','два','три']);assert.equal(b[0].start,300);
});
test('overlapping word boundaries do not shift later dialogue',()=>{
 const a=movieChunkSentences(raw,0,0,300);const b=movieChunkSentences(raw,1.9,0,300);const result=normalizeMovieTimeline([...a,...b]);assert.ok(result[1].start!>=result[0].end!);assert.equal(result[1].end,3.9);
});
test('complete movie documents accept timestamps after two hours',()=>{
 const sentences=movieChunkSentences(raw,7500,7500,7553).map(s=>({...s,translation:'Birinchi gap.'}));const document={id:'test',title:'Капернаум (2018)',language:'ru' as const,translationLanguage:'uz' as const,video:'/movie.mp4',sentences};assert.deepEqual(parseDocument(document,document),document);assert.deepEqual(lessonIssues(document,7553),[]);
});

test('film captions permit spoken numbers and names without weakening lesson validation',()=>{
 const sentence={text:'0-9',translation:'0-9',start:1,end:2,words:[{text:'0-9',start:1,end:2}]};
 const document={id:'test',title:'Film',language:'ru' as const,translationLanguage:'uz' as const,video:'/movie.mp4',sentences:[sentence]};
 assert.deepEqual(lessonIssues({...document,kind:'film'},3),[]);
 assert.ok(lessonIssues(document,3).some(issue=>issue.includes('русский текст')));
});
