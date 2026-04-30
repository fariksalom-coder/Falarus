import { createHash } from 'node:crypto';
import {
  getCourseProductPrice,
  getPaymentProductLabel,
  isSubscriptionTariffType,
  type PaymentProductCode,
  type PaymentProvider,
  type SubscriptionTariffType,
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
export const CLICK_PROVIDER_LABEL = 'Click';

export function inferPaymentProviderFromProofUrl(
  paymentProofUrl?: string | null
): PaymentProvider {
  if (!paymentProofUrl) return 'manual';
  return paymentProofUrl.startsWith(CLICK_BASE_URL) ? 'click' : 'manual';
}

export function buildClickPaymentUrl(params: {
  serviceId: string;
  merchantId: string;
  amount: number;
  paymentId: number | string;
  returnUrl?: string | null;
}): string {
  const search = new URLSearchParams({
    service_id: String(params.serviceId),
    merchant_id: String(params.merchantId),
    amount: String(params.amount),
    transaction_param: String(params.paymentId),
  });
  if (params.returnUrl) {
    search.set('return_url', params.returnUrl);
  }
  return `${CLICK_BASE_URL}?${search.toString()}`;
}

export function buildClickPaymentTitle(params: {
  productCode: PaymentProductCode;
  tariffType?: string | null;
}): string {
  if (params.productCode === 'russian' && isSubscriptionTariffType(params.tariffType)) {
    if (params.tariffType === 'year') return 'Курс русского языка · 1 год';
    if (params.tariffType === '3months') return 'Курс русского языка · 3 месяца';
    return 'Курс русского языка · 1 месяц';
  }
  return getPaymentProductLabel(params.productCode);
}

export function getClickAmountForProduct(params: {
  productCode: PaymentProductCode;
  tariffType?: SubscriptionTariffType | null;
  tariffPrices?: { month: number; three_months: number; year: number } | null;
}): number {
  if (params.productCode === 'russian') {
    if (!params.tariffType) return 0;
    if (!params.tariffPrices) return 0;
    if (params.tariffType === 'year') return Number(params.tariffPrices.year);
    if (params.tariffType === '3months') return Number(params.tariffPrices.three_months);
    return Number(params.tariffPrices.month);
  }
  return getCourseProductPrice(params.productCode, 'UZS');
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
}) {
  return {
    click_trans_id: params.payload.click_trans_id || '',
    merchant_trans_id: params.payload.merchant_trans_id || '',
    merchant_prepare_id: params.merchantPrepareId,
    error: 0,
    error_note: 'Success',
  };
}
