import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceRequest } from '../src/utils/voiceRequest';
import { resumeAudio } from '../src/utils/resumeAudio';
import { microphoneError } from '../src/utils/microphoneError';

test('native fetch ignoring abort still times out, without a duplicate AI request', async () => {
  const original = globalThis.fetch;
  let count = 0;
  let signal: AbortSignal | undefined;
  globalThis.fetch = async (_url, init) => { count++; signal = init?.signal as AbortSignal; return new Promise<Response>(() => {}); };
  try {
    await assert.rejects(voiceRequest('/voice', { method: 'POST' }, 10), /Javob kelmadi/);
    assert.equal(count, 1);
    assert.equal(signal?.aborted, true);
  } finally { globalThis.fetch = original; }
});

test('timeout includes a stalled response body; API errors remain readable', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: () => new Promise<Response>(() => {}) }) as Response;
    await assert.rejects(voiceRequest('/voice', {}, 10), /Javob kelmadi/);
    globalThis.fetch = async () => new Response('{"error":"Obuna kerak"}', { status: 403 });
    await assert.rejects(voiceRequest('/voice', {}), /Obuna kerak/);
    globalThis.fetch = async () => new Response('{"text":"Привет"}');
    assert.deepEqual(await voiceRequest('/voice', {}), { text: 'Привет' });
  } finally { globalThis.fetch = original; }
});

test('cancelled request never waits for ignored native abort', async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  globalThis.fetch = async () => new Promise<Response>(() => {});
  try {
    const result = voiceRequest('/voice', { signal: controller.signal });
    controller.abort();
    await assert.rejects(result, { name: 'AbortError' });
  } finally { globalThis.fetch = original; }
});

test('Safari audio resume cannot keep the conversation loading forever', async () => {
  const stalled = { state: 'suspended', resume: () => new Promise<Response>(() => {}) } as unknown as AudioContext;
  await assert.rejects(resumeAudio(stalled, 10), /Ovoz ochilmadi/);
  const interrupted = { state: 'interrupted', resume: async () => { interrupted.state = 'running'; } };
  await resumeAudio(interrupted as unknown as AudioContext);
  assert.equal(interrupted.state, 'running');
});

test('microphone permission, missing input and busy input are distinguished', () => {
  assert.match(microphoneError({ name: 'NotAllowedError' }), /ruxsat berilmadi/);
  assert.match(microphoneError({ name: 'NotFoundError' }), /topilmadi/);
  assert.match(microphoneError({ name: 'NotReadableError' }), /boshqa dastur/);
});
