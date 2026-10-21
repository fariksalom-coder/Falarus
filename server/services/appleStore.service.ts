import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { decodeJwt, importPKCS8, SignJWT } from 'jose';
import type { Pool } from 'pg';
import { pool } from '../lib/db';
import { createPostgresFacade } from '../lib/postgresFacade';
import { activateApprovedPayment } from '../../shared/paymentActivation';
import { APPLE_PRODUCTS, isAppleProductId, type AppleProductId } from '../../shared/appleProducts';
import { invalidateAccessCache } from './subscription.service';
import type { DbClient } from '../types/dbClient';

export class AppleStoreError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export function appleAccountToken(userId: number): string {
  const secret = process.env.APPLE_ACCOUNT_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new AppleStoreError(503, 'APPLE_ACCOUNT_TOKEN_NOT_CONFIGURED');
  if (!Number.isSafeInteger(userId) || userId < 1) throw new AppleStoreError(401, 'USER_REQUIRED');
  const hex = createHmac('sha256', secret).update(`falarus:apple:${userId}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export type AppleTransaction = {
  bundleId?: string; productId?: string; transactionId?: string; originalTransactionId?: string;
  appAccountToken?: string; expiresDate?: number; revocationDate?: number; isUpgraded?: boolean;
  environment?: string; purchaseDate?: number; type?: string;
};

export function validateAppleTransaction(transaction: AppleTransaction, productId: AppleProductId, transactionId: string, now = Date.now()): void {
  if (transaction.bundleId !== (process.env.APPLE_BUNDLE_ID || 'com.flarus.app')) throw new AppleStoreError(400, 'APPLE_BUNDLE_MISMATCH');
  if (transaction.productId !== productId || transaction.transactionId !== transactionId || !transaction.originalTransactionId) {
    throw new AppleStoreError(400, 'APPLE_TRANSACTION_MISMATCH');
  }
  if (transaction.environment !== 'Production' && !(transaction.environment === 'Sandbox' && process.env.APPLE_ALLOW_SANDBOX_PURCHASES === 'true')) {
    throw new AppleStoreError(400, 'APPLE_ENVIRONMENT_NOT_ALLOWED');
  }
  if (transaction.revocationDate != null || transaction.isUpgraded === true) throw new AppleStoreError(400, 'APPLE_TRANSACTION_REVOKED');
  if (APPLE_PRODUCTS[productId].productCode === 'russian') {
    if (transaction.type !== 'Auto-Renewable Subscription' || !Number.isFinite(transaction.expiresDate) || transaction.expiresDate! <= now) {
      throw new AppleStoreError(400, 'APPLE_SUBSCRIPTION_EXPIRED');
    }
  } else if (transaction.type !== 'Non-Consumable') throw new AppleStoreError(400, 'APPLE_PRODUCT_TYPE_MISMATCH');
}

export async function serverApiToken(): Promise<string> {
  const keyId = process.env.APPLE_IAP_KEY_ID;
  const issuerId = process.env.APPLE_IAP_ISSUER_ID;
  const keyPath = process.env.APPLE_IAP_PRIVATE_KEY_PATH;
  if (!keyId || !issuerId || !keyPath) throw new AppleStoreError(503, 'APPLE_STORE_NOT_CONFIGURED');
  const key = await importPKCS8(await readFile(keyPath, 'utf8'), 'ES256');
  return new SignJWT({ bid: process.env.APPLE_BUNDLE_ID || 'com.flarus.app' })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' }).setIssuer(issuerId)
    .setAudience('appstoreconnect-v1').setIssuedAt().setExpirationTime('5m').sign(key);
}

export async function getAppleTransaction(transactionId: string): Promise<AppleTransaction> {
  if (!/^\d{1,30}$/.test(transactionId)) throw new AppleStoreError(400, 'APPLE_TRANSACTION_ID_INVALID');
  const token = await serverApiToken();
  const request = (host: string) => fetch(`https://${host}/inApps/v1/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000),
  });
  let response = await request('api.storekit.apple.com');
  if (response.status === 404 && process.env.APPLE_ALLOW_SANDBOX_PURCHASES === 'true') {
    response = await request('api.storekit-sandbox.apple.com');
  }
  if (!response.ok) throw new AppleStoreError(response.status >= 500 || response.status === 429 ? 503 : 400, 'APPLE_TRANSACTION_NOT_VERIFIED');
  const payload = await response.json() as { signedTransactionInfo?: string };
  if (!payload.signedTransactionInfo) throw new AppleStoreError(503, 'APPLE_RESPONSE_INVALID');
  // Decode ONLY the response obtained directly from Apple's authenticated HTTPS
  // API. Client-supplied JWS/receipt contents never authorize an entitlement.
  return decodeJwt(payload.signedTransactionInfo) as AppleTransaction;
}

export async function confirmAppleStorePurchase(userId: number, body: Record<string, unknown>, dependencies: {
  databasePool?: Pool; getTransaction?: typeof getAppleTransaction;
} = {}) {
  const productId = String(body.store_product_id ?? '');
  if (!isAppleProductId(productId)) throw new AppleStoreError(400, 'STORE_PRODUCT_NOT_ALLOWED');
  const product = APPLE_PRODUCTS[productId];
  if (body.product_code !== product.productCode || (body.tariff_type || null) !== product.tariffType) {
    throw new AppleStoreError(400, 'PRODUCT_MISMATCH');
  }
  const transactionId = String(body.purchase_id ?? '');
  const transaction = await (dependencies.getTransaction ?? getAppleTransaction)(transactionId);
  validateAppleTransaction(transaction, productId, transactionId);
  const databasePool = dependencies.databasePool ?? pool;
  if (!databasePool) throw new AppleStoreError(503, 'DATABASE_UNAVAILABLE');
  const client = await databasePool.connect();
  try {
    await client.query('BEGIN');
    // Serializes renewals/restores within one account as well as duplicate receipts.
    const account = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!account.rows.length) throw new AppleStoreError(401, 'USER_REQUIRED');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`apple:${transaction.originalTransactionId}`]);
    const ownership = await client.query('SELECT user_id FROM store_purchase_ownership WHERE store=$1 AND original_transaction_id=$2',
      ['app_store', transaction.originalTransactionId]);
    if (ownership.rows.length) {
      if (Number(ownership.rows[0].user_id) !== userId) throw new AppleStoreError(409, 'STORE_PURCHASE_OWNED_BY_ANOTHER_ACCOUNT');
    } else {
      if (transaction.appAccountToken !== appleAccountToken(userId)) throw new AppleStoreError(409, 'APPLE_ACCOUNT_MISMATCH');
      await client.query('INSERT INTO store_purchase_ownership(store, original_transaction_id, user_id) VALUES ($1,$2,$3)',
        ['app_store', transaction.originalTransactionId, userId]);
    }
    const db = createPostgresFacade(client as unknown as Pool) as unknown as DbClient;
    const proof = `store:app_store:${transactionId}:${productId}`;
    const existing = await client.query('SELECT id, user_id FROM payments WHERE payment_proof_url=$1', [proof]);
    let paymentId: number;
    if (existing.rows.length) {
      if (Number(existing.rows[0].user_id) !== userId) throw new AppleStoreError(409, 'STORE_PURCHASE_OWNED_BY_ANOTHER_ACCOUNT');
      paymentId = Number(existing.rows[0].id);
      // A refund reversal is accepted only after fresh Apple verification.
      await client.query("UPDATE payments SET status='approved' WHERE id=$1", [paymentId]);
    } else {
      const now = new Date().toISOString();
      const payment = await db.from('payments').insert({
        user_id: userId, product_code: product.productCode, tariff_type: product.tariffType,
        currency: 'USD', amount: 0, base_amount: 0, discount_amount: 0,
        payment_proof_url: proof, payment_time: now, status: 'approved', approved_at: now,
        payment_channel: 'app_store', discount_meta: {
          store_product_id: productId, store_transaction_id: transactionId,
          store_original_transaction_id: transaction.originalTransactionId,
          store_environment: transaction.environment, apple_expires_at: transaction.expiresDate ?? null,
        },
      }).select('id').single();
      if (payment.error || !payment.data) throw new Error('Store payment insert failed');
      paymentId = Number(payment.data.id);
      if (product.productCode === 'russian') {
        // Restoring an older renewal must never shorten a newer active plan.
        const current = await client.query('SELECT plan_expires_at FROM users WHERE id=$1', [userId]);
        const currentExpiry = new Date(current.rows[0]?.plan_expires_at ?? '').getTime();
        if (!Number.isFinite(currentExpiry) || currentExpiry < transaction.expiresDate!) {
          await activateApprovedPayment(db, { userId, productCode: product.productCode, tariffType: product.tariffType,
            exactExpiresAt: new Date(transaction.expiresDate!).toISOString() });
          await client.query(`UPDATE subscriptions SET apple_original_transaction_id=$1
            WHERE id=(SELECT id FROM subscriptions WHERE user_id=$2 ORDER BY id DESC LIMIT 1)`,
          [transaction.originalTransactionId, userId]);
        }
      }
    }
    await client.query('COMMIT');
    invalidateAccessCache(userId);
    return { status: 200, json: { success: true, id: paymentId } };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
