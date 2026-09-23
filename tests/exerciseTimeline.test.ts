import test from 'node:test';
import assert from 'node:assert/strict';
import { activeWord, demoLesson, sentenceAt, sentenceEnd } from '../src/exercise/lesson';
test('word highlighting respects media boundaries and silent gaps', () => {
  const sentence = demoLesson.sentences[0];
  for (const [time, expected] of [[0,-1],[1.2,0],[1.64,0],[1.65,-1],[1.69,-1],[1.7,1],[2.1,-1],[2.15,2],[2.8,-1],[9,-1]]) assert.equal(activeWord(sentence,time),expected,`time=${time}`);
});
test('the same timeline works with other lesson data and backwards seeks', () => {
  const lesson = {...demoLesson, sentences:[...demoLesson.sentences,{id:'next',text:'Другая фраза',start:4,end:5,words:[{id:'a',text:'Другая',start:4,end:4.4},{id:'b',text:'фраза',start:4.5,end:5}]}]};
  assert.equal(sentenceAt(lesson,4.5),1); assert.equal(activeWord(lesson.sentences[1],4.5),1);
  assert.equal(sentenceAt(lesson,1.3),0); assert.equal(sentenceAt(lesson,0),0);
  assert.equal(sentenceAt(lesson,10),1);
});

test('sentence playback ends on the final word without trailing lead-in or next sentence', () => {
  const lesson = structuredClone(demoLesson);
  lesson.sentences[0].end = 4.8;
  assert.equal(sentenceEnd(lesson, 0), 2.8);
  lesson.sentences.push({id:'s2',text:'Дальше',start:2.7,end:4,words:[{id:'w4',text:'Дальше',start:2.7,end:4}]});
  assert.equal(sentenceEnd(lesson, 0), 2.7);
  assert.equal(sentenceEnd(lesson, 1), 4);
});
