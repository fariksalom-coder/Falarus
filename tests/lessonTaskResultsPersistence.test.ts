import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLessonTaskResult,
  setLessonTaskResult,
} from '../src/utils/lessonTaskResults.ts';

type StorageShape = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function createStorage(): StorageShape {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
  };
}

test('setLessonTaskResult saves locally and posts to lesson-task-results API when token exists', async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = (globalThis as typeof globalThis & { localStorage?: StorageShape }).localStorage;
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const originalCustomEvent = globalThis.CustomEvent;

  const storage = createStorage();
  const events: Array<{ type: string; detail?: unknown }> = [];
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { origin: 'https://www.falarus.uz' },
      dispatchEvent(event: { type: string; detail?: unknown }) {
        events.push(event);
        return true;
      },
    },
  });
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: class CustomEventShim<T> {
      type: string;
      detail?: T;

      constructor(type: string, init?: { detail?: T }) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  storage.setItem('token', 'test-token');

  /* 1-dars vazifa 1: joriy tanlovlar soni bilan mos total (aks holda eski sxema deb filtrlanadi) */
  setLessonTaskResult('/lesson-1', 1, 13, 18);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(getLessonTaskResult('/lesson-1', 1), { correct: 13, total: 18 });
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.input, '/api/lesson-task-results');
  assert.equal(fetchCalls[0]?.init?.method, 'POST');
  assert.match(String(fetchCalls[0]?.init?.headers && (fetchCalls[0]?.init?.headers as Record<string, string>).Authorization), /^Bearer /);
  assert.equal(events[0]?.type, 'lesson-task-saved');

  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
  }
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  }
  if (originalCustomEvent) {
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      value: originalCustomEvent,
    });
  }
});
