import { Router, Request, Response } from 'express';
import multer from 'multer';
import type { SupabaseClient } from '@supabase/supabase-js';

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
      const file = req.file;

      if (!tariff_type || !['month', '3months', 'year'].includes(tariff_type)) {
        return res.status(400).json({ error: 'tariff_type kerak: month, 3months, year' });
      }
      if (!currency || !['UZS', 'RUB', 'USD'].includes(currency)) {
        return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
      }
      if (!file || !file.buffer) {
        return res.status(400).json({ error: 'Chek yoki skrinshot faylini yuklang' });
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

        const { data: row, error: insertErr } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            tariff_type,
            currency,
            payment_proof_url: paymentProofUrl,
            payment_time: new Date().toISOString(),
            status: 'pending',
          })
          .select('id')
          .single();
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
