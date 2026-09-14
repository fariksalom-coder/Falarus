import test from 'node:test';
import assert from 'node:assert/strict';
import { ConversationMicGate, acquireConversationAudio, isConversationAudioActive, subscribeConversationAudio } from '../src/utils/conversationAudio';

test('speaker audio and acoustic tail are never sent as microphone speech', () => {
  const gate = new ConversationMicGate();
  const speech = Buffer.from(new Int16Array(1600).fill(12000).buffer).toString('base64');
  assert.equal(gate.filter(speech, false, 0), speech);
  for (const time of [100, 200, 900]) {
    const silence = Buffer.from(gate.filter(speech, true, time), 'base64');
    assert.equal(silence.length, 3200);
    assert.ok(silence.every(byte => byte === 0));
  }
  assert.notEqual(gate.filter(speech, false, 1299), speech);
  assert.equal(gate.filter(speech, false, 1300), speech);
});
test('overlapping lessons keep sounds muted until the last owner leaves', () => {
  let changes = 0;
  const unsubscribe = subscribeConversationAudio(() => changes++);
  const first = acquireConversationAudio();
  const second = acquireConversationAudio();
  assert.equal(isConversationAudioActive(), true);
  first(); first();
  assert.equal(isConversationAudioActive(), true);
  second();
  assert.equal(isConversationAudioActive(), false);
  assert.equal(changes, 4);
  unsubscribe();
});

test('feedback sounds never open audio during a spoken lesson', async () => {
  const { playCorrectSound, playWrongSound, playFlipSound } = await import('../src/utils/sound');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let opened = 0;
  class FakeAudioContext { constructor() { opened++; throw new Error('test audio device'); } }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: FakeAudioContext } });
  const release = acquireConversationAudio();
  try {
    playCorrectSound(); playWrongSound(); playFlipSound();
    assert.equal(opened, 0);
    release();
    playFlipSound();
    assert.equal(opened, 1);
  } finally {
    release();
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
