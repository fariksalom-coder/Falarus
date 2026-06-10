import type { DbClient } from '../types/dbClient';
import { getMulticardConfig } from '../../shared/multicardConfig.js';
import {
  getClickAmountForProduct,
  isExpiredClickPending,
  isExpiredRahmatPending,
} from '../../shared/clickPayments.js';
import {
  multicardCreateInvoice,
  soumToTiyin,
  verifyMulticardCallbackSign,
  shouldSkipMulticardSignatureVerify,
  MULTICARD_CALLBACK_IP,
  type MulticardOfdLine,
} from '../../shared/multicardPayments.js';
import {
  getPaymentDisplayLabel,
  isPaymentProductCode,
  isSubscriptionTariffType,
  normalizePaymentProductCode,
} from '../../shared/paymentProducts.js';
import { isPaymentsProductCodeSchemaError } from '../../shared/paymentsCompat.js';
import { activateApprovedPayment } from '../../shared/paymentActivation.js';
import { getTeacherListingPriceUzs } from '../../shared/paymentProducts.js';
import {
  ensureTeacherListingSubscription,
  parseTeacherListingPlanCode,
} from './teacherMarketplace.service.js';
import {
  embedFalarusProductInProofUrl,
  inferCourseProductFromPaymentAmount,
  resolvePaymentProductFromRow,
} from '../../shared/paymentsProofUrl.js';
import { invalidateAccessCache } from './subscription.service.js';
import { resolveRussianTariffQuote } from './promoPricing.service.js';
import { recordPaymentEvent, extractRequestMeta } from '../lib/paymentEvents.js';
import {
  isRahmatPartnerCallbackEnabled,
  postRahmatPaymentAppSuccessCallback,
} from '../../shared/rahmatPartnerCallback.js';

export type RahmatCreateBody = {
  tariff_type?: unknown;
  product_code?: unknown;
};

export type RahmatCreateJson =
  | { success: true; payment_id: number; payment_url: string; amount: number; currency: 'UZS' }
  | { error: string; message?: string; user_message?: string; code?: string };

/** Foydalanuvchiga ko‘rinadigan qisqa izoh (texnik `message` jurnalda qoladi). */
function userHintForRahmatInvoiceFailure(technicalMessage: string, publicApiBaseUrl: string): string {
  const haystack = `${technicalMessage} ${publicApiBaseUrl}`.toLowerCase();
  if (haystack.includes('localhost') || haystack.includes('127.0.0.1')) {
    return "Multicard callback uchun asosiy manzil HTTPS va internetdan ochiq bo‘lishi kerak. Mahalliy port ishlamaydi — ngrok yoki Cloudflare Tunnel HTTPS URL sini .env dagi MULTICARD_PUBLIC_API_BASE_URL ga qo‘ying.";
  }
  if (/toarray\(\)\s+on\s+null/i.test(technicalMessage)) {
    return "Kassa (MULTICARD_STORE_ID) yoki OFD: ИКПУ / package_code Multicard bilan mos kelmayapti. MULTICARD_OFD_MXIK va MULTICARD_OFD_PACKAGE_CODE (yoki CLICK_IKPU_CODE, CLICK_PACKAGE_CODE) ni tekshiring.";
  }
  if (/tarmoq xatosi|fetch failed|econnrefused|enotfound|socket hang up/i.test(haystack)) {
    return "Multicard serveriga ulanib bo‘lmadi. Internet va MULTICARD_BASE_URL (masalan, https://dev-mesh.multicard.uz) ni tekshiring.";
  }
  if (/auth:|token yo‘q|401|403/i.test(technicalMessage)) {
    return "Multicard autentifikatsiyasi xato. MULTICARD_APPLICATION_ID va MULTICARD_SECRET to‘g‘riligini tekshiring.";
  }
  return "To‘lov sahifasini hozircha ochib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring yoki qo‘llab-quvvatlashga murojaat qiling.";
}

export async function createRahmatMulticardPayment(
  supabase: DbClient,
  userId: number,
  body: RahmatCreateBody
): Promise<{ status: number; json: RahmatCreateJson }> {
  const cfg = getMulticardConfig();
  if (!cfg.configured) {
    return {
      status: 503,
      json: {
        error: 'MULTICARD_NOT_CONFIGURED',
        message:
          'Rahmat hozircha sozlanmagan. MULTICARD_APPLICATION_ID, MULTICARD_SECRET, MULTICARD_STORE_ID, MULTICARD_PUBLIC_API_BASE_URL, MULTICARD_RETURN_URL va OFD (MULTICARD_OFD_MXIK, MULTICARD_OFD_PACKAGE_CODE yoki CLICK_*) kerak.',
      },
    };
  }

  const tariffTypeRaw = String(body.tariff_type ?? '').trim();
  const rawProductCode =
    typeof body.product_code === 'string' ? body.product_code.trim() : body.product_code;
  if (!isPaymentProductCode(rawProductCode)) {
    return {
      status: 400,
      json: {
        error: 'INVALID_PRODUCT_CODE',
        message: "product_code majburiy va patent | vnzh | russian bo‘lishi kerak.",
      },
    };
  }
  const productCode = rawProductCode;
  const russianTariffType = isSubscriptionTariffType(tariffTypeRaw) ? tariffTypeRaw : null;
  if (productCode === 'russian' && !russianTariffType) {
    return { status: 400, json: { error: 'tariff_type kerak: month, year' } };
  }
  const listingPlanCode =
    productCode === 'teacher_listing' ? parseTeacherListingPlanCode(body as Record<string, unknown>) : null;
  if (productCode === 'teacher_listing' && !listingPlanCode) {
    return { status: 400, json: { error: 'listing_plan_code kerak' } };
  }
  if (productCode === 'teacher_listing') {
    const { data: account } = await supabase
      .from('users')
      .select('account_type')
      .eq('id', userId)
      .maybeSingle();
    if ((account as { account_type?: string } | null)?.account_type !== 'teacher') {
      return { status: 403, json: { error: "Bu to'lov faqat o'qituvchilar uchun" } };
    }
  }

  let { data: pending, error: pendingErr } = await supabase
    .from('payments')
    .select('id, payment_channel, payment_proof_url, amount, created_at, payment_time')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('product_code', productCode)
    .limit(1)
    .maybeSingle();
  if (pendingErr && isPaymentsProductCodeSchemaError(pendingErr)) {
    pending = null;
  }
  if (pending && isExpiredRahmatPending(pending as Parameters<typeof isExpiredRahmatPending>[0])) {
    await supabase
      .from('payments')
      .update({ status: 'rejected' })
      .eq('id', Number((pending as { id: number }).id))
      .eq('status', 'pending');
    pending = null;
  }
  if (pending && isExpiredClickPending(pending as Parameters<typeof isExpiredClickPending>[0])) {
    await supabase
      .from('payments')
      .update({ status: 'rejected' })
      .eq('id', Number((pending as { id: number }).id))
      .eq('status', 'pending');
    pending = null;
  }
  // Yangi Rahmat urinish: avvalgi to'liq tugamagan Rahmat pending — bekor (iOS / popup / checkout yopilganda
  // "admin tekshiruvi" holatiga tushmasin; yangi invoice yaratiladi). Manual / boshqa kanallar saqlanadi.
  if (pending && String((pending as { payment_channel?: string | null }).payment_channel ?? '') === 'rahmat') {
    await supabase
      .from('payments')
      .update({ status: 'rejected' })
      .eq('id', Number((pending as { id: number }).id))
      .eq('status', 'pending');
    pending = null;
  }
  if (pending) {
    return {
      status: 400,
      json: {
        error: 'PENDING_PAYMENT',
        message:
          "To'lovingiz tekshirilmoqda. Administrator tez orada to'lovni tasdiqlaydi. Tasdiqlangandan so'ng sizga kursga kirish ochiladi.",
      },
    };
  }

  let amount = 0;
  let baseAmount = 0;
  let discountAmount = 0;
  let discountMeta: Record<string, unknown> | null = null;
  if (productCode === 'russian' && russianTariffType) {
    const quote = await resolveRussianTariffQuote(supabase, {
      userId,
      currency: 'UZS',
      tariffType: russianTariffType,
      startPromoIfMissing: false,
    });
    amount = quote.finalAmount;
    baseAmount = quote.baseAmount;
    discountAmount = quote.discountAmount;
    discountMeta =
      quote.discountAmount > 0
        ? {
            campaign: 'russian-first-tariffs-30m',
            expires_at: quote.promo.expiresAt,
            currency: quote.currency,
            tariff_type: quote.tariffType,
          }
        : null;
  } else if (productCode === 'teacher_listing' && listingPlanCode) {
    amount = getTeacherListingPriceUzs(listingPlanCode);
    baseAmount = amount;
    discountMeta = { listing_plan_code: listingPlanCode };
  } else {
    amount = getClickAmountForProduct({
      productCode,
      tariffType: null,
      tariffPrices: null,
    });
    baseAmount = amount;
  }
  if (!amount || amount <= 0) {
    return { status: 400, json: { error: "To'lov summasi aniqlanmadi" } };
  }

  const insertBase: Record<string, unknown> = {
    user_id: userId,
    tariff_type: productCode === 'russian' ? russianTariffType : null,
    currency: 'UZS',
    amount,
    base_amount: baseAmount || amount,
    discount_amount: discountAmount,
    discount_meta: discountMeta,
    payment_proof_url: null,
    payment_time: new Date().toISOString(),
    status: 'pending' as const,
    payment_channel: 'rahmat',
    multicard_invoice_uuid: null,
  };

  let { data: row, error: insertErr } = await supabase
    .from('payments')
    .insert({ ...insertBase, product_code: productCode })
    .select('id')
    .single();
  if (insertErr && isPaymentsProductCodeSchemaError(insertErr)) {
    const legacyIns = await supabase
      .from('payments')
      .insert({
        ...insertBase,
        tariff_type: productCode === 'russian' ? russianTariffType : 'month',
      })
      .select('id')
      .single();
    row = legacyIns.data;
    insertErr = legacyIns.error;
  }
  if (insertErr || !row) {
    return { status: 500, json: { error: insertErr?.message || 'To‘lov yaratilmadi' } };
  }

  const paymentId = Number((row as { id: number }).id);
  if (productCode === 'teacher_listing' && listingPlanCode) {
    try {
      await ensureTeacherListingSubscription(supabase, userId, paymentId, listingPlanCode);
    } catch (subErr) {
      await supabase.from('payments').delete().eq('id', paymentId);
      const message = subErr instanceof Error ? subErr.message : 'Obuna yaratilmadi';
      return { status: 400, json: { error: message } };
    }
  }
  const invoiceId = String(paymentId);
  const amountTiyin = soumToTiyin(amount);
  const ofdName = getPaymentDisplayLabel(productCode, productCode === 'russian' ? russianTariffType : null);
  const ofd: MulticardOfdLine[] = [
    {
      qty: 1,
      price: amountTiyin,
      mxik: cfg.ofdMxik,
      total: amountTiyin,
      package_code: cfg.ofdPackageCode,
      name: ofdName.slice(0, 255),
      vat: 0,
    },
  ];

  try {
    const inv = await multicardCreateInvoice({
      cfg,
      amountTiyin,
      invoiceId,
      lang: 'uz',
      ofd,
    });
    const checkoutUrl = embedFalarusProductInProofUrl(inv.checkout_url, productCode);
    await supabase
      .from('payments')
      .update({
        payment_proof_url: checkoutUrl,
        multicard_invoice_uuid: inv.uuid,
      })
      .eq('id', paymentId);

    return {
      status: 200,
      json: {
        success: true,
        payment_id: paymentId,
        payment_url: checkoutUrl,
        amount,
        currency: 'UZS',
      },
    };
  } catch (e) {
    await supabase.from('payments').delete().eq('id', paymentId);
    const msg = e instanceof Error ? e.message : 'Multicard xatolik';
    console.error('[rahmat/create]', msg);
    const ofdConfig = /^MULTICARD_OFD_(EMPTY|INVALID):/i.test(msg);
    return {
      status: ofdConfig ? 400 : 503,
      json: {
        error: ofdConfig ? 'MULTICARD_OFD_INVALID' : 'MULTICARD_INVOICE_FAILED',
        message: msg,
        ...(ofdConfig ? {} : { user_message: userHintForRahmatInvoiceFailure(msg, cfg.publicApiBaseUrl) }),
      },
    };
  }
}

export async function handleRahmatMulticardCallback(
  supabase: DbClient,
  req: { body?: unknown; headers?: Record<string, unknown>; ip?: string; socket?: { remoteAddress?: string } }
): Promise<{ status: number; json: Record<string, unknown> }> {
  const cfg = getMulticardConfig();
  const meta = extractRequestMeta(req as Parameters<typeof extractRequestMeta>[0]);
  const payload = (req.body ?? {}) as Record<string, unknown>;

  const audit = async (
    outcome: Parameters<typeof recordPaymentEvent>[1]['outcome'],
    extra: Partial<Parameters<typeof recordPaymentEvent>[1]> = {}
  ) => {
    const paymentId = Number(String(payload.invoice_id ?? ''));
    await recordPaymentEvent(supabase, {
      paymentId: Number.isFinite(paymentId) && paymentId > 0 ? paymentId : null,
      provider: 'multicard',
      eventType: 'callback',
      outcome,
      applied: false,
      providerTransId: String(payload.uuid ?? '') || null,
      payload,
      ip: meta.ip,
      userAgent: meta.userAgent,
      ...extra,
    });
  };

  if (!cfg.configured) {
    void audit('config_missing', { note: 'multicard not configured' });
    return { status: 503, json: { success: false, message: 'Server not configured' } };
  }

  if (cfg.strictCallbackIp && meta.ip && meta.ip !== MULTICARD_CALLBACK_IP) {
    void audit('invalid_payload', { note: `ip=${meta.ip}` });
    return { status: 403, json: { success: false, message: 'Forbidden' } };
  }

  const skip = shouldSkipMulticardSignatureVerify();
  const sigOk = skip ? true : verifyMulticardCallbackSign(payload, cfg.secret);
  if (!sigOk) {
    void audit('invalid_signature', { signatureValid: false });
    return { status: 400, json: { success: false, message: 'Invalid sign' } };
  }

  const paymentId = Number(String(payload.invoice_id ?? '').trim());
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    void audit('invalid_payload', { note: 'invoice_id' });
    return { status: 400, json: { success: false, message: 'Invalid invoice_id' } };
  }

  const amountTiyin = Number(payload.amount);
  if (!Number.isFinite(amountTiyin) || amountTiyin <= 0) {
    void audit('invalid_payload', { note: 'amount' });
    return { status: 400, json: { success: false, message: 'Invalid amount' } };
  }

  let { data: payment, error } = await supabase
    .from('payments')
    .select('id, user_id, tariff_type, product_code, amount, status, payment_channel, multicard_invoice_uuid')
    .eq('id', paymentId)
    .maybeSingle();
  if (error && isPaymentsProductCodeSchemaError(error)) {
    const legacy = await supabase
      .from('payments')
      .select('id, user_id, tariff_type, amount, status, payment_channel, multicard_invoice_uuid')
      .eq('id', paymentId)
      .maybeSingle();
    payment = legacy.data as typeof payment;
    error = legacy.error;
  }
  if (error || !payment) {
    void audit('not_found', { signatureValid: sigOk });
    return { status: 400, json: { success: false, message: 'Invoice not found' } };
  }

  const row = payment as {
    id: number;
    user_id: number;
    tariff_type: string | null;
    product_code: string | null;
    amount: number;
    status: string;
    payment_channel?: string | null;
    multicard_invoice_uuid?: string | null;
  };

  if (row.payment_channel !== 'rahmat') {
    void audit('invalid_payload', { note: 'wrong_channel', signatureValid: sigOk });
    return { status: 400, json: { success: false, message: 'Wrong payment channel' } };
  }

  const expectedTiyin = soumToTiyin(Number(row.amount));
  if (expectedTiyin !== amountTiyin) {
    void audit('amount_mismatch', {
      signatureValid: sigOk,
      amountExpected: expectedTiyin,
      amountReceived: amountTiyin,
    });
    return { status: 400, json: { success: false, message: 'Amount mismatch' } };
  }

  const uuidIncoming = String(payload.uuid ?? '').trim();
  if (uuidIncoming && row.multicard_invoice_uuid && row.multicard_invoice_uuid !== uuidIncoming) {
    void audit('invalid_payload', { note: 'uuid_mismatch', signatureValid: sigOk });
    return { status: 400, json: { success: false, message: 'uuid mismatch' } };
  }

  if (row.status === 'approved') {
    void audit('duplicate', {
      signatureValid: sigOk,
      statusBefore: row.status,
      statusAfter: row.status,
      applied: false,
    });
    return { status: 200, json: { success: true } };
  }

  const extUuid = uuidIncoming || row.multicard_invoice_uuid || null;
  const inferredCourse = inferCourseProductFromPaymentAmount(row);
  const productCodeForAccess = inferredCourse ?? resolvePaymentProductFromRow(row);
  const approvePayload: Record<string, unknown> = {
    status: 'approved' as const,
    approved_at: new Date().toISOString(),
    click_merchant_payment_id: extUuid,
  };
  if (inferredCourse && normalizePaymentProductCode(row.product_code) !== inferredCourse) {
    approvePayload.product_code = inferredCourse;
  }

  let { data: flipped, error: approveErr } = await supabase
    .from('payments')
    .update(approvePayload)
    .eq('id', paymentId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  // Yangi Rahmat urinishi avvalgi pending/rejected qiladi; to‘lov eski invoice bo‘yicha bo‘lsa ham tasdiqlash kerak.
  const canRecoverRejected = row.status === 'rejected' && row.payment_channel === 'rahmat';

  if (!flipped && canRecoverRejected) {
    let recoverQuery = supabase
      .from('payments')
      .update(approvePayload)
      .eq('id', paymentId)
      .eq('status', 'rejected');
    if (uuidIncoming && row.multicard_invoice_uuid) {
      recoverQuery = recoverQuery.eq('multicard_invoice_uuid', uuidIncoming);
    }
    const recovered = await recoverQuery.select('id').maybeSingle();
    flipped = recovered.data;
    if (recovered.error) approveErr = recovered.error;
  }

  if (approveErr) {
    void audit('not_found', { note: approveErr.message, signatureValid: sigOk });
    return { status: 500, json: { success: false, message: approveErr.message } };
  }

  if (!flipped) {
    void audit('duplicate', {
      signatureValid: sigOk,
      statusBefore: row.status,
      statusAfter: 'approved',
      applied: false,
      note: 'lost approve race',
    });
    return { status: 200, json: { success: true } };
  }

  try {
    await activateApprovedPayment(supabase, {
      userId: Number(row.user_id),
      productCode: productCodeForAccess,
      tariffType: row.tariff_type,
    });
    invalidateAccessCache(Number(row.user_id));
  } catch (activationErr) {
    console.error('[rahmat/callback activation]', activationErr);
  }

  if (isRahmatPartnerCallbackEnabled()) {
    const rahmatOut = await postRahmatPaymentAppSuccessCallback({
      cfg,
      multicardSuccessPayload: payload,
      partnerTransId: String(paymentId),
    });
    void recordPaymentEvent(supabase, {
      paymentId,
      provider: 'multicard',
      eventType: 'rahmat_partner',
      outcome: rahmatOut.ok ? 'applied' : 'invalid_payload',
      applied: rahmatOut.ok,
      providerTransId: String(payload.uuid ?? '') || null,
      payload: { request: 'payment-app/callback', response: rahmatOut.ok ? rahmatOut.data : rahmatOut },
      ip: meta.ip,
      userAgent: meta.userAgent,
      note: rahmatOut.ok
        ? `rahmat_partner ok http=${rahmatOut.status}`
        : (() => {
            const r = rahmatOut as { error: string; status?: number };
            return `rahmat_partner fail: ${r.error}${r.status ? ` http=${r.status}` : ''}`;
          })(),
    });
    if (!rahmatOut.ok) {
      console.error('[rahmat/partner-callback]', paymentId, rahmatOut);
    }
  }

  void audit('applied', {
    signatureValid: sigOk,
    statusBefore: row.status,
    statusAfter: 'approved',
    applied: true,
    amountExpected: expectedTiyin,
    amountReceived: amountTiyin,
  });

  return { status: 200, json: { success: true } };
}
