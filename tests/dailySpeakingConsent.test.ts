import test from 'node:test';
import assert from 'node:assert/strict';
import { Capacitor } from '@capacitor/core';
import { checkDailySpeakingTask } from '../src/api/kunlikProgress';

test('daily speaking refusal prevents sending the answer; consent allows checking', async () => {
  const original = { fetch: globalThis.fetch, storage: globalThis.localStorage, native: Capacitor.isNativePlatform, platform: Capacitor.getPlatform };
  let allowed = false, requests = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === 'auth_user' ? '{"id":42}' : allowed ? 'yes' : 'no' } });
  Capacitor.isNativePlatform = () => true; Capacitor.getPlatform = () => 'ios';
  globalThis.fetch = async () => { requests++; return new Response('{}', { status: 200 }); };
  try {
    await assert.rejects(checkDailySpeakingTask('token', 1, 1, 'private answer', 1), /ruxsati o‘chirilgan/);
    assert.equal(requests, 0);
    allowed = true;
    await checkDailySpeakingTask('token', 1, 1, 'answer', 1);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = original.fetch;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original.storage });
    Capacitor.isNativePlatform = original.native; Capacitor.getPlatform = original.platform;
  }
});
