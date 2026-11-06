import test from 'node:test';
import assert from 'node:assert/strict';

/* Brauzer muhitining minimal o'rnini bosuvchilari (Node'da localStorage va navigator yo'q). */
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  },
});
let online = false;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { get onLine() { return online; } } });
store.set('auth_user', JSON.stringify({ id: 42 }));

const { sendOrQueue, pendingOutbox, pendingOptimisticPatches, flushOutbox } = await import('../src/offline/outbox');
const { deferAiSteps, aiDebtDays, saveDayBundle, loadDayBundle } = await import('../src/offline/courseCache');

test('offline writes are queued in order with their optimistic progress', async () => {
  online = false;
  assert.equal(await sendOrQueue('t', 'POST', '/api/kunlik-progress/3/phrases/start', {}), null);
  await sendOrQueue('t', 'POST', '/api/kunlik-progress/3/phrases/answer', { phraseId: 1, choice: 2 });
  await sendOrQueue('t', 'POST', '/api/kunlik-progress/3/phrases/finish', {}, {
    day: 3,
    optimistic: { phrases_done: true, phrases_correct: 1 },
  });
  assert.deepEqual(
    pendingOutbox().map((i) => i.path.split('/').pop()),
    ['start', 'answer', 'finish'],
  );
  assert.deepEqual(pendingOptimisticPatches(), [{ day: 3, patch: { phrases_done: true, phrases_correct: 1 } }]);
});

test('flush replays in order, stops on a network error and drops rejected requests', async () => {
  online = true;
  const seen: string[] = [];
  let failNext = true;
  globalThis.fetch = (async (url: string) => {
    seen.push(String(url).split('/').pop()!);
    if (failNext) {
      failNext = false;
      throw new TypeError('Failed to fetch');
    }
    // The answer is rejected (e.g. day locked) — it must not block the queue.
    return new Response('{}', { status: String(url).endsWith('/answer') ? 403 : 200 });
  }) as typeof fetch;

  await flushOutbox('t');
  assert.equal(pendingOutbox().length, 3, 'network failure keeps everything');
  await flushOutbox('t');
  assert.deepEqual(seen, ['start', 'start', 'answer', 'finish']);
  assert.equal(pendingOutbox().length, 0);
});

test('a new write waits behind older queued writes', async () => {
  online = false;
  await sendOrQueue('t', 'PATCH', '/api/kunlik-progress/4', { grammar_1: true }, { day: 4, optimistic: { grammar_1: true } });
  online = true;
  globalThis.fetch = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  // Server still unreachable: the second write must queue, not overtake the first.
  assert.equal(await sendOrQueue('t', 'PATCH', '/api/kunlik-progress/4', { grammar_2: true }, { day: 4 }), null);
  assert.equal(pendingOutbox().length, 2);
  store.delete('falarus:outbox:v1:42');
});

test('day content and AI debt are kept per user', () => {
  saveDayBundle(5, { dayNumber: 5 } as never);
  assert.equal((loadDayBundle(5)?.bundle as unknown as { dayNumber: number }).dayNumber, 5);
  deferAiSteps(5);
  assert.ok(aiDebtDays().has(5));
  store.set('auth_user', JSON.stringify({ id: 7 }));
  assert.equal(loadDayBundle(5), null, 'another account does not see it');
  assert.equal(aiDebtDays().has(5), false);
  store.set('auth_user', JSON.stringify({ id: 42 }));
});
