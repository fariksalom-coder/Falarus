import type { DbClient } from '../types/dbClient';
import {
  isPaymentProductCode,
  isSubscriptionTariffType,
  type PaymentProductCode,
} from '../../shared/paymentProducts.js';
import { isPaymentsProductCodeSchemaError } from '../../shared/paymentsCompat.js';
import { activateApprovedPayment } from '../../shared/paymentActivation.js';
import { invalidateAccessCache } from './subscription.service.js';

const STORE_PRODUCT_MAP: Record<
  string,
  { productCode: PaymentProductCode; tariffType: 'three_month' | 'year' | null }
> = {
  'falarus.premium.three_month': { productCode: 'russian', tariffType: 'three_month' },
  'falarus.premium.yearly': { productCode: 'russian', tariffType: 'year' },
  'falarus.patent': { productCode: 'patent', tariffType: null },
  'falarus.vnzh': { productCode: 'vnzh', tariffType: null },
  falarus_russian_three_month: { productCode: 'russian', tariffType: 'three_month' },
  falarus_russian_year: { productCode: 'russian', tariffType: 'year' },
  falarus_patent_access: { productCode: 'patent', tariffType: null },
  falarus_vnzh_access: { productCode: 'vnzh', tariffType: null },
};

const APPLE_PRODUCTION_VERIFY_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_VERIFY_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

type StorePurchaseBody = {
  product_code?: unknown;
  tariff_type?: unknown;
  store_product_id?: unknown;
  purchase_id?: unknown;
  verification_source?: unknown;
  verification_data?: unknown;
  transaction_date?: unknown;
};

type AppleReceiptTransaction = {
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  expires_date_ms?: string;
  cancellation_date_ms?: string;
};

type AppleReceiptResponse = {
  status?: number;
  environment?: string;
  receipt?: {
    in_app?: AppleReceiptTransaction[];
  };
  latest_receipt_info?: AppleReceiptTransaction[];
};

function isAppleSource(source: string): boolean {
  return source === 'app_store' || source === 'ios_app_store';
}

async function postAppleReceipt(
  url: string,
  receiptData: string,
  password?: string
): Promise<AppleReceiptResponse> {
  const body: Record<string, unknown> = {
    'receipt-data': receiptData,
    'exclude-old-transactions': false,
  };
  if (password) body.password = password;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await response.json()) as AppleReceiptResponse;
}

async function verifyAppleReceipt(
  receiptData: string,
  productId: string,
  needsSharedSecret: boolean
): Promise<{
  ok: boolean;
  status: number;
  environment: string | null;
  transactionId: string | null;
  expiresAt: string | null;
  rawStatus: number | null;
  error?: string;
}> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET?.trim();
  if (needsSharedSecret && !sharedSecret) {
    return {
      ok: false,
      status: 503,
      environment: null,
      transactionId: null,
      expiresAt: null,
      rawStatus: null,
      error: 'APPLE_SHARED_SECRET_REQUIRED',
    };
  }

  let payload = await postAppleReceipt(
    APPLE_PRODUCTION_VERIFY_URL,
    receiptData,
    sharedSecret
  );
  if (payload.status === 21007) {
    payload = await postAppleReceipt(
      APPLE_SANDBOX_VERIFY_URL,
      receiptData,
      sharedSecret
    );
  }

  if (payload.status !== 0) {
    return {
      ok: false,
      status: 400,
      environment: payload.environment ?? null,
      transactionId: null,
      expiresAt: null,
      rawStatus: payload.status ?? null,
      error: `APPLE_RECEIPT_INVALID_${payload.status ?? 'UNKNOWN'}`,
    };
  }

  const transactions = [
    ...(payload.latest_receipt_info ?? []),
    ...(payload.receipt?.in_app ?? []),
  ].filter((item) => item.product_id === productId);
  transactions.sort((a, b) => Number(b.expires_date_ms ?? 0) - Number(a.expires_date_ms ?? 0));

  const transaction = transactions[0] ?? null;
  if (!transaction) {
    return {
      ok: false,
      status: 400,
      environment: payload.environment ?? null,
      transactionId: null,
      expiresAt: null,
      rawStatus: payload.status ?? null,
      error: 'APPLE_PRODUCT_NOT_IN_RECEIPT',
    };
  }
  if (transaction.cancellation_date_ms) {
    return {
      ok: false,
      status: 400,
      environment: payload.environment ?? null,
      transactionId: transaction.transaction_id ?? null,
      expiresAt: null,
      rawStatus: payload.status ?? null,
      error: 'APPLE_TRANSACTION_CANCELLED',
    };
  }

  const expiresMs = Number(transaction.expires_date_ms ?? 0);
  const expiresAt = Number.isFinite(expiresMs) && expiresMs > 0
    ? new Date(expiresMs).toISOString()
    : null;
  if (needsSharedSecret && (!expiresAt || expiresMs <= Date.now())) {
    return {
      ok: false,
      status: 400,
      environment: payload.environment ?? null,
      transactionId: transaction.transaction_id ?? null,
      expiresAt,
      rawStatus: payload.status ?? null,
      error: 'APPLE_SUBSCRIPTION_EXPIRED',
    };
  }

  return {
    ok: true,
    status: 200,
    environment: payload.environment ?? null,
    transactionId:
      transaction.transaction_id ?? transaction.original_transaction_id ?? null,
    expiresAt,
    rawStatus: payload.status ?? null,
  };
}

export async function confirmStorePurchase(
  supabase: DbClient,
  userIdRaw: unknown,
  body: StorePurchaseBody
): Promise<{ status: number; json: Record<string, unknown> }> {
  const userId = Number(userIdRaw);
  if (!Number.isFinite(userId)) {
    return { status: 401, json: { error: 'USER_REQUIRED' } };
  }

  const storeProductId = String(body.store_product_id ?? '').trim();
  const mapped = STORE_PRODUCT_MAP[storeProductId];
  if (!mapped) {
    return {
      status: 400,
      json: { error: 'STORE_PRODUCT_NOT_ALLOWED' },
    };
  }

  const productCodeRaw = String(body.product_code ?? '').trim();
  if (!isPaymentProductCode(productCodeRaw)) {
    return { status: 400, json: { error: 'INVALID_PRODUCT_CODE' } };
  }
  if (productCodeRaw !== mapped.productCode) {
    return { status: 400, json: { error: 'PRODUCT_MISMATCH' } };
  }

  const tariffTypeRaw = String(body.tariff_type ?? '').trim();
  const tariffType =
    mapped.productCode === 'russian'
      ? isSubscriptionTariffType(tariffTypeRaw)
        ? tariffTypeRaw
        : null
      : null;
  if (mapped.productCode === 'russian' && tariffType !== mapped.tariffType) {
    return { status: 400, json: { error: 'TARIFF_MISMATCH' } };
  }

  const purchaseId = String(body.purchase_id ?? '').trim();
  const verificationSource = String(body.verification_source ?? '').trim();
  const verificationData = String(body.verification_data ?? '').trim();
  if (!purchaseId || !verificationSource || !verificationData) {
    return { status: 400, json: { error: 'STORE_RECEIPT_REQUIRED' } };
  }

  const isApple = isAppleSource(verificationSource);
  const isSubscription = mapped.productCode === 'russian';
  const appleVerification = isApple
    ? await verifyAppleReceipt(verificationData, storeProductId, isSubscription)
    : null;
  if (appleVerification && !appleVerification.ok) {
    return {
      status: appleVerification.status,
      json: { error: appleVerification.error ?? 'APPLE_RECEIPT_INVALID' },
    };
  }

  const verifiedTransactionId = appleVerification?.transactionId ?? purchaseId;
  const proofUrl = `store:${verificationSource}:${verifiedTransactionId}:${storeProductId}`;

  let { data: existing, error: existingErr } = await supabase
    .from('payments')
    .select('id, status')
    .eq('payment_proof_url', proofUrl)
    .limit(1)
    .maybeSingle();
  if (existingErr && isPaymentsProductCodeSchemaError(existingErr)) {
    existing = null;
    existingErr = null;
  }
  if (existingErr) {
    return { status: 500, json: { error: existingErr.message } };
  }
  if (existing) {
    invalidateAccessCache(userId);
    return {
      status: 200,
      json: { success: true, id: (existing as { id: number }).id },
    };
  }

  const nowIso = new Date().toISOString();
  const insertBase: Record<string, unknown> = {
    user_id: userId,
    tariff_type: mapped.productCode === 'russian' ? tariffType : null,
    currency: 'USD',
    amount: 0,
    base_amount: 0,
    discount_amount: 0,
    discount_meta: {
      store_product_id: storeProductId,
      verification_source: verificationSource,
      store_environment: appleVerification?.environment ?? null,
      store_transaction_id: verifiedTransactionId,
      apple_status: appleVerification?.rawStatus ?? null,
      apple_expires_at: appleVerification?.expiresAt ?? null,
      transaction_date: body.transaction_date ?? null,
    },
    payment_proof_url: proofUrl,
    payment_time: nowIso,
    status: 'approved',
    approved_at: nowIso,
    payment_channel:
      isApple ? 'app_store' : 'google_play',
  };

  let { data: row, error: insertErr } = await supabase
    .from('payments')
    .insert({ ...insertBase, product_code: mapped.productCode })
    .select('id')
    .single();
  if (insertErr && isPaymentsProductCodeSchemaError(insertErr)) {
    const legacyInsert = await supabase
      .from('payments')
      .insert({
        ...insertBase,
        tariff_type: mapped.productCode === 'russian' ? tariffType : 'three_month',
      })
      .select('id')
      .single();
    row = legacyInsert.data as typeof row;
    insertErr = legacyInsert.error;
  }
  if (insertErr || !row) {
    return {
      status: 500,
      json: { error: insertErr?.message ?? 'STORE_PAYMENT_NOT_RECORDED' },
    };
  }

  await activateApprovedPayment(supabase, {
    userId,
    productCode: mapped.productCode,
    tariffType,
    exactExpiresAt: appleVerification?.expiresAt ?? null,
  });
  invalidateAccessCache(userId);

  return { status: 200, json: { success: true, id: (row as { id: number }).id } };
}
