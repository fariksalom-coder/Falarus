import type { Request, Response } from 'express';
import type { DbClient } from '../types/dbClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/adminAuth';
import * as subscriptionService from '../services/subscription.service';
import {
  getPaymentDisplayLabel,
  getPaymentProductLabel,
  isSubscriptionTariffType,
} from '../../shared/paymentProducts.js';
import { inferPaymentProviderFromProofUrl } from '../../shared/clickPayments.js';
import { isPaymentsProductCodeSchemaError } from '../../shared/paymentsCompat.js';
import { resolvePaymentProductFromRow } from '../../shared/paymentsProofUrl.js';
import { getUserCompletedLessonsCount } from '../services/lessonProgressSnapshot.service.js';
import { clickPaymentRefund, isClickMerchantSuccess } from '../../shared/clickMerchantClient.js';
import { getClickConfig } from '../../shared/clickConfig.js';
import { adminCreateUserWithAccess } from '../services/adminCreateUser.service.js';
import { ensureSupportChatForUser } from '../lib/ensureSupportChat.js';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion.js';
import { activateTeacherMarketplacePayment } from '../services/teacherMarketplace.service.js';

const BROADCAST_FILTERS = [
  'subscription_active',
  'subscription_inactive',
  'kunlik_not_started',
  'kunlik_day1_complete',
  'kunlik_day1_incomplete',
  'kunlik_registered_week_stalled',
  'all_users',
] as const;

type BroadcastFilter = (typeof BROADCAST_FILTERS)[number];

function isBroadcastFilter(f: string): f is BroadcastFilter {
  return (BROADCAST_FILTERS as readonly string[]).includes(f);
}

const MAX_BROADCAST_RECIPIENTS = 8000;

async function collectBroadcastRecipientIds(
  supabase: DbClient,
  filter: BroadcastFilter
): Promise<{ ids: number[]; error?: string }> {
  const nowIso = new Date().toISOString();
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const takeIds = (data: { id: unknown }[] | null | undefined) =>
    (data ?? [])
      .map((r) => Number(r.id))
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, MAX_BROADCAST_RECIPIENTS);

  if (filter === 'subscription_active') {
    const { data, error } = await supabase.from('users').select('id').gt('plan_expires_at', nowIso);
    if (error) return { ids: [], error: error.message };
    return { ids: takeIds(data as { id: unknown }[]) };
  }
  if (filter === 'subscription_inactive') {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .or(`plan_expires_at.is.null,plan_expires_at.lt.${nowIso}`);
    if (error) return { ids: [], error: error.message };
    return { ids: takeIds(data as { id: unknown }[]) };
  }

  const { data: progRows, error: progErr } = await supabase.from('user_kunlik_day_progress').select('user_id');
  if (progErr) return { ids: [], error: progErr.message };
  const startedUserIds = new Set(
    (progRows ?? []).map((r) => Number((r as { user_id: unknown }).user_id)).filter((id) => id > 0)
  );

  if (filter === 'kunlik_not_started') {
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .order('id', { ascending: true })
      .limit(MAX_BROADCAST_RECIPIENTS + 4000);
    if (error) return { ids: [], error: error.message };
    const ids = takeIds(users as { id: unknown }[]).filter((id) => !startedUserIds.has(id));
    return { ids };
  }

  if (filter === 'kunlik_registered_week_stalled') {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, created_at')
      .lt('created_at', weekAgoIso)
      .order('id', { ascending: true })
      .limit(MAX_BROADCAST_RECIPIENTS + 4000);
    if (error) return { ids: [], error: error.message };
    const ids = (users ?? [])
      .map((r) => Number((r as { id: unknown }).id))
      .filter((id) => Number.isFinite(id) && id > 0 && !startedUserIds.has(id))
      .slice(0, MAX_BROADCAST_RECIPIENTS);
    return { ids };
  }

  const { data: promptsD1, error: pErr } = await supabase
    .from('daily_practice_prompts')
    .select('day_number')
    .eq('day_number', 1);
  if (pErr) return { ids: [], error: pErr.message };
  const practiceCountDay1 = (promptsD1 ?? []).length;
  const countMap: Record<number, number> = { 1: practiceCountDay1 };

  if (filter === 'kunlik_day1_complete' || filter === 'kunlik_day1_incomplete') {
    const { data: rows, error } = await supabase
      .from('user_kunlik_day_progress')
      .select('user_id, day_number, grammar_1, grammar_2, grammar_3, words_match, oqish_done, speaking_level')
      .eq('day_number', 1);
    if (error) return { ids: [], error: error.message };
    const complete: number[] = [];
    const incomplete: number[] = [];
    for (const raw of rows ?? []) {
      const r = raw as {
        user_id: unknown;
        grammar_1: unknown;
        grammar_2: unknown;
        grammar_3: unknown;
        words_match: unknown;
        oqish_done: unknown;
        speaking_level: unknown;
      };
      const uid = Number(r.user_id);
      if (!uid) continue;
      const slice = {
        day_number: 1,
        grammar_1: Boolean(r.grammar_1),
        grammar_2: Boolean(r.grammar_2),
        grammar_3: Boolean(r.grammar_3),
        words_match: Boolean(r.words_match),
        oqish_done: Boolean(r.oqish_done),
        speaking_level: Number(r.speaking_level ?? 0),
      };
      if (isKunlikDayRowFullyComplete(slice, countMap)) complete.push(uid);
      else incomplete.push(uid);
    }
    const ids = filter === 'kunlik_day1_complete' ? [...new Set(complete)] : [...new Set(incomplete)];
    return { ids: ids.slice(0, MAX_BROADCAST_RECIPIENTS) };
  }

  if (filter === 'all_users') {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(2500);
    if (error) return { ids: [], error: error.message };
    return { ids: takeIds(data as { id: unknown }[]) };
  }

  return { ids: [] };
}

export function createAdminController(supabase: DbClient) {
  /** Default 7 days (same order of magnitude as user JWT) — override via ADMIN_JWT_EXPIRES_SECONDS. */
  const tokenTtlSeconds = Number(process.env.ADMIN_JWT_EXPIRES_SECONDS || 60 * 60 * 24 * 7);
  const SUPPORT_ADMIN_NOTE_MARKER = '[ADMIN_NOTE]';
  const HELP_IMAGE_PREFIX = '__image__:';
  const HELP_CHAT_MEDIA_BUCKET = 'help-chat-media';
  const ADMIN_USERS_SELECT_FULL =
    'id, first_name, last_name, email, phone, created_at, plan_name, plan_expires_at, total_points, referral_balance, total_referral_earned, referred_by';
  const ADMIN_USERS_SELECT_LEGACY =
    'id, first_name, last_name, email, phone, created_at, plan_name, plan_expires_at, referral_balance, total_referral_earned, referred_by';

  function isUndefinedColumnError(error: unknown): boolean {
    const msg = String((error as { message?: unknown })?.message ?? '').toLowerCase();
    const code = String((error as { code?: unknown })?.code ?? '');
    return code === '42703' || (msg.includes('column') && msg.includes('does not exist'));
  }

  function isMissingRelationError(error: unknown): boolean {
    const msg = String((error as { message?: unknown })?.message ?? '').toLowerCase();
    const code = String((error as { code?: unknown })?.code ?? '');
    return code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'));
  }

  function isMissingSupportChatSchemaError(error: unknown): boolean {
    const message = typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error ?? '');
    return message.includes('support_chats') || message.includes('support_chat_messages');
  }

  function isAdminUsersSchemaError(error: unknown): boolean {
    const msg = String((error as { message?: unknown })?.message ?? '').toLowerCase();
    const code = String((error as { code?: unknown })?.code ?? '');
    return (
      code === '42703' ||
      (msg.includes('column') &&
        msg.includes('does not exist') &&
        (msg.includes('total_points') || msg.includes('total_referral_earned') || msg.includes('referral_balance')))
    );
  }
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
      JWT_SECRET,
      { expiresIn: tokenTtlSeconds }
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
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    type RevenueCurrency = 'UZS' | 'USD' | 'RUB';
    type RevenueByCurrency = Record<RevenueCurrency, number>;

    const emptyRevenue = (): RevenueByCurrency => ({ UZS: 0, USD: 0, RUB: 0 });
    const normalizeCurrency = (v: unknown): RevenueCurrency => {
      const raw = String(v ?? 'UZS').toUpperCase();
      return raw === 'USD' || raw === 'RUB' || raw === 'UZS' ? raw : 'UZS';
    };
    const sumByCurrency = (arr: { amount?: unknown; currency?: unknown }[] | null | undefined): RevenueByCurrency => {
      const out = emptyRevenue();
      for (const row of arr ?? []) {
        const currency = normalizeCurrency(row.currency);
        out[currency] += Number(row.amount ?? 0) || 0;
      }
      return out;
    };

    const [
      totalUsers,
      usersToday,
      usersWeek,
      usersMonth,
      activeUsers,
      inactiveUsers,
      paymentsToday,
      paymentsMonth,
      totalRevenue,
      paymentsMonthStatusRows,
      pendingPayments,
      refundedMonth,
      activeSubs,
      expiringSubs,
      pendingWithdrawals,
      openSupportChats,
      recentUsers,
      recentPayments,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekStartStr),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('users').select('id', { count: 'exact', head: true }).gt('plan_expires_at', now.toISOString()),
      supabase.from('users').select('id', { count: 'exact', head: true }).or(`plan_expires_at.is.null,plan_expires_at.lt.${now.toISOString()}`),
      supabase.from('payments').select('amount, currency, product_code, tariff_type').eq('status', 'approved').gte('approved_at', todayStart),
      supabase.from('payments').select('amount, currency, product_code, tariff_type').eq('status', 'approved').gte('approved_at', monthStart),
      supabase.from('payments').select('amount, currency').eq('status', 'approved'),
      supabase.from('payments').select('status, amount, currency, product_code, tariff_type, payment_channel, created_at').gte('created_at', monthStart),
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'refunded').gte('created_at', monthStart),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').gt('expires_at', now.toISOString()),
      supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('expires_at', now.toISOString())
        .lte('expires_at', nextWeek.toISOString()),
      supabase.from('referral_withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_chats').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, created_at, plan_name, plan_expires_at')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('payments')
        .select('id, user_id, amount, currency, tariff_type, product_code, status, created_at, approved_at, payment_channel')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);
    const { data: clickTodayRows, error: clickTodayError } = await supabase
      .from('click_payment_logs')
      .select('error_code, error_note')
      .gte('created_at', todayStart);
    const clickRows =
      clickTodayError && isMissingRelationError(clickTodayError)
        ? []
        : (clickTodayRows ?? []);
    const clickErrors = clickRows.filter((row: any) => {
      const code = Number(row?.error_code ?? 0);
      return code !== 0 || Boolean(String(row?.error_note ?? '').trim());
    }).length;
    const clickTotal = clickRows.length;
    const clickSuccess = Math.max(0, clickTotal - clickErrors);

    const monthRows = ((paymentsMonthStatusRows as any).data ?? []) as any[];
    const statusCounts = monthRows.reduce<Record<string, number>>((acc, row) => {
      const status = String(row.status ?? 'unknown');
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
    const revenueByProduct = (((paymentsMonth as any).data ?? []) as any[]).reduce<
      { product_code: string; label: string; revenue: RevenueByCurrency; count: number }[]
    >((acc, row) => {
      const productCode = resolvePaymentProductFromRow(row);
      const label = getPaymentDisplayLabel(productCode, row.tariff_type);
      let bucket = acc.find((item) => item.product_code === productCode && item.label === label);
      if (!bucket) {
        bucket = { product_code: productCode, label, revenue: emptyRevenue(), count: 0 };
        acc.push(bucket);
      }
      bucket.count += 1;
      bucket.revenue[normalizeCurrency(row.currency)] += Number(row.amount ?? 0) || 0;
      return acc;
    }, []);

    const recentPaymentRows = ((recentPayments as any).data ?? []) as any[];
    const paymentUserIds = [...new Set(recentPaymentRows.map((r) => Number(r.user_id)).filter((id) => Number.isFinite(id) && id > 0))];
    const { data: paymentUsers } =
      paymentUserIds.length > 0
        ? await supabase.from('users').select('id, first_name, last_name, email, phone').in('id', paymentUserIds)
        : { data: [] };
    const paymentUserMap = new Map((paymentUsers ?? []).map((u: any) => [u.id, u]));

    const formatUserName = (u: any) =>
      u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.phone || `User #${u.id}` : '—';

    return res.json({
      total_users: (totalUsers as any).count ?? 0,
      users_today: (usersToday as any).count ?? 0,
      users_this_week: (usersWeek as any).count ?? 0,
      users_this_month: (usersMonth as any).count ?? 0,
      active_users: (activeUsers as any).count ?? 0,
      inactive_users: (inactiveUsers as any).count ?? 0,
      payments_today: sumByCurrency((paymentsToday as any).data ?? []),
      payments_this_month: sumByCurrency((paymentsMonth as any).data ?? []),
      total_revenue: sumByCurrency((totalRevenue as any).data ?? []),
      pending_payments: (pendingPayments as any).count ?? 0,
      refunded_payments_this_month: (refundedMonth as any).count ?? 0,
      active_subscriptions: (activeSubs as any).count ?? 0,
      subscriptions_expiring_soon: (expiringSubs as any).count ?? 0,
      referral_payouts_pending: (pendingWithdrawals as any).count ?? 0,
      support_chats_open: openSupportChats && !(openSupportChats as any).error ? ((openSupportChats as any).count ?? 0) : 0,
      click_today: {
        total: clickTotal,
        success: clickSuccess,
        errors: clickErrors,
      },
      payment_statuses_this_month: {
        pending: statusCounts.pending ?? 0,
        approved: statusCounts.approved ?? 0,
        rejected: statusCounts.rejected ?? 0,
        refunded: statusCounts.refunded ?? 0,
      },
      revenue_by_product_this_month: revenueByProduct,
      recent_users: (((recentUsers as any).data ?? []) as any[]).map((u) => ({
        id: u.id,
        name: formatUserName(u),
        email: u.email ?? null,
        phone: u.phone ?? null,
        created_at: u.created_at,
        subscription_status: u.plan_expires_at && new Date(u.plan_expires_at) > now ? 'active' : 'inactive',
        plan_name: u.plan_name ?? null,
      })),
      recent_payments: recentPaymentRows.map((p) => {
        const u = paymentUserMap.get(p.user_id);
        const productCode = resolvePaymentProductFromRow(p);
        return {
          id: p.id,
          user_id: p.user_id,
          user: formatUserName(u),
          amount: Number(p.amount ?? 0) || 0,
          currency: normalizeCurrency(p.currency),
          status: p.status,
          product_label: getPaymentDisplayLabel(productCode, p.tariff_type),
          payment_channel: p.payment_channel ?? null,
          created_at: p.created_at,
          approved_at: p.approved_at ?? null,
        };
      }),
    });
  }

  // --- Users list with filters
  async function getUsers(req: Request, res: Response) {
    const registered = (req.query.registered as string) || '';
    const subscription = (req.query.subscription as string) || '';
    const referralOnly = req.query.referral === 'true';

    let q = supabase
      .from('users')
      .select(ADMIN_USERS_SELECT_FULL)
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
    } else if (subscription === 'yearly') {
      q = q.eq('plan_name', '1 YIL').gt('plan_expires_at', now);
    }

    if (referralOnly) {
      q = q.not('referred_by', 'is', null);
    }

    const firstRes = await q;
    let rows: any[] | null = (firstRes.data as any[] | null) ?? null;
    let error = firstRes.error;
    if (error && isAdminUsersSchemaError(error)) {
      let legacyQ = supabase
        .from('users')
        .select(ADMIN_USERS_SELECT_LEGACY)
        .order('created_at', { ascending: false });
      if (registered === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        legacyQ = legacyQ.gte('created_at', todayStart.toISOString());
      } else if (registered === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        legacyQ = legacyQ.gte('created_at', d.toISOString());
      } else if (registered === 'month') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        legacyQ = legacyQ.gte('created_at', d.toISOString());
      }
      if (subscription === 'none') {
        legacyQ = legacyQ.or('plan_expires_at.is.null,plan_expires_at.lt.' + now);
      } else if (subscription === 'monthly') {
        legacyQ = legacyQ.eq('plan_name', '1 OY').gt('plan_expires_at', now);
      } else if (subscription === 'yearly') {
        legacyQ = legacyQ.eq('plan_name', '1 YIL').gt('plan_expires_at', now);
      }
      if (referralOnly) {
        legacyQ = legacyQ.not('referred_by', 'is', null);
      }
      const legacyRes = await legacyQ;
      rows = (legacyRes.data as any[] | null) ?? null;
      error = legacyRes.error;
    }
    if (error) {
      console.error('[admin/users]', error);
      return res.status(500).json({ error: error.message });
    }

    const userIds = (rows ?? []).map((u: any) => Number(u.id)).filter((id: number) => Number.isFinite(id));
    const { data: kunlikRows } = await supabase
      .from('user_kunlik_day_progress')
      .select('user_id, day_number, grammar_1, grammar_2, grammar_3, words_match, oqish_done, speaking_level')
      .in('user_id', userIds);
    const kunlikByUser = new Map<number, any[]>();
    for (const row of kunlikRows ?? []) {
      const uid = Number((row as any).user_id);
      const arr = kunlikByUser.get(uid) ?? [];
      arr.push(row);
      kunlikByUser.set(uid, arr);
    }

    const list = (rows ?? []).map((u: any) => {
      const dayRows = (kunlikByUser.get(Number(u.id)) ?? []).sort(
        (a: any, b: any) => Number(a.day_number) - Number(b.day_number)
      );
      const lastDayRow = dayRows.length ? dayRows[dayRows.length - 1] : null;
      const reachedDay = lastDayRow ? Number(lastDayRow.day_number) : 0;
      const grammarDone = lastDayRow
        ? [lastDayRow.grammar_1, lastDayRow.grammar_2, lastDayRow.grammar_3].filter(Boolean).length
        : 0;
      const dayProgress = lastDayRow
        ? {
            day_number: reachedDay,
            grammar_done: grammarDone,
            grammar_total: 3,
            vocabulary_done: Boolean(lastDayRow.words_match),
            reading_done: Boolean(lastDayRow.oqish_done),
            speaking_level: Number(lastDayRow.speaking_level ?? 0),
          }
        : null;

      return {
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
      email: u.email ?? null,
      phone: u.phone ?? null,
      registration_date: u.created_at,
      subscription_type: u.plan_name ?? '—',
      subscription_status: u.plan_expires_at && u.plan_expires_at > now ? 'active' : 'expired',
      reached_day: reachedDay,
      day_progress: dayProgress,
      referral_earnings: u.total_referral_earned ?? 0,
      };
    });
    return res.json(list);
  }

  async function createUser(req: Request, res: Response) {
    try {
      const adminId = (req as any).adminId as number;
      const body = req.body ?? {};
      const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
      const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
      const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const russianTariff =
        body.russianTariff === 'month' || body.russianTariff === 'year' ? body.russianTariff : null;
      const grantPatent = Boolean(body.grantPatent);
      const grantVnzh = Boolean(body.grantVnzh);
      const courseCurrency =
        body.courseCurrency === 'USD' || body.courseCurrency === 'RUB' || body.courseCurrency === 'UZS'
          ? body.courseCurrency
          : 'UZS';

      const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
      const amountRussian = num(body.amountRussian);
      const amountPatent = num(body.amountPatent);
      const amountVnzh = num(body.amountVnzh);

      if (!firstName && !lastName) {
        return res.status(400).json({ error: 'Ism yoki familiya kiritilishi kerak' });
      }
      if (!identifier) {
        return res.status(400).json({ error: 'Email yoki telefon kiritilishi kerak' });
      }
      if (!russianTariff && !grantPatent && !grantVnzh) {
        return res.status(400).json({
          error: "Kamida bitta tarif yoki kurs tanlang (Rus tili, Patent yoki VNJ)",
        });
      }

      const out = await adminCreateUserWithAccess(supabase, {
        firstName,
        lastName,
        identifier,
        password,
        adminId,
        russianTariff,
        grantPatent,
        grantVnzh,
        amountRussian: amountRussian != null && Number.isFinite(amountRussian) ? amountRussian : null,
        amountPatent: amountPatent != null && Number.isFinite(amountPatent) ? amountPatent : null,
        amountVnzh: amountVnzh != null && Number.isFinite(amountVnzh) ? amountVnzh : null,
        courseCurrency,
      });
      return res.status(201).json(out);
    } catch (e: any) {
      const msg = e?.message || 'Server xatosi';
      if (
        typeof msg === 'string' &&
        (msg.includes("allaqachon ro'yxatdan") ||
          msg.includes('Parol kamida') ||
          msg.includes('Email yoki telefon') ||
          msg.includes("noto'g'ri"))
      ) {
        return res.status(400).json({ error: msg });
      }
      console.error('[admin/createUser]', e);
      return res.status(500).json({ error: msg });
    }
  }

  // --- User profile by id
  async function getUserProfile(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });

    let { data: user, error: userErr } = await supabase
      .from('users')
      .select(ADMIN_USERS_SELECT_FULL)
      .eq('id', id)
      .single();
    if (userErr && isAdminUsersSchemaError(userErr)) {
      const legacy = await supabase.from('users').select(ADMIN_USERS_SELECT_LEGACY).eq('id', id).single();
      user = legacy.data as typeof user;
      userErr = legacy.error;
    }
    if (userErr || !user) return res.status(404).json({ error: 'User topilmadi' });

    const now = new Date().toISOString();
    const lessonsCompleted = await getUserCompletedLessonsCount(supabase, id);
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
      email: (user as any).email ?? null,
      phone: (user as any).phone ?? null,
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
        invited_users: (referrals ?? []).length,
      },
    });
  }

  // --- Payments (subscription_payment_requests)
  async function getPayments(_req: Request, res: Response) {
    const PAY_EXTENDED =
      'id, user_id, tariff_type, product_code, currency, payment_proof_url, payment_time, status, approved_at, created_at, payment_channel, click_merchant_payment_id, fiscal_status, fiscal_receipt_id';
    const PAY_FULL =
      'id, user_id, tariff_type, product_code, currency, payment_proof_url, payment_time, status, approved_at, created_at';
    const PAY_LEGACY =
      'id, user_id, tariff_type, currency, payment_proof_url, payment_time, status, approved_at, created_at';
    let { data: rows, error } = await supabase.from('payments').select(PAY_EXTENDED).order('created_at', { ascending: false });
    if (error && (isPaymentsProductCodeSchemaError(error) || isUndefinedColumnError(error))) {
      const second = await supabase.from('payments').select(PAY_FULL).order('created_at', { ascending: false });
      rows = second.data as typeof rows;
      error = second.error;
    }
    if (error && isPaymentsProductCodeSchemaError(error)) {
      const third = await supabase.from('payments').select(PAY_LEGACY).order('created_at', { ascending: false });
      rows = third.data as typeof rows;
      error = third.error;
    }
    if (error) {
      console.error('[admin/payments]', error);
      return res.status(500).json({ error: error.message });
    }
    const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .in('id', userIds);
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

    const list = (rows ?? []).map((r: any) => {
      const u = userMap.get(r.user_id);
      const productCode = resolvePaymentProductFromRow(r);
      return {
        id: r.id,
        user: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '—',
        user_email: u?.email ?? '—',
        user_phone: u?.phone ?? null,
        user_id: r.user_id,
        plan:
          productCode === 'russian'
            ? r.tariff_type === 'year'
              ? '1 yil'
              : '1 oy'
            : getPaymentProductLabel(productCode),
        tariff_type: r.tariff_type,
        product_code: productCode,
        product_label: getPaymentDisplayLabel(productCode, r.tariff_type),
        payment_provider: inferPaymentProviderFromProofUrl(r.payment_proof_url ?? null),
        currency: r.currency,
        payment_proof_url: r.payment_proof_url,
        payment_time: r.payment_time,
        date: r.created_at,
        status: r.status,
        approved_at: r.approved_at,
        payment_channel: r.payment_channel ?? null,
        click_merchant_payment_id: r.click_merchant_payment_id ?? null,
        fiscal_status: r.fiscal_status ?? null,
        fiscal_receipt_id: r.fiscal_receipt_id ?? null,
      };
    });
    return res.json(list);
  }

  async function confirmPayment(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const adminId = (req as any).adminId;
      if (!id) return res.status(400).json({ error: 'Invalid payment id' });

      let { data: row, error: fetchErr } = await supabase
        .from('payments')
        .select('user_id, tariff_type, product_code, payment_channel, payment_proof_url')
        .eq('id', id)
        .eq('status', 'pending')
        .single();
      if (fetchErr && isPaymentsProductCodeSchemaError(fetchErr)) {
        const second = await supabase
          .from('payments')
          .select('user_id, tariff_type, payment_proof_url, payment_channel')
          .eq('id', id)
          .eq('status', 'pending')
          .single();
        row = second.data as unknown as typeof row;
        fetchErr = second.error;
      }
      if (fetchErr || !row) return res.status(404).json({ error: 'To\'lov topilmadi yoki tasdiqlangan' });

      if (String((row as any).payment_channel ?? '') === 'click_button') {
        return res.status(400).json({
          error:
            "Click tugma orqali yaratilgan to'lovni qo'lda tasdiqlash mumkin emas — to'lov yakunlangach avtomatik tasdiqlanadi.",
        });
      }

      const userId = Number((row as any).user_id);
      if (!Number.isFinite(userId)) return res.status(400).json({ error: 'To\'lovda user_id xato' });
      const tariffType = (row as any).tariff_type;
      const productCode = resolvePaymentProductFromRow(row as any);
      const now = new Date();

      const { error: updatePayErr } = await supabase
        .from('payments')
        .update({ status: 'approved', admin_id: adminId ?? null, approved_at: now.toISOString() })
        .eq('id', id);
      if (updatePayErr) {
        console.error('[admin/confirmPayment] payments update', updatePayErr);
        return res.status(500).json({ error: updatePayErr.message });
      }

      if (productCode === 'russian' && isSubscriptionTariffType(tariffType)) {
        const planType = tariffType === 'year' ? 'yearly' : 'monthly';
        const daysToAdd = tariffType === 'year' ? 365 : 30;
        const planName = tariffType === 'year' ? '1 YIL' : '1 OY';
        const { data: current } = await supabase
          .from('users')
          .select('plan_expires_at')
          .eq('id', userId)
          .single();
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

        await subscriptionService.createOrExtendSubscription(
          supabase as any,
          userId,
          planType as any,
          ext
        );
      }
      await activateTeacherMarketplacePayment(supabase, { paymentId: id, userId, productCode });
      subscriptionService.invalidateAccessCache(userId);
      try {
        const { invalidateLessonsCache } = await import('../cache/lessonsCache');
        invalidateLessonsCache(userId);
      } catch {}
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

  async function refundPayment(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid payment id' });

      const { data: row, error: fetchErr } = await supabase
        .from('payments')
        .select('id, user_id, status, product_code, click_merchant_payment_id')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr || !row) return res.status(404).json({ error: 'To\'lov topilmadi' });
      if (String((row as any).status) !== 'approved') {
        return res.status(400).json({ error: 'Faqat tasdiqlangan to\'lov qaytariladi' });
      }

      const clickPaymentId = String((row as any).click_merchant_payment_id ?? '').trim();
      if (!clickPaymentId) {
        return res.status(400).json({ error: 'Bu to\'lov Click orqali emas yoki payment_id yo\'q' });
      }

      const cfg = getClickConfig();
      const serviceId = Number(cfg.serviceId);
      const merchantUserId = cfg.apiMerchantUserId?.trim();
      const secretKey = cfg.secretKey?.trim();
      if (!Number.isFinite(serviceId) || !merchantUserId || !secretKey) {
        return res.status(503).json({ error: 'Click Merchant API sozlanmagan' });
      }

      const refundJson = await clickPaymentRefund({
        serviceId,
        paymentId: clickPaymentId,
        merchantUserId,
        secretKey,
      });

      if (!isClickMerchantSuccess(refundJson)) {
        return res.status(400).json({
          error: String(refundJson?.error_note ?? 'Click refund rad etildi'),
          click_error_code: Number(refundJson?.error_code ?? -1),
        });
      }

      const userId = Number((row as any).user_id);
      await supabase
        .from('payments')
        .update({
          status: 'refunded',
          approved_at: null,
          click_refund_raw: refundJson as unknown as Record<string, unknown>,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', id);

      const productCode = resolvePaymentProductFromRow(row as any);
      if (productCode === 'russian') {
        await supabase
          .from('users')
          .update({ plan_name: null, plan_expires_at: null })
          .eq('id', userId);
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', auto_payment_enabled: false })
          .eq('user_id', userId)
          .eq('status', 'active');
      }
      subscriptionService.invalidateAccessCache(userId);

      return res.json({ success: true });
    } catch (e: any) {
      console.error('[admin/refundPayment]', e);
      return res.status(500).json({ error: e?.message || 'Refund amalga oshmadi' });
    }
  }

  // --- Subscriptions list
  async function getSubscriptions(_req: Request, res: Response) {
    const SUB_FULL =
      'id, user_id, plan_type, status, started_at, expires_at, next_payment_date, auto_payment_enabled, card_token_id, auto_payment_retry_count, auto_payment_last_error';
    const SUB_LEGACY = 'id, user_id, plan_type, status, started_at, expires_at';
    let { data: rows, error } = await supabase.from('subscriptions').select(SUB_FULL).order('expires_at', { ascending: false });
    if (error && isUndefinedColumnError(error)) {
      const second = await supabase.from('subscriptions').select(SUB_LEGACY).order('expires_at', { ascending: false });
      rows = second.data as typeof rows;
      error = second.error;
    }
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
      next_payment_date: r.next_payment_date ?? null,
      auto_payment_enabled: Boolean(r.auto_payment_enabled),
      card_token_id: r.card_token_id ?? null,
      auto_payment_retry_count: r.auto_payment_retry_count ?? 0,
      auto_payment_last_error: r.auto_payment_last_error ?? null,
    }));
    return res.json(list);
  }

  async function getCardTokens(_req: Request, res: Response) {
    const { data: rows, error } = await supabase
      .from('card_tokens')
      .select('id, user_id, masked_phone, masked_card, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      if (isMissingRelationError(error)) return res.json([]);
      console.error('[admin/card-tokens]', error);
      return res.status(500).json({ error: error.message });
    }
    const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds);
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
    const list = (rows ?? []).map((r: any) => {
      const u = userMap.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        user: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '—',
        user_email: u?.email ?? null,
        masked_phone: r.masked_phone ?? null,
        masked_card: r.masked_card ?? null,
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
      };
    });
    return res.json(list);
  }

  async function getClickPaymentLogs(_req: Request, res: Response) {
    const { data: rows, error } = await supabase
      .from('click_payment_logs')
      .select('id, user_id, subscription_id, operation, click_payment_id, merchant_trans_id, error_code, error_note, created_at')
      .order('created_at', { ascending: false })
      .limit(400);
    if (error) {
      if (isMissingRelationError(error)) return res.json([]);
      console.error('[admin/click-payment-logs]', error);
      return res.status(500).json({ error: error.message });
    }
    const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean))];
    const { data: users } =
      userIds.length > 0
        ? await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds)
        : { data: [] };
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
    const list = (rows ?? []).map((r: any) => {
      const u = r.user_id ? userMap.get(r.user_id) : null;
      return {
        id: r.id,
        user_id: r.user_id,
        subscription_id: r.subscription_id,
        user: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : null,
        operation: r.operation,
        click_payment_id: r.click_payment_id ?? null,
        merchant_trans_id: r.merchant_trans_id ?? null,
        error_code: r.error_code ?? null,
        error_note: r.error_note ?? null,
        created_at: r.created_at,
      };
    });
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

  // --- Support chats (Telegram-like)
  async function getSupportChats(_req: Request, res: Response) {
    const { data: chats, error: chatErr } = await supabase
      .from('support_chats')
      .select('id, user_id, status, created_at, updated_at, last_message_at, admin_last_read_at')
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (chatErr) {
      if (!isMissingSupportChatSchemaError(chatErr)) return res.status(500).json({ error: chatErr.message });
      const { data: supportRows, error: supportErr } = await supabase
        .from('support_messages')
        .select('id, user_id, message, reply, status, created_at, answered_at')
        .order('created_at', { ascending: false });
      if (supportErr) return res.status(500).json({ error: supportErr.message });
      const userIdsFallback = [...new Set((supportRows ?? []).map((r: any) => Number(r.user_id)).filter(Boolean))];
      let usersFallbackRes = userIdsFallback.length
        ? await supabase
            .from('users')
            .select('id, first_name, last_name, email, phone, created_at, plan_name, plan_expires_at, total_points, referral_balance')
            .in('id', userIdsFallback)
        : ({ data: [], error: null } as any);
      if (usersFallbackRes.error && isAdminUsersSchemaError(usersFallbackRes.error)) {
        usersFallbackRes = userIdsFallback.length
          ? await supabase
              .from('users')
              .select('id, first_name, last_name, email, phone, created_at, plan_name, plan_expires_at, referral_balance')
              .in('id', userIdsFallback)
          : ({ data: [], error: null } as any);
      }
      const { data: usersFallback, error: usersErrFallback } = usersFallbackRes;
      if (usersErrFallback) return res.status(500).json({ error: usersErrFallback.message });

      const userMapFallback = new Map((usersFallback ?? []).map((u: any) => [Number(u.id), u]));
      const grouped = new Map<number, any[]>();
      for (const row of supportRows ?? []) {
        const uid = Number((row as any).user_id);
        if (!grouped.has(uid)) grouped.set(uid, []);
        grouped.get(uid)!.push(row);
      }
      const nowIso = new Date().toISOString();
      const listFallback = Array.from(grouped.entries()).map(([uid, rows]) => {
        const user = userMapFallback.get(uid) as any;
        const latest = rows[0] as any;
        const latestContent = latest?.reply
          ? String(latest.reply)
          : String(latest.message).startsWith(SUPPORT_ADMIN_NOTE_MARKER)
            ? String(latest.message).slice(SUPPORT_ADMIN_NOTE_MARKER.length).trim()
            : String(latest.message);
        const latestSender = latest?.reply || String(latest.message).startsWith(SUPPORT_ADMIN_NOTE_MARKER) ? 'admin' : 'user';
        const unreadCount = rows.filter((r: any) => r.status === 'new' && !String(r.message).startsWith(SUPPORT_ADMIN_NOTE_MARKER)).length;
        const isActiveSubscription = Boolean(user?.plan_expires_at && String(user.plan_expires_at) > nowIso);
        return {
          id: -uid,
          user_id: uid,
          status: 'open',
          created_at: latest?.created_at ?? new Date(0).toISOString(),
          updated_at: latest?.answered_at ?? latest?.created_at ?? new Date(0).toISOString(),
          last_message_at: latest?.answered_at ?? latest?.created_at ?? null,
          unread_count: unreadCount,
          user: {
            id: Number(user?.id ?? 0),
            name: user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || '—' : '—',
            email: user?.email ?? null,
            phone: user?.phone ?? null,
            registration_date: user?.created_at ?? null,
            subscription: {
              plan_type: user?.plan_name ?? null,
              status: isActiveSubscription ? 'active' : 'inactive',
              expires_at: user?.plan_expires_at ?? null,
            },
            total_points: Number(user?.total_points ?? 0),
            referral_balance: Number(user?.referral_balance ?? 0),
          },
          last_message: latest
            ? {
                id: Number(latest.id),
                sender_type: latestSender,
                content: latestContent,
                created_at: String(latest.answered_at ?? latest.created_at),
              }
            : null,
        };
      });
      return res.json(listFallback);
    }

    const userIds = [...new Set((chats ?? []).map((c: any) => Number(c.user_id)).filter(Boolean))];
    const chatIds = [...new Set((chats ?? []).map((c: any) => Number(c.id)).filter(Boolean))];
    const nowIso = new Date().toISOString();

    const [usersResult, { data: latestRows, error: latestErr }] = await Promise.all([
      userIds.length
        ? supabase
            .from('users')
            .select('id, first_name, last_name, email, phone, created_at, plan_name, plan_expires_at, total_points, referral_balance')
            .in('id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
      chatIds.length
        ? supabase
            .from('support_chat_messages')
            .select('id, chat_id, sender_type, content, created_at')
            .in('chat_id', chatIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    let users = usersResult.data;
    let usersErr = usersResult.error;
    if (usersErr && isAdminUsersSchemaError(usersErr)) {
      const legacyUsersResult = userIds.length
        ? await supabase
            .from('users')
            .select('id, first_name, last_name, email, phone, created_at, plan_name, plan_expires_at, referral_balance')
            .in('id', userIds)
        : ({ data: [], error: null } as any);
      users = legacyUsersResult.data;
      usersErr = legacyUsersResult.error;
    }

    if (usersErr) return res.status(500).json({ error: usersErr.message });
    if (latestErr) return res.status(500).json({ error: latestErr.message });

    const userMap = new Map((users ?? []).map((u: any) => [Number(u.id), u]));
    const latestByChat = new Map<number, any>();
    for (const row of latestRows ?? []) {
      const key = Number((row as any).chat_id);
      if (!latestByChat.has(key)) latestByChat.set(key, row);
    }

    const unreadByChat = new Map<number, number>();
    await Promise.all(
      (chats ?? []).map(async (chat: any) => {
        const chatId = Number(chat.id);
        let q = supabase
          .from('support_chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .eq('sender_type', 'user');
        if (chat.admin_last_read_at) {
          q = q.gt('created_at', String(chat.admin_last_read_at));
        }
        const { count } = await q;
        unreadByChat.set(chatId, Number(count ?? 0));
      })
    );

    const list = (chats ?? []).map((chat: any) => {
      const user = userMap.get(Number(chat.user_id)) as any;
      const last = latestByChat.get(Number(chat.id));
      const isActiveSubscription = Boolean(user?.plan_expires_at && String(user.plan_expires_at) > nowIso);
      return {
        id: Number(chat.id),
        user_id: Number(chat.user_id),
        status: String(chat.status),
        created_at: String(chat.created_at),
        updated_at: String(chat.updated_at),
        last_message_at: chat.last_message_at ? String(chat.last_message_at) : null,
        unread_count: unreadByChat.get(Number(chat.id)) ?? 0,
        user: {
          id: Number(user?.id ?? 0),
          name: user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || '—' : '—',
          email: user?.email ?? null,
          phone: user?.phone ?? null,
          registration_date: user?.created_at ?? null,
          subscription: {
            plan_type: user?.plan_name ?? null,
            status: isActiveSubscription ? 'active' : 'inactive',
            expires_at: user?.plan_expires_at ?? null,
          },
          total_points: Number(user?.total_points ?? 0),
          referral_balance: Number(user?.referral_balance ?? 0),
        },
        last_message: last
          ? {
              id: Number(last.id),
              sender_type: String(last.sender_type),
              content: String(last.content),
              created_at: String(last.created_at),
            }
          : null,
      };
    });

    return res.json(list);
  }

  async function getSupportChatMessages(req: Request, res: Response) {
    const chatId = Number(req.params.chatId);
    if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
    if (chatId < 0) {
      const userId = Math.abs(chatId);
      const { data: rows, error } = await supabase
        .from('support_messages')
        .select('id, message, reply, created_at, answered_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) return res.status(500).json({ error: error.message });
      const mapped = (rows ?? []).flatMap((r: any) => {
        const msg = String(r.message ?? '');
        const userMsg = msg.startsWith(SUPPORT_ADMIN_NOTE_MARKER)
          ? []
          : [{
              id: Number(r.id) * 2,
              chat_id: chatId,
              sender_type: 'user',
              sender_user_id: userId,
              content: msg,
              created_at: String(r.created_at),
            }];
        const adminMsg = r.reply
          ? [{
              id: Number(r.id) * 2 + 1,
              chat_id: chatId,
              sender_type: 'admin',
              sender_user_id: null,
              content: String(r.reply),
              created_at: String(r.answered_at ?? r.created_at),
            }]
          : msg.startsWith(SUPPORT_ADMIN_NOTE_MARKER)
            ? [{
                id: Number(r.id) * 2 + 1,
                chat_id: chatId,
                sender_type: 'admin',
                sender_user_id: null,
                content: msg.slice(SUPPORT_ADMIN_NOTE_MARKER.length).trim(),
                created_at: String(r.created_at),
              }]
            : [];
        return [...userMsg, ...adminMsg];
      });
      return res.json(mapped);
    }

    const { data: chat, error: chatErr } = await supabase
      .from('support_chats')
      .select('id')
      .eq('id', chatId)
      .single();
    if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });

    const { data: rows, error } = await supabase
      .from('support_chat_messages')
      .select('id, chat_id, sender_type, sender_user_id, content, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(rows ?? []);
  }

  async function sendSupportChatMessage(req: Request, res: Response) {
    const chatId = Number(req.params.chatId);
    const content = String((req.body as any)?.content ?? '').trim();
    if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
    if (!content) return res.status(400).json({ error: 'Xabar bo‘sh' });
    if (chatId < 0) {
      const userId = Math.abs(chatId);
      const now = new Date().toISOString();
      const { data: pending } = await supabase
        .from('support_messages')
        .select('id')
        .eq('user_id', userId)
        .is('reply', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pending?.id) {
        const { error } = await supabase
          .from('support_messages')
          .update({ status: 'answered', answered_at: now, reply: content })
          .eq('id', Number(pending.id));
        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json({
          id: Number(pending.id) * 2 + 1,
          chat_id: chatId,
          sender_type: 'admin',
          sender_user_id: null,
          content,
          created_at: now,
        });
      }

      const { data: created, error } = await supabase
        .from('support_messages')
        .insert({
          user_id: userId,
          message: `${SUPPORT_ADMIN_NOTE_MARKER} ${content}`,
          status: 'answered',
          answered_at: now,
          reply: null,
        })
        .select('id, created_at')
        .single();
      if (error || !created) return res.status(500).json({ error: error?.message || 'Xabar yuborilmadi' });
      return res.status(201).json({
        id: Number((created as any).id) * 2 + 1,
        chat_id: chatId,
        sender_type: 'admin',
        sender_user_id: null,
        content,
        created_at: String((created as any).created_at),
      });
    }

    const now = new Date().toISOString();
    const { data: created, error: msgErr } = await supabase
      .from('support_chat_messages')
      .insert({
        chat_id: chatId,
        sender_type: 'admin',
        sender_user_id: null,
        content,
        created_at: now,
      })
      .select('id, chat_id, sender_type, sender_user_id, content, created_at')
      .single();
    if (msgErr || !created) return res.status(500).json({ error: msgErr?.message || 'Xabar yuborilmadi' });

    const { error: updErr } = await supabase
      .from('support_chats')
      .update({ updated_at: now, last_message_at: now })
      .eq('id', chatId);
    if (updErr) return res.status(500).json({ error: updErr.message });

    return res.status(201).json(created);
  }

  async function sendSupportChatMedia(req: Request, res: Response) {
    const chatId = Number(req.params.chatId);
    if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file?.buffer?.length) return res.status(400).json({ error: 'Rasm yuklanmadi' });

    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const objectPath = `admin/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasBucket = (buckets ?? []).some((b: any) => b.name === HELP_CHAT_MEDIA_BUCKET);
    if (!hasBucket) await supabase.storage.createBucket(HELP_CHAT_MEDIA_BUCKET, { public: true });
    const { error: uploadErr } = await supabase.storage
      .from(HELP_CHAT_MEDIA_BUCKET)
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
    if (uploadErr) return res.status(500).json({ error: uploadErr.message });
    const { data: publicData } = supabase.storage.from(HELP_CHAT_MEDIA_BUCKET).getPublicUrl(objectPath);
    const imageUrl = publicData?.publicUrl;
    if (!imageUrl) return res.status(500).json({ error: 'Rasm URL olinmadi' });
    const content = `${HELP_IMAGE_PREFIX}${imageUrl}`;

    if (chatId < 0) {
      const userId = Math.abs(chatId);
      const now = new Date().toISOString();
      const { data: created, error } = await supabase
        .from('support_messages')
        .insert({
          user_id: userId,
          message: `${SUPPORT_ADMIN_NOTE_MARKER} ${content}`,
          status: 'answered',
          answered_at: now,
          reply: null,
        })
        .select('id, created_at')
        .single();
      if (error || !created) return res.status(500).json({ error: error?.message || 'Rasm yuborilmadi' });
      return res.status(201).json({
        id: Number((created as any).id) * 2 + 1,
        chat_id: chatId,
        sender_type: 'admin',
        sender_user_id: null,
        content,
        created_at: String((created as any).created_at),
      });
    }

    const now = new Date().toISOString();
    const { data: created, error: msgErr } = await supabase
      .from('support_chat_messages')
      .insert({
        chat_id: chatId,
        sender_type: 'admin',
        sender_user_id: null,
        content,
        created_at: now,
      })
      .select('id, chat_id, sender_type, sender_user_id, content, created_at')
      .single();
    if (msgErr || !created) return res.status(500).json({ error: msgErr?.message || 'Rasm yuborilmadi' });
    await supabase.from('support_chats').update({ updated_at: now, last_message_at: now }).eq('id', chatId);
    return res.status(201).json(created);
  }

  async function markSupportChatRead(req: Request, res: Response) {
    const chatId = Number(req.params.chatId);
    if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
    if (chatId < 0) {
      const userId = Math.abs(chatId);
      const { error } = await supabase
        .from('support_messages')
        .update({ status: 'answered', answered_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'new');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('support_chats')
      .update({ admin_last_read_at: now, updated_at: now })
      .eq('id', chatId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  async function sendHelpDirectUserMessage(req: Request, res: Response) {
    const userId = Number(req.params.userId);
    const content = String((req.body as { content?: unknown })?.content ?? '').trim();
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ error: 'user_id noto‘g‘ri' });
    if (!content) return res.status(400).json({ error: 'Xabar bo‘sh' });
    const { data: u, error: uErr } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
    if (uErr) return res.status(500).json({ error: uErr.message });
    if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    try {
      const chatId = await ensureSupportChatForUser(supabase, userId);
      const now = new Date().toISOString();
      const { data: created, error: msgErr } = await supabase
        .from('support_chat_messages')
        .insert({
          chat_id: chatId,
          sender_type: 'admin',
          sender_user_id: null,
          content,
          created_at: now,
        })
        .select('id, chat_id, sender_type, sender_user_id, content, created_at')
        .single();
      if (msgErr || !created) return res.status(500).json({ error: msgErr?.message || 'Xabar yuborilmadi' });
      await supabase.from('support_chats').update({ updated_at: now, last_message_at: now }).eq('id', chatId);
      return res.status(201).json({ chat_id: chatId, message: created });
    } catch (e) {
      if (isMissingSupportChatSchemaError(e)) {
        return res.status(503).json({ error: 'Yozishmalar (support_chats) mavjud emas' });
      }
      console.error('[admin/help/users message]', e);
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik' });
    }
  }

  async function getHelpBroadcastPreview(req: Request, res: Response) {
    const filterRaw = String(req.query.filter ?? '').trim();
    if (!isBroadcastFilter(filterRaw)) {
      return res.status(400).json({ error: `filter: ${BROADCAST_FILTERS.join(', ')}` });
    }
    const { ids, error } = await collectBroadcastRecipientIds(supabase, filterRaw);
    if (error) return res.status(500).json({ error });
    return res.json({ count: ids.length, filter: filterRaw, max: MAX_BROADCAST_RECIPIENTS });
  }

  async function postHelpBroadcast(req: Request, res: Response) {
    const body = (req.body ?? {}) as { filter?: unknown; content?: unknown; confirm_broadcast?: unknown };
    const filterRaw = String(body.filter ?? '').trim();
    const content = String(body.content ?? '').trim();
    const confirm = body.confirm_broadcast === true || String(body.confirm_broadcast ?? '') === 'true';
    if (!isBroadcastFilter(filterRaw)) {
      return res.status(400).json({ error: `filter: ${BROADCAST_FILTERS.join(', ')}` });
    }
    if (!content) return res.status(400).json({ error: 'Xabar bo‘sh' });
    if (filterRaw === 'all_users' && !confirm) {
      return res.status(400).json({
        error: "Barcha foydalanuvchilarga yuborish uchun JSON da confirm_broadcast: true yuboring (maks. 2500 ta, eng yangi ro'yxatdan).",
      });
    }
    const { ids, error } = await collectBroadcastRecipientIds(supabase, filterRaw);
    if (error) return res.status(500).json({ error });
    if (!ids.length) return res.json({ sent: 0, total: 0 });

    let sent = 0;
    const BATCH = 25;
    for (let i = 0; i < ids.length; i += BATCH) {
      const slice = ids.slice(i, i + BATCH);
      await Promise.all(
        slice.map(async (uid) => {
          try {
            const chatId = await ensureSupportChatForUser(supabase, uid);
            const now = new Date().toISOString();
            const { error: insErr } = await supabase.from('support_chat_messages').insert({
              chat_id: chatId,
              sender_type: 'admin',
              sender_user_id: null,
              content,
              created_at: now,
            });
            if (!insErr) {
              await supabase.from('support_chats').update({ updated_at: now, last_message_at: now }).eq('id', chatId);
              sent += 1;
            }
          } catch {
            /* skip */
          }
        })
      );
    }
    return res.json({ sent, total: ids.length, filter: filterRaw });
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
    if (!tariff_type || !['month', 'year'].includes(tariff_type)) {
      return res.status(400).json({ error: 'tariff_type kerak: month, year' });
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

  const TEACHER_PROFILE_STATUSES = ['draft', 'pending_review', 'active', 'paused', 'rejected'] as const;

  async function updateTeacherStatus(req: Request, res: Response) {
    try {
      const userId = Number(req.params.userId);
      const status = String(req.body?.status ?? req.body?.profile_status ?? '').trim();

      if (!Number.isFinite(userId)) return res.status(400).json({ error: 'userId noto‘g‘ri' });
      if (!TEACHER_PROFILE_STATUSES.includes(status as (typeof TEACHER_PROFILE_STATUSES)[number])) {
        return res.status(400).json({ error: 'Status noto‘g‘ri' });
      }

      const updatePayload: Record<string, unknown> = {
        profile_status: status,
        updated_at: new Date().toISOString(),
      };
      if (typeof req.body?.admin_note === 'string') {
        updatePayload.admin_note = req.body.admin_note.trim();
      }

      const { data, error } = await supabase
        .from('teacher_profiles')
        .update(updatePayload)
        .eq('user_id', userId)
        .select('user_id, display_name, profile_status, listing_paid_until, admin_note')
        .maybeSingle();

      if (error) {
        console.error('[admin/updateTeacherStatus]', error);
        return res.status(500).json({ error: error.message });
      }
      if (!data) return res.status(404).json({ error: 'O‘qituvchi topilmadi' });
      return res.json(data);
    } catch (e: unknown) {
      console.error('[admin/updateTeacherStatus]', e);
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Server xatosi' });
    }
  }

  return {
    login,
    getDashboard,
    getUsers,
    createUser,
    getUserProfile,
    getPayments,
    confirmPayment,
    rejectPayment,
    refundPayment,
    getSubscriptions,
    getCardTokens,
    getClickPaymentLogs,
    getWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    getSupportMessages,
    replySupport,
    getSupportChats,
    getSupportChatMessages,
    sendSupportChatMessage,
    sendSupportChatMedia,
    markSupportChatRead,
    sendHelpDirectUserMessage,
    getHelpBroadcastPreview,
    postHelpBroadcast,
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
    updateTeacherStatus,
  };
}
