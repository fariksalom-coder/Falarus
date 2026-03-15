import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { setCors, handleOptions } from '../../_lib/cors.js';
import { requireAuth } from '../../_lib/auth.js';

async function hasActiveAccess(userId: number): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', now)
    .limit(1)
    .maybeSingle();
  if (sub) return true;
  const { data: user } = await supabase
    .from('users')
    .select('plan_expires_at')
    .eq('id', userId)
    .single();
  return user?.plan_expires_at != null && new Date(user.plan_expires_at) > new Date();
}

async function getAccessInfo(userId: number) {
  const subscription_active = await hasActiveAccess(userId);
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
    subscription_active,
    vocabulary_free_topic_id,
    vocabulary_free_subtopic_id,
  };
}

async function getSubtopicsByTopic(topicId: string) {
  const { data, error } = await supabase
    .from('vocabulary_subtopics')
    .select('id, topic_id, title')
    .eq('topic_id', topicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: string; topic_id: string; title: string }[];
}

async function getWordGroupsBySubtopic(subtopicId: string) {
  const { data, error } = await supabase
    .from('vocabulary_word_groups')
    .select('id, total_words')
    .eq('subtopic_id', subtopicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: number; total_words: number }[];
}

async function getSubtopicTotalWords(subtopicId: string): Promise<number> {
  const groups = await getWordGroupsBySubtopic(subtopicId);
  return groups.reduce((sum, g) => sum + g.total_words, 0);
}

async function getUserSubtopicProgress(userId: number, topicId: string) {
  const subtopics = await getSubtopicsByTopic(topicId);
  if (subtopics.length === 0) return [];
  const ids = subtopics.map((s) => s.id);
  const { data, error } = await supabase
    .from('user_subtopic_progress')
    .select('subtopic_id, learned_words, total_words, progress_percent')
    .eq('user_id', userId)
    .in('subtopic_id', ids);
  if (error) throw error;
  return (data ?? []) as { subtopic_id: string; learned_words: number; total_words: number; progress_percent: number }[];
}

function applySubtopicsLock(
  list: Array<{ id: string; topic_id?: string; [k: string]: unknown }>,
  topicId: string,
  access: { subscription_active: boolean; vocabulary_free_topic_id: string | null; vocabulary_free_subtopic_id: string | null }
) {
  const freeTopicId = access.vocabulary_free_topic_id;
  const freeSubtopicId = access.vocabulary_free_subtopic_id;
  const isFreeTopic = access.subscription_active || freeTopicId === topicId;
  return list.map((s) => ({
    ...s,
    locked: isFreeTopic ? s.id !== freeSubtopicId : true,
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const topicId = req.query.topicId as string;
  if (!topicId) {
    return res.status(400).json({ error: 'topicId kerak' });
  }

  try {
    const [access, subtopics, progressRows] = await Promise.all([
      getAccessInfo(userId),
      getSubtopicsByTopic(topicId),
      getUserSubtopicProgress(userId, topicId),
    ]);
    const progressBySubtopic = Object.fromEntries(
      progressRows.map((p) => [
        p.subtopic_id,
        { learned_words: p.learned_words, total_words: p.total_words, progress_percent: p.progress_percent },
      ])
    );
    const list = await Promise.all(
      subtopics.map(async (s) => {
        const prog = progressBySubtopic[s.id];
        const total_words = prog?.total_words ?? (await getSubtopicTotalWords(s.id));
        return {
          id: s.id,
          topic_id: s.topic_id,
          title: s.title,
          learned_words: prog?.learned_words ?? 0,
          total_words,
          progress_percent: prog?.progress_percent ?? (total_words ? 0 : 0),
        };
      })
    );
    const withLock = applySubtopicsLock(list, topicId, access);
    return res.status(200).json(withLock);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/vocabulary/subtopics]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
