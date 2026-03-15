/**
 * Single handler for /api/pricing, tariff-prices, payment-methods, payments (POST), leaderboard, activity/streak.
 * Keeps serverless function count under Vercel Hobby limit (12).
 */
import './_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Busboy from 'busboy';
import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';
import { requireAuth } from './_lib/auth.js';

const PAYMENT_PROOFS_BUCKET = 'payment-proofs';
const PAYMENT_ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const PAYMENT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function parseMultipartPayments(req: VercelRequest): Promise<{ fields: Record<string, string>; file: { buffer: Buffer; mimetype: string } | null }> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let file: { buffer: Buffer; mimetype: string } | null = null;
    const chunks: Buffer[] = [];
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'));
      return;
    }
    const bb = Busboy({ headers: { 'content-type': contentType } });
    bb.on('field', (name: string, value: string) => { fields[name] = value; });
    bb.on('file', (name, stream, info) => {
      const { mimeType } = info;
      if (name !== 'upload_file') { stream.resume(); return; }
      if (!PAYMENT_ALLOWED_MIMES.includes(mimeType)) {
        stream.resume();
        reject(new Error('Faqat JPG, PNG, WEBP yoki PDF yuklashingiz mumkin'));
        return;
      }
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > PAYMENT_MAX_SIZE) reject(new Error('Fayl 10 MB dan oshmasin'));
        else file = { buffer, mimetype: mimeType };
      });
      stream.on('error', reject);
    });
    bb.on('error', reject);
    bb.on('finish', () => resolve({ fields, file }));
    (req as NodeJS.ReadableStream).pipe(bb);
  });
}

function getPathParts(req: VercelRequest): string[] {
  const path = req.query.path;
  if (Array.isArray(path)) return path.filter((p): p is string => typeof p === 'string');
  if (typeof path === 'string') return path ? path.split('/').filter(Boolean) : [];
  const url = req.url || (req as any).originalUrl || '';
  const pathname = typeof url === 'string' ? url.split('?')[0] : '';
  const parts = pathname.split('/').filter(Boolean);
  const apiIndex = parts.indexOf('api');
  if (apiIndex >= 0 && apiIndex < parts.length - 1) return parts.slice(apiIndex + 1);
  return [];
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const path = getPathParts(req);
  // POST /api/payments — inline to avoid extra serverless function (Vercel 12 limit)
  if (path[0] === 'payments' && path.length === 1 && req.method === 'POST') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    try {
      const { data: pending } = await supabase.from('payments').select('id').eq('user_id', userId).eq('status', 'pending').limit(1).maybeSingle();
      if (pending) {
        return res.status(400).json({
          error: 'PENDING_PAYMENT',
          message: "To'lovingiz tekshirilmoqda. Administrator tez orada to'lovni tasdiqlaydi. Tasdiqlangandan so'ng sizga kursga kirish ochiladi.",
        });
      }
      const { fields, file } = await parseMultipartPayments(req);
      const tariff_type = (fields.tariff_type || '').trim();
      const currency = (fields.currency || '').toUpperCase();
      if (!tariff_type || !['month', '3months', 'year'].includes(tariff_type))
        return res.status(400).json({ error: 'tariff_type kerak: month, 3months, year' });
      if (!currency || !['UZS', 'RUB', 'USD'].includes(currency))
        return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
      if (!file || !file.buffer.length)
        return res.status(400).json({ error: 'Chek yoki skrinshot faylini yuklang' });
      // amount required by payments table (e.g. from 009_referral) — get from tariff_prices
      const priceKey = tariff_type === 'year' ? 'year' : tariff_type === '3months' ? 'three_months' : 'month';
      const { data: priceRow } = await supabase.from('tariff_prices').select('price').eq('currency', currency).eq('tariff_type', priceKey).maybeSingle();
      const amount = priceRow != null ? Number((priceRow as { price: number }).price) : 0;
      const ext = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype.split('/')[1] || 'jpg';
      const pathStr = `${userId}/${Date.now()}_proof.${ext}`;
      const { data: bucketList } = await supabase.storage.listBuckets();
      const bucketExists = (bucketList ?? []).some((b: { name: string }) => b.name === PAYMENT_PROOFS_BUCKET);
      if (!bucketExists) await supabase.storage.createBucket(PAYMENT_PROOFS_BUCKET, { public: true });
      const { error: uploadErr } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).upload(pathStr, file.buffer, { contentType: file.mimetype, upsert: false });
      if (uploadErr) {
        console.error('[payment upload]', uploadErr);
        return res.status(500).json({ error: 'Fayl yuklanmadi' });
      }
      const { data: urlData } = supabase.storage.from(PAYMENT_PROOFS_BUCKET).getPublicUrl(pathStr);
      const paymentProofUrl = urlData?.publicUrl ?? null;
      const { data: row, error: insertErr } = await supabase.from('payments').insert({
        user_id: userId,
        tariff_type,
        currency,
        amount,
        payment_proof_url: paymentProofUrl,
        payment_time: (fields.payment_time && new Date(fields.payment_time).toISOString()) || new Date().toISOString(),
        status: 'pending',
      }).select('id').single();
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

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // /api/pricing — public active plans (no auth)
  if (path[0] === 'pricing' && path.length === 1) {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('id, plan_name, duration_days, price, discount_percent, active')
        .eq('active', true)
        .order('duration_days', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data ?? []);
    } catch (e) {
      console.error('[api/pricing]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/tariff-prices?currency=UZS — public (no auth)
  if (path[0] === 'tariff-prices' && path.length === 1) {
    const currency = (typeof req.query.currency === 'string' ? req.query.currency : '').toUpperCase();
    if (!['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    try {
      const { data, error } = await supabase
        .from('tariff_prices')
        .select('tariff_type, price')
        .eq('currency', currency);
      if (error) throw error;
      const rows = (data ?? []) as { tariff_type: string; price: number }[];
      const out: Record<string, number> = {};
      rows.forEach((r) => { out[r.tariff_type] = Number(r.price); });
      return res.status(200).json({ month: out.month, three_months: out.three_months, year: out.year });
    } catch (e) {
      console.error('[api/tariff-prices]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/payment-methods?currency=RUB — public (no auth)
  if (path[0] === 'payment-methods' && path.length === 1) {
    const currency = (typeof req.query.currency === 'string' ? req.query.currency : '').toUpperCase();
    if (!['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('card_number, phone_number, card_holder_name')
        .eq('currency', currency)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json(data ?? null);
    } catch (e) {
      console.error('[api/payment-methods]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  // /api/leaderboard
  if (path[0] === 'leaderboard') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    const period = (typeof req.query.period === 'string' ? req.query.period : 'weekly') || 'weekly';
    const useTotalPoints = period === 'all';
    try {
      if (useTotalPoints) {
        const { data: lbRows, error: lbErr } = await supabase
          .from('leaderboard')
          .select('user_id, total_points, rank')
          .order('rank', { ascending: true })
          .limit(100);
        if (lbErr) throw lbErr;
        const rows = lbRows ?? [];
        if (rows.length === 0) return res.status(200).json({ top: [], myRank: null });
        const userIds = [...new Set(rows.map((r: { user_id: number }) => r.user_id))];
        const { data: users, error: uErr } = await supabase.from('users').select('id, first_name, last_name, avatar_url').in('id', userIds);
        if (uErr) throw uErr;
        const byId = (users ?? []).reduce((acc: Record<number, any>, u: any) => { acc[u.id] = u; return acc; }, {});
        const top = rows.map((r: any) => {
          const u = byId[r.user_id];
          return { id: u?.id ?? r.user_id, firstName: u?.first_name ?? '', lastName: u?.last_name ?? '', avatarUrl: u?.avatar_url ?? null, points: Number(r.total_points), rank: Number(r.rank) };
        });
        const { data: myRow } = await supabase.from('leaderboard').select('rank, total_points').eq('user_id', userId).maybeSingle();
        const { data: me } = await supabase.from('users').select('id, first_name, last_name, avatar_url').eq('id', userId).single();
        return res.status(200).json({
          top,
          myRank: myRow && me ? { rank: Number(myRow.rank), id: me.id, firstName: me.first_name, lastName: me.last_name, avatarUrl: me.avatar_url, points: Number(myRow.total_points) } : null,
        });
      }
      const col = period === 'monthly' ? 'monthly_points' : 'weekly_points';
      const { data: top, error: topErr } = await supabase.from('users').select('id, first_name, last_name, avatar_url, weekly_points, monthly_points').order(col, { ascending: false }).limit(100);
      if (topErr) throw topErr;
      const { data: me, error: meErr } = await supabase.from('users').select('id, first_name, last_name, avatar_url, weekly_points, monthly_points').eq('id', userId).single();
      if (meErr || !me) return res.status(200).json({ top: top ?? [], myRank: null });
      const myPoints = period === 'monthly' ? (me.monthly_points ?? 0) : (me.weekly_points ?? 0);
      const { count, error: countErr } = await supabase.from('users').select('*', { count: 'exact', head: true }).gt(col, myPoints);
      const rank = countErr ? null : (count ?? 0) + 1;
      return res.status(200).json({
        top: (top ?? []).map((u: any) => ({ id: u.id, firstName: u.first_name, lastName: u.last_name, avatarUrl: u.avatar_url, points: period === 'monthly' ? (u.monthly_points ?? 0) : (u.weekly_points ?? 0) })),
        myRank: rank == null ? null : { rank, id: me.id, firstName: me.first_name, lastName: me.last_name, avatarUrl: me.avatar_url, points: myPoints },
      });
    } catch (e) {
      console.error('[api/leaderboard]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  }

  // /api/activity/streak
  if (path[0] === 'activity' && path[1] === 'streak') {
    const userId = requireAuth(req, res);
    if (userId == null) return;
    try {
      const { data: rows, error } = await supabase
        .from('user_activity_dates')
        .select('activity_date')
        .eq('user_id', userId)
        .order('activity_date', { ascending: false })
        .limit(365);
      if (error) {
        console.error('[api/activity/streak]', error.message);
        return res.status(200).json({ streak_days: 0, last_7_days: [false, false, false, false, false, false, false] });
      }
      const dates = new Set((rows ?? []).map((r: { activity_date: string }) => r.activity_date));
      const today = todayDateString();
      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dates.has(key)) { streak++; d.setDate(d.getDate() - 1); } else break;
      }
      const last7: boolean[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        last7.push(dates.has(key));
      }
      return res.status(200).json({ streak_days: streak, last_7_days: last7 });
    } catch (e) {
      console.error('[api/activity/streak]', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
