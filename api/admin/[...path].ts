/**
 * Admin API (Vercel): login + dashboard, users, payments, subscriptions, referrals, support, pricing.
 * Single serverless function to stay under 12-function limit.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'super-secret-key-uz-ru';

function getPathParts(req: VercelRequest): string[] {
  const path = req.query.path;
  if (Array.isArray(path)) return path.filter((p): p is string => typeof p === 'string');
  if (typeof path === 'string') return path ? [path] : [];
  const url = req.url || (req as any).originalUrl || '';
  const pathname = typeof url === 'string' ? url.split('?')[0] : '';
  const parts = pathname.split('/').filter(Boolean);
  const adminIndex = parts.indexOf('admin');
  if (adminIndex >= 0 && adminIndex < parts.length - 1) return parts.slice(adminIndex + 1);
  return [];
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
    // GET /api/admin/dashboard
    if (path[0] === 'dashboard' && req.method === 'GET') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [uToday, uWeek, uMonth, uActive, pToday, pMonth, pAll, subs, wdraw] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('users').select('id', { count: 'exact', head: true }).gt('plan_expires_at', now.toISOString()),
        supabase.from('subscription_payment_requests').select('amount').eq('status', 'confirmed').gte('confirmed_at', todayStart),
        supabase.from('subscription_payment_requests').select('amount').eq('status', 'confirmed').gte('confirmed_at', monthStart),
        supabase.from('subscription_payment_requests').select('amount').eq('status', 'confirmed'),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').gt('expires_at', now.toISOString()),
        supabase.from('referral_withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const sum = (arr: { amount?: number }[] | null) => (arr ?? []).reduce((a, r) => a + Number(r.amount ?? 0), 0);
      return res.status(200).json({
        users_today: (uToday as any).count ?? 0,
        users_this_week: (uWeek as any).count ?? 0,
        users_this_month: (uMonth as any).count ?? 0,
        active_users: (uActive as any).count ?? 0,
        payments_today: sum((pToday as any).data ?? []),
        payments_this_month: sum((pMonth as any).data ?? []),
        total_revenue: sum((pAll as any).data ?? []),
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
      const { count: lessonsCompleted } = await supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('user_id', id).eq('completed', 1);
      const { count: wordsLearned } = await supabase.from('vocabulary').select('*', { count: 'exact', head: true }).eq('user_id', id);
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
          lessons_completed: lessonsCompleted ?? 0,
          words_learned: wordsLearned ?? 0,
        },
        referral: {
          referral_balance: (user as any).referral_balance ?? 0,
          invited_users: (refs ?? []).length,
        },
      });
    }

    // GET /api/admin/payments
    if (path[0] === 'payments' && path.length === 1 && req.method === 'GET') {
      const { data: rows, error } = await supabase
        .from('subscription_payment_requests')
        .select('id, user_id, plan_type, amount, payment_method, status, created_at, confirmed_at')
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const list = (rows ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        user: userMap.get(r.user_id) ? [userMap.get(r.user_id)!.first_name, userMap.get(r.user_id)!.last_name].filter(Boolean).join(' ') || (userMap.get(r.user_id) as any).email : '—',
        plan: r.plan_type,
        amount: r.amount,
        date: r.created_at,
        status: r.status,
        confirmed_at: r.confirmed_at,
      }));
      return res.status(200).json(list);
    }

    // POST /api/admin/payments/:id/confirm and .../reject
    if (path[0] === 'payments' && path.length >= 3 && req.method === 'POST') {
      const payId = Number(path[1]);
      const action = path[2];
      if (!payId) return res.status(400).json({ error: 'Invalid id' });
      if (action === 'confirm') {
        const { data: row, error: fe } = await supabase.from('subscription_payment_requests').select('user_id, plan_type').eq('id', payId).eq('status', 'pending').single();
        if (fe || !row) return res.status(404).json({ error: 'To\'lov topilmadi' });
        const userId = (row as any).user_id;
        const planType = (row as any).plan_type;
        const now = new Date();
        let expiresAt = new Date(now);
        if (planType === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1);
        else if (planType === 'three_months') expiresAt.setMonth(expiresAt.getMonth() + 3);
        else if (planType === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        else return res.status(400).json({ error: 'Invalid plan_type' });
        const planName = planType === 'yearly' ? '1 YIL' : planType === 'three_months' ? '3 OY' : '1 OY';
        await supabase.from('subscription_payment_requests').update({ status: 'confirmed', confirmed_at: now.toISOString() }).eq('id', payId);
        const { data: current } = await supabase.from('users').select('plan_expires_at').eq('id', userId).single();
        const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at) : null;
        const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
        const ext = new Date(startFrom);
        if (planType === 'monthly') ext.setMonth(ext.getMonth() + 1);
        else if (planType === 'three_months') ext.setMonth(ext.getMonth() + 3);
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
        await supabase.from('subscription_payment_requests').update({ status: 'rejected' }).eq('id', payId).eq('status', 'pending');
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
      const { data: rows, error } = await supabase.from('pricing_plans').select('*').order('id');
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

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('[api/admin]', e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
