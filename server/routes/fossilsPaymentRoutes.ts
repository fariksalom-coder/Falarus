import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const uploadDir = path.join(projectRoot, 'uploads', 'fossils-checks');

async function ensureStoragePaths(): Promise<void> {
  await fs.mkdir(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureStoragePaths();
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Faqat JPG, PNG yoki WEBP ruxsat etiladi'));
      return;
    }
    cb(null, true);
  },
});

export function createFossilsPaymentRoutes(supabase: SupabaseClient): Router {
  const router = Router();

  // Public endpoint for landing page payment proof submission.
  router.post('/payment', upload.single('receipt'), async (req, res) => {
    try {
      const phone = String(req.body?.phone ?? '').trim();
      const tariff = String(req.body?.tariff ?? '').trim();
      const imageFile = req.file;
      const normalizedPhone = phone.replace(/[^\d+]/g, '');
      const allowedTariffs = new Set(['month', '3months', 'year']);

      if (!normalizedPhone || normalizedPhone.length < 8 || normalizedPhone.length > 20) {
        return res.status(400).json({ error: 'Telefon raqami noto‘g‘ri' });
      }
      if (!allowedTariffs.has(tariff)) return res.status(400).json({ error: 'Tarif noto‘g‘ri' });
      if (!imageFile) return res.status(400).json({ error: 'Chek rasmi kerak' });

      const imagePublicPath = `/uploads/fossils-checks/${imageFile.filename}`;
      const { data: row, error: insertError } = await supabase
        .from('fossils_payments')
        .insert({
          phone,
          tariff,
          image_url: imagePublicPath,
          status: 'pending',
        })
        .select('id, phone, tariff, image_url, status, created_at')
        .single();
      if (insertError || !row) {
        throw insertError ?? new Error('Failed to save fossils payment');
      }

      // Placeholder admin notification hook (can be replaced by Telegram webhook).
      console.log('[fossils-payment:new]', {
        id: row.id,
        phone: row.phone,
        tariff: row.tariff,
        image: row.image_url,
        created_at: row.created_at,
      });

      return res.status(201).json({ success: true, id: row.id, status: row.status });
    } catch (error) {
      console.error('[POST /api/payment]', error);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  return router;
}
