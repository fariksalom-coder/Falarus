import test from 'node:test';
import assert from 'node:assert/strict';
import {DialogueSpeechQueue,splitDialogueSpeech} from '../src/utils/dialogueSpeech';
import {speakText,stopSpeaking} from '../src/utils/speak';
test('speech splits long lines without exceeding the server 200-character limit',()=>{
  const text='Здравствуйте! Я хочу узнать, где находится метро. '.repeat(12).trim();
  const pieces=splitDialogueSpeech(text);assert.ok(pieces.length>1);assert.ok(pieces.every(p=>p.length<=200));assert.equal(pieces.join(' '),text);
  assert.deepEqual(splitDialogueSpeech('   '),[]);assert.ok(splitDialogueSpeech('я'.repeat(500)).every(p=>p.length<=200));
});
test('partner, correct answer and next partner play sequentially; cancellation ignores stale callbacks',()=>{
  const played:string[]=[],callbacks:{done:()=>void;fail:()=>void}[]=[];let stopped=0,errors=0;
  const queue=new DialogueSpeechQueue((text,done,fail)=>{played.push(text);callbacks.push({done,fail});},()=>stopped++,()=>errors++);
  queue.enqueue('Здравствуйте!');queue.enqueue('Да, я ищу метро.');queue.enqueue('Идите прямо.');
  assert.deepEqual(played,['Здравствуйте!']);callbacks[0].done();assert.equal(played[1],'Да, я ищу метро.');
  callbacks[0].done();assert.equal(played.length,2);callbacks[1].done();assert.equal(played[2],'Идите прямо.');
  queue.clear();queue.enqueue('Новый диалог');callbacks[2].done();assert.equal(played.length,4);assert.equal(stopped,1);
  queue.enqueue('Следующая реплика');callbacks[3].fail();assert.equal(errors,1);assert.equal(played[4],'Следующая реплика');
});
test('server audio reports autoplay restriction, resumes on a gesture and ignores cancelled playback',async(t)=>{
  const global=globalThis as any;
  const old={fetch:global.fetch,window:global.window,Audio:global.Audio};
  const events=new EventTarget();const players:any[]=[];let rejectPlay=true,started=0,blocked=0,ended=0,failed=0;
  class AudioMock {
    onended?:()=>void;onerror?:()=>void;currentTime=0;preload='';paused=false;
    constructor(public src:string){players.push(this);}
    pause(){this.paused=true;}
    async play(){if(rejectPlay){rejectPlay=false;throw new Error('Autoplay blocked');}}
  }
  global.window=events;global.Audio=AudioMock;
  global.fetch=async()=>new Response(new Blob(['audio']),{headers:{'Content-Type':'audio/mpeg'}});
  t.after(()=>{stopSpeaking();global.fetch=old.fetch;if(old.window===undefined)delete global.window;else global.window=old.window;if(old.Audio===undefined)delete global.Audio;else global.Audio=old.Audio;});
  await speakText('Здравствуйте, проверка звука.',{token:'test',zaxira:false,onAutoplayBlocked:()=>blocked++,onStart:()=>started++,onEnd:()=>ended++,onError:()=>failed++});
  assert.equal(blocked,1);assert.equal(started,0);
  events.dispatchEvent(new Event('pointerdown'));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(started,1);players[0].onended();assert.equal(ended,1);
  await speakText('Другой диалог.',{token:'test',zaxira:false,onEnd:()=>ended++});stopSpeaking();players[1].onended();assert.equal(ended,1);assert.equal(players[1].paused,true);
  global.fetch=async()=>new Response('{}',{status:503});
  await speakText('Сервис временно недоступен.',{token:'test',zaxira:false,onEnd:()=>ended++,onError:()=>failed++});
  assert.equal(failed,1);assert.equal(ended,1);
});
