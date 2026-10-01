import test from 'node:test';
import assert from 'node:assert/strict';
import { multicardFetch } from '../shared/multicardPayments';

test('Multicard retries only a pre-request connection timeout, at most once', async () => {
  const original = globalThis.fetch;
  const failure = (code: string) => new TypeError('fetch failed', { cause: { code } });
  try {
    let calls = 0;
    globalThis.fetch = async () => {
      if (++calls === 1) throw failure('UND_ERR_CONNECT_TIMEOUT');
      return new Response('{}', { status: 200 });
    };
    assert.equal((await multicardFetch('https://provider.invalid/invoice', { method: 'POST', body: '{}' })).status, 200);
    assert.equal(calls, 2);
    calls = 0;
    globalThis.fetch = async () => { calls++; throw failure('UND_ERR_CONNECT_TIMEOUT'); };
    await assert.rejects(multicardFetch('https://provider.invalid/invoice', {}), /UND_ERR_CONNECT_TIMEOUT/);
    assert.equal(calls, 2);
    for (const code of ['ECONNRESET', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT', 'ENOTFOUND']) {
      calls = 0;
      globalThis.fetch = async () => { calls++; throw failure(code); };
      await assert.rejects(multicardFetch('https://provider.invalid/invoice', {}), new RegExp(code));
      assert.equal(calls, 1);
    }
    calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('{}', { status: 503 }); };
    assert.equal((await multicardFetch('https://provider.invalid/invoice', {})).status, 503);
    assert.equal(calls, 1);
    calls = 0;
    const controller = new AbortController(); controller.abort();
    globalThis.fetch = async () => { calls++; throw failure('UND_ERR_CONNECT_TIMEOUT'); };
    await assert.rejects(multicardFetch('https://provider.invalid/invoice', { signal: controller.signal }));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
