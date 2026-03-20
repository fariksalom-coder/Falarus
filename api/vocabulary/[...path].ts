/**
 * Single handler for GET /api/vocabulary/topics and GET /api/vocabulary/subtopics/:topicId
 * to stay under Vercel Hobby 12-function limit.
 */
import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import {
  FREE_VOCAB_SUBTOPIC_ID,
  FREE_VOCAB_TOPIC_ID,
  resolveFreeVocabularyIds,
} from '../../server/lib/freeVocabularyIds.js';

const VOCAB_API_PREFIXES = new Set(['topics', 'subtopics', 'word-groups', 'progress', 'tasks', 'daily-word-stats']);

/**
 * Vercel may pass catch-all as query.path string, string[], or omit it — parse URL as fallback.
 * On Vercel, req.url for api/vocabulary/[...path] is often only the tail (e.g. /subtopics/kundalik-hayot)
 * without /api/vocabulary, so we must not require the word "vocabulary" in pathname.
 */
function getVocabularyPathSegments(req: VercelRequest): string[] {
  const raw = req.query.path;
  if (Array.isArray(raw)) {
    return raw.filter((p): p is string => typeof p === 'string' && p.length > 0);
  }
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split('/').filter(Boolean);
  }
  const url = req.url || (req as { originalUrl?: string }).originalUrl || '';
  const pathname = typeof url === 'string' ? url.split('?')[0] : '';
  const parts = pathname.split('/').filter(Boolean);
  // /api/vocabulary/subtopics/...
  const apiIdx = parts.indexOf('api');
  if (apiIdx >= 0 && parts[apiIdx + 1] === 'vocabulary' && parts.length > apiIdx + 2) {
    return parts.slice(apiIdx + 2);
  }
  // /vocabulary/subtopics/... (no leading api)
  const vIdx = parts.indexOf('vocabulary');
  if (vIdx >= 0 && vIdx < parts.length - 1) {
    return parts.slice(vIdx + 1);
  }
  // Tail only: /subtopics/kundalik-hayot — common on Vercel for this handler
  if (parts.length > 0 && VOCAB_API_PREFIXES.has(parts[0])) {
    return parts;
  }
  return [];
}

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
    .select('id, subtopic_id, part_id, title, total_words')
    .eq('subtopic_id', subtopicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: number; subtopic_id: string; part_id: string | null; title: string; total_words: number }[];
}

async function getWordGroupById(wordGroupId: number) {
  const { data, error } = await supabase
    .from('vocabulary_word_groups')
    .select('id, total_words')
    .eq('id', wordGroupId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: number; total_words: number };
}

async function getProgressRowForWordGroup(userId: number, wordGroupId: number) {
  const { data, error } = await supabase
    .from('user_word_group_progress')
    .select('flashcards_completed, flashcards_known, flashcards_unknown, test_last_correct, test_last_incorrect, test_last_percentage, test_passed, test_best_correct, match_completed, learned_words, total_words')
    .eq('user_id', userId)
    .eq('word_group_id', wordGroupId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const MATCH_UNLOCK_PERCENT = 80;

function mapProgressRowToStepsState(row: any, total_words: number) {
  const flashcards_completed = row?.flashcards_completed ?? false;
  const flashcards_known = row?.flashcards_known ?? 0;
  const flashcards_unknown = row?.flashcards_unknown ?? 0;
  const test_last_correct = row?.test_last_correct ?? 0;
  const test_last_incorrect = row?.test_last_incorrect ?? 0;
  const storedPercentage = row?.test_last_percentage ?? 0;
  const storedPassed = row?.test_passed ?? false;
  const attemptsTotal = test_last_correct + test_last_incorrect;
  const percentage = attemptsTotal > 0 ? (test_last_correct / attemptsTotal) * 100 : storedPercentage;
  const passed = attemptsTotal > 0 ? percentage >= 80 : storedPassed;
  return {
    step1: {
      completed: flashcards_completed && flashcards_known + flashcards_unknown > 0,
      known: flashcards_known,
      unknown: flashcards_unknown,
    },
    step2: {
      completed: attemptsTotal > 0,
      correct: test_last_correct,
      incorrect: test_last_incorrect,
      percentage,
      passed,
    },
    step3: { unlocked: passed },
  };
}

async function getOrCreateUserWordGroupProgress(userId: number, wordGroupId: number, totalWords: number) {
  const { data: existing, error: fetchErr } = await supabase
    .from('user_word_group_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('word_group_id', wordGroupId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (existing) return existing as any;
  const { data: inserted, error: insertErr } = await supabase
    .from('user_word_group_progress')
    .insert({
      user_id: userId,
      word_group_id: wordGroupId,
      learned_words: 0,
      total_words: totalWords,
      flashcards_completed: false,
      flashcards_known: 0,
      flashcards_unknown: 0,
      test_best_correct: 0,
      test_last_correct: 0,
      test_last_incorrect: 0,
      test_last_percentage: 0,
      test_passed: false,
      match_completed: false,
      progress_percent: 0,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;
  return inserted as any;
}

async function upsertUserWordGroupProgress(
  userId: number,
  wordGroupId: number,
  patch: Record<string, unknown>
) {
  const { error } = await supabase.from('user_word_group_progress').upsert(
    {
      user_id: userId,
      word_group_id: wordGroupId,
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: 'user_id,word_group_id' }
  );
  if (error) throw error;
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
  if (access.subscription_active) {
    return list.map((s) => ({ ...s, locked: false }));
  }
  const { vocabulary_free_topic_id, vocabulary_free_subtopic_id } = access;
  const isFreeTopic = vocabulary_free_topic_id === topicId;
  return list.map((s) => {
    if (!isFreeTopic) return { ...s, locked: true };
    const salomAlwaysFree =
      topicId === FREE_VOCAB_TOPIC_ID && s.id === FREE_VOCAB_SUBTOPIC_ID;
    const matchesAccessPair =
      vocabulary_free_subtopic_id != null && s.id === vocabulary_free_subtopic_id;
    return { ...s, locked: !(salomAlwaysFree || matchesAccessPair) };
  });
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

async function handleWordGroups(userId: number, subtopicId: string, res: VercelResponse) {
  const { data: subtopic, error: subErr } = await supabase
    .from('vocabulary_subtopics')
    .select('topic_id')
    .eq('id', subtopicId)
    .maybeSingle();
  if (subErr) {
    console.error('[api/vocabulary/word-groups] subtopic', subErr.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  const topicId = (subtopic as { topic_id?: string } | null)?.topic_id ?? '';
  const access = await getAccessInfo(userId);
  const allowed =
    access.subscription_active ||
    (topicId === FREE_VOCAB_TOPIC_ID && subtopicId === FREE_VOCAB_SUBTOPIC_ID) ||
    (access.vocabulary_free_topic_id === topicId && access.vocabulary_free_subtopic_id === subtopicId);
  if (!allowed) {
    return res.status(403).json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }
  const groups = await getWordGroupsBySubtopic(subtopicId);
  if (groups.length === 0) {
    return res.status(200).json([]);
  }
  const groupIds = groups.map((g) => g.id);
  const { data: progressRows, error: progErr } = await supabase
    .from('user_word_group_progress')
    .select('word_group_id, learned_words, total_words, flashcards_completed, test_best_correct, match_completed, progress_percent')
    .eq('user_id', userId)
    .in('word_group_id', groupIds);
  if (progErr) {
    console.error('[api/vocabulary/word-groups] progress', progErr.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  const progressByGroup = (progressRows ?? []).reduce(
    (acc: Record<number, { learned_words: number; total_words: number; progress_percent: number; flashcards_completed: boolean; test_best_correct: number; match_completed: boolean }>, row: any) => {
      acc[row.word_group_id] = row;
      return acc;
    },
    {}
  );
  const list = groups.map((g) => {
    const p = progressByGroup[g.id];
    return {
      id: g.id,
      subtopic_id: g.subtopic_id,
      part_id: g.part_id,
      title: g.title,
      total_words: g.total_words,
      learned_words: p?.learned_words ?? 0,
      progress_percent: p?.progress_percent ?? 0,
      flashcards_completed: p?.flashcards_completed ?? false,
      test_best_correct: p?.test_best_correct ?? 0,
      match_completed: p?.match_completed ?? false,
    };
  });
  return res.status(200).json(list);
}

async function handleWordGroupSteps(userId: number, wordGroupId: number, res: VercelResponse) {
  const group = await getWordGroupById(wordGroupId);
  if (!group) return res.status(404).json({ error: 'Not found' });
  const row = await getProgressRowForWordGroup(userId, wordGroupId);
  const state = mapProgressRowToStepsState(row, group.total_words);
  return res.status(200).json(state);
}

async function handleTasks(userId: number, wordGroupId: number, res: VercelResponse) {
  const group = await getWordGroupById(wordGroupId);
  if (!group) return res.status(404).json({ error: 'Not found' });
  const row = await getProgressRowForWordGroup(userId, wordGroupId);
  const total_words = group.total_words;
  const learned_words = row?.learned_words ?? 0;
  const flashcards_completed = row?.flashcards_completed ?? false;
  const test_best_correct = row?.test_best_correct ?? 0;
  const match_completed = row?.match_completed ?? false;
  const test_status: 'locked' | 'not_started' | 'completed' = !flashcards_completed
    ? 'locked'
    : test_best_correct > 0
      ? 'completed'
      : 'not_started';
  const match_unlocked = total_words > 0 && (test_best_correct / total_words) * 100 >= MATCH_UNLOCK_PERCENT;
  const match_status: 'locked' | 'not_started' | 'completed' = !flashcards_completed
    ? 'locked'
    : !match_unlocked
      ? 'locked'
      : match_completed
        ? 'completed'
        : 'not_started';
  return res.status(200).json({
    flashcards_status: flashcards_completed ? 'completed' : 'not_started',
    test_status,
    match_status,
    learned_words,
    total_words,
    test_best_correct,
    match_unlocked,
  });
}

async function handlePostStep1(userId: number, wordGroupId: number, body: Record<string, unknown>, res: VercelResponse) {
  const group = await getWordGroupById(wordGroupId);
  if (!group) return res.status(404).json({ error: 'Not found' });
  const total_words = group.total_words;
  const known = Math.max(0, Math.min(Number(body.known ?? 0), total_words));
  const unknown = Math.max(0, Math.min(Number(body.unknown ?? 0), total_words - known));
  await getOrCreateUserWordGroupProgress(userId, wordGroupId, total_words);
  await upsertUserWordGroupProgress(userId, wordGroupId, {
    flashcards_known: known,
    flashcards_unknown: unknown,
    flashcards_completed: true,
  });
  const row = await getProgressRowForWordGroup(userId, wordGroupId);
  const state = mapProgressRowToStepsState(row, total_words);
  return res.status(200).json(state);
}

async function handlePostStep2(userId: number, wordGroupId: number, body: Record<string, unknown>, res: VercelResponse) {
  const group = await getWordGroupById(wordGroupId);
  if (!group) return res.status(404).json({ error: 'Not found' });
  const correct = Math.max(0, Number(body.correct ?? 0));
  const incorrect = Math.max(0, Number(body.incorrect ?? 0));
  const totalQuestions = body.totalQuestions != null ? Number(body.totalQuestions) : undefined;
  let attemptsTotal = correct + incorrect;
  if (totalQuestions != null && totalQuestions > 0) attemptsTotal = Math.min(totalQuestions, attemptsTotal);
  if (attemptsTotal <= 0) return res.status(400).json({ error: 'correct+incorrect or totalQuestions required' });
  const total_words = group.total_words || attemptsTotal;
  const percentage = (correct / attemptsTotal) * 100;
  const passed = percentage >= 80;
  await getOrCreateUserWordGroupProgress(userId, wordGroupId, total_words);
  await upsertUserWordGroupProgress(userId, wordGroupId, {
    test_last_correct: correct,
    test_last_incorrect: attemptsTotal - correct,
    test_last_percentage: percentage,
    test_passed: passed,
    test_best_correct: Math.max(correct, 0),
  });
  const row = await getProgressRowForWordGroup(userId, wordGroupId);
  const state = mapProgressRowToStepsState(row, group.total_words);
  return res.status(200).json(state);
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

function toDateStringLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mirrors server/repositories/vocabularyRepository.getUserVocabularyStep2DailyStats */
async function handleDailyWordStats(userId: number, res: VercelResponse) {
  const today = new Date();
  const todayStr = toDateStringLocal(today);
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  const startStr = toDateStringLocal(start);

  const { data, error } = await supabase
    .from('user_vocabulary_step2_attempts')
    .select('activity_date, word_group_id, correct_answers')
    .eq('user_id', userId)
    .gte('activity_date', startStr)
    .lte('activity_date', todayStr);

  if (error) {
    console.error('[api/vocabulary/daily-word-stats]', error.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }

  const maxByDayAndWordGroup = new Map<string, number>();
  for (const row of data ?? []) {
    const day = (row as { activity_date: string }).activity_date;
    const wg = String((row as { word_group_id: number }).word_group_id);
    const correct = Number((row as { correct_answers?: number }).correct_answers ?? 0);
    const key = `${day}:${wg}`;
    const prev = maxByDayAndWordGroup.get(key) ?? 0;
    maxByDayAndWordGroup.set(key, Math.max(prev, correct));
  }

  const sumByDay = new Map<string, number>();
  for (const [key, correct] of maxByDayAndWordGroup.entries()) {
    const day = key.split(':')[0] ?? '';
    if (!day) continue;
    sumByDay.set(day, (sumByDay.get(day) ?? 0) + correct);
  }

  let weekWords = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = toDateStringLocal(d);
    weekWords += sumByDay.get(k) ?? 0;
  }

  return res.status(200).json({
    todayWords: sumByDay.get(todayStr) ?? 0,
    weekWords,
  });
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

  const segments = getVocabularyPathSegments(req);

  try {
    if (segments.length === 1 && segments[0] === 'topics' && req.method === 'GET') {
      return await handleTopics(userId, res);
    }
    if (segments.length === 2 && segments[0] === 'subtopics' && req.method === 'GET') {
      return await handleSubtopics(userId, segments[1], res);
    }
    if (segments.length === 2 && segments[0] === 'word-groups' && req.method === 'GET') {
      return await handleWordGroups(userId, segments[1], res);
    }
    if (segments.length === 3 && segments[0] === 'word-groups' && segments[2] === 'steps' && req.method === 'GET') {
      const wordGroupId = Number(segments[1]);
      if (!Number.isFinite(wordGroupId)) return res.status(400).json({ error: 'Invalid wordGroupId' });
      return await handleWordGroupSteps(userId, wordGroupId, res);
    }
    if (segments.length === 4 && segments[0] === 'word-groups' && segments[2] === 'steps' && req.method === 'POST') {
      const wordGroupId = Number(segments[1]);
      const step = segments[3];
      if (!Number.isFinite(wordGroupId)) return res.status(400).json({ error: 'Invalid wordGroupId' });
      const body = parseBody(req.body);
      if (step === '1') return await handlePostStep1(userId, wordGroupId, body, res);
      if (step === '2') return await handlePostStep2(userId, wordGroupId, body, res);
      return res.status(404).json({ error: 'Not found' });
    }
    if (segments.length === 2 && segments[0] === 'tasks' && req.method === 'GET') {
      const wordGroupId = Number(segments[1]);
      if (!Number.isFinite(wordGroupId)) return res.status(400).json({ error: 'Invalid wordGroupId' });
      return await handleTasks(userId, wordGroupId, res);
    }
    if (segments.length === 1 && segments[0] === 'progress') {
      return await handleProgress(userId, req, res);
    }
    if (segments.length === 1 && segments[0] === 'daily-word-stats' && req.method === 'GET') {
      return await handleDailyWordStats(userId, res);
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[api/vocabulary/[...path]]', err.message);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
