import { decodeJwt } from 'jose';
import type { Pool } from 'pg';
import { pool } from '../lib/db';
import { APPLE_PRODUCTS, isAppleProductId } from '../../shared/appleProducts';
import { AppleStoreError, confirmAppleStorePurchase, getAppleTransaction, serverApiToken, type AppleTransaction } from './appleStore.service';
import { invalidateAccessCache } from './subscription.service';

export type AppleSnapshot = { transaction: AppleTransaction; status?: number; graceExpiresAt?: number };

// Both the transaction and renewal JWS below come ONLY from Apple's authenticated
// HTTPS API. No client/webhook payload is decoded into an entitlement.
export async function loadAppleSnapshots(originalId: string): Promise<AppleSnapshot[]> {
  const original = await getAppleTransaction(originalId);
  if (original.type !== 'Auto-Renewable Subscription') return [{ transaction: original }];
  const token = await serverApiToken();
  const host = original.environment === 'Sandbox' ? 'api.storekit-sandbox.apple.com' : 'api.storekit.apple.com';
  const response = await fetch(`https://${host}/inApps/v1/subscriptions/${originalId}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new AppleStoreError(503, 'APPLE_STATUS_UNAVAILABLE');
  const body = await response.json() as { data?: Array<{ lastTransactions?: Array<{
    status?: number; signedTransactionInfo?: string; signedRenewalInfo?: string;
  }> }> };
  const snapshots: AppleSnapshot[] = [];
  for (const group of body.data ?? []) for (const item of group.lastTransactions ?? []) {
    if (!item.signedTransactionInfo) continue;
    const transaction = decodeJwt(item.signedTransactionInfo) as AppleTransaction;
    if (transaction.originalTransactionId !== originalId) continue;
    const renewal = item.signedRenewalInfo ? decodeJwt(item.signedRenewalInfo) : {};
    snapshots.push({ transaction, status: item.status, graceExpiresAt: Number(renewal.gracePeriodExpiresDate) });
  }
  if (!snapshots.length) throw new AppleStoreError(503, 'APPLE_STATUS_EMPTY');
  return snapshots;
}

export function appleSnapshotExpiry(snapshot: AppleSnapshot, now = Date.now()): number | null {
  const tx = snapshot.transaction;
  if (tx.revocationDate != null || tx.isUpgraded || snapshot.status === 5) return null;
  if (tx.type !== 'Auto-Renewable Subscription') return null;
  if (snapshot.status === 4 && Number.isFinite(snapshot.graceExpiresAt) && snapshot.graceExpiresAt! > now) {
    return Math.max(snapshot.graceExpiresAt!, tx.expiresDate ?? 0);
  }
  if (snapshot.status !== undefined && snapshot.status !== 1) return null;
  return Number.isFinite(tx.expiresDate) && tx.expiresDate! > now ? tx.expiresDate! : null;
}

export async function applyAppleSnapshot(userId: number, originalId: string, snapshot: AppleSnapshot, databasePool: Pool): Promise<void> {
  const tx = snapshot.transaction;
  if (tx.bundleId !== (process.env.APPLE_BUNDLE_ID || 'com.flarus.app') || tx.originalTransactionId !== originalId ||
      !tx.productId || !isAppleProductId(tx.productId) || !tx.transactionId ||
      (tx.environment !== 'Production' && !(tx.environment === 'Sandbox' && process.env.APPLE_ALLOW_SANDBOX_PURCHASES === 'true'))) {
    throw new AppleStoreError(400, 'APPLE_STATUS_MISMATCH');
  }
  const product = APPLE_PRODUCTS[tx.productId];
  const expiry = appleSnapshotExpiry(snapshot);
  if (product.productCode === 'russian' && tx.type !== 'Auto-Renewable Subscription') throw new AppleStoreError(400, 'APPLE_PRODUCT_TYPE_MISMATCH');
  if (product.productCode !== 'russian' && tx.type !== 'Non-Consumable') throw new AppleStoreError(400, 'APPLE_PRODUCT_TYPE_MISMATCH');
  const revoked = tx.revocationDate != null || snapshot.status === 5;
  if (!revoked && !tx.isUpgraded && (product.productCode !== 'russian' || expiry)) {
    await confirmAppleStorePurchase(userId, { store_product_id: tx.productId, product_code: product.productCode,
      tariff_type: product.tariffType, purchase_id: tx.transactionId }, {
      databasePool, getTransaction: async () => ({ ...tx, ...(expiry ? { expiresDate: expiry } : {}) }),
    });
  }
  const client = await databasePool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query('SELECT id, plan_expires_at FROM users WHERE id=$1 FOR UPDATE', [userId]);
    if (!account.rows.length) { await client.query('ROLLBACK'); return; }
    const owner = await client.query('SELECT user_id FROM store_purchase_ownership WHERE store=$1 AND original_transaction_id=$2', ['app_store', originalId]);
    if (Number(owner.rows[0]?.user_id) !== userId) throw new AppleStoreError(409, 'APPLE_ACCOUNT_MISMATCH');
    if (revoked) {
      // Reject only Apple's refunded transaction; other paid purchases survive.
      await client.query(`UPDATE payments SET status='rejected' WHERE user_id=$1 AND payment_channel='app_store' AND payment_proof_url=$2`,
        [userId, `store:app_store:${tx.transactionId}:${tx.productId}`]);
    }
    if (product.productCode === 'russian') {
      const previous = await client.query(`SELECT max(expires_at) AS expiry FROM subscriptions WHERE user_id=$1 AND apple_original_transaction_id=$2`, [userId, originalId]);
      await client.query(`UPDATE subscriptions SET status=$3, expires_at=CASE WHEN $4::timestamptz IS NULL THEN expires_at ELSE $4::timestamptz END
        WHERE user_id=$1 AND apple_original_transaction_id=$2`, [userId, originalId, expiry ? 'active' : 'expired', expiry ? new Date(expiry).toISOString() : null]);
      const other = await client.query(`SELECT max(expires_at) AS expiry FROM subscriptions WHERE user_id=$1 AND status='active' AND expires_at>now()`, [userId]);
      const current = new Date(account.rows[0].plan_expires_at ?? '').getTime();
      const old = new Date(previous.rows[0]?.expiry ?? '').getTime();
      const best = new Date(other.rows[0]?.expiry ?? '').getTime();
      // Preserve a later independent web/manual grant. Remove only the expiry
      // previously represented by this Apple subscription chain.
      if (current === old || (Number.isFinite(best) && (!Number.isFinite(current) || best > current))) {
        await client.query('UPDATE users SET plan_expires_at=$2 WHERE id=$1', [userId, Number.isFinite(best) ? new Date(best).toISOString() : null]);
      }
    }
    await client.query('UPDATE store_purchase_ownership SET checked_at=now() WHERE store=$1 AND original_transaction_id=$2', ['app_store', originalId]);
    await client.query('COMMIT');
    invalidateAccessCache(userId);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export function startAppleReconciliation(): void {
  if (!pool || !process.env.APPLE_IAP_KEY_ID || !process.env.APPLE_IAP_PRIVATE_KEY_PATH || !process.env.APPLE_IAP_ISSUER_ID) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const owners = await pool!.query(`SELECT user_id, original_transaction_id FROM store_purchase_ownership
        WHERE store='app_store' AND user_id IS NOT NULL AND (checked_at IS NULL OR checked_at<now()-interval '5 minutes')
        ORDER BY checked_at NULLS FIRST LIMIT 100`);
      for (const owner of owners.rows) {
        const lock = await pool!.connect();
        const key = `apple-reconcile:${owner.original_transaction_id}`;
        try {
          const acquired = await lock.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked', [key]);
          if (!acquired.rows[0]?.locked) continue;
          const snapshots = await loadAppleSnapshots(owner.original_transaction_id);
          const lockedPool = { connect: async () => ({ query: lock.query.bind(lock), release() {} }) } as unknown as Pool;
          for (const snapshot of snapshots) await applyAppleSnapshot(Number(owner.user_id), owner.original_transaction_id, snapshot, lockedPool);
        } catch {
          // Rotate failed owners too, so an unavailable/invalid transaction
          // cannot starve later accounts in a large queue.
          await lock.query('UPDATE store_purchase_ownership SET checked_at=now() WHERE store=$1 AND original_transaction_id=$2', ['app_store', owner.original_transaction_id]);
          console.warn('[apple-reconcile] Apple status check failed; retaining last verified access and retrying');
        }
        finally { await lock.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [key]); lock.release(); }
      }
    } catch { console.warn('[apple-reconcile] Database check failed; retrying'); }
    finally { running = false; }
  };
  void tick();
  setInterval(() => void tick(), 60_000).unref();
}
