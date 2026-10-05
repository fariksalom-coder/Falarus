import test from 'node:test';
import assert from 'node:assert/strict';
import {DialogueTurnPlayback} from '../src/utils/dialogueTurnPlayback';
import type {DialogueRound} from '../shared/situations';
function round(position=0,finished=false):DialogueRound {
  return {id:'session',situationId:'street-01',position,total:2,mistakes:0,finished,stars:finished?3:0,earned:finished?3:0,
    messages:Array.from({length:position},(_,i)=>[{from:'partner' as const,ru:`Вопрос ${i}`},{from:'me' as const,ru:`Ответ ${i}`}]).flat(),
    question:finished?null:{partnerRu:`Вопрос ${position}`,partnerUz:'Savol',options:[{id:'a',text:'Да'},{id:'b',text:'Нет'},{id:'c',text:'Спасибо'}]}};
}
function harness(){
  const audio:{text:string;voice:string;done:()=>void;fail:()=>void}[]=[];
  const player=new DialogueTurnPlayback((text,done,fail,voice)=>audio.push({text,voice,done,fail}),()=>{},()=>{});
  return {player,audio};
}
test('choices await female audio; next message awaits male audio; result awaits final answer',()=>{
  const {player,audio}=harness();player.start(round());
  assert.equal(player.view.questionVisible,true);assert.equal(player.view.ready,false);assert.equal(audio[0].voice,'dialogue-female');
  audio[0].done();assert.equal(player.view.ready,true);assert.equal(player.view.round!.question!.options.length,3);
  player.accept(round(1),true);
  assert.equal(player.view.phase,'answer');assert.equal(player.view.questionVisible,false);assert.equal(player.view.ready,false);
  assert.equal(audio[1].voice,'dialogue-male');assert.equal(audio.length,2);
  audio[1].done();assert.equal(player.view.questionVisible,true);assert.equal(player.view.ready,false);assert.equal(audio[2].voice,'dialogue-female');
  audio[2].done();assert.equal(player.view.ready,true);
  player.accept(round(2,true),true);assert.equal(player.view.finished,false);assert.equal(audio[3].voice,'dialogue-male');
  audio[3].done();assert.equal(player.view.finished,true);assert.equal(audio.length,4);
});
test('wrong answers do not speak, duplicate results do not repeat, replay temporarily hides choices',()=>{
  const {player,audio}=harness();player.start(round());audio[0].done();
  const wrong={...round(),mistakes:1};player.accept(wrong,false);assert.equal(player.view.ready,true);assert.equal(audio.length,1);
  player.repeat('Вопрос 0','partner');assert.equal(player.view.ready,false);audio[1].done();assert.equal(player.view.ready,true);
  player.accept(round(1),true);player.accept(round(1),true);assert.equal(audio.length,3);
  audio[2].done();assert.equal(audio.length,4);
});
test('all audio chunks must finish before choices appear, and cancellation ignores old callbacks',()=>{
  const {player,audio}=harness();const initial=round();initial.question!.partnerRu='Здравствуйте! '.repeat(30);
  player.start(initial);audio[0].done();assert.equal(player.view.ready,false);audio[1].done();assert.equal(player.view.ready,false);audio[2].done();assert.equal(player.view.ready,true);
  player.accept(round(1),true);const old=audio[3];player.stop();old.done();assert.equal(player.view.phase,'idle');assert.equal(audio.length,4);
  player.start({...round(),id:'other'});old.done();assert.equal(player.view.ready,false);assert.equal(player.view.round!.id,'other');
});
test('mute and speech failure release the sequence; re-enabling sound reads the current question',()=>{
  const {player,audio}=harness();player.start(round());player.toggle();assert.equal(player.view.ready,true);audio[0].done();assert.equal(audio.length,1);
  player.accept(round(1),true);assert.equal(player.view.questionVisible,true);assert.equal(player.view.ready,true);assert.equal(audio.length,1);
  player.toggle();assert.equal(player.view.ready,false);audio[1].fail();assert.equal(player.view.ready,true);assert.equal(player.view.error,true);
  player.accept(round(2,true),true);assert.equal(player.view.finished,false);player.toggle();assert.equal(player.view.finished,true);
});
test('a valid answer still advances if the sound toggle is used during its API request',()=>{
  const {player,audio}=harness();player.start(round());audio[0].done();player.toggle();player.toggle();
  assert.equal(player.view.ready,false);player.accept(round(1),true);assert.equal(player.view.phase,'answer');
  audio[1].done();assert.equal(player.view.phase,'answer');audio[2].done();assert.equal(player.view.phase,'partner');
});
test('newer server progress from another tab resumes its current question',()=>{
  const {player,audio}=harness();player.start(round());audio[0].done();
  player.accept({...round(2),question:{partnerRu:'Новая реплика',partnerUz:'Savol',options:[]}},true);
  assert.equal(player.view.phase,'partner');assert.equal(player.view.ready,false);assert.equal(player.view.round!.position,2);assert.equal(audio[1].text,'Новая реплика');
});
