import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';

async function hasActiveAccess(userId: number): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', now)
    .limit(1)
    .maybeSingle();
  if (subErr) throw subErr;
  if (sub) return true;
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('plan_expires_at')
    .eq('id', userId)
    .single();
  if (userErr || !user?.plan_expires_at) return false;
  return new Date(user.plan_expires_at) > new Date();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const subscriptionActive = await hasActiveAccess(userId);

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

    return res.status(200).json({
      lessons_free_limit: 3,
      vocabulary_free_topic: 1,
      vocabulary_free_subtopic: 1,
      subscription_active: subscriptionActive,
      vocabulary_free_topic_id: vocabulary_free_topic_id ?? null,
      vocabulary_free_subtopic_id: vocabulary_free_subtopic_id ?? null,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/user/access]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
