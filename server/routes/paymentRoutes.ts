import { Router, Request, Response } from 'express';
import multer from 'multer';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getCourseProductPrice,
  isCourseProductCode,
  isCurrencyCode,
  isPaymentProductCode,
  isSubscriptionTariffType,
  normalizePaymentProductCode,
} from '../../shared/paymentProducts.js';
import {
  buildClickErrorResponse,
  buildClickPaymentUrl,
  buildClickSuccessResponse,
  CLICK_PAY_CARD_TYPE_DEFAULT,
  inferPaymentProviderFromProofUrl,
  getClickAmountForProduct,
  isExpiredClickPending,
  isResumableClickButtonPending,
  normalizeClickCallbackPayload,
  shouldSkipClickSignatureVerify,
  verifyClickSignature,
} from '../../shared/clickPayments.js';
import { isPaymentsProductCodeSchemaError } from '../../shared/paymentsCompat.js';
import { embedFalarusProductInProofUrl } from '../../shared/paymentsProofUrl.js';
import { activateApprovedPayment } from '../../shared/paymentActivation.js';
import { invalidateAccessCache } from '../services/subscription.service.js';
import { getClickConfig } from '../../shared/clickConfig.js';
import {
  handleClickCardTokenDelete,
  handleClickCardTokenPayment,
  handleClickCardTokenRequest,
  handleClickCardTokenVerify,
} from '../services/clickCardToken.service.js';
import { fiscalizePayment } from '../services/clickFiscal.service.js';
import { resolveRussianTariffQuote } from '../services/promoPricing.service.js';
import { extractRequestMeta, recordPaymentEvent } from '../lib/paymentEvents.js';
import {
  createRahmatMulticardPayment,
  handleRahmatMulticardCallback,
} from '../services/rahmatMulticardPayment.service.js';

const PAYMENT_PROOFS_BUCKET = 'payment-proofs';
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Faqat JPG, PNG, WEBP yoki PDF yuklashingiz mumkin'));
    }
  },
});

export function createPaymentRoutes(
  supabase: SupabaseClient,
  authenticate: (req: Request, res: Response, next: () => void) => void
): Router {
  const router = Router();

  router.post(
    '/click/create',
    authenticate,
    async (req: any, res: Response) => {
      const userId = req.userId;
      const tariffTypeRaw = String(req.body?.tariff_type ?? '').trim();
      const rawProductCode =
        typeof req.body?.product_code === 'string' ? req.body.product_code.trim() : req.body?.product_code;
      if (!isPaymentProductCode(rawProductCode)) {
        return res.status(400).json({
          error: 'INVALID_PRODUCT_CODE',
          message: "product_code majburiy va patent | vnzh | russian bo‘lishi kerak.",
        });
      }
      const productCode = rawProductCode;
      const {
        serviceId: clickServiceId,
        merchantId: clickMerchantId,
        returnUrl: clickReturnUrl,
      } = getClickConfig();

      if (!clickServiceId || !clickMerchantId) {
        return res.status(503).json({ error: 'Click sozlanmagan. CLICK_SERVICE_ID va CLICK_MERCHANT_ID kerak.' });
      }
      const russianTariffType = isSubscriptionTariffType(tariffTypeRaw) ? tariffTypeRaw : null;
      if (productCode === 'russian' && !russianTariffType) {
        return res.status(400).json({
          error: 'tariff_type kerak: month, year',
        });
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
      if (pending && isExpiredClickPending(pending as any)) {
        await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', Number((pending as any).id))
          .eq('status', 'pending');
        pending = null;
      }
      if (pending) {
        if (isResumableClickButtonPending(pending)) {
          const proofUrl = String(pending.payment_proof_url ?? '').trim();
          return res.json({
            success: true,
            payment_id: Number(pending.id),
            payment_url: proofUrl,
            amount: Number(pending.amount),
            currency: 'UZS',
          });
        }
        return res.status(400).json({
          error: 'PENDING_PAYMENT',
          message: "To'lovingiz tekshirilmoqda. Administrator tez orada to'lovni tasdiqlaydi. Tasdiqlangandan so'ng sizga kursga kirish ochiladi.",
        });
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
        discountMeta = quote.discountAmount > 0
          ? {
              campaign: 'russian-first-tariffs-30m',
              expires_at: quote.promo.expiresAt,
              currency: quote.currency,
              tariff_type: quote.tariffType,
            }
          : null;
      } else {
        amount = getClickAmountForProduct({
          productCode,
          tariffType: null,
          tariffPrices: null,
        });
        baseAmount = amount;
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "To'lov summasi aniqlanmadi" });
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
        payment_channel: 'click_button',
      };

      let { data: row, error: insertErr } = await supabase
        .from('payments')
        .insert({ ...insertBase, product_code: productCode })
        .select('id')
        .single();
      if (insertErr && isPaymentsProductCodeSchemaError(insertErr)) {
        const legacyBase = {
          ...insertBase,
          tariff_type: 'month',
        };
        const legacyIns = await supabase.from('payments').insert(legacyBase).select('id').single();
        row = legacyIns.data;
        insertErr = legacyIns.error;
      }
      if (insertErr || !row) {
        return res.status(500).json({ error: insertErr?.message || 'To‘lov yaratilmadi' });
      }

      const paymentId = Number((row as any).id);
      const paymentUrl = embedFalarusProductInProofUrl(
        buildClickPaymentUrl({
          serviceId: clickServiceId,
          merchantId: clickMerchantId,
          merchantUserId: String(userId),
          amount,
          paymentId,
          returnUrl: clickReturnUrl,
          cardType: CLICK_PAY_CARD_TYPE_DEFAULT,
        }),
        productCode
      );
      await supabase.from('payments').update({ payment_proof_url: paymentUrl }).eq('id', paymentId);

      return res.json({
        success: true,
        payment_id: paymentId,
        payment_url: paymentUrl,
        amount,
        currency: 'UZS',
      });
    }
  );

  router.post('/click/card-token/request', authenticate, async (req: any, res: Response) => {
    const out = await handleClickCardTokenRequest(supabase, req.userId, (req.body ?? {}) as Record<string, unknown>);
    return res.status(out.status).json(out.json);
  });

  router.post('/click/card-token/verify', authenticate, async (req: any, res: Response) => {
    const cfg = getClickConfig();

    console.log('CLICK CONFIG FINAL:', {
      serviceId: cfg.serviceId,
      merchantUserId: cfg.apiMerchantUserId,
      secretKey: cfg.secretKey ? 'OK' : 'MISSING'
    });

    const payload = (req.body ?? {}) as Record<string, unknown>;
    const verifyOut = await handleClickCardTokenVerify(supabase, req.userId, payload);
    if (verifyOut.status !== 200) {
      return res.status(verifyOut.status).json(verifyOut.json);
    }

    // Backward compatibility for existing clients:
    // old frontend sends plan/product to verify and expects immediate activation.
    const shouldAutoCharge =
      typeof payload.product_code === 'string' ||
      typeof payload.plan_type === 'string' ||
      typeof payload.tariff_type === 'string';
    if (!shouldAutoCharge) {
      return res.status(verifyOut.status).json(verifyOut.json);
    }

    const paymentOut = await handleClickCardTokenPayment(supabase, req.userId, payload);
    if (paymentOut.status !== 200) {
      return res.status(paymentOut.status).json(paymentOut.json);
    }
    return res.status(200).json({
      ...paymentOut.json,
      card_verified: true,
      card_token_id: verifyOut.json.card_token_id ?? null,
    });
  });

  router.post('/click/card-token/payment', authenticate, async (req: any, res: Response) => {
    const out = await handleClickCardTokenPayment(supabase, req.userId, (req.body ?? {}) as Record<string, unknown>);
    return res.status(out.status).json(out.json);
  });

  router.post('/click/card-token/delete', authenticate, async (req: any, res: Response) => {
    const out = await handleClickCardTokenDelete(supabase, req.userId);
    return res.status(out.status).json(out.json);
  });

  router.post(
    '/',
    authenticate,
    upload.single('upload_file'),
    async (req: any, res: Response) => {
      const userId = req.userId;
      const { tariff_type, currency } = req.body || {};
      const productCode = normalizePaymentProductCode(req.body?.product_code);
      const file = req.file;

      if (productCode === 'russian' && !isSubscriptionTariffType(tariff_type)) {
        return res.status(400).json({ error: 'tariff_type kerak: month, year' });
      }
      if (!isCurrencyCode(currency)) {
        return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
      }
      if (!file || !file.buffer) {
        return res.status(400).json({ error: 'Chek yoki skrinshot faylini yuklang' });
      }

      let { data: pending, error: pendingErr } = await supabase
        .from('payments')
        .select('id, payment_channel, created_at, payment_time')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .eq('product_code', productCode)
        .limit(1)
        .maybeSingle();
      if (pendingErr && isPaymentsProductCodeSchemaError(pendingErr)) {
        const legacy = await supabase
          .from('payments')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .limit(1)
          .maybeSingle();
        pending = legacy.data as any;
      }
      if (pending && isExpiredClickPending(pending as any)) {
        await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', Number((pending as any).id))
          .eq('status', 'pending');
        pending = null;
      }
      if (pending) {
        return res.status(400).json({
          error: 'PENDING_PAYMENT',
          message: "To'lovingiz tekshirilmoqda. Administrator tez orada to'lovni tasdiqlaydi. Tasdiqlangandan so'ng sizga kursga kirish ochiladi.",
        });
      }

      let amount = 0;
      let baseAmount = 0;
      let discountAmount = 0;
      let discountMeta: Record<string, unknown> | null = null;
      if (productCode === 'russian') {
        const quote = await resolveRussianTariffQuote(supabase, {
          userId,
          currency,
          tariffType: tariff_type === 'year' ? 'year' : 'month',
          startPromoIfMissing: false,
        });
        amount = quote.finalAmount;
        baseAmount = quote.baseAmount;
        discountAmount = quote.discountAmount;
        discountMeta = quote.discountAmount > 0
          ? {
              campaign: 'russian-first-tariffs-30m',
              expires_at: quote.promo.expiresAt,
              currency: quote.currency,
              tariff_type: quote.tariffType,
            }
          : null;
      } else if (isCourseProductCode(productCode)) {
        amount = getCourseProductPrice(productCode, currency);
        baseAmount = amount;
      }

      try {
        const ext = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype.split('/')[1] || 'jpg';
        const path = `${userId}/${Date.now()}_proof.${ext}`;

        const { data: bucketList } = await supabase.storage.listBuckets();
        const bucketExists = (bucketList ?? []).some((b: { name: string }) => b.name === PAYMENT_PROOFS_BUCKET);
        if (!bucketExists) {
          await supabase.storage.createBucket(PAYMENT_PROOFS_BUCKET, { public: true });
        }

        const { error: uploadErr } = await supabase.storage
          .from(PAYMENT_PROOFS_BUCKET)
          .upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });
        if (uploadErr) {
          console.error('[payment upload]', uploadErr);
          return res.status(500).json({ error: 'Fayl yuklanmadi' });
        }

        const { data: urlData } = supabase.storage
          .from(PAYMENT_PROOFS_BUCKET)
          .getPublicUrl(path);
        const paymentProofUrl = urlData?.publicUrl ?? null;

        const insertBase: Record<string, unknown> = {
          user_id: userId,
          tariff_type: productCode === 'russian' ? tariff_type : null,
          currency,
          amount,
          base_amount: baseAmount || amount,
          discount_amount: discountAmount,
          discount_meta: discountMeta,
          payment_proof_url: paymentProofUrl,
          payment_time: new Date().toISOString(),
          status: 'pending' as const,
        };
        let { data: row, error: insertErr } = await supabase
          .from('payments')
          .insert({ ...insertBase, product_code: productCode })
          .select('id')
          .single();
        if (insertErr && isPaymentsProductCodeSchemaError(insertErr)) {
          const proofUrl =
            productCode === 'russian'
              ? paymentProofUrl
              : embedFalarusProductInProofUrl(paymentProofUrl, productCode);
          const legacyBase = {
            ...insertBase,
            payment_proof_url: proofUrl,
            tariff_type: productCode === 'russian' ? tariff_type : 'month',
          };
          const legacyIns = await supabase.from('payments').insert(legacyBase).select('id').single();
          row = legacyIns.data;
          insertErr = legacyIns.error;
        }
        if (insertErr) {
          console.error('[payments insert]', insertErr);
          return res.status(500).json({ error: insertErr.message });
        }
        return res.json({ success: true, id: (row as any).id });
      } catch (e) {
        console.error('[POST /api/payments]', e);
        return res.status(500).json({ error: 'Xatolik yuz berdi' });
      }
    }
  );

  router.post('/rahmat/create', authenticate, async (req: any, res: Response) => {
    const out = await createRahmatMulticardPayment(supabase, req.userId, req.body ?? {});
    return res.status(out.status).json(out.json);
  });

  router.post('/rahmat/callback', async (req: Request, res: Response) => {
    const out = await handleRahmatMulticardCallback(supabase, req);
    return res.status(out.status).json(out.json);
  });

  return router;
}

export function createClickMerchantRoutes(
  supabase: SupabaseClient
): Router {
  const router = Router();

  router.post('/prepare', async (req: Request, res: Response) => {
    const payload = normalizeClickCallbackPayload((req.body ?? {}) as Record<string, unknown>);
    const { secretKey: clickSecretKey, serviceId: clickServiceId } = getClickConfig();
    const paymentId = Number(payload.merchant_trans_id);
    const meta = extractRequestMeta(req as any);
    const paymentIdSafe = Number.isFinite(paymentId) && paymentId > 0 ? paymentId : null;
    const clickPaydocId = String(payload.click_paydoc_id ?? '').trim() || null;
    const audit = (
      outcome: Parameters<typeof recordPaymentEvent>[1]['outcome'],
      extra: Partial<Parameters<typeof recordPaymentEvent>[1]> = {}
    ) =>
      recordPaymentEvent(supabase, {
        paymentId: paymentIdSafe,
        provider: 'click',
        eventType: 'prepare',
        outcome,
        applied: false,
        clickPaydocId,
        amountReceived: Number(payload.amount) || null,
        payload,
        ip: meta.ip,
        userAgent: meta.userAgent,
        ...extra,
      });

    if (!clickSecretKey || !clickServiceId) {
      void audit('config_missing', { note: 'click secret/service missing' });
      return res.status(200).json(
        buildClickErrorResponse({ payload, error: -9, note: 'Click konfiguratsiyasi topilmadi' })
      );
    }
    if (payload.service_id !== clickServiceId) {
      void audit('invalid_payload', { note: `service_id mismatch got=${payload.service_id}` });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentId || 0, error: -1, note: 'service_id mos emas' })
      );
    }
    const skipSigPrepare = shouldSkipClickSignatureVerify();
    const signatureValid = skipSigPrepare ? null : verifyClickSignature(payload, clickSecretKey);
    if (signatureValid === false) {
      void audit('invalid_signature', { signatureValid: false });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentId || 0, error: -1, note: 'Imzo noto‘g‘ri' })
      );
    }
    if (paymentIdSafe === null) {
      void audit('invalid_payload', { signatureValid, note: `bad merchant_trans_id=${payload.merchant_trans_id}` });
      return res.status(200).json(
        buildClickErrorResponse({ payload, error: -5, note: 'To‘lov topilmadi' })
      );
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, amount, status')
      .eq('id', paymentIdSafe)
      .maybeSingle();
    if (error || !payment) {
      void audit('not_found', { signatureValid, note: error?.message ?? 'no row' });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentIdSafe, error: -5, note: 'To‘lov topilmadi' })
      );
    }

    if (Number(payment.amount) !== Number(payload.amount)) {
      void audit('amount_mismatch', {
        signatureValid,
        statusBefore: payment.status,
        amountExpected: Number(payment.amount),
        amountReceived: Number(payload.amount),
      });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentIdSafe, error: -2, note: 'Summa mos emas' })
      );
    }

    void audit('applied', { signatureValid, statusBefore: payment.status, statusAfter: payment.status, amountExpected: Number(payment.amount) });
    return res.json(buildClickSuccessResponse({ payload, merchantPrepareId: paymentIdSafe }));
  });

  router.post('/complete', async (req: Request, res: Response) => {
    const payload = normalizeClickCallbackPayload((req.body ?? {}) as Record<string, unknown>);
    const {
      secretKey: clickSecretKey,
      serviceId: clickServiceId,
      merchantId: clickMerchantId,
      returnUrl: clickReturnUrl,
    } = getClickConfig();
    const paymentId = Number(payload.merchant_trans_id);
    const paymentIdSafe = Number.isFinite(paymentId) && paymentId > 0 ? paymentId : null;
    const clickPaydocId = String(payload.click_paydoc_id ?? '').trim() || null;
    const meta = extractRequestMeta(req as any);
    const audit = (
      outcome: Parameters<typeof recordPaymentEvent>[1]['outcome'],
      extra: Partial<Parameters<typeof recordPaymentEvent>[1]> = {}
    ) =>
      recordPaymentEvent(supabase, {
        paymentId: paymentIdSafe,
        provider: 'click',
        eventType: 'complete',
        outcome,
        applied: false,
        clickPaydocId,
        amountReceived: Number(payload.amount) || null,
        payload,
        ip: meta.ip,
        userAgent: meta.userAgent,
        ...extra,
      });

    if (!clickSecretKey || !clickServiceId) {
      void audit('config_missing');
      return res.status(200).json(
        buildClickErrorResponse({ payload, error: -9, note: 'Click konfiguratsiyasi topilmadi' })
      );
    }
    if (payload.service_id !== clickServiceId) {
      void audit('invalid_payload', { note: `service_id mismatch got=${payload.service_id}` });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentId || 0, error: -1, note: 'service_id mos emas' })
      );
    }
    const skipSigComplete = shouldSkipClickSignatureVerify();
    const signatureValid = skipSigComplete ? null : verifyClickSignature(payload, clickSecretKey);
    if (signatureValid === false) {
      void audit('invalid_signature', { signatureValid: false });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentId || 0, error: -1, note: 'Imzo noto‘g‘ri' })
      );
    }
    if (paymentIdSafe === null) {
      void audit('invalid_payload', { signatureValid, note: `bad merchant_trans_id=${payload.merchant_trans_id}` });
      return res.status(200).json(
        buildClickErrorResponse({ payload, error: -5, note: 'To‘lov topilmadi' })
      );
    }

    let { data: payment, error } = await supabase
      .from('payments')
      .select(
        'id, user_id, tariff_type, product_code, amount, status, payment_proof_url, click_merchant_payment_id'
      )
      .eq('id', paymentIdSafe)
      .maybeSingle();
    if (error && isPaymentsProductCodeSchemaError(error)) {
      const legacy = await supabase
        .from('payments')
        .select('id, user_id, tariff_type, amount, status, payment_proof_url, click_merchant_payment_id')
        .eq('id', paymentIdSafe)
        .maybeSingle();
      payment = legacy.data as any;
      error = legacy.error;
    }
    if (error || !payment) {
      void audit('not_found', { signatureValid, note: error?.message ?? 'no row' });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentIdSafe, error: -5, note: 'To‘lov topilmadi' })
      );
    }
    const statusBefore = String((payment as any).status ?? '');
    const expectedAmount = Number(payment.amount);
    if (expectedAmount !== Number(payload.amount)) {
      void audit('amount_mismatch', {
        signatureValid,
        statusBefore,
        amountExpected: expectedAmount,
        amountReceived: Number(payload.amount),
      });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentIdSafe, error: -2, note: 'Summa mos emas' })
      );
    }

    // Provider says the user cancelled / payment failed.
    if (String(payload.error || '0') !== '0') {
      const { data: rejected } = await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', paymentIdSafe)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      void audit('rejected', {
        signatureValid,
        statusBefore,
        statusAfter: rejected ? 'rejected' : statusBefore,
        applied: Boolean(rejected),
        amountExpected: expectedAmount,
        note: payload.error_note || 'To‘lov bekor qilindi',
      });
      return res.json(
        buildClickErrorResponse({
          payload,
          merchantPrepareId: paymentIdSafe,
          error: -9,
          note: payload.error_note || 'To‘lov bekor qilindi',
        })
      );
    }

    // Idempotent fast path: already approved by an earlier webhook.
    if (statusBefore === 'approved') {
      void audit('duplicate', {
        signatureValid,
        statusBefore,
        statusAfter: statusBefore,
        amountExpected: expectedAmount,
        note: 'already approved',
      });
      return res.json(buildClickSuccessResponse({ payload, merchantPrepareId: paymentIdSafe }));
    }

    const productCode = normalizePaymentProductCode((payment as any).product_code);
    const proofUrl =
      inferPaymentProviderFromProofUrl((payment as any).payment_proof_url) === 'click'
        ? ((payment as any).payment_proof_url as string | null | undefined) ?? null
        : buildClickPaymentUrl({
            serviceId: clickServiceId,
            merchantId: clickMerchantId,
            merchantUserId: String((payment as any).user_id),
            amount: expectedAmount,
            paymentId: paymentIdSafe,
            returnUrl: clickReturnUrl,
            cardType: CLICK_PAY_CARD_TYPE_DEFAULT,
          });

    // Atomic transition: only ONE concurrent webhook can flip pending→approved.
    // The .select() forces Supabase to return the row IFF the WHERE matched —
    // so an empty result tells us a parallel request already approved (or the
    // row was rejected in between). In that case we DO NOT activate again.
    const { data: flipped, error: approveErr } = await supabase
      .from('payments')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        click_merchant_payment_id:
          clickPaydocId ?? ((payment as { click_merchant_payment_id?: string | null }).click_merchant_payment_id ?? null),
        payment_proof_url: proofUrl,
      })
      .eq('id', paymentIdSafe)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (approveErr) {
      void audit('not_found', {
        signatureValid,
        statusBefore,
        amountExpected: expectedAmount,
        note: `update_failed: ${approveErr.message}`,
      });
      return res.status(200).json(
        buildClickErrorResponse({ payload, merchantPrepareId: paymentIdSafe, error: -9, note: approveErr.message })
      );
    }

    if (!flipped) {
      // Lost the race. Another webhook already approved (or rejected) this
      // payment row. Tell Click "success" — but DO NOT re-activate or
      // re-fiscalize: that would extend the user's plan twice.
      void audit('duplicate', {
        signatureValid,
        statusBefore,
        statusAfter: 'approved',
        amountExpected: expectedAmount,
        note: 'lost approve race',
      });
      return res.json(
        buildClickSuccessResponse({ payload, merchantPrepareId: paymentIdSafe, merchantConfirmId: paymentIdSafe })
      );
    }

    try {
      await activateApprovedPayment(supabase, {
        userId: Number((payment as any).user_id),
        productCode,
        tariffType: (payment as any).tariff_type,
      });
      invalidateAccessCache(Number((payment as any).user_id));
    } catch (activationErr) {
      console.error('[click/complete activation]', activationErr);
    }

    void fiscalizePayment(supabase, paymentIdSafe);

    void audit('applied', {
      signatureValid,
      statusBefore,
      statusAfter: 'approved',
      applied: true,
      amountExpected: expectedAmount,
    });

    return res.json(
      buildClickSuccessResponse({ payload, merchantPrepareId: paymentIdSafe, merchantConfirmId: paymentIdSafe })
    );
  });

  return router;
}
