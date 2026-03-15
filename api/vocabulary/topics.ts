import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';

async function getTopics() {
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
    .select('id, subtopic_id, part_id, title, total_words')
    .eq('subtopic_id', subtopicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: number; subtopic_id: string; part_id: string; title: string; total_words: number }[];
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = requireAuth(req, res);
  if (userId == null) return;

  try {
    const [topics, progressRows] = await Promise.all([
      getTopics(),
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
        const progress_percent = prog?.progress_percent ?? (total_words ? 0 : 0);
        return {
          id: t.id,
          title: t.title,
          learned_words: prog?.learned_words ?? 0,
          total_words,
          progress_percent,
        };
      })
    );
    return res.status(200).json(list);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/vocabulary/topics]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
