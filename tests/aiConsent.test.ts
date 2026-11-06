import test from 'node:test';
import assert from 'node:assert/strict';
import { Capacitor } from '@capacitor/core';
import { requireAIConsent, revokeAIConsent } from '../src/utils/aiConsent';

test('AI choice survives re-login, isolates accounts and remembers refusal until settings change', async () => {
  const originals = { storage: globalThis.localStorage, document: globalThis.document, native: Capacitor.isNativePlatform, platform: Capacitor.getPlatform };
  const data = new Map<string, string>();
  let dialogs = 0;
  let buttons: { textContent?: string; onclick?: () => void }[] = [];
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  }});
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    body: { append() {} },
    createElement(tag: string) {
      const element = { onclick: undefined as (() => void) | undefined, textContent: '', setAttribute() {}, append() {}, addEventListener() {}, showModal() { dialogs++; }, close() {}, remove() {} };
      if (tag === 'button') buttons.push(element);
      return element;
    },
  }});
  Capacitor.isNativePlatform = () => true;
  Capacitor.getPlatform = () => 'ios';
  try {
    data.set('auth_user', JSON.stringify({ id: 1 }));
    const first = requireAIConsent();
    buttons[1].onclick!();
    await first;
    data.delete('auth_user');
    data.set('auth_user', JSON.stringify({ id: 1 }));
    await requireAIConsent();
    assert.equal(dialogs, 1);
    data.set('auth_user', JSON.stringify({ id: 2 }));
    buttons = [];
    const other = requireAIConsent();
    const refused = assert.rejects(other, /ruxsat berilmadi/);
    buttons[0].onclick!();
    await refused;
    await assert.rejects(requireAIConsent(), /Profil sozlamalaridan/);
    assert.equal(dialogs, 2);
    buttons = [];
    const settings = requireAIConsent(true);
    buttons[1].onclick!();
    await settings;
    revokeAIConsent();
    await assert.rejects(requireAIConsent(), /Profil sozlamalaridan/);
    data.set('auth_user', JSON.stringify({ id: 1 }));
    await requireAIConsent();
    assert.equal(dialogs, 3);
  } finally {
    Capacitor.isNativePlatform = originals.native;
    Capacitor.getPlatform = originals.platform;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originals.storage });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: originals.document });
  }
});
