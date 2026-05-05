import type { SupabaseClient } from '@supabase/supabase-js';
import {
  clickCardTokenDelete,
  clickCardTokenPayment,
  clickCardTokenRequest,
  clickCardTokenVerify,
  clickMerchantErrorCode,
  clickPaymentStatus,
  isClickMerchantSuccess,
  isClickPaymentSucceeded,
  maskCardNumberInput,
  type ClickMerchantJson,
} from '../../shared/clickMerchantClient.js';
import { getClickConfig } from '../../shared/clickConfig.js';
import {
  buildClickTokenPaymentProofUrl,
} from '../../shared/clickPayments.js';
import {
  CARD_PAN_DIGITS_UZ,
  isValidPanLuhn,
} from '../../shared/cardPan.js';
import {
  encryptCardTokenPlaintext,
  decryptCardTokenPlaintext,
} from '../../shared/cardTokenCrypto.js';
import { isPaymentsProductCodeSchemaError } from '../../shared/paymentsCompat.js';
import {
  activateRussianSubscription,
} from '../../shared/paymentActivation.js';
import {
  getCourseProductPrice,
  isPaymentProductCode,
  isSubscriptionTariffType,
  type PaymentProductCode,
  type SubscriptionTariffType,
} from '../../shared/paymentProducts.js';
import { invalidateAccessCache } from './subscription.service.js';
import { fiscalizePayment } from './clickFiscal.service.js';
import { resolveRussianTariffQuote } from './promoPricing.service.js';

const MAX_CHARGE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function planTypeToTariff(planType: string): SubscriptionTariffType | null {
  if (planType === 'monthly') return 'month';
  if (planType === 'yearly') return 'year';
  return null;
}

function tariffToDbTariffKey(t: SubscriptionTariffType): 'month' | 'year' {
  return t === 'year' ? 'year' : 'month';
}

async function logClickSafe(
  supabase: SupabaseClient,
  row: {
    user_id?: number | null;
    subscription_id?: number | null;
    operation: string;
    click_payment_id?: string | null;
    merchant_trans_id?: string | null;
    error_code?: number | null;
    error_note?: string | null;
    request_safe?: Record<string, unknown> | null;
    response_safe?: Record<string, unknown> | null;
  }
) {
  try {
    await supabase.from('click_payment_logs').insert({
      user_id: row.user_id ?? null,
      subscription_id: row.subscription_id ?? null,
      operation: row.operation,
      click_payment_id: row.click_payment_id ?? null,
      merchant_trans_id: row.merchant_trans_id ?? null,
      error_code: row.error_code ?? null,
      error_note: row.error_note ?? null,
      request_safe: row.request_safe ?? null,
      response_safe: row.response_safe ?? null,
    });
  } catch (e) {
    console.warn('[click_payment_logs]', e instanceof Error ? e.message : e);
  }
}

async function fetchUzAmountForTariff(
  supabase: SupabaseClient,
  tariffType: SubscriptionTariffType
): Promise<number> {
  const key = tariffToDbTariffKey(tariffType);
  const { data: row } = await supabase
    .from('tariff_prices')
    .select('price')
    .eq('currency', 'UZS')
    .eq('tariff_type', key)
    .maybeSingle();
  return row != null ? Number((row as { price: number }).price) : 0;
}

async function userHasPendingPaymentForProduct(
  supabase: SupabaseClient,
  userId: number,
  productCode: PaymentProductCode
): Promise<boolean> {
  let q = supabase
    .from('payments')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('product_code', productCode)
    .limit(1)
    .maybeSingle();
  let { data: pending, error } = await q;
  if (error && isPaymentsProductCodeSchemaError(error)) {
    const legacy = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();
    pending = legacy.data;
  }
  return Boolean(pending);
}

async function chargeCardTokenWithRetries(params: {
  supabase: SupabaseClient;
  userId: number;
  serviceId: number;
  merchantUserId: string;
  secretKey: string;
  cardTokenPlain: string;
  amount: number;
  merchantTransId: string;
  subscriptionId?: number | null;
}): Promise<{ ok: boolean; paymentId: string | null; lastJson: ClickMerchantJson }> {
  let lastJson: ClickMerchantJson = {};
  let paymentId: string | null = null;
  for (let attempt = 1; attempt <= MAX_CHARGE_ATTEMPTS; attempt++) {
    lastJson = await clickCardTokenPayment({
      serviceId: params.serviceId,
      card_token: params.cardTokenPlain,
      amount: params.amount,
      transaction_parameter: params.merchantTransId,
      merchantUserId: params.merchantUserId,
      secretKey: params.secretKey,
    });
    paymentId = lastPaymentIdFromJson(lastJson);
    await logClickSafe(params.supabase, {
      user_id: params.userId,
      subscription_id: params.subscriptionId ?? null,
      operation: `card_token_payment_attempt_${attempt}`,
      click_payment_id: paymentId,
      merchant_trans_id: params.merchantTransId,
      error_code: clickMerchantErrorCode(lastJson),
      error_note: String(lastJson?.error_note ?? ''),
      response_safe: lastJson as Record<string, unknown>,
    });

    if (isClickPaymentSucceeded(lastJson)) {
      return { ok: true, paymentId, lastJson };
    }
    const pid =
      lastJson.payment_id != null ? String(lastJson.payment_id) : paymentId;
    if (pid) {
      const st = await clickPaymentStatus({
        serviceId: params.serviceId,
        paymentId: pid,
        merchantUserId: params.merchantUserId,
        secretKey: params.secretKey,
      });
      await logClickSafe(params.supabase, {
        user_id: params.userId,
        subscription_id: params.subscriptionId ?? null,
        operation: `payment_status_poll_${attempt}`,
        click_payment_id: pid,
        merchant_trans_id: params.merchantTransId,
        error_code: clickMerchantErrorCode(st),
        error_note: String(st?.error_note ?? ''),
        response_safe: st as Record<string, unknown>,
      });
      if (isClickPaymentSucceeded(st)) {
        return { ok: true, paymentId: pid, lastJson: st };
      }
    }
    if (attempt < MAX_CHARGE_ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }
  return { ok: false, paymentId, lastJson };
}

function lastPaymentIdFromJson(json: ClickMerchantJson): string | null {
  const raw = json?.payment_id;
  if (raw == null) return null;
  return String(raw);
}

async function insertClickTokenPaymentPending(
  supabase: SupabaseClient,
  params: {
    userId: number;
    productCode: PaymentProductCode;
    tariffType: SubscriptionTariffType | null;
    amount: number;
    baseAmount?: number;
    discountAmount?: number;
    discountMeta?: Record<string, unknown> | null;
    paymentChannel: 'click_auto_token' | 'click_auto_cron';
  }
): Promise<number> {
  const insertBase: Record<string, unknown> = {
    user_id: params.userId,
    tariff_type: params.tariffType,
    currency: 'UZS',
    amount: params.amount,
    base_amount: params.baseAmount ?? params.amount,
    discount_amount: params.discountAmount ?? 0,
    discount_meta: params.discountMeta ?? null,
    payment_time: new Date().toISOString(),
    status: 'pending',
    payment_channel: params.paymentChannel,
  };
  let { data: row, error } = await supabase
    .from('payments')
    .insert({ ...insertBase, product_code: params.productCode })
    .select('id')
    .single();
  if (error && isPaymentsProductCodeSchemaError(error)) {
    const legacyIns = await supabase
      .from('payments')
      .insert({
        ...insertBase,
        tariff_type: params.tariffType ?? 'month',
      })
      .select('id')
      .single();
    row = legacyIns.data;
    error = legacyIns.error;
  }
  if (error || !row) throw error ?? new Error('Payment yozilmadi');
  const paymentId = Number((row as { id: number }).id);
  await supabase
    .from('payments')
    .update({ payment_proof_url: buildClickTokenPaymentProofUrl(paymentId) })
    .eq('id', paymentId);
  return paymentId;
}

export async function handleClickCardTokenRequest(
  supabase: SupabaseClient,
  userId: number,
  body: Record<string, unknown>
): Promise<{ status: number; json: Record<string, unknown> }> {
  const cfg = getClickConfig();
  const serviceId = Number(cfg.serviceId);
  if (!cfg.serviceId || !Number.isFinite(serviceId)) {
    return { status: 503, json: { error: 'CLICK_SERVICE_ID sozlanmagan' } };
  }

  const card_number_raw = String(body.card_number ?? '').trim();
  const card_digits = card_number_raw.replace(/\D/g, '');
  const expire_date = String(body.expire_date ?? '').replace(/\D/g, '');
  const plan_type = String(body.plan_type ?? body.tariff_type ?? '').trim();
  const productCodeRaw = String(body.product_code ?? '').trim();
  const productCode: PaymentProductCode = isPaymentProductCode(productCodeRaw) ? productCodeRaw : 'russian';

  if (!card_digits || expire_date.length !== 4) {
    return {
      status: 400,
      json: {
        error: 'card_number, expire_date (karta muddati: oy-yil, 4 raqam) kerak',
      },
    };
  }
  if (productCode === 'russian' && !isSubscriptionTariffType(plan_type)) {
    return {
      status: 400,
      json: {
        error: 'Rus tili uchun plan_type kerak: month | year',
      },
    };
  }

  if (card_digits.length !== CARD_PAN_DIGITS_UZ || !isValidPanLuhn(card_digits)) {
    return {
      status: 400,
      json: { error: 'Karta raqami noto‘g‘ri (16 raqam, format tekshiruvi)' },
    };
  }

  const maskedReq = maskCardNumberInput(card_digits);
  const apiJson = await clickCardTokenRequest({
    serviceId,
    card_number: card_digits,
    expire_date,
    temporary: 0,
  });
  await logClickSafe(supabase, {
    user_id: userId,
    operation: 'card_token_request',
    error_code: clickMerchantErrorCode(apiJson),
    error_note: String(apiJson?.error_note ?? ''),
    request_safe: {
      card_number: maskedReq,
      expire_date,
      temporary: 0,
      plan_type,
      product_code: productCode,
    },
    response_safe: apiJson as Record<string, unknown>,
  });

  if (!isClickMerchantSuccess(apiJson)) {
    return {
      status: 400,
      json: {
        error: String(apiJson?.error_note ?? 'Click SMS so‘rovi yuborilmadi'),
        error_code: clickMerchantErrorCode(apiJson),
      },
    };
  }

  return {
    status: 200,
    json: {
      phone_number: String(apiJson.phone_number ?? ''),
      card_token: String(apiJson.card_token ?? ''),
      temporary: Number(apiJson.temporary ?? 0),
    },
  };
}

export async function handleClickCardTokenVerify(
  supabase: SupabaseClient,
  userId: number,
  body: Record<string, unknown>
): Promise<{ status: number; json: Record<string, unknown> }> {
  const cfg = getClickConfig();
  const serviceId = Number(cfg.serviceId);
  const merchantUserId = cfg.apiMerchantUserId?.trim();
  const secretKey = cfg.secretKey?.trim();

  if (!merchantUserId || !secretKey || !cfg.serviceId || !Number.isFinite(serviceId)) {
    return { status: 503, json: { error: 'Click Merchant API sozlanmagan (CLICK_MERCHANT_USER_ID, CLICK_SECRET_KEY, CLICK_SERVICE_ID)' } };
  }

  const card_token = String(body.card_token ?? '').trim();
  const sms_code = body.sms_code;
  const plan_type = String(body.plan_type ?? body.tariff_type ?? '').trim();
  const productCodeRaw = String(body.product_code ?? '').trim();
  const productCode: PaymentProductCode = isPaymentProductCode(productCodeRaw) ? productCodeRaw : 'russian';

  if (!card_token || sms_code == null || sms_code === '') {
    return {
      status: 400,
      json: { error: 'card_token, sms_code kerak' },
    };
  }
  if (productCode === 'russian' && !isSubscriptionTariffType(plan_type)) {
    return {
      status: 400,
      json: { error: 'Rus tili uchun plan_type kerak: month | year' },
    };
  }

  if (await userHasPendingPaymentForProduct(supabase, userId, productCode)) {
    return {
      status: 400,
      json: {
        error: 'PENDING_PAYMENT',
        message: "Oldingi to'lov tekshirilmoqda",
      },
    };
  }

  const tariffType = isSubscriptionTariffType(plan_type) ? (plan_type as SubscriptionTariffType) : null;
  const verifyJson = await clickCardTokenVerify({
    serviceId,
    card_token,
    sms_code: String(sms_code).trim(),
    merchantUserId,
    secretKey,
  });
  await logClickSafe(supabase, {
    user_id: userId,
    operation: 'card_token_verify',
    error_code: clickMerchantErrorCode(verifyJson),
    error_note: String(verifyJson?.error_note ?? ''),
    response_safe: verifyJson as Record<string, unknown>,
  });

  if (!isClickMerchantSuccess(verifyJson)) {
    return {
      status: 400,
      json: {
        error: String(verifyJson?.error_note ?? 'SMS kod noto‘g‘ri'),
        error_code: clickMerchantErrorCode(verifyJson),
      },
    };
  }

  const maskedCard = String(verifyJson.card_number ?? '').trim();

  const encrypted = encryptCardTokenPlaintext(card_token);
  const nowIso = new Date().toISOString();

  await supabase
    .from('card_tokens')
    .update({ is_active: false, updated_at: nowIso })
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data: tokenRow, error: tokErr } = await supabase
    .from('card_tokens')
    .insert({
      user_id: userId,
      encrypted_card_token: encrypted,
      masked_phone: null,
      masked_card: maskedCard || null,
      is_active: true,
      updated_at: nowIso,
    })
    .select('id')
    .single();

  if (tokErr || !tokenRow) {
    console.error('[card_tokens insert]', tokErr);
    return { status: 500, json: { error: 'Karta tokeni saqlanmadi' } };
  }

  const cardTokenId = Number((tokenRow as { id: number }).id);

  let amount = 0;
  let baseAmount = 0;
  let discountAmount = 0;
  let discountMeta: Record<string, unknown> | null = null;
  if (productCode === 'russian') {
    const quote = await resolveRussianTariffQuote(supabase, {
      userId,
      currency: 'UZS',
      tariffType: (tariffType ?? 'month'),
      startPromoIfMissing: false,
    });
    amount = quote.finalAmount;
    baseAmount = quote.baseAmount;
    discountAmount = quote.discountAmount;
    discountMeta = quote.discountAmount > 0
      ? {
          campaign: 'russian-first-tariffs-30m',
          expires_at: quote.promo.expiresAt,
          currency: 'UZS',
          tariff_type: quote.tariffType,
        }
      : null;
  } else {
    amount = getCourseProductPrice(productCode, 'UZS');
    baseAmount = amount;
  }
  if (!amount || amount <= 0) {
    await supabase.from('card_tokens').update({ is_active: false }).eq('id', cardTokenId);
    return { status: 400, json: { error: "Tarif narxi topilmadi" } };
  }

  let paymentId: number;
  try {
    paymentId = await insertClickTokenPaymentPending(supabase, {
      userId,
      tariffType,
      productCode,
      amount,
      baseAmount,
      discountAmount,
      discountMeta,
      paymentChannel: 'click_auto_token',
    });
  } catch (e) {
    await supabase.from('card_tokens').update({ is_active: false }).eq('id', cardTokenId);
    return {
      status: 500,
      json: { error: e instanceof Error ? e.message : 'To‘lov yozilmadi' },
    };
  }

  const merchantTransId = String(paymentId);
  const charge = await chargeCardTokenWithRetries({
    supabase,
    userId,
    serviceId,
    merchantUserId,
    secretKey,
    cardTokenPlain: card_token,
    amount,
    merchantTransId,
    subscriptionId: null,
  });

  if (!charge.ok) {
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId);
    await supabase.from('card_tokens').update({ is_active: false }).eq('id', cardTokenId);
    await supabase.from('users').update({
      billing_notice_uz:
        'Karta rad etildi. Click kabinetiga kirib, boshqa karta bilan qayta urinib ko‘ring.',
    }).eq('id', userId);
    return {
      status: 402,
      json: {
        error: 'CARD_DECLINED',
        message: 'Karta rad etildi',
        hint: 'Keyinroq qayta urinib ko‘ring yoki boshqa kartadan foydalaning.',
        click: charge.lastJson,
      },
    };
  }

  const approvePatch: Record<string, unknown> = {
    status: 'approved',
    approved_at: new Date().toISOString(),
    click_merchant_payment_id: charge.paymentId,
  };
  await supabase.from('payments').update(approvePatch).eq('id', paymentId);

  try {
    if (productCode === 'russian' && tariffType) {
      await activateRussianSubscription(supabase, {
        userId,
        tariffType,
        extras: {
          auto_payment_enabled: true,
          card_token_id: cardTokenId,
          next_payment_date: null,
        },
      });
      const { data: u } = await supabase
        .from('users')
        .select('plan_expires_at')
        .eq('id', userId)
        .single();
      const next = u?.plan_expires_at ? String(u.plan_expires_at) : null;
      const { data: latestSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('auto_payment_enabled', true)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestSub?.id && next) {
        await supabase
          .from('subscriptions')
          .update({ next_payment_date: next })
          .eq('id', latestSub.id);
      }
      await supabase.from('users').update({
        billing_notice_uz:
          'Avtomatik to‘lov yoqildi. Keyingi yechilish muddatiga yaqinligi haqida xabar beramiz.',
      }).eq('id', userId);
    }
    invalidateAccessCache(userId);
  } catch (activationErr) {
    console.error('[click verify activation]', activationErr);
    void fiscalizePayment(supabase, paymentId);
    return {
      status: 500,
      json: {
        error: 'To‘lov tasdiqlandi, lekin obuna yangilanmadi. Qo‘llab-quvvatlashga yozing.',
      },
    };
  }

  void fiscalizePayment(supabase, paymentId);

  return {
    status: 200,
    json: {
      success: true,
      payment_id: paymentId,
      click_payment_id: charge.paymentId,
      auto_pay_enabled: true,
      message: 'Avtomatik to‘lov yoqildi',
    },
  };
}

export async function handleClickCardTokenDelete(
  supabase: SupabaseClient,
  userId: number
): Promise<{ status: number; json: Record<string, unknown> }> {
  const cfg = getClickConfig();
  const serviceId = Number(cfg.serviceId);
  const merchantUserId = cfg.apiMerchantUserId?.trim();
  const secretKey = cfg.secretKey?.trim();
  if (!merchantUserId || !secretKey || !cfg.serviceId || !Number.isFinite(serviceId)) {
    return { status: 503, json: { error: 'Click sozlanmagan' } };
  }

  const { data: row } = await supabase
    .from('card_tokens')
    .select('id, encrypted_card_token')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return { status: 404, json: { error: 'Faol token topilmadi' } };
  }

  let plain: string;
  try {
    plain = decryptCardTokenPlaintext(String((row as { encrypted_card_token: string }).encrypted_card_token));
  } catch {
    return { status: 500, json: { error: 'Token ochilmadi' } };
  }

  const delJson = await clickCardTokenDelete({
    serviceId,
    card_token: plain,
    merchantUserId,
    secretKey,
  });
  await logClickSafe(supabase, {
    user_id: userId,
    operation: 'card_token_delete',
    error_code: clickMerchantErrorCode(delJson),
    error_note: String(delJson?.error_note ?? ''),
    response_safe: delJson as Record<string, unknown>,
  });

  await supabase
    .from('card_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', (row as { id: number }).id);

  await supabase
    .from('subscriptions')
    .update({
      auto_payment_enabled: false,
      auto_payment_last_error: 'Foydalanuvchi avtomatik to‘lovni o‘chirdi',
    })
    .eq('user_id', userId)
    .eq('auto_payment_enabled', true);

  await supabase.from('users').update({ billing_notice_uz: null }).eq('id', userId);

  invalidateAccessCache(userId);

  return {
    status: 200,
    json: {
      success: true,
      click: delJson,
    },
  };
}

export async function runClickAutoRenewalCron(
  supabase: SupabaseClient
): Promise<{ scanned: number; renewed: number; failed: number }> {
  const cfg = getClickConfig();
  const serviceId = Number(cfg.serviceId);
  const merchantUserId = cfg.apiMerchantUserId?.trim();
  const secretKey = cfg.secretKey?.trim();
  if (!merchantUserId || !secretKey || !cfg.serviceId || !Number.isFinite(serviceId)) {
    console.warn('[cron click-auto-pay] Click config incomplete');
    return { scanned: 0, renewed: 0, failed: 0 };
  }

  const nowIso = new Date().toISOString();
  const { data: dueRows, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_type, card_token_id, expires_at, next_payment_date')
    .eq('status', 'active')
    .eq('auto_payment_enabled', true)
    .not('card_token_id', 'is', null)
    .lte('next_payment_date', nowIso);

  if (error) {
    console.error('[cron click-auto-pay]', error.message);
    return { scanned: 0, renewed: 0, failed: 0 };
  }

  let renewed = 0;
  let failed = 0;

  for (const raw of dueRows ?? []) {
    const sub = raw as {
      id: number;
      user_id: number;
      plan_type: string;
      card_token_id: number;
      expires_at: string;
      next_payment_date: string | null;
    };

    const tariff = planTypeToTariff(sub.plan_type);
    if (!tariff) {
      failed += 1;
      continue;
    }

    const { data: tok } = await supabase
      .from('card_tokens')
      .select('id, encrypted_card_token, is_active')
      .eq('id', sub.card_token_id)
      .maybeSingle();

    if (!tok || !(tok as { is_active: boolean }).is_active) {
      await supabase
        .from('subscriptions')
        .update({
          auto_payment_enabled: false,
          auto_payment_last_error: 'Token faol emas',
        })
        .eq('id', sub.id);
      failed += 1;
      continue;
    }

    let plainToken: string;
    try {
      plainToken = decryptCardTokenPlaintext(
        String((tok as { encrypted_card_token: string }).encrypted_card_token)
      );
    } catch {
      await supabase
        .from('subscriptions')
        .update({
          auto_payment_enabled: false,
          auto_payment_last_error: 'Token shifri buzildi',
        })
        .eq('id', sub.id);
      failed += 1;
      continue;
    }

    const amount = await fetchUzAmountForTariff(supabase, tariff);
    if (!amount || amount <= 0) {
      failed += 1;
      continue;
    }

    let paymentId: number;
    try {
      paymentId = await insertClickTokenPaymentPending(supabase, {
        userId: sub.user_id,
        productCode: 'russian',
        tariffType: tariff,
        amount,
        paymentChannel: 'click_auto_cron',
      });
    } catch {
      failed += 1;
      continue;
    }

    const merchantTransId = String(paymentId);
    const charge = await chargeCardTokenWithRetries({
      supabase,
      userId: sub.user_id,
      serviceId,
      merchantUserId,
      secretKey,
      cardTokenPlain: plainToken,
      amount,
      merchantTransId,
      subscriptionId: sub.id,
    });

    if (!charge.ok) {
      await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId);
      const retries = MAX_CHARGE_ATTEMPTS;
      await supabase
        .from('subscriptions')
        .update({
          auto_payment_enabled: false,
          auto_payment_retry_count: retries,
          auto_payment_last_error: String(charge.lastJson?.error_note ?? 'Charge failed'),
        })
        .eq('id', sub.id);
      await supabase.from('users').update({
        billing_notice_uz:
          'Avtomatik to‘lov 3 marta urinib ko‘rilgan bo‘lsa ham amalga oshmadi. Kartangizni tekshiring yoki «Tariflar»dan qo‘lda to‘lang. Avtomatik to‘lov o‘chirildi.',
      }).eq('id', sub.user_id);
      failed += 1;
      invalidateAccessCache(sub.user_id);
      continue;
    }

    await supabase
      .from('payments')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        click_merchant_payment_id: charge.paymentId,
      })
      .eq('id', paymentId);

    void fiscalizePayment(supabase, paymentId);

    await supabase
      .from('subscriptions')
      .update({ status: 'expired', auto_payment_enabled: false })
      .eq('id', sub.id);

    try {
      await activateRussianSubscription(supabase, {
        userId: sub.user_id,
        tariffType: tariff,
        extras: {
          auto_payment_enabled: true,
          card_token_id: sub.card_token_id,
          next_payment_date: null,
        },
      });
      const { data: u } = await supabase
        .from('users')
        .select('plan_expires_at')
        .eq('id', sub.user_id)
        .single();
      const next = u?.plan_expires_at ? String(u.plan_expires_at) : null;
      const { data: latestSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('auto_payment_enabled', true)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestSub?.id && next) {
        await supabase
          .from('subscriptions')
          .update({ next_payment_date: next, auto_payment_retry_count: 0, auto_payment_last_error: null })
          .eq('id', latestSub.id);
      }
      await supabase.from('users').update({ billing_notice_uz: null }).eq('id', sub.user_id);
      invalidateAccessCache(sub.user_id);
      renewed += 1;
    } catch (e) {
      console.error('[cron renewal activation]', e);
      failed += 1;
    }
  }

  return { scanned: (dueRows ?? []).length, renewed, failed };
}
