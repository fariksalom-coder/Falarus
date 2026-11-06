import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { fetchSessionProfile } from '../src/api/session';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const profile = (id: number) => ({ id, firstName: 'Test', lastName: '', email: null, level: 'A1', onboarded: 0, progress: 0 });

test('session profile requests cannot share native HTTP cache entries', async () => {
  const original = globalThis.fetch;
  const requests: { url: string; options: RequestInit }[] = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options: options! });
    return new Response('{}');
  };
  try {
    await fetchSessionProfile('first'); await fetchSessionProfile('second');
    assert.notEqual(requests[0].url, requests[1].url);
    assert.equal(requests[0].options.cache, 'no-store');
    assert.equal((requests[1].options.headers as Record<string, string>).Authorization, 'Bearer second');
  } finally { globalThis.fetch = original; }
});

test('old profile JSON cannot overwrite a new Apple session or resurrect a logged-out account', async () => {
  const original = { fetch: globalThis.fetch, storage: globalThis.localStorage, window: globalThis.window };
  const data = new Map([['token', 'old'], ['auth_user', JSON.stringify(profile(1))]]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, setTimeout } });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const oldBody = deferred<unknown>();
  const newBody = deferred<unknown>();
  globalThis.fetch = async (_url, options) => ({ ok: true, status: 200, json: () => (options!.headers as any).Authorization === 'Bearer old' ? oldBody.promise : newBody.promise }) as Response;
  let auth!: ReturnType<typeof useAuth>;
  function Probe() { auth = useAuth(); return null; }
  let renderer: ReturnType<typeof create>;
  try {
    await act(async () => { renderer = create(React.createElement(AuthProvider, null, React.createElement(Probe))); });
    await act(async () => { auth.login('apple-new', profile(2)); });
    await act(async () => { oldBody.resolve(profile(1)); });
    assert.equal(auth.user?.id, 2);
    assert.equal(data.get('token'), 'apple-new');
    await act(async () => { auth.logout(); });
    await act(async () => { newBody.resolve(profile(2)); });
    assert.equal(auth.user, null);
    assert.equal(data.has('auth_user'), false);
  } finally {
    await act(async () => { renderer?.unmount(); });
    globalThis.fetch = original.fetch;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original.storage });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: original.window });
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  }
});
