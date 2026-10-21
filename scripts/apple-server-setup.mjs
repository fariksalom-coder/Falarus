import 'dotenv/config';
import { createPrivateKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

// Run on the server after taking a database backup. Never print credentials.
const errors = [];
for (const name of ['APPLE_TEAM_ID', 'APPLE_SIGN_IN_KEY_ID', 'APPLE_SIGN_IN_PRIVATE_KEY_PATH',
  'DATABASE_URL']) {
  if (!process.env[name]?.trim()) errors.push(`${name}: missing`);
}
if (!/^[a-fA-F0-9]{64}$/.test(process.env.APPLE_TOKEN_ENCRYPTION_KEY ?? '')) errors.push('APPLE_TOKEN_ENCRYPTION_KEY: requires 64 hex characters');
const iapConfigured = ['APPLE_IAP_KEY_ID', 'APPLE_IAP_ISSUER_ID', 'APPLE_IAP_PRIVATE_KEY_PATH'].some(name => process.env[name]?.trim());
if (iapConfigured) {
  for (const name of ['APPLE_IAP_KEY_ID', 'APPLE_IAP_ISSUER_ID', 'APPLE_IAP_PRIVATE_KEY_PATH']) {
    if (!process.env[name]?.trim()) errors.push(`${name}: missing for optional Apple purchases`);
  }
  if ((process.env.APPLE_ACCOUNT_TOKEN_SECRET || process.env.JWT_SECRET || '').length < 32) errors.push('APPLE_ACCOUNT_TOKEN_SECRET: requires at least 32 characters');
}
if (!process.env.APPLE_BUNDLE_ID) errors.push('APPLE_BUNDLE_ID: missing');
if (!(process.env.APPLE_AUDIENCES ?? '').split(',').map(x => x.trim()).includes(process.env.APPLE_BUNDLE_ID)) errors.push('APPLE_AUDIENCES: must include APPLE_BUNDLE_ID');
for (const name of ['APPLE_SIGN_IN_PRIVATE_KEY_PATH', 'APPLE_IAP_PRIVATE_KEY_PATH']) {
  if (!process.env[name]) continue;
  try {
    const key = createPrivateKey(await readFile(process.env[name]));
    if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') errors.push(`${name}: requires Apple P-256 private key`);
  } catch { errors.push(`${name}: unreadable or invalid key`); }
}
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
let client;
try {
  client = await pool.connect();
  if (process.argv.includes('--apply')) {
    await client.query("SELECT pg_advisory_lock(hashtextextended('falarus:apple-migrations',0))");
    for (const file of ['204_apple_app_store.sql', '205_apple_reconciliation.sql']) {
      await client.query(await readFile(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8'));
      console.log(`${file}: applied`);
    }
  }
  const schema = await client.query(`SELECT
    to_regclass('public.apple_auth_challenges') IS NOT NULL AS challenges,
    to_regclass('public.store_purchase_ownership') IS NOT NULL AS ownership,
    to_regclass('public.account_file_deletion_jobs') IS NOT NULL AS cleanup,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='apple_original_transaction_id') AS reconciliation,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_purchase_ownership' AND column_name='checked_at') AS polling,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_oauth_identities' AND column_name='apple_refresh_token_encrypted') AS token_storage`);
  if (Object.values(schema.rows[0]).some(value => value !== true)) throw new Error('Apple migrations missing; take backup, then run with --apply');
  console.log('Apple key formats and database schema: OK. Real-device Sign in with Apple verification is still required.');
} catch (error) {
  console.error(error instanceof Error && error.message.startsWith('Apple migrations') ? error.message : 'Apple database setup failed. Check server connectivity/schema; credentials were not printed.');
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
