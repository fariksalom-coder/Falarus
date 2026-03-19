/**
 * Single handler for GET /api/vocabulary/topics and GET /api/vocabulary/subtopics/:topicId
 * to stay under Vercel Hobby 12-function limit.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { resolveFreeVocabularyIds } from '../../server/lib/freeVocabularyIds.js';

// --- shared helpers ---
async function getTopicsList() {
  const { data, error } = await supabase
    .from('vocabulary_topics')
    .select('id, title')
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: string; title: string }[];
}

async function getUserTopicProgress(userId: number) {
  const { data, error } = await supabase
    .from('user_topic_progress')
    .select('topic_id, learned_words, total_words, progress_percent')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as { topic_id: string; learned_words: number; total_words: number; progress_percent: number }[];
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

async function getTopicTotalWords(topicId: string): Promise<number> {
  const subtopics = await getSubtopicsByTopic(topicId);
  let total = 0;
  for (const s of subtopics) {
    const groups = await getWordGroupsBySubtopic(s.id);
    total += groups.reduce((sum, g) => sum + g.total_words, 0);
  }
  return total;
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
  const { vocabulary_free_topic_id, vocabulary_free_subtopic_id } =
    await resolveFreeVocabularyIds(supabase);
  return { subscription_active, vocabulary_free_topic_id, vocabulary_free_subtopic_id };
}

function applySubtopicsLock(
  list: Array<{ id: string; topic_id?: string; [k: string]: unknown }>,
  topicId: string,
  access: { subscription_active: boolean; vocabulary_free_topic_id: string | null; vocabulary_free_subtopic_id: string | null }
) {
  const { vocabulary_free_topic_id, vocabulary_free_subtopic_id } = access;
  const isFreeTopic = access.subscription_active || vocabulary_free_topic_id === topicId;
  return list.map((s) => ({
    ...s,
    locked: isFreeTopic ? s.id !== vocabulary_free_subtopic_id : true,
  }));
}

// --- handlers ---
async function handleTopics(userId: number, res: VercelResponse) {
  const [topics, progressRows] = await Promise.all([
    getTopicsList(),
    getUserTopicProgress(userId),
  ]);
  const progressByTopic = Object.fromEntries(
    progressRows.map((p) => [
      p.topic_id,
      { learned_words: p.learned_words, total_words: p.total_words, progress_percent: p.progress_percent },
    ])
  );
  const list = await Promise.all(
    topics.map(async (t) => {
      const prog = progressByTopic[t.id];
      const total_words = prog?.total_words ?? (await getTopicTotalWords(t.id));
      return {
        id: t.id,
        title: t.title,
        learned_words: prog?.learned_words ?? 0,
        total_words,
        progress_percent: prog?.progress_percent ?? (total_words ? 0 : 0),
      };
    })
  );
  return res.status(200).json(list);
}

async function handleSubtopics(userId: number, topicId: string, res: VercelResponse) {
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

async function handleProgress(userId: number, req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data: rows, error } = await supabase
      .from('vocabulary_progress')
      .select('topic_id, subtopic_id, part_id, result_count, stage_cards, stage_test, stage_pairs')
      .eq('user_id', userId);
    if (error) throw error;
    return res.status(200).json(rows ?? []);
  }
  if (req.method === 'POST') {
    const body = parseBody(req.body);
    const topicId = body.topic_id as string | undefined;
    const subtopicId = body.subtopic_id as string | undefined;
    const partId = body.part_id as string | undefined;
    if (!topicId || !subtopicId || !partId) {
      return res.status(400).json({ error: 'topic_id, subtopic_id, part_id kerak' });
    }
    const row: Record<string, unknown> = {
      user_id: userId,
      topic_id: topicId,
      subtopic_id: subtopicId,
      part_id: partId,
      result_count: typeof body.result_count === 'number' ? body.result_count : 0,
      updated_at: new Date().toISOString(),
    };
    if (body.stage_cards !== undefined) row.stage_cards = body.stage_cards;
    if (body.stage_test !== undefined) row.stage_test = body.stage_test;
    if (body.stage_pairs !== undefined) row.stage_pairs = body.stage_pairs;
    const { error } = await supabase.from('vocabulary_progress').upsert(row, {
      onConflict: 'user_id,topic_id,subtopic_id,part_id',
    });
    if (error) throw error;
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const userId = requireAuth(req, res);
  if (userId == null) return;

  const path = req.query.path;
  const segments = Array.isArray(path) ? path : path ? [path] : [];

  try {
    if (segments.length === 1 && segments[0] === 'topics' && req.method === 'GET') {
      return await handleTopics(userId, res);
    }
    if (segments.length === 2 && segments[0] === 'subtopics' && req.method === 'GET') {
      return await handleSubtopics(userId, segments[1], res);
    }
    if (segments.length === 1 && segments[0] === 'progress') {
      return await handleProgress(userId, req, res);
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/vocabulary/[...path]]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
