import { createHash } from 'node:crypto';

export const CLICK_MERCHANT_API_BASE = 'https://api.click.uz/v2/merchant';

/**
 * Click Merchant API Auth: SHA1(timestamp + secretKey), timestamp in **seconds**.
 * Format: merchant_user_id:hex_digest:timestamp
 */
export function buildClickMerchantAuthHeader(merchantUserId: string, secretKey: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHash('sha1').update(`${timestamp}${secretKey}`, 'utf8').digest('hex');
  return `${merchantUserId}:${digest}:${timestamp}`;
}

export function maskCardNumberInput(pan: string): string {
  const digits = pan.replace(/\D/g, '');
  if (digits.length < 8) return '****';
  return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
}

export type ClickMerchantJson = Record<string, unknown>;

function safeJsonParse(text: string): ClickMerchantJson {
  try {
    return JSON.parse(text) as ClickMerchantJson;
  } catch {
    return { raw: text };
  }
}

/** POST/GET/DELETE with Auth header (not used for `/card_token/request` — that endpoint is unauthenticated). */
export async function clickMerchantAuthorizedRequest(params: {
  method: 'GET' | 'POST' | 'DELETE';
  url: string;
  merchantUserId: string;
  secretKey: string;
  body?: unknown;
}): Promise<{ httpStatus: number; json: ClickMerchantJson }> {
  const Auth = buildClickMerchantAuthHeader(params.merchantUserId, params.secretKey);
  console.log('AUTH HEADER:', Auth);
  try {
    const res = await fetch(params.url, {
      method: params.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Auth,
      },
      body: params.method === 'POST' ? JSON.stringify(params.body ?? {}) : undefined,
    });
    const text = await res.text();
    const json = safeJsonParse(text);
    console.log('CLICK RESPONSE:', json);
    if (!res.ok) {
      console.error('CLICK ERROR:', json);
    }
    return { httpStatus: res.status, json };
  } catch (error) {
    console.error('CLICK ERROR:', error);
    throw error;
  }
}

export async function clickCardTokenRequest(params: {
  serviceId: number;
  card_number: string;
  expire_date: string;
  temporary: 0 | 1;
}): Promise<ClickMerchantJson> {
  const url = `${CLICK_MERCHANT_API_BASE}/card_token/request`;
  const body = {
    service_id: params.serviceId,
    card_number: params.card_number.replace(/\s/g, ''),
    expire_date: params.expire_date,
    temporary: params.temporary,
  };
  console.info('[click.merchant]', 'POST', url, {
    ...body,
    card_number: maskCardNumberInput(body.card_number),
  });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const json = safeJsonParse(text);
    console.log('CLICK RESPONSE:', json);
    if (!res.ok) {
      console.error('CLICK ERROR:', json);
    }
    console.info('[click.merchant]', 'response', url, 'status', res.status, json);
    return json;
  } catch (error) {
    console.error('CLICK ERROR:', error);
    throw error;
  }
}

export async function clickCardTokenVerify(params: {
  serviceId: number;
  card_token: string;
  sms_code: string | number;
  merchantUserId: string;
  secretKey: string;
}): Promise<ClickMerchantJson> {
  const url = `${CLICK_MERCHANT_API_BASE}/card_token/verify`;
  const body = {
    service_id: params.serviceId,
    card_token: params.card_token,
    sms_code: Number(params.sms_code),
  };
  console.info('[click.merchant]', 'POST', url, { service_id: body.service_id });
  const { httpStatus, json } = await clickMerchantAuthorizedRequest({
    method: 'POST',
    url,
    merchantUserId: params.merchantUserId,
    secretKey: params.secretKey,
    body,
  });
  console.info('[click.merchant]', 'response', url, 'status', httpStatus, json);
  return json;
}

export async function clickCardTokenPayment(params: {
  serviceId: number;
  card_token: string;
  amount: number;
  transaction_parameter: string;
  merchantUserId: string;
  secretKey: string;
}): Promise<ClickMerchantJson> {
  const url = `${CLICK_MERCHANT_API_BASE}/card_token/payment`;
  const body = {
    service_id: params.serviceId,
    card_token: params.card_token,
    amount: params.amount,
    transaction_parameter: params.transaction_parameter,
  };
  console.info('[click.merchant]', 'POST', url, {
    service_id: body.service_id,
    amount: body.amount,
    transaction_parameter: body.transaction_parameter,
  });
  const { httpStatus, json } = await clickMerchantAuthorizedRequest({
    method: 'POST',
    url,
    merchantUserId: params.merchantUserId,
    secretKey: params.secretKey,
    body,
  });
  console.info('[click.merchant]', 'response', url, 'status', httpStatus, json);
  return json;
}

export async function clickPaymentStatus(params: {
  serviceId: number;
  paymentId: string | number;
  merchantUserId: string;
  secretKey: string;
}): Promise<ClickMerchantJson> {
  const url = `${CLICK_MERCHANT_API_BASE}/payment/status/${params.serviceId}/${params.paymentId}`;
  console.info('[click.merchant]', 'GET', url);
  const { httpStatus, json } = await clickMerchantAuthorizedRequest({
    method: 'GET',
    url,
    merchantUserId: params.merchantUserId,
    secretKey: params.secretKey,
  });
  console.info('[click.merchant]', 'response', url, 'status', httpStatus, json);
  return json;
}

/** https://docs.click.uz — Create invoice (Auth required) */
export async function clickInvoiceCreate(params: {
  serviceId: number;
  amount: number;
  phone_number: string;
  merchant_trans_id: string;
  merchantUserId: string;
  secretKey: string;
}): Promise<ClickMerchantJson> {
  const url = `${CLICK_MERCHANT_API_BASE}/invoice/create`;
  const body = {
    service_id: params.serviceId,
    amount: params.amount,
    phone_number: params.phone_number,
    merchant_trans_id: params.merchant_trans_id,
  };
  console.info('[click.merchant]', 'POST', url, {
    service_id: body.service_id,
    amount: body.amount,
    merchant_trans_id: body.merchant_trans_id,
  });
  const { httpStatus, json } = await clickMerchantAuthorizedRequest({
    method: 'POST',
    url,
    merchantUserId: params.merchantUserId,
    secretKey: params.secretKey,
    body,
  });
  console.info('[click.merchant]', 'response', url, 'status', httpStatus, json);
  return json;
}

export async function clickCardTokenDelete(params: {
  serviceId: number;
  card_token: string;
  merchantUserId: string;
  secretKey: string;
}): Promise<ClickMerchantJson> {
  const encoded = encodeURIComponent(params.card_token);
  const url = `${CLICK_MERCHANT_API_BASE}/card_token/${params.serviceId}/${encoded}`;
  console.info('[click.merchant]', 'DELETE', url.split(params.card_token).join('***'));
  const { httpStatus, json } = await clickMerchantAuthorizedRequest({
    method: 'DELETE',
    url,
    merchantUserId: params.merchantUserId,
    secretKey: params.secretKey,
  });
  console.info('[click.merchant]', 'response', url, 'status', httpStatus, json);
  return json;
}

export function clickMerchantErrorCode(json: ClickMerchantJson): number {
  return Number(json?.error_code ?? -1);
}

export function isClickMerchantSuccess(json: ClickMerchantJson): boolean {
  return clickMerchantErrorCode(json) === 0;
}

/** Heuristic: Click docs sample uses payment_status 1 for paid */
export function isClickPaymentSucceeded(json: ClickMerchantJson): boolean {
  if (!isClickMerchantSuccess(json)) return false;
  const st = Number(json?.payment_status ?? 0);
  return st === 1 || st === 2;
}

/** Single OFD line item (Click fiscal docs — PascalCase keys). */
export type ClickOfdItem = {
  Name: string;
  SPIC: string;
  PackageCode?: string;
  Units?: number;
  GoodPrice: number;
  Price: number;
  Amount: number;
  VAT: number;
  VATPercent: number;
  Discount?: number;
  Other?: number;
  CommissionInfo: { TIN?: string; PINFL?: string };
};

export async function clickSubmitOfdItems(params: {
  serviceId: number;
  paymentId: number;
  items: ClickOfdItem[];
  receivedEcash: number;
  receivedCash: number;
  receivedCard: number;
  merchantUserId: string;
  secretKey: string;
}): Promise<ClickMerchantJson> {
  const url = `${CLICK_MERCHANT_API_BASE}/payment/ofd_data/submit_items`;
  const body = {
    service_id: params.serviceId,
    payment_id: params.paymentId,
    items: params.items,
    received_ecash: params.receivedEcash,
    received_cash: params.receivedCash,
    received_card: params.receivedCard,
  };
  console.info('[click.merchant]', 'POST', url, {
    service_id: body.service_id,
    payment_id: body.payment_id,
    items_count: body.items.length,
    received_ecash: body.received_ecash,
    received_cash: body.received_cash,
    received_card: body.received_card,
  });
  const { httpStatus, json } = await clickMerchantAuthorizedRequest({
    method: 'POST',
    url,
    merchantUserId: params.merchantUserId,
    secretKey: params.secretKey,
    body,
  });
  console.info('[click.merchant]', 'response', url, 'status', httpStatus, json);
  return json;
}

export async function clickFetchOfdReceipt(params: {
  serviceId: number;
  paymentId: number;
  merchantUserId: string;
  secretKey: string;
}): Promise<ClickMerchantJson> {
  const url = `${CLICK_MERCHANT_API_BASE}/payment/ofd_data/${params.serviceId}/${params.paymentId}`;
  console.info('[click.merchant]', 'GET', url);
  const { httpStatus, json } = await clickMerchantAuthorizedRequest({
    method: 'GET',
    url,
    merchantUserId: params.merchantUserId,
    secretKey: params.secretKey,
  });
  console.info('[click.merchant]', 'response', url, 'status', httpStatus, json);
  return json;
}

/** OFD submit uses same error_code convention as other Merchant methods */
export function isClickOfdSubmitSuccess(json: ClickMerchantJson): boolean {
  return clickMerchantErrorCode(json) === 0;
}

export async function clickPaymentRefund(params: {
  serviceId: number;
  paymentId: string | number;
  merchantUserId: string;
  secretKey: string;
}): Promise<ClickMerchantJson> {
  const url = `${CLICK_MERCHANT_API_BASE}/payment/reversal`;
  const body = {
    service_id: params.serviceId,
    payment_id: Number(params.paymentId),
  };
  console.info('[click.merchant]', 'POST', url, body);
  const { httpStatus, json } = await clickMerchantAuthorizedRequest({
    method: 'POST',
    url,
    merchantUserId: params.merchantUserId,
    secretKey: params.secretKey,
    body,
  });
  console.info('[click.merchant]', 'response', url, 'status', httpStatus, json);
  return json;
}
