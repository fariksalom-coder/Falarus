import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilmSubtitles } from '../src/exercise/FilmSubtitles';
import { filmCaptionAt, lessonFromDocument } from '../src/exercise/lesson';
import { lessonIssues } from '../shared/videoLesson';

test('film subtitles retain the entire sentence even when word alignment was incomplete',()=>{
 const sentence={id:'a',text:'Истец — заключённый. Покажи мне руки.',translation:'Da’vogar — mahbus. Qo‘llaringni ko‘rsat.',start:1,end:5,words:[{id:'w',text:'Истец',start:1,end:2}]};
 const html=renderToStaticMarkup(createElement(FilmSubtitles,{sentence}));
 assert.ok(html.includes(sentence.text));assert.ok(html.includes(sentence.translation));assert.equal(html.includes('ex-row'),false);
});
test('a pause does not display future dialogue or repeated old captions',()=>{
 const html=renderToStaticMarkup(createElement(FilmSubtitles,{}));assert.ok(html.includes('Пауза в субтитрах'));assert.equal(html.includes('ex-film-source'),false);
});
test('films can use accurately timed phrase captions without fabricated word timestamps',()=>{
 const document={kind:'film' as const,id:'film',title:'Фильм',language:'ru' as const,translationLanguage:'uz' as const,video:'/movie.mp4',sentences:[{text:'Подними голову.',translation:'Boshingni ko‘tar.',start:34.7,end:36,words:[]}]};
 assert.deepEqual(lessonIssues(document,100),[]);assert.equal(lessonFromDocument(document).kind,'film');
 const overlapping={...document,sentences:[...document.sentences,{...document.sentences[0],start:35,end:37}]};assert.ok(lessonIssues(overlapping,100).some(s=>s.includes('пересекаются')));
 assert.ok(lessonIssues({...document,kind:'lesson'},100).some(s=>s.includes('нет слов')));
});

test('a film caption stays through a short pause and clears in a long one',()=>{
 const line=(id:string,start:number,end:number)=>({id,text:id,start,end,words:[]});
 const lesson={id:'f',title:'f',label:'',language:'ru',video:{src:''},sentences:[line('a',10,12),line('b',12.8,14),line('c',30,32),line('d',34.5,35)]};
 assert.equal(filmCaptionAt(lesson,5),-1);assert.equal(filmCaptionAt(lesson,11),0);assert.equal(filmCaptionAt(lesson,12.5),0);
 assert.equal(filmCaptionAt(lesson,13),1);assert.equal(filmCaptionAt(lesson,14.9),1);assert.equal(filmCaptionAt(lesson,16),-1);
 assert.equal(filmCaptionAt(lesson,34),2);assert.equal(filmCaptionAt(lesson,35.5),3);assert.equal(filmCaptionAt(lesson,40),-1);
});
test('a film opens at its playback start and rejects an impossible one',()=>{
 const document={kind:'film' as const,playbackStart:304,id:'film',title:'Фильм',language:'ru' as const,translationLanguage:'uz' as const,video:'/movie.mp4',sentences:[{text:'Да.',translation:'Ha.',start:309,end:310,words:[]}]};
 assert.equal(lessonFromDocument(document).startAt,304);assert.deepEqual(lessonIssues(document,400),[]);
 assert.ok(lessonIssues({...document,playbackStart:500},400).some(s=>s.includes('начала просмотра')));
});
