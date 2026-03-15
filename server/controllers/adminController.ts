import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/adminAuth';
import * as subscriptionService from '../services/subscription.service';

export function createAdminController(supabase: SupabaseClient) {
  // --- Login (no auth)
  async function login(req: Request, res: Response) {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kerak' });
    }
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, password_hash')
      .eq('email', String(email).trim().toLowerCase())
      .single();
    if (error || !admin) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }
    const ok = await bcrypt.compare(password, (admin as any).password_hash);
    if (!ok) return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    const token = jwt.sign(
      { adminId: (admin as any).id, email: (admin as any).email },
      JWT_SECRET
    );
    return res.json({ token, admin: { id: (admin as any).id, email: (admin as any).email } });
  }

  // --- Dashboard analytics
  async function getDashboard(_req: Request, res: Response) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      usersToday,
      usersWeek,
      usersMonth,
      activeUsers,
      paymentsToday,
      paymentsMonth,
      totalRevenue,
      activeSubs,
      pendingWithdrawals,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekStartStr),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('users').select('id', { count: 'exact', head: true }).gt('plan_expires_at', now.toISOString()),
      supabase.from('subscription_payment_requests').select('amount').eq('status', 'confirmed').gte('confirmed_at', todayStart),
      supabase.from('subscription_payment_requests').select('amount').eq('status', 'confirmed').gte('confirmed_at', monthStart),
      supabase.from('subscription_payment_requests').select('amount').eq('status', 'confirmed'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').gt('expires_at', now.toISOString()),
      supabase.from('referral_withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const sum = (arr: { amount?: number }[] | null) => (arr ?? []).reduce((a, r) => a + Number(r.amount ?? 0), 0);

    return res.json({
      users_today: (usersToday as any).count ?? 0,
      users_this_week: (usersWeek as any).count ?? 0,
      users_this_month: (usersMonth as any).count ?? 0,
      active_users: (activeUsers as any).count ?? 0,
      payments_today: sum((paymentsToday as any).data ?? []),
      payments_this_month: sum((paymentsMonth as any).data ?? []),
      total_revenue: sum((totalRevenue as any).data ?? []),
      active_subscriptions: (activeSubs as any).count ?? 0,
      referral_payouts_pending: (pendingWithdrawals as any).count ?? 0,
    });
  }

  // --- Users list with filters
  async function getUsers(req: Request, res: Response) {
    const registered = (req.query.registered as string) || '';
    const subscription = (req.query.subscription as string) || '';
    const referralOnly = req.query.referral === 'true';

    let q = supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        created_at,
        plan_name,
        plan_expires_at,
        total_points,
        referral_balance,
        total_referral_earned,
        referred_by
      `)
      .order('created_at', { ascending: false });

    const now = new Date().toISOString();
    if (registered === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      q = q.gte('created_at', todayStart.toISOString());
    } else if (registered === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      q = q.gte('created_at', d.toISOString());
    } else if (registered === 'month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      q = q.gte('created_at', d.toISOString());
    }

    if (subscription === 'none') {
      q = q.or('plan_expires_at.is.null,plan_expires_at.lt.' + now);
    } else if (subscription === 'monthly') {
      q = q.eq('plan_name', '1 OY').gt('plan_expires_at', now);
    } else if (subscription === 'three_months') {
      q = q.eq('plan_name', '3 OY').gt('plan_expires_at', now);
    } else if (subscription === 'yearly') {
      q = q.eq('plan_name', '1 YIL').gt('plan_expires_at', now);
    }

    if (referralOnly) {
      q = q.not('referred_by', 'is', null);
    }

    const { data: rows, error } = await q;
    if (error) {
      console.error('[admin/users]', error);
      return res.status(500).json({ error: error.message });
    }

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
    return res.json(list);
  }

  // --- User profile by id
  async function getUserProfile(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, created_at, plan_name, plan_expires_at, total_points, referral_balance, total_referral_earned, referred_by')
      .eq('id', id)
      .single();
    if (userErr || !user) return res.status(404).json({ error: 'User topilmadi' });

    const now = new Date().toISOString();
    const { count: lessonsCompleted } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
      .eq('completed', 1);
    const { count: wordsLearned } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    const { data: referrals } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', id);

    return res.json({
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
        invited_users: (referrals ?? []).length,
      },
    });
  }

  // --- Payments (subscription_payment_requests)
  async function getPayments(_req: Request, res: Response) {
    const { data: rows, error } = await supabase
      .from('payments')
      .select('id, user_id, tariff_type, currency, payment_proof_url, payment_time, status, approved_at, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[admin/payments]', error);
      return res.status(500).json({ error: error.message });
    }
    const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

    const list = (rows ?? []).map((r: any) => {
      const u = userMap.get(r.user_id);
      const planLabel = r.tariff_type === 'year' ? '1 yil' : r.tariff_type === '3months' ? '3 oy' : '1 oy';
      return {
        id: r.id,
        user: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '—',
        user_email: u?.email ?? '—',
        user_id: r.user_id,
        plan: planLabel,
        tariff_type: r.tariff_type,
        currency: r.currency,
        payment_proof_url: r.payment_proof_url,
        payment_time: r.payment_time,
        date: r.created_at,
        status: r.status,
        approved_at: r.approved_at,
      };
    });
    return res.json(list);
  }

  async function confirmPayment(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const adminId = (req as any).adminId;
      if (!id) return res.status(400).json({ error: 'Invalid payment id' });

      const { data: row, error: fetchErr } = await supabase
        .from('payments')
        .select('user_id, tariff_type')
        .eq('id', id)
        .eq('status', 'pending')
        .single();
      if (fetchErr || !row) return res.status(404).json({ error: 'To\'lov topilmadi yoki tasdiqlangan' });

      const userId = (row as any).user_id;
      const tariffType = (row as any).tariff_type;
      const planType = tariffType === 'year' ? 'yearly' : tariffType === '3months' ? 'three_months' : 'monthly';
      const daysToAdd = tariffType === 'year' ? 365 : tariffType === '3months' ? 90 : 30;
      const planName = tariffType === 'year' ? '1 YIL' : tariffType === '3months' ? '3 OY' : '1 OY';
      const now = new Date();

      const { error: updatePayErr } = await supabase
        .from('payments')
        .update({ status: 'approved', admin_id: adminId ?? null, approved_at: now.toISOString() })
        .eq('id', id);
      if (updatePayErr) {
        console.error('[admin/confirmPayment] payments update', updatePayErr);
        return res.status(500).json({ error: updatePayErr.message });
      }

      const { data: current } = await supabase.from('users').select('plan_expires_at').eq('id', userId).single();
      const currentEnd = current?.plan_expires_at ? new Date(current.plan_expires_at) : null;
      const startFrom = currentEnd && currentEnd > now ? currentEnd : now;
      const ext = new Date(startFrom);
      ext.setDate(ext.getDate() + daysToAdd);

      const { error: updateUserErr } = await supabase
        .from('users')
        .update({ plan_name: planName, plan_expires_at: ext.toISOString() })
        .eq('id', userId);
      if (updateUserErr) {
        console.error('[admin/confirmPayment] users update', updateUserErr);
        return res.status(500).json({ error: updateUserErr.message });
      }

      await subscriptionService.createOrExtendSubscription(supabase as any, userId, planType as any, ext);
      return res.json({ success: true });
    } catch (e: any) {
      console.error('[admin/confirmPayment]', e);
      return res.status(500).json({ error: e?.message || 'Server xatosi' });
    }
  }

  async function rejectPayment(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid payment id' });

      const { data: updated, error } = await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id');
      if (error) {
        console.error('[admin/rejectPayment]', error);
        return res.status(500).json({ error: error.message });
      }
      // 200 either way: if already processed, client will refetch and see current status
      return res.json({ success: true, updated: (updated?.length ?? 0) > 0 });
    } catch (e: any) {
      console.error('[admin/rejectPayment]', e);
      return res.status(500).json({ error: e?.message || 'Server xatosi' });
    }
  }

  // --- Subscriptions list
  async function getSubscriptions(_req: Request, res: Response) {
    const { data: rows, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan_type, status, started_at, expires_at')
      .order('expires_at', { ascending: false });
    if (error) {
      console.error('[admin/subscriptions]', error);
      return res.status(500).json({ error: error.message });
    }
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
    return res.json(list);
  }

  // --- Referral withdrawals
  async function getWithdrawals(_req: Request, res: Response) {
    const { data: rows, error } = await supabase
      .from('referral_withdrawals')
      .select('id, user_id, amount, card_number, phone, full_name, status, created_at, processed_at, admin_receipt')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[admin/withdrawals]', error);
      return res.status(500).json({ error: error.message });
    }
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
    return res.json(list);
  }

  async function approveWithdrawal(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { admin_receipt } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { data: row, error: fetchErr } = await supabase
      .from('referral_withdrawals')
      .select('user_id, amount, status')
      .eq('id', id)
      .single();
    if (fetchErr || !row) return res.status(404).json({ error: 'Topilmadi' });
    if ((row as any).status !== 'pending') return res.status(400).json({ error: 'Allaqachon qayta ishlangan' });

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('referral_withdrawals')
      .update({
        status: 'approved',
        processed_at: now,
        admin_receipt: admin_receipt != null ? String(admin_receipt) : null,
      })
      .eq('id', id);
    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.json({ success: true });
  }

  async function rejectWithdrawal(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { data: row, error: fetchErr } = await supabase
      .from('referral_withdrawals')
      .select('user_id, amount, status')
      .eq('id', id)
      .single();
    if (fetchErr || !row) return res.status(404).json({ error: 'Topilmadi' });
    if ((row as any).status !== 'pending') return res.status(400).json({ error: 'Allaqachon qayta ishlangan' });

    const userId = (row as any).user_id;
    const amount = Number((row as any).amount);

    const { data: user, error: userErr } = await supabase.from('users').select('referral_balance').eq('id', userId).single();
    if (userErr || !user) return res.status(500).json({ error: 'User topilmadi' });
    const balance = Number((user as any).referral_balance ?? 0) + amount;

    await supabase.from('users').update({ referral_balance: balance }).eq('id', userId);
    await supabase
      .from('referral_withdrawals')
      .update({ status: 'rejected', processed_at: new Date().toISOString() })
      .eq('id', id);

    return res.json({ success: true });
  }

  // --- Support messages
  async function getSupportMessages(_req: Request, res: Response) {
    const { data: rows, error } = await supabase
      .from('support_messages')
      .select('id, user_id, message, status, created_at, answered_at, reply')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[admin/support]', error);
      return res.status(500).json({ error: error.message });
    }
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
    return res.json(list);
  }

  async function replySupport(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { reply } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (reply == null || String(reply).trim() === '') return res.status(400).json({ error: 'reply kerak' });

    const { error } = await supabase
      .from('support_messages')
      .update({
        status: 'answered',
        answered_at: new Date().toISOString(),
        reply: String(reply).trim(),
      })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  // --- Pricing
  async function getPricing(_req: Request, res: Response) {
    const { data: rows, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('id');
    if (error) {
      console.error('[admin/pricing]', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(rows ?? []);
  }

  async function updatePricing(req: Request, res: Response) {
    const body = req.body;
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Array of plans kerak' });

    for (const plan of body) {
      const id = plan.id;
      if (id == null) continue;
      const updates: Record<string, unknown> = {};
      if (plan.plan_name != null) updates.plan_name = plan.plan_name;
      if (plan.duration_days != null) updates.duration_days = plan.duration_days;
      if (plan.price != null) updates.price = plan.price;
      if (plan.discount_percent != null) updates.discount_percent = plan.discount_percent;
      if (plan.active != null) updates.active = plan.active;
      if (Object.keys(updates).length > 0) {
        await supabase.from('pricing_plans').update(updates).eq('id', id);
      }
    }
    return res.json({ success: true });
  }

  // --- Payment methods (CRUD)
  async function getPaymentMethods(_req: Request, res: Response) {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, currency, bank_name, card_number, phone_number, card_holder_name, status, created_at, updated_at')
      .order('currency')
      .order('id');
    if (error) {
      console.error('[admin/payment-methods]', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data ?? []);
  }

  async function createPaymentMethod(req: Request, res: Response) {
    const body = req.body || {};
    const { currency, bank_name, card_number, phone_number, card_holder_name } = body;
    if (!currency || !['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    if (!bank_name || !String(bank_name).trim()) return res.status(400).json({ error: 'bank_name kerak' });
    if (!card_number || !String(card_number).trim()) return res.status(400).json({ error: 'card_number kerak' });
    if (!card_holder_name || !String(card_holder_name).trim()) return res.status(400).json({ error: 'card_holder_name kerak' });
    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from('payment_methods')
      .insert({
        currency,
        bank_name: String(bank_name).trim(),
        card_number: String(card_number).trim(),
        phone_number: phone_number != null ? String(phone_number).trim() : null,
        card_holder_name: String(card_holder_name).trim(),
        status: 'active',
        updated_at: now,
      })
      .select('id')
      .single();
    if (error) {
      console.error('[admin/payment-methods create]', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ id: (row as any).id });
  }

  async function updatePaymentMethod(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const body = req.body || {};
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.currency != null && ['UZS', 'RUB', 'USD'].includes(body.currency)) updates.currency = body.currency;
    if (body.bank_name != null) updates.bank_name = String(body.bank_name).trim();
    if (body.card_number != null) updates.card_number = String(body.card_number).trim();
    if (body.phone_number != null) updates.phone_number = String(body.phone_number).trim();
    if (body.card_holder_name != null) updates.card_holder_name = String(body.card_holder_name).trim();
    if (body.status != null && ['active', 'disabled'].includes(body.status)) updates.status = body.status;
    if (Object.keys(updates).length <= 1) return res.status(400).json({ error: 'Hech narsa yangilanmadi' });
    const { error } = await supabase.from('payment_methods').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  async function togglePaymentMethod(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { data: row, error: fetchErr } = await supabase
      .from('payment_methods')
      .select('status')
      .eq('id', id)
      .single();
    if (fetchErr || !row) return res.status(404).json({ error: 'Topilmadi' });
    const newStatus = (row as any).status === 'active' ? 'disabled' : 'active';
    const { error } = await supabase
      .from('payment_methods')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, status: newStatus });
  }

  async function deletePaymentMethod(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  // --- Tariff pricing (multi-currency)
  async function getTariffPrices(_req: Request, res: Response) {
    const { data, error } = await supabase
      .from('tariff_prices')
      .select('id, tariff_type, currency, price, created_at, updated_at')
      .order('tariff_type')
      .order('currency');
    if (error) {
      console.error('[admin/tariff-prices]', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data ?? []);
  }

  async function updateTariffPrice(req: Request, res: Response) {
    const body = req.body || {};
    const { tariff_type, currency, price } = body;
    if (!tariff_type || !['month', 'three_months', 'year'].includes(tariff_type)) {
      return res.status(400).json({ error: 'tariff_type kerak: month, three_months, year' });
    }
    if (!currency || !['UZS', 'RUB', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'currency kerak: UZS, RUB, USD' });
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: 'price son bo\'lishi kerak' });
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('tariff_prices')
      .upsert(
        { tariff_type, currency, price: priceNum, updated_at: now },
        { onConflict: 'tariff_type,currency' }
      );
    if (error) {
      console.error('[admin/tariff-prices update]', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true });
  }

  async function bulkUpdateTariffPrices(req: Request, res: Response) {
    const body = req.body;
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Array kerak' });
    const now = new Date().toISOString();
    for (const row of body) {
      const { tariff_type, currency, price } = row;
      if (!tariff_type || !currency || price == null) continue;
      const priceNum = Number(price);
      if (Number.isNaN(priceNum) || priceNum < 0) continue;
      await supabase
        .from('tariff_prices')
        .upsert(
          { tariff_type, currency, price: priceNum, updated_at: now },
          { onConflict: 'tariff_type,currency' }
        );
    }
    return res.json({ success: true });
  }

  return {
    login,
    getDashboard,
    getUsers,
    getUserProfile,
    getPayments,
    confirmPayment,
    rejectPayment,
    getSubscriptions,
    getWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    getSupportMessages,
    replySupport,
    getPricing,
    updatePricing,
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    togglePaymentMethod,
    deletePaymentMethod,
    getTariffPrices,
    updateTariffPrice,
    bulkUpdateTariffPrices,
  };
}
