import type { SupabaseClient } from '@supabase/supabase-js';

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
  vocabulary_free_topic_id?: string | null;
  vocabulary_free_subtopic_id?: string | null;
};

const LESSONS_FREE_LIMIT = 3;
const VOCABULARY_FREE_TOPIC = 1;
const VOCABULARY_FREE_SUBTOPIC = 1;

/**
 * Get active subscription for user (status=active and expires_at > now).
 */
export async function getActiveSubscription(
  supabase: SupabaseClient,
  userId: number
): Promise<SubscriptionRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_type, started_at, expires_at, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as SubscriptionRow | null;
}

/**
 * Also consider users.plan_expires_at as fallback (from payments).
 */
export async function hasActiveAccess(
  supabase: SupabaseClient,
  userId: number
): Promise<boolean> {
  const sub = await getActiveSubscription(supabase, userId);
  if (sub) return true;
  const { data: user } = await supabase
    .from('users')
    .select('plan_expires_at')
    .eq('id', userId)
    .single();
  const expiresAt = user?.plan_expires_at;
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
}

/**
 * Get full access info for user (for GET /user/access).
 */
export async function getAccessInfo(
  supabase: SupabaseClient,
  userId: number
): Promise<AccessInfo> {
  const subscriptionActive = await hasActiveAccess(supabase, userId);

  let vocabulary_free_topic_id: string | null = null;
  let vocabulary_free_subtopic_id: string | null = null;
  const { data: firstTopic } = await supabase
    .from('vocabulary_topics')
    .select('id')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (firstTopic?.id) {
    vocabulary_free_topic_id = firstTopic.id;
    const { data: firstSub } = await supabase
      .from('vocabulary_subtopics')
      .select('id')
      .eq('topic_id', firstTopic.id)
      .order('id')
      .limit(1)
      .maybeSingle();
    if (firstSub?.id) vocabulary_free_subtopic_id = firstSub.id;
  }

  return {
    lessons_free_limit: LESSONS_FREE_LIMIT,
    vocabulary_free_topic: VOCABULARY_FREE_TOPIC,
    vocabulary_free_subtopic: VOCABULARY_FREE_SUBTOPIC,
    subscription_active: subscriptionActive,
    vocabulary_free_topic_id: vocabulary_free_topic_id ?? undefined,
    vocabulary_free_subtopic_id: vocabulary_free_subtopic_id ?? undefined,
  };
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
