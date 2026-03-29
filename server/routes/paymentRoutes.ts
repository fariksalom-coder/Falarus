import { Router, Request, Response } from 'express';
import multer from 'multer';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getCourseProductPrice,
  isCourseProductCode,
  isCurrencyCode,
  isSubscriptionTariffType,
  normalizePaymentProductCode,
} from '../../shared/paymentProducts.js';
import { isPaymentsProductCodeSchemaError } from '../../shared/paymentsCompat.js';

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
    '/',
    authenticate,
    upload.single('upload_file'),
    async (req: any, res: Response) => {
      const userId = req.userId;
      const { tariff_type, currency } = req.body || {};
      const productCode = normalizePaymentProductCode(req.body?.product_code);
      const file = req.file;

      if (productCode === 'russian' && !isSubscriptionTariffType(tariff_type)) {
        return res.status(400).json({ error: 'tariff_type kerak: month, 3months, year' });
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
            tariff_type === 'year' ? 'year' : tariff_type === '3months' ? 'three_months' : 'month'
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

        const insertBase = {
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
          if (productCode !== 'russian') {
            return res.status(503).json({
              error:
                "To'lov tizimi yangilanmoqda. Keyinroq urinib ko'ring yoki qo'llab-quvvatlashga murojaat qiling.",
            });
          }
          const legacyIns = await supabase.from('payments').insert(insertBase).select('id').single();
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
