import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureInitialized } from '../src/hooks/useGoogleSignIn.ts';

test('Google Identity initializes once and forwards credentials to the latest handler', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let initializeCalls = 0;
  let callback: ((response: { credential?: string }) => void) | undefined;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      google: {
        accounts: {
          id: {
            initialize(config: { callback: (response: { credential?: string }) => void }) {
              initializeCalls += 1;
              callback = config.callback;
            },
          },
        },
      },
    },
  });

  try {
    const staleHandler: string[] = [];
    const activeHandler: string[] = [];
    ensureInitialized('test-client-id', (token) => staleHandler.push(token));
    ensureInitialized('test-client-id', (token) => activeHandler.push(token));

    assert.equal(initializeCalls, 1);
    callback?.({ credential: 'google-id-token' });
    assert.deepEqual(staleHandler, []);
    assert.deepEqual(activeHandler, ['google-id-token']);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete (globalThis as { window?: unknown }).window;
  }
});
