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
  handleClickCardTokenRequest,
  handleClickCardTokenVerify,
} from '../services/clickCardToken.service.js';
import { fiscalizePayment } from '../services/clickFiscal.service.js';

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
      if (productCode === 'russian') {
        return res.status(400).json({
          error: 'AUTO_PAY_ONLY',
          message:
            'Rus tili kursi uchun bir martalik Click tugmasi o‘chirilgan. Faqat avtomatik to‘lov (karta + SMS) mavjud.',
        });
      }

      let { data: pending, error: pendingErr } = await supabase
        .from('payments')
        .select('id, payment_channel, payment_proof_url, amount')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .eq('product_code', productCode)
        .limit(1)
        .maybeSingle();
      if (pendingErr && isPaymentsProductCodeSchemaError(pendingErr)) {
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

      const amount =
        productCode === 'vnzh'
          ? 1000
          : getClickAmountForProduct({
              productCode,
              tariffType: null,
              tariffPrices: null,
            });
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "To'lov summasi aniqlanmadi" });
      }

      const insertBase: Record<string, unknown> = {
        user_id: userId,
        tariff_type: null,
        currency: 'UZS',
        amount,
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
      const paymentUrl = buildClickPaymentUrl({
        serviceId: clickServiceId,
        merchantId: clickMerchantId,
        merchantUserId: String(userId),
        amount,
        paymentId,
        returnUrl: clickReturnUrl,
        cardType: CLICK_PAY_CARD_TYPE_DEFAULT,
      });
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
    const out = await handleClickCardTokenVerify(supabase, req.userId, (req.body ?? {}) as Record<string, unknown>);
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
        .select('id')
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
        pending = legacy.data;
      }
      if (pending) {
        return res.status(400).json({
          error: 'PENDING_PAYMENT',
          message: "To'lovingiz tekshirilmoqda. Administrator tez orada to'lovni tasdiqlaydi. Tasdiqlangandan so'ng sizga kursga kirish ochiladi.",
        });
      }

      let amount = 0;
      if (productCode === 'russian') {
        const { data: priceRow } = await supabase
          .from('tariff_prices')
          .select('price')
          .eq('currency', currency)
          .eq(
            'tariff_type',
            tariff_type === 'year' ? 'year' : 'month'
          )
          .maybeSingle();
        amount = priceRow != null ? Number((priceRow as { price: number }).price) : 0;
      } else if (isCourseProductCode(productCode)) {
        amount = getCourseProductPrice(productCode, currency);
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

  return router;
}

export function createClickMerchantRoutes(
  supabase: SupabaseClient
): Router {
  const router = Router();

  router.post('/prepare', async (req: Request, res: Response) => {
    const merchantTransId =
      String((req.body as Record<string, unknown> | null | undefined)?.merchant_trans_id ?? '').trim() || 0;
    return res.json({
      error: 0,
      error_note: 'Success',
      merchant_prepare_id: merchantTransId,
    });
  });

  router.post('/complete', async (req: Request, res: Response) => {
    const merchantTransId =
      String((req.body as Record<string, unknown> | null | undefined)?.merchant_trans_id ?? '').trim() || 0;
    return res.json({
      error: 0,
      error_note: 'Success',
      merchant_confirm_id: merchantTransId,
    });
  });

  return router;
}
