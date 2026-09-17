/**
 * Admin: telefon bo‘yicha qidiruv, muzlatish, to‘lovni bekor qilish.
 *
 * Muzlatish — plan_expires_at / payments saqlanadi, lekin hasActiveAccess
 * false qaytaradi (foydalanuvchi to‘lamagandek).
 * Bekor qilish — plan + subscriptions + approved russian payments o‘chiriladi.
 */
import type { DbClient } from '../types/dbClient';
import { foydalanuvchiniTop } from './qolParolTiklash.service.js';
import { invalidateAccessCache } from './subscription.service.js';
import {
  isPaymentProductCode,
  SUBSCRIPTION_PRODUCT_CODE,
} from '../../shared/paymentProducts.js';

function isRussianSubscriptionPayment(productCode: string | null | undefined): boolean {
  if (productCode == null || productCode === '') return true;
  return isPaymentProductCode(productCode) && productCode === SUBSCRIPTION_PRODUCT_CODE;
}

export type AdminUserManageSnapshot = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  registration_date: string | null;
  last_seen_at: string | null;
  account_type: string | null;
  is_golden: boolean;
  access_frozen: boolean;
  access_frozen_at: string | null;
  access_frozen_reason: string | null;
  subscription: {
    plan_type: string | null;
    status: 'active' | 'inactive';
    expires_at: string | null;
  };
  reached_day: number;
  day_progress: {
    day_number: number;
    grammar_done: number;
    grammar_total: number;
    vocabulary_done: boolean;
    reading_done: boolean;
    speaking_level: number;
    updated_at: string | null;
  } | null;
  payments: Array<{
    id: number;
    status: string;
    product_code: string | null;
    tariff_type: string | null;
    amount: number | null;
    currency: string | null;
    created_at: string | null;
    approved_at: string | null;
  }>;
};

function displayName(u: {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  id: number;
}): string {
  return (
    [u.first_name, u.last_name].filter(Boolean).join(' ') ||
    u.phone ||
    u.email ||
    `#${u.id}`
  );
}

export async function lookupUserByPhone(
  supabase: DbClient,
  phoneQuery: string,
): Promise<AdminUserManageSnapshot | null> {
  const found = await foydalanuvchiniTop(supabase, phoneQuery);
  if (!found) return null;
  return loadUserManageSnapshot(supabase, Number(found.id));
}

export async function loadUserManageSnapshot(
  supabase: DbClient,
  userId: number,
): Promise<AdminUserManageSnapshot | null> {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select(
      'id, first_name, last_name, email, phone, created_at, last_seen_at, plan_name, plan_expires_at, account_type, is_golden, access_frozen_at, access_frozen_reason',
    )
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  if (!user) return null;

  const nowIso = new Date().toISOString();
  const planExpires = (user as { plan_expires_at?: string | null }).plan_expires_at ?? null;
  const subActive = Boolean(planExpires && String(planExpires) > nowIso);

  const [{ data: kunlikRows }, { data: paymentRows }] = await Promise.all([
    supabase
      .from('user_kunlik_day_progress')
      .select(
        'day_number, grammar_1, grammar_2, grammar_3, words_match, oqish_done, speaking_level, updated_at',
      )
      .eq('user_id', uid)
      .order('day_number', { ascending: true }),
    supabase
      .from('payments')
      .select('id, status, product_code, tariff_type, amount, currency, created_at, approved_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const dayRows = [...(kunlikRows ?? [])].sort(
    (a: any, b: any) => Number(a.day_number) - Number(b.day_number),
  );
  const lastDayRow = dayRows.length ? dayRows[dayRows.length - 1] : null;
  const reachedDay = lastDayRow ? Number((lastDayRow as any).day_number) : 0;
  const grammarDone = lastDayRow
    ? [(lastDayRow as any).grammar_1, (lastDayRow as any).grammar_2, (lastDayRow as any).grammar_3].filter(
        Boolean,
      ).length
    : 0;

  const frozenAt = (user as { access_frozen_at?: string | null }).access_frozen_at ?? null;

  return {
    id: uid,
    name: displayName(user as any),
    email: (user as any).email ?? null,
    phone: (user as any).phone ?? null,
    registration_date: (user as any).created_at ?? null,
    last_seen_at: (user as any).last_seen_at ?? null,
    account_type: (user as any).account_type ?? null,
    is_golden: Boolean((user as any).is_golden),
    access_frozen: Boolean(frozenAt),
    access_frozen_at: frozenAt ? String(frozenAt) : null,
    access_frozen_reason: (user as any).access_frozen_reason ?? null,
    subscription: {
      plan_type: (user as any).plan_name ?? null,
      status: subActive ? 'active' : 'inactive',
      expires_at: planExpires ? String(planExpires) : null,
    },
    reached_day: reachedDay,
    day_progress: lastDayRow
      ? {
          day_number: reachedDay,
          grammar_done: grammarDone,
          grammar_total: 3,
          vocabulary_done: Boolean((lastDayRow as any).words_match),
          reading_done: Boolean((lastDayRow as any).oqish_done),
          speaking_level: Number((lastDayRow as any).speaking_level ?? 0),
          updated_at: (lastDayRow as any).updated_at
            ? String((lastDayRow as any).updated_at)
            : null,
        }
      : null,
    payments: (paymentRows ?? []).map((p: any) => ({
      id: Number(p.id),
      status: String(p.status ?? ''),
      product_code: p.product_code ? String(p.product_code) : null,
      tariff_type: p.tariff_type ? String(p.tariff_type) : null,
      amount: p.amount != null ? Number(p.amount) : null,
      currency: p.currency ? String(p.currency) : null,
      created_at: p.created_at ? String(p.created_at) : null,
      approved_at: p.approved_at ? String(p.approved_at) : null,
    })),
  };
}

export async function freezeUserAccess(
  supabase: DbClient,
  userId: number,
  reason?: string | null,
): Promise<AdminUserManageSnapshot | null> {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;
  const now = new Date().toISOString();
  const note = String(reason ?? '').trim().slice(0, 500) || null;
  const { error } = await supabase
    .from('users')
    .update({
      access_frozen_at: now,
      access_frozen_reason: note,
    })
    .eq('id', uid);
  if (error) throw error;
  invalidateAccessCache(uid);
  return loadUserManageSnapshot(supabase, uid);
}

export async function unfreezeUserAccess(
  supabase: DbClient,
  userId: number,
): Promise<AdminUserManageSnapshot | null> {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;
  const { error } = await supabase
    .from('users')
    .update({
      access_frozen_at: null,
      access_frozen_reason: null,
    })
    .eq('id', uid);
  if (error) throw error;
  invalidateAccessCache(uid);
  return loadUserManageSnapshot(supabase, uid);
}

/**
 * To‘lovni bekor qilish (Click refundsiz): plan + active subscriptions +
 * approved russian payments → refunded. Kirish darhol yo‘qoladi.
 */
export async function revokeUserPaidAccess(
  supabase: DbClient,
  userId: number,
): Promise<{ snapshot: AdminUserManageSnapshot | null; revoked_payments: number }> {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    return { snapshot: null, revoked_payments: 0 };
  }

  const now = new Date().toISOString();

  await supabase
    .from('users')
    .update({ plan_name: null, plan_expires_at: null })
    .eq('id', uid);

  await supabase
    .from('subscriptions')
    .update({ status: 'expired', auto_payment_enabled: false })
    .eq('user_id', uid)
    .eq('status', 'active');

  const { data: approved } = await supabase
    .from('payments')
    .select('id, product_code')
    .eq('user_id', uid)
    .eq('status', 'approved');

  const russianIds = (approved ?? [])
    .filter((row: any) => isRussianSubscriptionPayment(row.product_code as string | null | undefined))
    .map((row: any) => Number(row.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  let revoked = 0;
  if (russianIds.length) {
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        approved_at: null,
        refunded_at: now,
      })
      .in('id', russianIds);
    if (error) throw error;
    revoked = russianIds.length;
  }

  invalidateAccessCache(uid);
  const snapshot = await loadUserManageSnapshot(supabase, uid);
  return { snapshot, revoked_payments: revoked };
}
