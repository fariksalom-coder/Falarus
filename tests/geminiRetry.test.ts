import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiError, isRetryableGeminiError } from '../server/lib/gemini';

test('fetch transport timeout is retryable through its nested cause', () => {
  const timeout = Object.assign(new Error('connect timeout'), { code: 'ETIMEDOUT' });
  const fetchError = new TypeError('fetch failed', { cause: new AggregateError([timeout]) });
  assert.equal(isRetryableGeminiError(fetchError), true);
});

test('billing and authentication errors do not consume retries', () => {
  assert.equal(isRetryableGeminiError(new GeminiError('credits depleted', { status: 429, code: 'AI_CREDITS_DEPLETED' })), false);
  assert.equal(isRetryableGeminiError(new GeminiError('invalid key', { status: 403, code: 'AI_CREDENTIAL_EXPIRED' })), false);
  assert.equal(isRetryableGeminiError(new GeminiError('rate limit', { status: 429 })), true);
  assert.equal(isRetryableGeminiError(new GeminiError('bad request', { status: 400 })), false);
});

test('unknown and cyclic error causes terminate without a retry', () => {
  const cyclic = { cause: null };
  cyclic.cause = cyclic;
  assert.equal(isRetryableGeminiError(cyclic), false);
  assert.equal(isRetryableGeminiError(new TypeError('programming error')), false);
});
