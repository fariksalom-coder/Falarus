import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
test('server requests distinct native Russian voices and caches each separately',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'dialogue-voices-'));
  const keys=['TTS_CACHE_DIR','OPENAI_API_KEY','OPENAI_TTS_MODEL'] as const;
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const originalFetch=globalThis.fetch;
  const requests:any[]=[];
  try {
    process.env.TTS_CACHE_DIR=dir;process.env.OPENAI_API_KEY='test-only';process.env.OPENAI_TTS_MODEL='gpt-4o-mini-tts';
    globalThis.fetch=(async(_url:any,options:any)=>{const body=JSON.parse(options.body);requests.push(body);return new Response(Buffer.from(body.voice),{headers:{'Content-Type':'audio/mpeg'}});}) as any;
    const {speak}=await import('../server/services/tts.service');
    const female=await speak('Здравствуйте!',{ohang:'dialogue-female',speed:1});
    const male=await speak('Здравствуйте!',{ohang:'dialogue-male',speed:1});
    assert.deepEqual(requests.map(r=>r.voice),['nova','onyx']);assert.notDeepEqual(female.audio,male.audio);
    assert.ok(requests.every(r=>r.instructions.includes('native Russian speaker')));
    const again=await speak('Здравствуйте!',{ohang:'dialogue-female',speed:1});assert.equal(again.cached,true);assert.deepEqual(again.audio,female.audio);assert.equal(requests.length,2);
  } finally {
    globalThis.fetch=originalFetch;for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}await rm(dir,{recursive:true,force:true});
  }
});
