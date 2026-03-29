import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveFreeVocabularyIds } from '../lib/freeVocabularyIds';
import {
  normalizePaymentProductCode,
  type CourseProductCode,
} from '../../shared/paymentProducts.js';

const PLAN_TYPES = ['monthly', 'three_months', 'yearly'] as const;
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
};

const LESSONS_FREE_LIMIT = 3;
const VOCABULARY_FREE_TOPIC = 1;
const VOCABULARY_FREE_SUBTOPIC = 1;

/** In-memory cache for access info to avoid repeated DB hits on every request. TTL seconds. */
const ACCESS_CACHE_TTL_MS = 90 * 1000;
const accessCache = new Map<number, { access: AccessInfo; until: number }>();

export function invalidateAccessCache(userId: number): void {
  const uid = Number(userId);
  if (Number.isFinite(uid)) accessCache.delete(uid);
}

function getCachedAccess(userId: number): AccessInfo | null {
  const entry = accessCache.get(Number(userId));
  if (!entry || Date.now() > entry.until) return null;
  return entry.access;
}

function setCachedAccess(userId: number, access: AccessInfo): void {
  accessCache.set(Number(userId), { access, until: Date.now() + ACCESS_CACHE_TTL_MS });
}

/**
 * Get active subscription for user (status=active and expires_at > now).
 * Accepts status in any case (active, Active, ACTIVE).
 */
export async function getActiveSubscription(
  supabase: SupabaseClient,
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
 * Also consider users.plan_expires_at as fallback (from payments).
 * Last resort: if user has any approved payment, grant access (in case plan_expires_at update failed).
 */
export async function hasActiveAccess(
  supabase: SupabaseClient,
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
    .select('id, product_code')
    .eq('user_id', uid)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(10);
  return (approvedPayment ?? []).some(
    (row: { product_code?: string | null }) =>
      normalizePaymentProductCode(row.product_code) === 'russian'
  );
}

export async function hasApprovedCourseAccess(
  supabase: SupabaseClient,
  userId: number,
  productCode: CourseProductCode
): Promise<boolean> {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return false;
  const { data } = await supabase
    .from('payments')
    .select('id')
    .eq('user_id', uid)
    .eq('status', 'approved')
    .eq('product_code', productCode)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Get full access info for user (for GET /user/access).
 * Uses in-memory cache (90s TTL) to avoid repeated DB queries on every page/request.
 */
export async function getAccessInfo(
  supabase: SupabaseClient,
  userId: number
): Promise<AccessInfo> {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) {
    return {
      lessons_free_limit: LESSONS_FREE_LIMIT,
      vocabulary_free_topic: VOCABULARY_FREE_TOPIC,
      vocabulary_free_subtopic: VOCABULARY_FREE_SUBTOPIC,
      subscription_active: false,
      patent_course_active: false,
      vnzh_course_active: false,
    };
  }
  const cached = getCachedAccess(uid);
  if (cached) return cached;

  let subscriptionActive = await hasActiveAccess(supabase, uid);
  const [patentCourseActive, vnzhCourseActive] = await Promise.all([
    hasApprovedCourseAccess(supabase, uid, 'patent'),
    hasApprovedCourseAccess(supabase, uid, 'vnzh'),
  ]);
  if (!subscriptionActive) {
    const { data: user } = await supabase
      .from('users')
      .select('plan_expires_at')
      .eq('id', uid)
      .maybeSingle();
    const expiresAt = user?.plan_expires_at;
    if (expiresAt != null && expiresAt !== '') {
      const expiry = new Date(expiresAt as string);
      if (Number.isFinite(expiry.getTime()) && expiry > new Date()) subscriptionActive = true;
    }
  }

  const { vocabulary_free_topic_id, vocabulary_free_subtopic_id } =
    await resolveFreeVocabularyIds(supabase);

  const access: AccessInfo = {
    lessons_free_limit: LESSONS_FREE_LIMIT,
    vocabulary_free_topic: VOCABULARY_FREE_TOPIC,
    vocabulary_free_subtopic: VOCABULARY_FREE_SUBTOPIC,
    subscription_active: subscriptionActive,
    patent_course_active: patentCourseActive,
    vnzh_course_active: vnzhCourseActive,
    vocabulary_free_topic_id: vocabulary_free_topic_id ?? undefined,
    vocabulary_free_subtopic_id: vocabulary_free_subtopic_id ?? undefined,
  };
  setCachedAccess(uid, access);
  return access;
}

export async function createOrExtendSubscription(
  supabase: SupabaseClient,
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
