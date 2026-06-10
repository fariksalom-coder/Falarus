import { createHash } from 'node:crypto';
import {
  getCourseProductPrice,
  getPaymentProductLabel,
  getTeacherListingPriceUzs,
  isCourseProductCode,
  isSubscriptionTariffType,
  isTeacherListingPlanCode,
  type PaymentProductCode,
  type PaymentProvider,
  type SubscriptionTariffType,
  type TeacherListingPlanCode,
} from './paymentProducts.js';

export type ClickCallbackPayload = {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  merchant_prepare_id: string;
  amount: string;
  action: string;
  error: string;
  error_note: string;
  sign_time: string;
  sign_string: string;
};

export const CLICK_BASE_URL = 'https://my.click.uz/services/pay';
/**
 * Empty = do not send `card_type` (optional per Click docs). Both uzcard and humo stay available on Click UI.
 * Combined `uzcard/humo` triggers «Неверный тип карты»; valid single values are only `uzcard` or `humo`.
 * @see https://docs.click.uz/click-button/
 */
export const CLICK_PAY_CARD_TYPE_DEFAULT = '';
export const CLICK_TOKEN_PAYMENT_PREFIX = 'click-token:';
export const CLICK_PROVIDER_LABEL = 'Click';
export const CLICK_PENDING_EXPIRE_MS = 5 * 60 * 1000;

export function isClickShopCheckoutUrl(url: string | null | undefined): boolean {
  const u = typeof url === 'string' ? url.trim() : '';
  return u.length > 0 && u.startsWith(CLICK_BASE_URL);
}

/** Pending Click Shop checkout — qayta `/create` chaqirilsa, avvalgi havolani qaytarish mumkin */
export function isResumableClickButtonPending(row: {
  payment_channel?: string | null;
  payment_proof_url?: string | null;
}): boolean {
  if (!isClickShopCheckoutUrl(row.payment_proof_url)) return false;
  const ch = row.payment_channel;
  return ch === 'click_button' || ch == null || ch === '';
}

export function isClickLikePendingChannel(channel?: string | null): boolean {
  return channel === 'click_button' || channel === 'click_auto_token' || channel === 'click_auto_cron';
}

const RAHMAT_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export function isRahmatHostedCheckoutUrl(url: string | null | undefined): boolean {
  const raw = (url || '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'app.rhmt.uz') return true;
    if (h.endsWith('multicard.uz')) return true;
    if (h.endsWith('rhmt.uz')) return true;
    return false;
  } catch {
    return false;
  }
}

export function isResumableRahmatPending(row: {
  payment_channel?: string | null;
  payment_proof_url?: string | null;
}): boolean {
  return row.payment_channel === 'rahmat' && isRahmatHostedCheckoutUrl(row.payment_proof_url);
}

export function isExpiredRahmatPending(row: {
  payment_channel?: string | null;
  created_at?: string | null;
  payment_time?: string | null;
}): boolean {
  if (row.payment_channel !== 'rahmat') return false;
  const rawTs = row.created_at ?? row.payment_time ?? null;
  if (!rawTs) return false;
  const createdAtMs = Date.parse(rawTs);
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs >= RAHMAT_PENDING_TTL_MS;
}

export function isExpiredClickPending(row: {
  payment_channel?: string | null;
  created_at?: string | null;
  payment_time?: string | null;
}): boolean {
  if (!isClickLikePendingChannel(row.payment_channel)) return false;
  const rawTs = row.created_at ?? row.payment_time ?? null;
  if (!rawTs) return false;
  const createdAtMs = Date.parse(rawTs);
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs >= CLICK_PENDING_EXPIRE_MS;
}

export function buildClickTokenPaymentProofUrl(paymentId: number | string): string {
  return `${CLICK_TOKEN_PAYMENT_PREFIX}${paymentId}`;
}

export function inferPaymentProviderFromProofUrl(
  paymentProofUrl?: string | null
): PaymentProvider {
  if (!paymentProofUrl) return 'manual';
  if (paymentProofUrl.startsWith(CLICK_BASE_URL)) return 'click';
  if (paymentProofUrl.startsWith(CLICK_TOKEN_PAYMENT_PREFIX)) return 'click';
  if (isRahmatHostedCheckoutUrl(paymentProofUrl)) return 'rahmat';
  return 'manual';
}

export function buildClickPaymentUrl(params: {
  serviceId: string;
  merchantId: string;
  /** Shop/Button pay form field `merchant_user_id` (often differs from numeric merchant_id). */
  merchantUserId?: string | null;
  amount: number;
  paymentId: number | string;
  returnUrl?: string | null;
  /** Single value `uzcard` or `humo`, or omit (empty) for both — not `uzcard/humo`. */
  cardType?: string | null;
}): string {
  const search = new URLSearchParams({
    service_id: String(params.serviceId),
    merchant_id: String(params.merchantId),
    amount: params.amount.toFixed(2),
    transaction_param: String(params.paymentId),
  });
  if (params.returnUrl) {
    search.set('return_url', params.returnUrl);
  }
  const muid = params.merchantUserId?.trim();
  if (muid) {
    search.set('merchant_user_id', muid);
  }
  const ct = (params.cardType ?? CLICK_PAY_CARD_TYPE_DEFAULT).trim();
  if (ct) {
    search.set('card_type', ct);
  }
  return `${CLICK_BASE_URL}?${search.toString()}`;
}

export function buildClickPaymentTitle(params: {
  productCode: PaymentProductCode;
  tariffType?: string | null;
}): string {
  if (params.productCode === 'russian' && isSubscriptionTariffType(params.tariffType)) {
    if (params.tariffType === 'year') return 'Курс русского языка · 1 год';
    return 'Курс русского языка · 1 месяц';
  }
  return getPaymentProductLabel(params.productCode);
}

export function getClickAmountForProduct(params: {
  productCode: PaymentProductCode;
  tariffType?: SubscriptionTariffType | null;
  tariffPrices?: { month: number; year: number } | null;
  listingPlanCode?: TeacherListingPlanCode | null;
}): number {
  if (params.productCode === 'russian') {
    if (!params.tariffType) return 0;
    if (!params.tariffPrices) return 0;
    if (params.tariffType === 'year') return Number(params.tariffPrices.year);
    return Number(params.tariffPrices.month);
  }
  if (isCourseProductCode(params.productCode)) {
    return getCourseProductPrice(params.productCode, 'UZS');
  }
  if (params.productCode === 'teacher_listing' && isTeacherListingPlanCode(params.listingPlanCode)) {
    return getTeacherListingPriceUzs(params.listingPlanCode);
  }
  return 0;
}

function md5(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

export function buildClickPrepareSignature(payload: ClickCallbackPayload, secretKey: string): string {
  return md5(
    `${payload.click_trans_id}${payload.service_id}${secretKey}${payload.merchant_trans_id}${payload.amount}${payload.action}${payload.sign_time}`
  );
}

export function buildClickCompleteSignature(payload: ClickCallbackPayload, secretKey: string): string {
  return md5(
    `${payload.click_trans_id}${payload.service_id}${secretKey}${payload.merchant_trans_id}${payload.merchant_prepare_id}${payload.amount}${payload.action}${payload.sign_time}`
  );
}

export function verifyClickSignature(payload: ClickCallbackPayload, secretKey: string): boolean {
  const expected =
    payload.action === '1'
      ? buildClickCompleteSignature(payload, secretKey)
      : buildClickPrepareSignature(payload, secretKey);
  return expected.toLowerCase() === String(payload.sign_string || '').toLowerCase();
}

/**
 * Production: signature is NEVER skipped (even if CLICK_SKIP_SIGNATURE_VERIFY is set).
 * Non-production: CLICK_SKIP_SIGNATURE_VERIFY=true|1 skips MD5 verify (local tools only).
 */
export function shouldSkipClickSignatureVerify(): boolean {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const flag = ['true', '1'].includes(
    String(process.env.CLICK_SKIP_SIGNATURE_VERIFY || '').trim().toLowerCase()
  );
  if (isProd && flag) {
    console.warn(
      '[click] CLICK_SKIP_SIGNATURE_VERIFY is ignored when NODE_ENV=production (signatures required)'
    );
  }
  if (isProd) return false;
  return flag;
}

export function normalizeClickCallbackPayload(
  raw: Record<string, unknown>
): ClickCallbackPayload {
  const pick = (key: string) => String(raw[key] ?? '').trim();
  return {
    click_trans_id: pick('click_trans_id'),
    service_id: pick('service_id'),
    click_paydoc_id: pick('click_paydoc_id'),
    merchant_trans_id: pick('merchant_trans_id'),
    merchant_prepare_id: pick('merchant_prepare_id'),
    amount: pick('amount'),
    action: pick('action'),
    error: pick('error'),
    error_note: pick('error_note'),
    sign_time: pick('sign_time'),
    sign_string: pick('sign_string'),
  };
}

export function buildClickErrorResponse(params: {
  payload: ClickCallbackPayload;
  merchantPrepareId?: number | string | null;
  error: number;
  note: string;
}) {
  return {
    click_trans_id: params.payload.click_trans_id || '',
    merchant_trans_id: params.payload.merchant_trans_id || '',
    merchant_prepare_id: params.merchantPrepareId ?? 0,
    error: params.error,
    error_note: params.note,
  };
}

export function buildClickSuccessResponse(params: {
  payload: ClickCallbackPayload;
  merchantPrepareId: number | string;
  merchantConfirmId?: number | string | null;
}) {
  const resp: Record<string, unknown> = {
    click_trans_id: params.payload.click_trans_id || '',
    merchant_trans_id: params.payload.merchant_trans_id || '',
    merchant_prepare_id: params.merchantPrepareId,
    error: 0,
    error_note: 'Success',
  };
  if (params.merchantConfirmId != null) {
    resp.merchant_confirm_id = params.merchantConfirmId;
  }
  return resp;
}
