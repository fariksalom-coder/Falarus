import test from 'node:test';
import assert from 'node:assert/strict';
import { isObjectionableCommunityText } from '../shared/communityContent';
import { sendSavolJavobMessage, sendSavolJavobMedia, uploadReel, addReelComment } from '../src/api/communityChat';
import { sendChatMessage } from '../src/api/partner';

test('text checks reject clear abuse, case changes and invisible-character evasion; lessons remain allowed', () => {
  for (const text of ['FUCK YOU!', 'fu\u200bck you', 'Иди НАХУЙ!', 'блядь', 'https://pornhub.com', 'BUY COCAINE']) assert.equal(isObjectionableCommunityText(text), true, text);
  for (const text of ['', 'Salom! Darsni birga qilamizmi?', 'Меня зовут Али.', 'Здоровье — это важно.', 'Thank you for helping me study.', 'My mother is a teacher.', 'Мы изучаем иностранный язык.']) assert.equal(isObjectionableCommunityText(text), false, text);
});

test('all public outgoing text surfaces are stopped before an HTTP request or media upload', async () => {
  const original = globalThis.fetch; let requests = 0;
  globalThis.fetch = async () => { requests++; return new Response('{}'); };
  try {
    for (const action of [
      () => sendSavolJavobMessage('token', 'fuck you'),
      () => sendSavolJavobMedia('token', {kind: 'image', file: new Blob(), fileName: 'photo.png', content: 'fuck you'}),
      () => uploadReel('token', {file: new Blob(), fileName: 'video.mp4', caption: 'fuck you'}),
      () => addReelComment('token', 1, 'fuck you'),
      () => sendChatMessage('token', 1, 'fuck you'),
    ]) await assert.rejects(action(), /nomaqbul/);
    assert.equal(requests, 0);
    await sendSavolJavobMessage('token', 'Salom');
    assert.equal(requests, 1);
  } finally { globalThis.fetch = original; }
});
