import type { DbClient } from '../types/dbClient';
import { resolveFreeVocabularyIds } from '../lib/freeVocabularyIds';
import {
  isPaymentProductCode,
  SUBSCRIPTION_PRODUCT_CODE,
  type CourseProductCode,
} from '../../shared/paymentProducts.js';
import {
  resolveApprovedCourseProduct,
} from '../../shared/paymentsProofUrl.js';
import { LruTtlCache } from '../lib/lruCache.js';
import { PATENT_COURSE_FREE_FOR_ALL } from '../../shared/courseAccess.js';

// 'monthly' is kept for backward compatibility with historic subscriptions rows
// (deprecated 2026-07); new activations use 'three_month' or 'yearly'.
const PLAN_TYPES = ['monthly', 'three_month', 'yearly'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export type SubscriptionRow = {
  id: number;
  user_id: number;
  plan_type: string;
  started_at: string;
  expires_at: string;
  status: string;
};

export type AccessInfo = {
  lessons_free_limit: number;
  vocabulary_free_topic: number;
  vocabulary_free_subtopic: number;
  subscription_active: boolean;
  patent_course_active: boolean;
  vnzh_course_active: boolean;
  vocabulary_free_topic_id?: string | null;
  vocabulary_free_subtopic_id?: string | null;
  /** OLTIN A'ZO: platformada hech qanday taqiq yo'q (to'lov ham, ketma-ketlik ham). */
  golden?: boolean;
  /**
   * Obuna qachon tugashi (ISO). Ilova shu asosda "muddat tugayapti"
   * bannerini ko'rsatadi — avto-to'lov yo'q, qaror foydalanuvchida.
   * Obunasi bo'lmaganlarda `null`.
   */
  subscription_expires_at?: string | null;
};

// Preserved at 3 to match the value that has been live in production via
// api/_lib/subscription.ts (the file Express was importing until this
// cleanup). server/services/subscription.service.ts had drifted to 2 but
// was effectively dead code, so the 2 was never observed by users.
const LESSONS_FREE_LIMIT = 3;
const VOCABULARY_FREE_TOPIC = 1;
const VOCABULARY_FREE_SUBTOPIC = 1;

/**
 * In-memory cache for access info to avoid repeated DB hits on every request.
 * Bounded LRU + per-entry TTL. The previous unbounded `new Map()` would have
 * grown by one entry per unique active user — at 100k DAU that is a steady
 * memory leak in a long-running Express process.
 *
 * Cap of 10k entries with 90s TTL covers concurrent-active users well; any
 * cap-driven eviction just causes a fresh DB read on the next access call.
 */
const ACCESS_CACHE_TTL_MS = 90 * 1000;
const ACCESS_CACHE_MAX = 10_000;
const accessCache = new LruTtlCache<number, AccessInfo>(ACCESS_CACHE_MAX);

export function invalidateAccessCache(userId: number): void {
  const uid = Number(userId);
  if (Number.isFinite(uid)) accessCache.delete(uid);
}

function getCachedAccess(userId: number): AccessInfo | null {
  return accessCache.get(Number(userId));
}

function setCachedAccess(userId: number, access: AccessInfo): void {
  accessCache.set(Number(userId), access, ACCESS_CACHE_TTL_MS);
}

/**
 * Get active subscription for user (status=active and expires_at > now).
 * Accepts status in any case (active, Active, ACTIVE).
 */
export async function getActiveSubscription(
  supabase: DbClient,
  userId: number
): Promise<SubscriptionRow | null> {
  const now = new Date().toISOString();
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_type, started_at, expires_at, status')
    .eq('user_id', uid)
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  const row = (data as SubscriptionRow[] | null)?.find(
    (r) => r && String(r.status).toLowerCase() === 'active'
  ) ?? null;
  return row;
}

/**
 * Approved-payment zaxirasi qancha amal qiladi.
 *
 * Zaxira `plan_expires_at` yozilmay qolgan holat uchun. Ilgari u MUDDATSIZ
 * edi: bir marta to'lagan odam tarifi tugagach ham abadiy premium bo'lib
 * qolardi (2026-08-17 da prodda 62 ta shunday hisob topildi). Endi zaxira
 * to'lov tasdiqlangan sanadan boshlab tarif muddatichagina amal qiladi.
 */
const FALLBACK_DAYS_BY_TARIFF: Record<string, number> = {
  year: 365,
  yearly: 365,
  three_month: 90,
  month: 30,
  monthly: 30,
};
/** Tarif kodi noma'lum bo'lsa eng qisqa joriy tarif bo'yicha hisoblanadi. */
const FALLBACK_DAYS_DEFAULT = 90;

function approvedPaymentStillCovers(
  approvedAt: string | null | undefined,
  tariffType: string | null | undefined
): boolean {
  if (!approvedAt) return false;
  const start = new Date(approvedAt);
  if (!Number.isFinite(start.getTime())) return false;
  const days = FALLBACK_DAYS_BY_TARIFF[String(tariffType ?? '').toLowerCase()] ?? FALLBACK_DAYS_DEFAULT;
  return start.getTime() + days * 24 * 60 * 60 * 1000 > Date.now();
}

/**
 * To'lov rus kursi obunasimi.
 *
 * `normalizePaymentProductCode` NOMA'LUM qiymatni ham 'russian' qiladi, ya'ni
 * kodi buzuq yozilgan har qanday to'lov jimgina premium berib yuborardi.
 * Shu sabab bu yerda tekshiruv aniq: kod tanilgan bo'lishi VA 'russian'
 * bo'lishi shart. Bo'sh/NULL kod — `product_code` ustuni paydo bo'lishidan
 * oldingi eski yozuvlar; ular o'sha paytda faqat rus kursi bo'lgan.
 */
function isRussianSubscriptionPayment(productCode: string | null | undefined): boolean {
  if (productCode == null || productCode === '') return true;
  return isPaymentProductCode(productCode) && productCode === SUBSCRIPTION_PRODUCT_CODE;
}

/**
 * Also consider users.plan_expires_at as fallback (from payments).
 * Last resort: an approved Russian-course payment still inside its tariff
 * window (in case plan_expires_at update failed).
 */
export async function hasActiveAccess(
  supabase: DbClient,
  userId: number
): Promise<boolean> {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return false;
  const sub = await getActiveSubscription(supabase, uid);
  if (sub) return true;
  const { data: user, error } = await supabase
    .from('users')
    .select('plan_expires_at')
    .eq('id', uid)
    .single();
  if (!error && user?.plan_expires_at != null && user.plan_expires_at !== '') {
    const expiry = new Date(user.plan_expires_at as string);
    if (Number.isFinite(expiry.getTime()) && expiry > new Date()) return true;
  }
  const { data: approvedPayment } = await supabase
    .from('payments')
    .select('id, product_code, approved_at, tariff_type')
    .eq('user_id', uid)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(10);
  return (approvedPayment ?? []).some(
    (row: {
      product_code?: string | null;
      approved_at?: string | null;
      tariff_type?: string | null;
    }) =>
      isRussianSubscriptionPayment(row.product_code) &&
      approvedPaymentStillCovers(row.approved_at, row.tariff_type)
  );
}

export async function hasApprovedCourseAccess(
  supabase: DbClient,
  userId: number,
  productCode: CourseProductCode
): Promise<boolean> {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return false;
  const { data: rows, error } = await supabase
    .from('payments')
    .select('id, product_code, payment_proof_url, amount, currency')
    .eq('user_id', uid)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (rows ?? []).some((row) => resolveApprovedCourseProduct(row) === productCode);
}

/**
 * Get full access info for user (for GET /user/access).
 * Uses in-memory cache (90s TTL) to avoid repeated DB queries on every page/request.
 */
export async function getAccessInfo(
  supabase: DbClient,
  userId: number
): Promise<AccessInfo> {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) {
    return {
      lessons_free_limit: LESSONS_FREE_LIMIT,
      vocabulary_free_topic: VOCABULARY_FREE_TOPIC,
      vocabulary_free_subtopic: VOCABULARY_FREE_SUBTOPIC,
      subscription_active: false,
      patent_course_active: PATENT_COURSE_FREE_FOR_ALL,
      vnzh_course_active: false,
    };
  }
  const cached = getCachedAccess(uid);
  if (cached) return cached;

  /*
   * OLTIN A'ZO — ichki xizmat hisobi: hamma narsa to'liq ochiq.
   * Bu maqom o'quvchi, o'qituvchi va adminda ham yo'q.
   */
  const { data: oltinRow } = await supabase
    .from('users')
    .select('is_golden')
    .eq('id', uid)
    .maybeSingle();
  if ((oltinRow as { is_golden?: boolean } | null)?.is_golden) {
    const oltin: AccessInfo = {
      lessons_free_limit: Number.MAX_SAFE_INTEGER,
      vocabulary_free_topic: VOCABULARY_FREE_TOPIC,
      vocabulary_free_subtopic: VOCABULARY_FREE_SUBTOPIC,
      subscription_active: true,
      patent_course_active: true,
      vnzh_course_active: true,
      golden: true,
    };
    setCachedAccess(uid, oltin);
    return oltin;
  }

  let subscriptionActive = await hasActiveAccess(supabase, uid);
  const [patentCourseActive, vnzhCourseActive] = await Promise.all([
    hasApprovedCourseAccess(supabase, uid, 'patent'),
    hasApprovedCourseAccess(supabase, uid, 'vnzh'),
  ]);
  // Eslatma banneri uchun: eng kech tugaydigan sana. Obuna yozuvi
  // birinchi navbatda, bo'lmasa `users.plan_expires_at` zaxirasi.
  let expiresAt: string | null = null;
  try {
    const sub = await getActiveSubscription(supabase, uid);
    if (sub?.expires_at) expiresAt = String(sub.expires_at);
  } catch {
    expiresAt = null;
  }
  if (!subscriptionActive) {
    const { data: user } = await supabase
      .from('users')
      .select('plan_expires_at')
      .eq('id', uid)
      .maybeSingle();
    const planExpiresAt = user?.plan_expires_at;
    if (planExpiresAt != null && planExpiresAt !== '') {
      const expiry = new Date(planExpiresAt as string);
      if (Number.isFinite(expiry.getTime()) && expiry > new Date()) {
        subscriptionActive = true;
        if (!expiresAt) expiresAt = String(planExpiresAt);
      }
    }
  }

  const { vocabulary_free_topic_id, vocabulary_free_subtopic_id } =
    await resolveFreeVocabularyIds(supabase);

  const access: AccessInfo = {
    lessons_free_limit: LESSONS_FREE_LIMIT,
    vocabulary_free_topic: VOCABULARY_FREE_TOPIC,
    vocabulary_free_subtopic: VOCABULARY_FREE_SUBTOPIC,
    subscription_active: subscriptionActive,
    patent_course_active: PATENT_COURSE_FREE_FOR_ALL ? true : patentCourseActive,
    vnzh_course_active: vnzhCourseActive,
    vocabulary_free_topic_id: vocabulary_free_topic_id ?? undefined,
    vocabulary_free_subtopic_id: vocabulary_free_subtopic_id ?? undefined,
    subscription_expires_at: expiresAt,
  };
  setCachedAccess(uid, access);
  return access;
}

export async function createOrExtendSubscription(
  supabase: DbClient,
  userId: number,
  planType: PlanType,
  expiresAt: Date
): Promise<void> {
  const now = new Date();
  const { error } = await supabase.from('subscriptions').insert({
    user_id: userId,
    plan_type: planType,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
  });
  if (error) throw error;
}

export { LESSONS_FREE_LIMIT, VOCABULARY_FREE_TOPIC, VOCABULARY_FREE_SUBTOPIC };
