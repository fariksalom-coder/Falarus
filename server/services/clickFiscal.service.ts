import type { SupabaseClient } from '@supabase/supabase-js';
import {
  clickFetchOfdReceipt,
  clickSubmitOfdItems,
  type ClickOfdItem,
  isClickOfdSubmitSuccess,
  type ClickMerchantJson,
} from '../../shared/clickMerchantClient.js';
import { getClickConfig } from '../../shared/clickConfig.js';
import {
  COURSE_PRODUCT_META,
  getPaymentProductLabel,
  normalizePaymentProductCode,
  type PaymentProductCode,
  isSubscriptionTariffType,
} from '../../shared/paymentProducts.js';

export const FISCAL_MAX_ATTEMPTS = 4;

type FiscalEnv = {
  enabled: boolean;
  ikpuCode: string;
  packageCode: string;
  commissionTin: string;
  commissionPinfl: string;
  vatPercent: number;
};

function readFiscalEnv(): FiscalEnv {
  const disabled =
    String(process.env.CLICK_FISCAL_DISABLED ?? '').trim().toLowerCase() === 'true' ||
    String(process.env.CLICK_FISCAL_DISABLED ?? '').trim() === '1';
  const ikpu =
    String(process.env.CLICK_IKPU_CODE ?? '').trim() || '10899002001000000';
  const packageCode = String(process.env.CLICK_PACKAGE_CODE ?? '').trim();
  const commissionTin = String(process.env.CLICK_FISCAL_COMMISSION_TIN ?? '').trim();
  const commissionPinfl = String(process.env.CLICK_FISCAL_COMMISSION_PINFL ?? '').trim();
  const vatPercent = Math.min(
    255,
    Math.max(0, Math.round(Number(process.env.CLICK_FISCAL_VAT_PERCENT ?? '0') || 0))
  );
  return {
    enabled: !disabled,
    ikpuCode: ikpu,
    packageCode,
    commissionTin,
    commissionPinfl,
    vatPercent,
  };
}

function commissionPayload(env: FiscalEnv): { TIN?: string; PINFL?: string } | null {
  if (env.commissionTin.length >= 9) return { TIN: env.commissionTin };
  if (env.commissionPinfl.length >= 14) return { PINFL: env.commissionPinfl };
  return null;
}

function fiscalConfigReady(env: FiscalEnv): { ok: boolean; reason?: string } {
  if (!env.enabled) return { ok: false, reason: 'CLICK_FISCAL_DISABLED' };
  if (env.ikpuCode.length !== 17) return { ok: false, reason: 'CLICK_IKPU_CODE must be 17 characters (SPIC)' };
  if (!env.packageCode) return { ok: false, reason: 'CLICK_PACKAGE_CODE is required' };
  if (!commissionPayload(env)) {
    return { ok: false, reason: 'CLICK_FISCAL_COMMISSION_TIN or CLICK_FISCAL_COMMISSION_PINFL required' };
  }
  return { ok: true };
}

function subscriptionItemLabel(productCode: PaymentProductCode, tariffType: string | null | undefined): string {
  if (productCode === 'russian' && isSubscriptionTariffType(tariffType)) {
    const period = tariffType === 'year' ? '1 year' : '1 month';
    return `Subscription (${period})`;
  }
  if (productCode === 'patent') return `${COURSE_PRODUCT_META.patent.label} (onlayn)`;
  if (productCode === 'vnzh') return `${COURSE_PRODUCT_META.vnzh.label} (onlayn)`;
  return `${getPaymentProductLabel(productCode)} (onlayn)`;
}

function vatParts(totalTiyin: number, vatPercent: number): { vat: number; vatPercentByte: number } {
  if (vatPercent <= 0) return { vat: 0, vatPercentByte: 0 };
  const vat = Math.round((totalTiyin * vatPercent) / (100 + vatPercent));
  return { vat, vatPercentByte: vatPercent };
}

function truncateErr(msg: string, max = 4000): string {
  if (msg.length <= max) return msg;
  return `${msg.slice(0, max)}…`;
}

function jsonSafeSlice(obj: unknown): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  } catch {
    return { note: 'unserializable_response' };
  }
}

export type FiscalPaymentRow = {
  id: number;
  status: string;
  amount: number | string | null;
  payment_channel?: string | null;
  click_merchant_payment_id?: string | null;
  product_code?: string | null;
  tariff_type?: string | null;
  fiscal_status?: string | null;
  fiscal_attempt_count?: number | null;
};

/**
 * Fiscalize approved Click payment (non-blocking for callers — catch internally).
 * Never throws. Payment success must never depend on fiscal outcome.
 */
export async function fiscalizePayment(supabase: SupabaseClient, paymentId: number): Promise<void> {
  try {
    await fiscalizePaymentInner(supabase, paymentId);
  } catch (e) {
    console.error('[click.fiscal] unexpected error', paymentId, e instanceof Error ? e.message : e);
  }
}

async function fiscalizePaymentInner(supabase: SupabaseClient, paymentId: number): Promise<void> {
  const fiscalEnv = readFiscalEnv();
  const fiscalGate = fiscalConfigReady(fiscalEnv);
  const merchantCfg = getClickConfig();
  const serviceId = Number(merchantCfg.serviceId);
  const merchantUserId = merchantCfg.apiMerchantUserId?.trim();
  const secretKey = merchantCfg.secretKey?.trim();

  const { data: row, error } = await supabase
    .from('payments')
    .select(
      'id, status, amount, payment_channel, click_merchant_payment_id, product_code, tariff_type, fiscal_status, fiscal_attempt_count'
    )
    .eq('id', paymentId)
    .maybeSingle();

  if (error || !row) {
    console.warn('[click.fiscal] payment row missing', paymentId, error?.message);
    return;
  }

  const payment = row as FiscalPaymentRow;

  if (payment.status !== 'approved') return;

  const clickPid = String(payment.click_merchant_payment_id ?? '').trim();
  if (!clickPid || !Number.isFinite(Number(clickPid))) {
    console.info('[click.fiscal] skip — no Click payment_id on row', paymentId);
    if (String(payment.payment_channel ?? '').startsWith('click')) {
      await markFiscalFailed(
        supabase,
        paymentId,
        'Click payment approved but click_merchant_payment_id is empty; fiscalization cannot start.'
      );
    }
    return;
  }

  if (payment.fiscal_status === 'success') return;

  const attempts = Number(payment.fiscal_attempt_count ?? 0);
  if (attempts >= FISCAL_MAX_ATTEMPTS) {
    console.info('[click.fiscal] skip — max attempts', paymentId, attempts);
    return;
  }

  if (!fiscalGate.ok) {
    console.warn('[click.fiscal] skipped', paymentId, fiscalGate.reason);
    await markFiscalFailed(
      supabase,
      paymentId,
      `Fiscal config is incomplete: ${String(fiscalGate.reason ?? 'unknown reason')}`
    );
    return;
  }

  if (!merchantUserId || !secretKey || !merchantCfg.serviceId || !Number.isFinite(serviceId)) {
    console.warn('[click.fiscal] skipped — Click merchant credentials incomplete');
    await markFiscalFailed(
      supabase,
      paymentId,
      'Click merchant credentials are incomplete (service_id / merchant_user_id / secret_key).'
    );
    return;
  }

  const nextAttempt = attempts + 1;
  await supabase
    .from('payments')
    .update({
      fiscal_attempt_count: nextAttempt,
      fiscal_status: 'pending',
      fiscal_error: null,
    })
    .eq('id', paymentId);

  const amountSoum = Number(payment.amount ?? 0);
  if (!Number.isFinite(amountSoum) || amountSoum <= 0) {
    await markFiscalFailed(supabase, paymentId, 'Invalid payment amount for fiscalization');
    return;
  }

  const totalTiyin = Math.round(amountSoum * 100);
  const productCode = normalizePaymentProductCode(payment.product_code);
  const itemName = subscriptionItemLabel(productCode, payment.tariff_type).slice(0, 63);
  const commission = commissionPayload(fiscalEnv)!;
  const { vat, vatPercentByte } = vatParts(totalTiyin, fiscalEnv.vatPercent);

  const item: ClickOfdItem = {
    Name: itemName,
    SPIC: fiscalEnv.ikpuCode,
    PackageCode: fiscalEnv.packageCode,
    GoodPrice: totalTiyin,
    Price: totalTiyin,
    Amount: 1,
    VAT: vat,
    VATPercent: vatPercentByte,
    CommissionInfo: commission,
  };

  console.info('[click.fiscal] submit_items request', {
    payment_row_id: paymentId,
    click_payment_id: clickPid,
    service_id: serviceId,
    attempt: nextAttempt,
    amount_soum: amountSoum,
    item_name: itemName,
  });

  let submitJson: ClickMerchantJson;
  try {
    submitJson = await clickSubmitOfdItems({
      serviceId,
      paymentId: Number(clickPid),
      items: [item],
      receivedEcash: 0,
      receivedCash: 0,
      receivedCard: totalTiyin,
      merchantUserId,
      secretKey,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[click.fiscal] submit_items network error', paymentId, msg);
    await markFiscalFailed(supabase, paymentId, truncateErr(`submit_items fetch error: ${msg}`));
    return;
  }

  if (!isClickOfdSubmitSuccess(submitJson)) {
    const note = String(submitJson?.error_note ?? 'submit_items rejected');
    console.warn('[click.fiscal] submit_items failed', paymentId, submitJson);
    await markFiscalFailed(supabase, paymentId, truncateErr(note), {
      submit: jsonSafeSlice(submitJson),
    });
    return;
  }

  let fetchJson: ClickMerchantJson | undefined;
  try {
    fetchJson = await clickFetchOfdReceipt({
      serviceId,
      paymentId: Number(clickPid),
      merchantUserId,
      secretKey,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[click.fiscal] fetch ofd_data error', paymentId, msg);
  }

  const qrUrl =
    typeof fetchJson?.qrCodeURL === 'string'
      ? fetchJson.qrCodeURL.trim()
      : typeof fetchJson?.qr_code_url === 'string'
        ? String(fetchJson.qr_code_url).trim()
        : '';

  const receiptId =
    qrUrl ||
    (fetchJson?.paymentId != null ? String(fetchJson.paymentId) : String(clickPid));

  const rawCombined = jsonSafeSlice({
    submit: submitJson,
    fetch: fetchJson ?? null,
    payment_row_id: paymentId,
    click_payment_id: clickPid,
  });

  await supabase
    .from('payments')
    .update({
      fiscal_status: 'success',
      fiscal_receipt_id: receiptId.slice(0, 2048),
      fiscal_raw_response: rawCombined as unknown as Record<string, unknown>,
      fiscal_error: null,
    })
    .eq('id', paymentId);

  console.info('[click.fiscal] success', paymentId, {
    receipt_preview: receiptId.slice(0, 120),
    had_fetch: Boolean(fetchJson),
  });
}

async function markFiscalFailed(
  supabase: SupabaseClient,
  paymentId: number,
  message: string,
  partial?: Record<string, unknown>
): Promise<void> {
  let raw: Record<string, unknown> | null = null;
  if (partial) {
    raw = partial as Record<string, unknown>;
  }
  await supabase
    .from('payments')
    .update({
      fiscal_status: 'failed',
      fiscal_error: truncateErr(message),
      ...(raw ? { fiscal_raw_response: raw as unknown as Record<string, unknown> } : {}),
    })
    .eq('id', paymentId);
  console.warn('[click.fiscal] marked failed', paymentId, message.slice(0, 500));
}

export async function runClickFiscalRetryCron(
  supabase: SupabaseClient
): Promise<{ scanned: number; processed: number }> {
  const { data: rows, error } = await supabase
    .from('payments')
    .select('id')
    .eq('status', 'approved')
    .eq('fiscal_status', 'failed')
    .lt('fiscal_attempt_count', FISCAL_MAX_ATTEMPTS)
    .not('click_merchant_payment_id', 'is', null)
    .order('id', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[cron click-fiscal-retry]', error.message);
    return { scanned: 0, processed: 0 };
  }

  let processed = 0;
  for (const r of rows ?? []) {
    const id = Number((r as { id: number }).id);
    if (!Number.isFinite(id)) continue;
    await fiscalizePayment(supabase, id);
    processed += 1;
  }

  console.info('[cron click-fiscal-retry]', { scanned: (rows ?? []).length, processed });
  return { scanned: (rows ?? []).length, processed };
}
