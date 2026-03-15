/**
 * POST /api/payments — submit payment proof (file upload + save to DB).
 * Used by Vercel; same behavior as server/routes/paymentRoutes.ts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Busboy from 'busboy';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';

const PAYMENT_PROOFS_BUCKET = 'payment-proofs';
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function parseMultipart(req: VercelRequest): Promise<{ fields: Record<string, string>; file: { buffer: Buffer; mimetype: string; originalname: string } | null }> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let file: { buffer: Buffer; mimetype: string; originalname: string } | null = null;
    const chunks: Buffer[] = [];
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'));
      return;
    }
    const bb = Busboy({ headers: { 'content-type': contentType } });

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('file', (name, stream, info) => {
      const { mimeType, filename } = info;
      if (name !== 'upload_file') {
        stream.resume();
        return;
      }
      if (!ALLOWED_MIMES.includes(mimeType)) {
        stream.resume();
        reject(new Error('Faqat JPG, PNG, WEBP yoki PDF yuklashingiz mumkin'));
        return;
      }
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > MAX_SIZE) reject(new Error('Fayl 10 MB dan oshmasin'));
        else file = { buffer, mimetype: mimeType, originalname: filename || 'proof' };
      });
      stream.on('error', reject);
    });

    bb.on('error', reject);
    bb.on('finish', () => resolve({ fields, file }));

    (req as NodeJS.ReadableStream).pipe(bb);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const { fields, file } = await parseMultipart(req);

    const tariff_type = (fields.tariff_type || '').trim();
    const currency = (fields.currency || '').toUpperCase();

    if (!tariff_type || !['month', '3months', 'year'].includes(tariff_type)) {
      return res.status(400).json({ error: 'tariff_type kerak: month, 3months, year' });
    }
    if (!currency || !['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    if (!file || !file.buffer.length) {
      return res.status(400).json({ error: 'Chek yoki skrinshot faylini yuklang' });
    }

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

    const { data: urlData } = supabase.storage.from(PAYMENT_PROOFS_BUCKET).getPublicUrl(path);
    const paymentProofUrl = urlData?.publicUrl ?? null;

    const { data: row, error: insertErr } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        tariff_type,
        currency,
        payment_proof_url: paymentProofUrl,
        payment_time: (fields.payment_time && new Date(fields.payment_time).toISOString()) || new Date().toISOString(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[payments insert]', insertErr);
      return res.status(500).json({ error: insertErr.message });
    }
    return res.status(200).json({ success: true, id: (row as { id: number }).id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Xatolik yuz berdi';
    console.error('[POST /api/payments]', message);
    return res.status(500).json({ error: message });
  }
}
