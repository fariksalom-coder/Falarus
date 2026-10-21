import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { APPLE_PRODUCTS, isAppleProductId } from '../shared/appleProducts';

type Transaction = { transactionId: string; productIdentifier: string; purchaseDate: string; expirationDate?: string; revocationDate?: string; isUpgraded?: boolean };
const purchase: Transaction = { transactionId: '123', productIdentifier: 'falarus.premium.three_month',
  purchaseDate: new Date().toISOString(), expirationDate: new Date(Date.now() + 86400_000).toISOString() };

function setup(options: { serverFails?: boolean; purchases?: Transaction[] } = {}) {
  const calls: string[] = []; let sent: Record<string, unknown> = {};
  const native = {
    purchaseProduct: async (settings: Record<string, unknown>) => { calls.push('purchase'); sent = settings; return purchase; },
    acknowledgePurchase: async () => { calls.push('finish'); },
    restorePurchases: async () => { calls.push('restore'); },
    getPurchases: async () => { calls.push('getPurchases'); return { purchases: options.purchases ?? [purchase] }; },
  };
  const mod = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> };
  const source = ts.transpileModule(readFileSync('src/native/applePurchases.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module: mod, exports: mod.exports, Date, Map, Set, Error,
    sessionStorage: { removeItem: () => calls.push('clearAccess') },
    fetch: async (url: string) => {
      if (url.endsWith('/account')) { calls.push('account'); return { ok: true, json: async () => ({ appAccountToken: 'account-uuid' }) }; }
      calls.push('confirm');
      return { ok: !options.serverFails, json: async () => options.serverFails ? { error: 'APPLE_STORE_NOT_CONFIGURED' } : { success: true } };
    },
    require: (id: string) => {
      if (id === '@capgo/native-purchases') return { NativePurchases: native, PURCHASE_TYPE: { SUBS: 'subs', INAPP: 'inapp' } };
      if (id === '../api') return { apiUrl: (value: string) => value };
      if (id === '../../shared/appleProducts') return { APPLE_PRODUCTS, isAppleProductId };
      if (id === './platform') return { isNativeIOS: () => true };
      if (id === '../utils/requestCache') return { invalidateCacheByPrefix: () => calls.push('invalidate') };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  return { api: mod.exports, calls, settings: () => sent };
}

test('Apple purchase verifies with backend before StoreKit finish and uses opaque account token', async () => {
  const fixture = setup();
  await fixture.api.purchaseAppleProduct('token', 'falarus.premium.three_month');
  assert.deepEqual(fixture.calls, ['account', 'purchase', 'confirm', 'invalidate', 'clearAccess', 'finish']);
  assert.equal(fixture.settings().autoAcknowledgePurchases, false);
  assert.equal(fixture.settings().appAccountToken, 'account-uuid');
});

test('server validation failure never finishes purchase and tells user to restore without paying again', async () => {
  const fixture = setup({ serverFails: true });
  await assert.rejects(fixture.api.purchaseAppleProduct('token', 'falarus.premium.three_month'), /Xaridlarni tiklash/);
  assert.ok(!fixture.calls.includes('finish'));
});

test('duplicate StoreKit events share one backend confirmation', async () => {
  const fixture = setup();
  await Promise.all([fixture.api.confirmAppleTransaction('token', purchase), fixture.api.confirmAppleTransaction('token', purchase)]);
  assert.equal(fixture.calls.filter(call => call === 'confirm').length, 1);
});

test('restore syncs first, uses latest active renewal and excludes revoked/expired/unknown purchases', async () => {
  const fixture = setup({ purchases: [
    { ...purchase, transactionId: '122', purchaseDate: '2025-01-01T00:00:00Z' }, purchase,
    { ...purchase, transactionId: 'expired', expirationDate: '2025-01-01T00:00:00Z' },
    { ...purchase, transactionId: 'revoked', revocationDate: new Date().toISOString() },
    { ...purchase, transactionId: 'other', productIdentifier: 'other.product' },
  ] });
  assert.equal(await fixture.api.syncApplePurchases('token', true), 1);
  assert.deepEqual(fixture.calls.slice(0, 3), ['restore', 'getPurchases', 'confirm']);
  assert.equal(fixture.calls.filter(call => call === 'confirm').length, 1);
});
