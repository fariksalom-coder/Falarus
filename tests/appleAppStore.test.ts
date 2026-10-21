import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { mkdtemp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Pool } from 'pg';
import { createPostgresFacade } from '../server/lib/postgresFacade';
import { consumeAppleChallenge, encryptAppleToken, decryptAppleToken } from '../server/services/appleSignIn.service';
import { appleAccountToken, validateAppleTransaction, type AppleTransaction } from '../server/services/appleStore.service';
import { deleteAccount, purgeAccountFiles, ownedAccountDirectories } from '../server/services/accountDeletion.service';
import { appleProductId } from '../shared/appleProducts';
import type { DbClient } from '../server/types/dbClient';
import { createHash } from 'node:crypto';

const valid: AppleTransaction = { bundleId: 'com.flarus.app', productId: 'falarus.premium.three_month',
  transactionId: '123', originalTransactionId: '100', type: 'Auto-Renewable Subscription',
  environment: 'Production', expiresDate: Date.now() + 86_400_000 };

test('Apple verification rejects wrong app/product/id, expired, revoked and sandbox purchases', () => {
  const previousBundle = process.env.APPLE_BUNDLE_ID;
  const sandbox = process.env.APPLE_ALLOW_SANDBOX_PURCHASES;
  process.env.APPLE_BUNDLE_ID = 'com.flarus.app';
  delete process.env.APPLE_ALLOW_SANDBOX_PURCHASES;
  try {
    assert.doesNotThrow(() => validateAppleTransaction(valid, 'falarus.premium.three_month', '123'));
    for (const patch of [{ bundleId: 'other.app' }, { productId: 'falarus.vnzh' }, { transactionId: '999' },
      { originalTransactionId: '' }, { expiresDate: Date.now() - 1 }, { expiresDate: undefined },
      { revocationDate: Date.now() }, { isUpgraded: true }, { environment: 'Sandbox' }, { environment: 'Xcode' }, { type: 'Consumable' }]) {
      assert.throws(() => validateAppleTransaction({ ...valid, ...patch }, 'falarus.premium.three_month', '123'));
    }
    process.env.APPLE_ALLOW_SANDBOX_PURCHASES = 'true';
    assert.doesNotThrow(() => validateAppleTransaction({ ...valid, environment: 'Sandbox' }, 'falarus.premium.three_month', '123'));
    const oneTime = { ...valid, productId: 'falarus.vnzh', type: 'Non-Consumable', expiresDate: undefined };
    assert.doesNotThrow(() => validateAppleTransaction(oneTime, 'falarus.vnzh', '123'));
    assert.throws(() => validateAppleTransaction({ ...oneTime, type: 'Consumable' }, 'falarus.vnzh', '123'));
  } finally {
    if (previousBundle === undefined) delete process.env.APPLE_BUNDLE_ID; else process.env.APPLE_BUNDLE_ID = previousBundle;
    if (sandbox === undefined) delete process.env.APPLE_ALLOW_SANDBOX_PURCHASES; else process.env.APPLE_ALLOW_SANDBOX_PURCHASES = sandbox;
  }
});

test('Apple account token is stable, opaque, distinct and a StoreKit-compatible UUID', () => {
  const key = process.env.APPLE_ACCOUNT_TOKEN_SECRET;
  process.env.APPLE_ACCOUNT_TOKEN_SECRET = 'a'.repeat(64);
  try {
    assert.equal(appleAccountToken(123), appleAccountToken(123));
    assert.notEqual(appleAccountToken(123), appleAccountToken(124));
    assert.match(appleAccountToken(123), /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/);
    assert.throws(() => appleAccountToken(0));
    assert.equal(appleProductId('russian', 'month'), 'falarus.premium.monthly');
    assert.equal(appleProductId('russian', 'six_month'), 'falarus.premium.six_month');
    assert.equal(appleProductId('teacher_trial'), null);
  } finally { if (key === undefined) delete process.env.APPLE_ACCOUNT_TOKEN_SECRET; else process.env.APPLE_ACCOUNT_TOKEN_SECRET = key; }
});

test('Apple refresh token encryption detects tampering and never stores plaintext', () => {
  const key = process.env.APPLE_TOKEN_ENCRYPTION_KEY;
  process.env.APPLE_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
  try {
    const encrypted = encryptAppleToken('test-refresh-token');
    assert.equal(decryptAppleToken(encrypted), 'test-refresh-token');
    assert.notEqual(encryptAppleToken('test-refresh-token'), encrypted);
    assert.ok(!encrypted.includes('test-refresh-token'));
    const tampered = Buffer.from(encrypted, 'base64'); tampered[28] ^= 1;
    assert.throws(() => decryptAppleToken(tampered.toString('base64')));
    process.env.APPLE_TOKEN_ENCRYPTION_KEY = 'bad';
    assert.throws(() => encryptAppleToken('test-refresh-token'));
  } finally { if (key === undefined) delete process.env.APPLE_TOKEN_ENCRYPTION_KEY; else process.env.APPLE_TOKEN_ENCRYPTION_KEY = key; }
});

async function fixture() {
  const database = await PGlite.create();
  await database.exec(`CREATE TABLE users(id bigint PRIMARY KEY);
    CREATE TABLE user_oauth_identities(user_id bigint REFERENCES users(id) ON DELETE CASCADE, provider text, provider_user_id text);
    CREATE TABLE payments(id bigint PRIMARY KEY, user_id bigint REFERENCES users(id) ON DELETE CASCADE, payment_proof_url text, payment_channel text);
    CREATE TABLE progress(user_id bigint REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE users_total_points_backup_20260801(user_id bigint);
    INSERT INTO users VALUES(1),(2); INSERT INTO progress VALUES(1),(2);
    INSERT INTO users_total_points_backup_20260801 VALUES(1),(2);`);
  await database.exec(await readFile('db/migrations/204_apple_app_store.sql', 'utf8'));
  const facade = createPostgresFacade({ query: (sql: string, args?: unknown[]) => database.query(sql, args) } as unknown as Pool) as unknown as DbClient;
  return { database, facade };
}

test('Apple challenges are single-use, expire, and survive concurrent replay attempts safely', async () => {
  const { database, facade } = await fixture();
  try {
    const nonce = 'a'.repeat(64); const hash = createHash('sha256').update(nonce).digest('hex');
    await database.query('INSERT INTO apple_auth_challenges VALUES($1,now()+interval \'1 minute\')', [hash]);
    const results = await Promise.allSettled([consumeAppleChallenge(facade, nonce), consumeAppleChallenge(facade, nonce)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    await assert.rejects(consumeAppleChallenge(facade, nonce));
    await database.query('INSERT INTO apple_auth_challenges VALUES($1,now()-interval \'1 minute\')', [hash]);
    await assert.rejects(consumeAppleChallenge(facade, nonce));
    await assert.rejects(consumeAppleChallenge(facade, 'invalid'));
  } finally { await database.close(); }
});

test('account deletion cascades, retains anonymous purchase ownership and removes only owned files', async () => {
  const { database, facade } = await fixture();
  const root = await mkdtemp(path.join(tmpdir(), 'falarus-deletion-test-'));
  try {
    await database.exec(`INSERT INTO store_purchase_ownership VALUES('app_store','100',1);
      INSERT INTO payments VALUES(10,1,'store:app_store:123:falarus.vnzh','app_store');`);
    for (const user of [1, 2]) for (const dir of ownedAccountDirectories(user, ['savol_javob'])) {
      await mkdir(path.join(root, dir), { recursive: true }); await writeFile(path.join(root, dir, 'file.jpg'), 'fixture');
    }
    await deleteAccount(facade, root, 1);
    assert.equal((await database.query('SELECT * FROM users WHERE id=1')).rows.length, 0);
    assert.equal((await database.query('SELECT * FROM progress WHERE user_id=1')).rows.length, 0);
    assert.equal((await database.query('SELECT * FROM payments WHERE user_id=1')).rows.length, 0);
    assert.equal((await database.query('SELECT * FROM users_total_points_backup_20260801 WHERE user_id=1')).rows.length, 0);
    assert.equal((await database.query<{ user_id: number | null }>('SELECT user_id FROM store_purchase_ownership')).rows[0].user_id, null);
    assert.equal((await database.query('SELECT * FROM account_file_deletion_jobs')).rows.length, 0);
    for (const dir of ownedAccountDirectories(1, ['savol_javob'])) await assert.rejects(access(path.join(root, dir)));
    for (const dir of ownedAccountDirectories(2, ['savol_javob'])) await access(path.join(root, dir, 'file.jpg'));
    await purgeAccountFiles(root, 1); // retry is idempotent
    assert.throws(() => ownedAccountDirectories(-1, []));
    assert.throws(() => ownedAccountDirectories(1, ['../escape']));
  } finally { await database.close(); await rm(root, { recursive: true, force: true }); }
});

test('failed DB deletion rolls back cleanup job, legacy Apple grant requires reauthentication', async () => {
  const { database, facade } = await fixture();
  const root = await mkdtemp(path.join(tmpdir(), 'falarus-deletion-rollback-'));
  try {
    await database.exec('CREATE TABLE restricted(user_id bigint REFERENCES users(id)); INSERT INTO restricted VALUES(1);');
    await assert.rejects(deleteAccount(facade, root, 1));
    assert.equal((await database.query('SELECT * FROM users WHERE id=1')).rows.length, 1);
    assert.equal((await database.query('SELECT * FROM account_file_deletion_jobs')).rows.length, 0);
    await database.exec("INSERT INTO user_oauth_identities(user_id,provider,provider_user_id) VALUES(2,'apple','apple-sub');");
    await assert.rejects(deleteAccount(facade, root, 2), /Apple orqali qayta kiring/);
    assert.equal((await database.query('SELECT * FROM users WHERE id=2')).rows.length, 1);
  } finally { await database.close(); await rm(root, { recursive: true, force: true }); }
});

import { confirmAppleStorePurchase } from '../server/services/appleStore.service';
import { applyAppleSnapshot, appleSnapshotExpiry } from '../server/services/appleReconciliation.service';
import { hasActiveAccess } from '../server/services/subscription.service';

test('server confirmation is atomic and idempotent; same receipt cannot unlock another account', async () => {
  const db = await PGlite.create();
  await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY, plan_name text, plan_expires_at timestamptz);
    CREATE TABLE user_oauth_identities(user_id bigint REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE payments(id bigserial PRIMARY KEY, user_id bigint REFERENCES users(id) ON DELETE CASCADE,
      product_code text, tariff_type text, currency text, amount numeric, base_amount numeric, discount_amount numeric,
      payment_proof_url text, payment_time timestamptz, status text, approved_at timestamptz, payment_channel text, discount_meta jsonb);
    CREATE TABLE subscriptions(id bigserial PRIMARY KEY,user_id bigint REFERENCES users(id) ON DELETE CASCADE,
      plan_type text,started_at timestamptz,expires_at timestamptz,status text,auto_payment_enabled boolean,
      next_payment_date timestamptz,card_token_id bigint,auto_payment_retry_count int,auto_payment_last_error text);
    INSERT INTO users(id) VALUES(1),(2);`);
  await db.exec(await readFile('db/migrations/204_apple_app_store.sql', 'utf8'));
  await db.exec(await readFile('db/migrations/205_apple_reconciliation.sql', 'utf8'));
  const adapter = { connect: async () => ({
    query: (sql: string, args?: unknown[]) => sql.includes('pg_advisory_xact_lock')
      ? Promise.resolve({ rows: [] }) : db.query(sql, args), release: () => undefined,
  }) } as unknown as Pool;
  const key = process.env.APPLE_ACCOUNT_TOKEN_SECRET;
  process.env.APPLE_ACCOUNT_TOKEN_SECRET = 'a'.repeat(64);
  try {
    const receipt = { ...valid, appAccountToken: appleAccountToken(1) };
    const body = { store_product_id: 'falarus.premium.three_month', product_code: 'russian', tariff_type: 'three_month', purchase_id: '123' };
    const dependencies = { databasePool: adapter, getTransaction: async () => receipt };
    await confirmAppleStorePurchase(1, body, dependencies);
    await confirmAppleStorePurchase(1, body, dependencies);
    assert.equal((await db.query('SELECT * FROM payments')).rows.length, 1);
    assert.equal((await db.query('SELECT * FROM subscriptions')).rows.length, 1);
    assert.equal(new Date((await db.query<{ plan_expires_at: string }>('SELECT plan_expires_at FROM users WHERE id=1')).rows[0].plan_expires_at).getTime(), receipt.expiresDate);
    await assert.rejects(confirmAppleStorePurchase(2, body, dependencies), /OWNED_BY_ANOTHER_ACCOUNT/);
    assert.equal((await db.query('SELECT * FROM payments WHERE user_id=2')).rows.length, 0);
    const renewed = { ...receipt, transactionId: '124', expiresDate: receipt.expiresDate! + 86400_000 };
    await applyAppleSnapshot(1, '100', { transaction: renewed, status: 1 }, adapter);
    assert.equal((await db.query('SELECT * FROM payments')).rows.length, 2);
    assert.equal(new Date((await db.query<{ plan_expires_at: string }>('SELECT plan_expires_at FROM users WHERE id=1')).rows[0].plan_expires_at).getTime(), renewed.expiresDate);
    const grace = renewed.expiresDate! + 86400_000;
    await applyAppleSnapshot(1, '100', { transaction: renewed, status: 4, graceExpiresAt: grace }, adapter);
    assert.equal(new Date((await db.query<{ plan_expires_at: string }>('SELECT plan_expires_at FROM users WHERE id=1')).rows[0].plan_expires_at).getTime(), grace);
    await applyAppleSnapshot(1, '100', { transaction: { ...renewed, revocationDate: Date.now() }, status: 5 }, adapter);
    assert.equal((await db.query<{ plan_expires_at: string }>('SELECT plan_expires_at FROM users WHERE id=1')).rows[0].plan_expires_at, null);
    assert.equal((await db.query("SELECT * FROM subscriptions WHERE status='active'")).rows.length, 0);
    assert.equal((await db.query<{ status: string }>("SELECT status FROM payments WHERE payment_proof_url LIKE '%124:%'")).rows[0].status, 'rejected');
    await db.exec('ALTER TABLE users ADD COLUMN access_frozen_at timestamptz');
    assert.equal(await hasActiveAccess(createPostgresFacade({ query: (sql: string, args?: unknown[]) => db.query(sql, args) } as unknown as Pool) as unknown as DbClient, 1), false);
    // Restored/refund-reversed purchase is verified afresh and reactivates its chain.
    await applyAppleSnapshot(1, '100', { transaction: renewed, status: 1 }, adapter);
    assert.equal((await db.query<{ status: string }>("SELECT status FROM payments WHERE payment_proof_url LIKE '%124:%'")).rows[0].status, 'approved');
    // A later independently granted subscription survives an Apple revocation.
    const webExpiry = new Date(grace + 86400_000).toISOString();
    await db.query("INSERT INTO subscriptions(user_id,status,expires_at) VALUES(1,'active',$1)", [webExpiry]);
    await db.query('UPDATE users SET plan_expires_at=$1 WHERE id=1', [webExpiry]);
    await applyAppleSnapshot(1, '100', { transaction: { ...renewed, revocationDate: Date.now() }, status: 5 }, adapter);
    assert.equal(new Date((await db.query<{ plan_expires_at: string }>('SELECT plan_expires_at FROM users WHERE id=1')).rows[0].plan_expires_at).toISOString(), webExpiry);
    const oneTime = { ...receipt, productId: 'falarus.vnzh', type: 'Non-Consumable', transactionId: '900', originalTransactionId: '900', expiresDate: undefined };
    await confirmAppleStorePurchase(1, { store_product_id: 'falarus.vnzh', product_code: 'vnzh', purchase_id: '900' }, { databasePool: adapter, getTransaction: async () => oneTime });
    await applyAppleSnapshot(1, '900', { transaction: { ...oneTime, revocationDate: Date.now() } }, adapter);
    assert.equal((await db.query<{ status: string }>("SELECT status FROM payments WHERE product_code='vnzh'")).rows[0].status, 'rejected');
    // Roll back payment and ownership if entitlement activation fails.
    await db.exec('DROP TABLE subscriptions');
    const next = { ...receipt, transactionId: '456', originalTransactionId: '400', expiresDate: Date.parse(webExpiry) + 86400_000 };
    await assert.rejects(confirmAppleStorePurchase(1, { ...body, purchase_id: '456' }, { databasePool: adapter, getTransaction: async () => next }));
    assert.equal((await db.query("SELECT * FROM store_purchase_ownership WHERE original_transaction_id='400'")).rows.length, 0);
    assert.equal((await db.query("SELECT * FROM payments WHERE payment_proof_url LIKE '%456%'")).rows.length, 0);
  } finally {
    if (key === undefined) delete process.env.APPLE_ACCOUNT_TOKEN_SECRET; else process.env.APPLE_ACCOUNT_TOKEN_SECRET = key;
    await db.close();
  }
});

 test('Apple expiry follows grace period, retry, expiry and refund states', () => {
  const now = Date.now();
  assert.equal(appleSnapshotExpiry({ transaction: valid, status: 1 }, now), valid.expiresDate);
  assert.equal(appleSnapshotExpiry({ transaction: valid, status: 4, graceExpiresAt: now + 172800000 }, now), now + 172800000);
  for (const status of [2, 3, 5]) assert.equal(appleSnapshotExpiry({ transaction: valid, status }, now), null);
  assert.equal(appleSnapshotExpiry({ transaction: { ...valid, revocationDate: now }, status: 1 }, now), null);
  assert.equal(appleSnapshotExpiry({ transaction: valid, status: 4, graceExpiresAt: now - 1 }, now), null);
});
