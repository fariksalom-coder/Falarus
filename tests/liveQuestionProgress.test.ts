import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveQuestionProgress } from '../server/services/liveLessonPrompt';
test('successful review advances once; duplicate tool calls never reopen a question',()=>{
 const p=new LiveQuestionProgress(2);
 assert.equal(p.record(1).nextQuestion,2);
 assert.equal(p.record(1).reason,'duplicate');
 assert.equal(p.nextQuestion,2);
 assert.equal(p.record(2).nextQuestion,null);
});
test('malformed reviews and premature extra questions do not advance',()=>{
 const p=new LiveQuestionProgress(3);
 for(const n of [4,-1,NaN,1.5,0]) assert.equal(p.record(n,'new').accepted,false);
 assert.equal(p.nextQuestion,1);
 assert.equal(p.record(1).accepted,true);
});
test('extra questions unlock after list and cannot be graded twice',()=>{
 const p=new LiveQuestionProgress(1);
 assert.equal(p.record(0,'Savol?').accepted,false);
 p.record(1);
 assert.equal(p.record(0,'Savol?').accepted,true);
 assert.equal(p.record(0,'  SAVOL! ').reason,'duplicate');
 assert.equal(p.record(0,'').accepted,false);
});

test('missing and late tool events never rewind the spoken lesson',()=>{
 const p=new LiveQuestionProgress(3);
 assert.equal(p.record(2).nextQuestion,3);
 assert.equal(p.record(1).accepted,true);
 assert.equal(p.nextQuestion,3);
 assert.equal(p.record(2).reason,'duplicate');
 assert.equal(p.nextQuestion,3);
});
