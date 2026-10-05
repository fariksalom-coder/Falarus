// Creates only a temporary test account; deletes it and its cascading game data.
// Run on the application host after deployment. Never prints tokens or credentials.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import {execFileSync} from 'node:child_process';
const database=new pg.Client({connectionString:process.env.DATABASE_URL});
const base=process.env.DIALOGUE_SMOKE_URL||'http://127.0.0.1:3001';
let user;
await database.connect();
try {
  const anonymous=await fetch(`${base}/api/games/dialogue/catalog`);
  assert.equal(anonymous.status,401);
  user=(await database.query('INSERT INTO users(first_name,email,password,is_golden) VALUES($1,$2,$3,true) RETURNING id',['Dialogue smoke',`dialogue-smoke-${randomUUID()}@example.invalid`,randomUUID()])).rows[0].id;
  const token=jwt.sign({id:user},process.env.JWT_SECRET,{expiresIn:'5m',algorithm:'HS256'});
  const call=async(path,body,status=200)=>{
    const response=await fetch(`${base}/api/games/dialogue${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    assert.equal(response.status,status,`Unexpected status for ${path}`);
    return response.json();
  };
  const catalog=await call('/catalog');assert.equal(catalog.topics.length,11);
  assert.equal(catalog.topics.reduce((n,t)=>n+t.situations.length,0),88);
  assert.ok(!JSON.stringify(catalog).includes('correct'));
  await call('/sessions',{situationId:'street-01',requestId:'invalid'},400);
  const requestId=randomUUID();let round=await call('/sessions',{situationId:'street-01',requestId});
  assert.equal((await call('/sessions',{situationId:'street-01',requestId})).id,round.id);
  assert.equal((await call('/sessions',{situationId:'street-01',requestId:randomUUID()})).id,round.id);
  const content=(await database.query('SELECT content FROM dialogue_situations WHERE id=$1',['street-01'])).rows[0].content;
  const voices=[];
  for(const [text,voice] of [[content.steps[0].partnerRu,'dialogue-female'],[content.steps[0].correct,'dialogue-male']]){
    const response=await fetch(`${base}/api/tts?text=${encodeURIComponent(text)}&speed=1&ohang=${voice}`,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(response.status,200,'Server speech unavailable');assert.ok(response.headers.get('content-type')?.startsWith('audio/'));
    const audio=Buffer.from(await response.arrayBuffer());assert.ok(audio.length>1000);
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,codec_type','-of','json','pipe:0'],{input:audio,timeout:10000}).toString());
    assert.ok(probe.streams.some(s=>s.codec_type==='audio'));
    voices.push({voice,bytes:audio.length,mime:response.headers.get('content-type'),cache:response.headers.get('x-tts-cache')});
  }
  console.log(JSON.stringify({dialogueSpeech:voices}));
  let previous;
  while(!round.finished){
    const option=round.question.options.find(o=>o.text===content.steps[round.position].correct);
    const body={position:round.position,optionId:option.id,requestId:randomUUID(),stars:999};
    previous=await call(`/sessions/${round.id}/answer`,body);
    assert.deepEqual(await call(`/sessions/${round.id}/answer`,body),previous);
    round=previous.round;
  }
  assert.equal(round.stars,3);assert.equal(round.earned,3);assert.equal(previous.totalStars,3);
  const after=await call('/catalog');assert.deepEqual(after.completed,['street-01']);assert.equal(after.stars,3);
  console.log(JSON.stringify({anonymous:401,topics:catalog.topics.length,situations:88,completed:1,stars:3,replay:'passed',resume:'passed'}));
} finally {
  if(user) {
    // Touch timestamps written by authentication are stored in the user record.
    await database.query('DELETE FROM users WHERE id=$1 AND email LIKE $2',[user,'dialogue-smoke-%@example.invalid']);
    console.log('Temporary smoke account removed.');
  }
  await database.end();
}
