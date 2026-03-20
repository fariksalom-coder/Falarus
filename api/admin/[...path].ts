/**
 * Admin API (Vercel): login + dashboard, users, payments, subscriptions, referrals, support, pricing.
 * Single serverless function to stay under 12-function limit.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { getUserCompletedLessonsCount } from '../../server/services/lessonProgressSnapshot.service.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'super-secret-key-uz-ru';

/**
 * Normalize admin API path.
 * Examples:
 *  /api/admin/payments/2/confirm  -> ['payments', '2', 'confirm']
 *  /admin/payments/2/reject       -> ['payments', '2', 'reject']
 *
 * Vercel sets req.query.path for [...path] routes; prefer that,
 * and fall back to parsing req.url for extra safety.
 */
function normalizeAdminPathSegments(input: string[]): string[] {
  // Vercel can provide path as:
  // ['payments','4','reject'] OR ['admin','payments','4','reject']
  // OR even ['api/admin/payments/4/reject'] (single item with slashes).
  const segs = input
    .flatMap((item) => String(item).replace(/^https?:\/\/[^/]+/i, '').split('/'))
    .map((s) => s.trim())
    .map((s) => s.split('?')[0].split('#')[0])
    .map((s) => decodeURIComponent(s))
    .filter(Boolean);

  if (segs.length === 0) return [];

  // If "admin" appears later, cut everything before it.
  const adminIdx = segs.indexOf('admin');
  const cut = adminIdx >= 0 ? segs.slice(adminIdx) : segs;

  if (cut[0] === 'api' && cut[1] === 'admin') return cut.slice(2);
  if (cut[0] === 'admin') return cut.slice(1);
  if (cut[0] === 'api' && cut[1]) return cut.slice(1);
  return cut;
}

function getPathParts(req: VercelRequest): string[] {
  const anyReq = req as any;
  const pathParam = anyReq.query?.path;

  if (Array.isArray(pathParam)) {
    return normalizeAdminPathSegments(pathParam.map(String));
  }
  if (typeof pathParam === 'string') {
    return normalizeAdminPathSegments(pathParam.split('/'));
  }

  const raw = (req.url || anyReq.originalUrl || anyReq.path || '') as string;
  const url = raw.split('?')[0].replace(/^https?:\/\/[^/]+/, '');
  const segments = url.split('/').filter(Boolean);

  // Remove leading \"api\" and \"admin\" segments
  return normalizeAdminPathSegments(segments);
}

function parseBody(body: unknown): Record<string, unknown> {
  if (body == null) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

function getAdminId(req: VercelRequest): number | null {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId?: number; id?: number };
    const adminId = decoded.adminId ?? decoded.id;
    return adminId != null && typeof adminId === 'number' ? adminId : null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const path = getPathParts(req);

  // POST /api/admin/login (no auth)
  if (path[0] === 'login' && req.method === 'POST') {
    try {
      const body = parseBody(req.body);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) return res.status(400).json({ error: 'Email va parol kerak' });
      const { data: admin, error } = await supabase.from('admins').select('id, email, password_hash').eq('email', email).single();
      if (error || !admin) return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
      const valid = await bcrypt.compare(password, (admin as { password_hash: string }).password_hash);
      if (!valid) return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
      const token = jwt.sign(
        { adminId: (admin as { id: number }).id, email: (admin as { email: string }).email },
        JWT_SECRET
      );
      return res.status(200).json({ token, admin: { id: (admin as { id: number }).id, email: (admin as { email: string }).email } });
    } catch (e) {
      console.error('[api/admin/login]', e);
      return res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  }

  const adminId = getAdminId(req);
  if (adminId == null) return res.status(401).json({ error: 'Token kerak' });

  try {
    // GET /api/admin/dashboard — revenue by currency (UZS, USD, RUB)
    if (path[0] === 'dashboard' && req.method === 'GET') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [uToday, uWeek, uMonth, uActive, pTodayRows, pMonthRows, pAllRows, subs, wdraw] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('users').select('id', { count: 'exact', head: true }).gt('plan_expires_at', now.toISOString()),
        supabase.from('payments').select('amount, currency').eq('status', 'approved').gte('approved_at', todayStart),
        supabase.from('payments').select('amount, currency').eq('status', 'approved').gte('approved_at', monthStart),
        supabase.from('payments').select('amount, currency').eq('status', 'approved'),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').gt('expires_at', now.toISOString()),
        supabase.from('referral_withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      function sumByCurrency(rows: { amount?: number; currency?: string }[] | null): { UZS: number; USD: number; RUB: number } {
        const out = { UZS: 0, USD: 0, RUB: 0 };
        (rows ?? []).forEach((r: any) => {
          const c = (r.currency || 'UZS').toUpperCase();
          const key = c === 'UZS' ? 'UZS' : c === 'USD' ? 'USD' : c === 'RUB' ? 'RUB' : 'UZS';
          out[key as keyof typeof out] += Number(r.amount ?? 0);
        });
        return out;
      }

      return res.status(200).json({
        users_today: (uToday as any).count ?? 0,
        users_this_week: (uWeek as any).count ?? 0,
        users_this_month: (uMonth as any).count ?? 0,
        active_users: (uActive as any).count ?? 0,
        payments_today: sumByCurrency((pTodayRows as any).data ?? []),
        payments_this_month: sumByCurrency((pMonthRows as any).data ?? []),
        total_revenue: sumByCurrency((pAllRows as any).data ?? []),
        active_subscriptions: (subs as any).count ?? 0,
        referral_payouts_pending: (wdraw as any).count ?? 0,
      });
    }

    // GET /api/admin/users
    if (path[0] === 'users' && path.length === 1 && req.method === 'GET') {
      const registered = (req.query.registered as string) || '';
      const subscription = (req.query.subscription as string) || '';
      const referralOnly = req.query.referral === 'true';
      const now = new Date().toISOString();

      let q = supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at, plan_name, plan_expires_at, total_points, referral_balance, total_referral_earned, referred_by')
        .order('created_at', { ascending: false });

      if (registered === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        q = q.gte('created_at', d.toISOString());
      } else if (registered === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        q = q.gte('created_at', d.toISOString());
      } else if (registered === 'month') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        q = q.gte('created_at', d.toISOString());
      }
      if (subscription === 'none') q = q.or('plan_expires_at.is.null,plan_expires_at.lt.' + now);
      else if (subscription === 'monthly') q = q.eq('plan_name', '1 OY').gt('plan_expires_at', now);
      else if (subscription === 'three_months') q = q.eq('plan_name', '3 OY').gt('plan_expires_at', now);
      else if (subscription === 'yearly') q = q.eq('plan_name', '1 YIL').gt('plan_expires_at', now);
      if (referralOnly) q = q.not('referred_by', 'is', null);

      const { data: rows, error } = await q;
      if (error) return res.status(500).json({ error: error.message });
      const list = (rows ?? []).map((u: any) => ({
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
        email: u.email,
        registration_date: u.created_at,
        subscription_type: u.plan_name ?? '—',
        subscription_status: u.plan_expires_at && u.plan_expires_at > now ? 'active' : 'expired',
        total_points: u.total_points ?? 0,
        referral_earnings: u.total_referral_earned ?? 0,
      }));
      return res.status(200).json(list);
    }

    // GET /api/admin/users/:id
    if (path[0] === 'users' && path.length === 2 && req.method === 'GET') {
      const id = Number(path[1]);
      if (!id) return res.status(400).json({ error: 'Invalid user id' });
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at, plan_name, plan_expires_at, total_points, referral_balance, total_referral_earned, referred_by')
        .eq('id', id)
        .single();
      if (userErr || !user) return res.status(404).json({ error: 'User topilmadi' });
      const now = new Date().toISOString();
      const lessonsCompleted = await getUserCompletedLessonsCount(supabase, id);
      const { count: wordsLearned } = await supabase.from('vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', id);
      const { data: refs } = await supabase.from('referrals').select('id').eq('referrer_id', id);
      return res.status(200).json({
        id: (user as any).id,
        name: [(user as any).first_name, (user as any).last_name].filter(Boolean).join(' ') || '—',
        email: (user as any).email,
        registration_date: (user as any).created_at,
        subscription: {
          plan_type: (user as any).plan_name ?? null,
          status: (user as any).plan_expires_at && (user as any).plan_expires_at > now ? 'active' : 'expired',
          expires_at: (user as any).plan_expires_at ?? null,
        },
        statistics: {
          total_points: (user as any).total_points ?? 0,
          lessons_completed: lessonsCompleted,
          words_learned: wordsLearned ?? 0,
        },
        referral: {
          referral_balance: (user as any).referral_balance ?? 0,
          invited_users: (refs ?? []).length,
        },
      });
    }

    // GET /api/admin/payments — from payments table (user uploads proof, admin confirms)
    if (path[0] === 'payments' && path.length === 1 && req.method === 'GET') {
      const { data: rows, error } = await supabase
        .from('payments')
        .select('id, user_id, tariff_type, currency, payment_proof_url, payment_time, status, created_at, approved_at')
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const planLabel: Record<string, string> = { month: '1 OY', '3months': '3 OY', year: '1 YIL' };
      const list = (rows ?? []).map((r: any) => {
        const u = userMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          user: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '—',
          user_email: u?.email ?? '—',
          plan: planLabel[r.tariff_type] ?? r.tariff_type,
          tariff_type: r.tariff_type,
          currency: r.currency,
          payment_proof_url: r.payment_proof_url ?? null,
          payment_time: r.payment_time ?? r.created_at ?? '',
          date: r.created_at ?? '',
          status: r.status,
          approved_at: r.approved_at ?? null,
        };
      });
      return res.status(200).json(list);
    }

    // POST /api/admin/payments/:id/confirm and .../reject — payments table
    if (path[0] === 'payments' && path.length >= 3 && req.method === 'POST') {
      const payId = Number(path[1]);
      const action = path[2];
      if (!payId) return res.status(400).json({ error: 'Invalid id' });
      if (action === 'confirm') {
        const { data: row, error: fe } = await supabase.from('payments').select('user_id, tariff_type').eq('id', payId).eq('status', 'pending').single();
        if (fe || !row) return res.status(404).json({ error: 'To\'lov topilmadi' });
        const userId = (row as any).user_id;
        const tariffType = (row as any).tariff_type; // month | 3months | year
        const planType = tariffType === 'month' ? 'monthly' : tariffType === '3months' ? 'three_months' : 'yearly';
        const now = new Date();
        const planName = tariffType === 'year' ? '1 YIL' : tariffType === '3months' ? '3 OY' : '1 OY';
        await supabase.from('payments').update({ status: 'approved', approved_at: now.toISOString(), admin_id: adminId }).eq('id', payId);
        const { data: current } = await supabase.from('users').select('plan_expires_at').eq('id', userId).single();
        const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at) : null;
        const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
        const ext = new Date(startFrom);
        if (tariffType === 'month') ext.setMonth(ext.getMonth() + 1);
        else if (tariffType === '3months') ext.setMonth(ext.getMonth() + 3);
        else ext.setFullYear(ext.getFullYear() + 1);
        await supabase.from('users').update({ plan_name: planName, plan_expires_at: ext.toISOString() }).eq('id', userId);
        await supabase.from('subscriptions').insert({
          user_id: userId,
          plan_type: planType,
          started_at: now.toISOString(),
          expires_at: ext.toISOString(),
          status: 'active',
        });
        return res.status(200).json({ success: true });
      }
      if (action === 'reject') {
        await supabase.from('payments').update({ status: 'rejected' }).eq('id', payId).eq('status', 'pending');
        return res.status(200).json({ success: true });
      }
    }

    // GET /api/admin/subscriptions
    if (path[0] === 'subscriptions' && path.length === 1 && req.method === 'GET') {
      const { data: rows, error } = await supabase.from('subscriptions').select('id, user_id, plan_type, status, started_at, expires_at').order('expires_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const list = (rows ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        user: userMap.get(r.user_id) ? [userMap.get(r.user_id)!.first_name, userMap.get(r.user_id)!.last_name].filter(Boolean).join(' ') || (userMap.get(r.user_id) as any).email : '—',
        plan_type: r.plan_type,
        status: r.status,
        started_at: r.started_at,
        expires_at: r.expires_at,
      }));
      return res.status(200).json(list);
    }

    // GET /api/admin/referrals/withdrawals
    if (path[0] === 'referrals' && path[1] === 'withdrawals' && req.method === 'GET') {
      const { data: rows, error } = await supabase.from('referral_withdrawals').select('id, user_id, amount, card_number, phone, full_name, status, created_at, processed_at, admin_receipt').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const list = (rows ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        user: userMap.get(r.user_id) ? [userMap.get(r.user_id)!.first_name, userMap.get(r.user_id)!.last_name].filter(Boolean).join(' ') || (userMap.get(r.user_id) as any).email : '—',
        amount: r.amount,
        card_number: r.card_number ?? '—',
        phone: r.phone ?? '—',
        full_name: r.full_name ?? '—',
        status: r.status,
        created_at: r.created_at,
        processed_at: r.processed_at,
        admin_receipt: r.admin_receipt,
      }));
      return res.status(200).json(list);
    }

    // POST /api/admin/referrals/:id/approve | reject
    if (path[0] === 'referrals' && path.length === 3 && req.method === 'POST') {
      const id = Number(path[1]);
      const action = path[2];
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const { data: row } = await supabase.from('referral_withdrawals').select('user_id, amount, status').eq('id', id).single();
      if (!row || (row as any).status !== 'pending') return res.status(404).json({ error: 'Topilmadi' });
      if (action === 'approve') {
        const body = parseBody(req.body);
        const adminReceipt = body.admin_receipt != null ? String(body.admin_receipt) : null;
        await supabase.from('referral_withdrawals').update({ status: 'approved', processed_at: new Date().toISOString(), admin_receipt: adminReceipt }).eq('id', id);
        return res.status(200).json({ success: true });
      }
      if (action === 'reject') {
        const userId = (row as any).user_id;
        const amount = Number((row as any).amount);
        const { data: user } = await supabase.from('users').select('referral_balance').eq('id', userId).single();
        const balance = Number((user as any)?.referral_balance ?? 0) + amount;
        await supabase.from('users').update({ referral_balance: balance }).eq('id', userId);
        await supabase.from('referral_withdrawals').update({ status: 'rejected', processed_at: new Date().toISOString() }).eq('id', id);
        return res.status(200).json({ success: true });
      }
    }

    // GET /api/admin/support
    if (path[0] === 'support' && path.length === 1 && req.method === 'GET') {
      const { data: rows, error } = await supabase.from('support_messages').select('id, user_id, message, status, created_at, answered_at, reply').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const list = (rows ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        user: userMap.get(r.user_id) ? [userMap.get(r.user_id)!.first_name, userMap.get(r.user_id)!.last_name].filter(Boolean).join(' ') || (userMap.get(r.user_id) as any).email : '—',
        message: r.message,
        status: r.status,
        created_at: r.created_at,
        answered_at: r.answered_at,
        reply: r.reply,
      }));
      return res.status(200).json(list);
    }

    // POST /api/admin/support/:id/reply
    if (path[0] === 'support' && path.length === 3 && path[2] === 'reply' && req.method === 'POST') {
      const id = Number(path[1]);
      const body = parseBody(req.body);
      const reply = body.reply != null ? String(body.reply).trim() : '';
      if (!id || !reply) return res.status(400).json({ error: 'reply kerak' });
      await supabase.from('support_messages').update({ status: 'answered', answered_at: new Date().toISOString(), reply }).eq('id', id);
      return res.status(200).json({ success: true });
    }

    // GET /api/admin/pricing
    if (path[0] === 'pricing' && path.length === 1 && req.method === 'GET') {
      const { data: rows, error } = await supabase
        .from('pricing_plans')
        .select('id, plan_name, duration_days, price, discount_percent, active')
        .order('id');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(rows ?? []);
    }

    // PUT /api/admin/pricing/update
    if (path[0] === 'pricing' && path[1] === 'update' && (req.method === 'PUT' || req.method === 'PATCH')) {
      const raw = req.body;
      const plans = Array.isArray(raw) ? raw : Array.isArray((parseBody(raw) as any).plans) ? (parseBody(raw) as any).plans : [];
      for (const plan of plans) {
        const id = plan.id;
        if (id == null) continue;
        const updates: Record<string, unknown> = {};
        if (plan.plan_name != null) updates.plan_name = plan.plan_name;
        if (plan.duration_days != null) updates.duration_days = plan.duration_days;
        if (plan.price != null) updates.price = plan.price;
        if (plan.discount_percent != null) updates.discount_percent = plan.discount_percent;
        if (plan.active != null) updates.active = plan.active;
        if (Object.keys(updates).length > 0) await supabase.from('pricing_plans').update(updates).eq('id', id);
      }
      return res.status(200).json({ success: true });
    }

    // --- Payment methods
    if (path[0] === 'payment-methods') {
      if (path.length === 1 && req.method === 'GET') {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('id, currency, bank_name, card_number, phone_number, card_holder_name, status, created_at, updated_at')
          .order('currency').order('id');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data ?? []);
      }
      if (path.length === 1 && req.method === 'POST') {
        const body = parseBody(req.body);
        const currency = typeof body.currency === 'string' ? body.currency : '';
        const bank_name = typeof body.bank_name === 'string' ? body.bank_name.trim() : '';
        const card_number = typeof body.card_number === 'string' ? body.card_number.trim() : '';
        const card_holder_name = typeof body.card_holder_name === 'string' ? body.card_holder_name.trim() : '';
        const phone_number = body.phone_number != null ? String(body.phone_number).trim() : null;
        if (!['UZS', 'RUB', 'USD'].includes(currency) || !bank_name || !card_number || !card_holder_name) {
          return res.status(400).json({ error: 'currency, bank_name, card_number, card_holder_name kerak' });
        }
        const now = new Date().toISOString();
        const { data: row, error } = await supabase.from('payment_methods').insert({
          currency,
          bank_name,
          card_number,
          phone_number,
          card_holder_name,
          status: 'active',
          updated_at: now,
        }).select('id').single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json({ id: (row as any).id });
      }
      const id = parseInt(path[1], 10);
      if (path.length === 2 && !Number.isNaN(id)) {
        if (req.method === 'PUT') {
          const body = parseBody(req.body);
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (body.currency && ['UZS', 'RUB', 'USD'].includes(body.currency as string)) updates.currency = body.currency;
          if (body.bank_name != null) updates.bank_name = String(body.bank_name).trim();
          if (body.card_number != null) updates.card_number = String(body.card_number).trim();
          if (body.phone_number != null) updates.phone_number = String(body.phone_number).trim();
          if (body.card_holder_name != null) updates.card_holder_name = String(body.card_holder_name).trim();
          if (body.status && ['active', 'disabled'].includes(body.status as string)) updates.status = body.status;
          if (Object.keys(updates).length <= 1) return res.status(400).json({ error: 'Hech narsa yangilanmadi' });
          const { error } = await supabase.from('payment_methods').update(updates).eq('id', id);
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
        if (req.method === 'DELETE') {
          const { error } = await supabase.from('payment_methods').delete().eq('id', id);
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
      }
      if (path.length === 3 && path[2] === 'toggle' && req.method === 'POST' && !Number.isNaN(parseInt(path[1], 10))) {
        const payId = parseInt(path[1], 10);
        const { data: row, error: fe } = await supabase.from('payment_methods').select('status').eq('id', payId).single();
        if (fe || !row) return res.status(404).json({ error: 'Topilmadi' });
        const newStatus = (row as any).status === 'active' ? 'disabled' : 'active';
        const { error } = await supabase.from('payment_methods').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', payId);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, status: newStatus });
      }
    }

    // --- Tariff prices (multi-currency)
    if (path[0] === 'tariff-prices') {
      if (path.length === 1 && req.method === 'GET') {
        const { data, error } = await supabase
          .from('tariff_prices')
          .select('id, tariff_type, currency, price, created_at, updated_at')
          .order('tariff_type').order('currency');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data ?? []);
      }
      if (path.length === 1 && (req.method === 'PUT' || req.method === 'PATCH')) {
        const body = parseBody(req.body);
        const tariff_type = typeof body.tariff_type === 'string' ? body.tariff_type : '';
        const currency = typeof body.currency === 'string' ? body.currency : '';
        const price = Number(body.price);
        if (!['month', 'three_months', 'year'].includes(tariff_type) || !['UZS', 'RUB', 'USD'].includes(currency) || Number.isNaN(price) || price < 0) {
          return res.status(400).json({ error: 'tariff_type, currency, price kerak' });
        }
        const now = new Date().toISOString();
        const { error } = await supabase.from('tariff_prices').upsert(
          { tariff_type, currency, price, updated_at: now },
          { onConflict: 'tariff_type,currency' }
        );
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }
      if (path[1] === 'bulk' && (req.method === 'PUT' || req.method === 'PATCH')) {
        const body = req.body;
        const rows = Array.isArray(body) ? body : [];
        const now = new Date().toISOString();
        for (const row of rows) {
          const tariff_type = row?.tariff_type;
          const currency = row?.currency;
          const price = Number(row?.price);
          if (!tariff_type || !currency || Number.isNaN(price) || price < 0) continue;
          await supabase.from('tariff_prices').upsert(
            { tariff_type, currency, price, updated_at: now },
            { onConflict: 'tariff_type,currency' }
          );
        }
        return res.status(200).json({ success: true });
      }
    }

    return res.status(404).json({
      error: 'Not found',
      debug: {
        method: req.method,
        rawUrl: req.url ?? null,
        originalUrl: (req as any).originalUrl ?? null,
        queryPath: (req as any).query?.path ?? null,
        normalizedPath: path,
      },
    });
  } catch (e) {
    console.error('[api/admin]', e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
