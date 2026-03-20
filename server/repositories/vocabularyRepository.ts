import type { Supabase } from '../types/vocabulary';
import { formatDateInAppTimezone, getRecentAppDateStrings } from '../lib/appDate.js';

export async function getTopics(supabase: Supabase) {
  const { data, error } = await supabase
    .from('vocabulary_topics')
    .select('id, title')
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: string; title: string }[];
}

export async function getTopicTotalWords(supabase: Supabase, topicId: string): Promise<number> {
  const subtopics = await getSubtopicsByTopic(supabase, topicId);
  let total = 0;
  for (const s of subtopics) {
    const groups = await getWordGroupsBySubtopic(supabase, s.id);
    total += groups.reduce((sum, g) => sum + g.total_words, 0);
  }
  return total;
}

export async function getSubtopicTotalWords(supabase: Supabase, subtopicId: string): Promise<number> {
  const groups = await getWordGroupsBySubtopic(supabase, subtopicId);
  return groups.reduce((sum, g) => sum + g.total_words, 0);
}

/** Get total_words per subtopic in one query (avoids N+1). */
export async function getTotalWordsBySubtopicIds(
  supabase: Supabase,
  subtopicIds: string[]
): Promise<Record<string, number>> {
  if (subtopicIds.length === 0) return {};
  const { data, error } = await supabase
    .from('vocabulary_word_groups')
    .select('subtopic_id, total_words')
    .in('subtopic_id', subtopicIds);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const id of subtopicIds) out[id] = 0;
  for (const row of data ?? []) {
    const id = (row as { subtopic_id: string; total_words: number }).subtopic_id;
    out[id] = (out[id] ?? 0) + (row as { total_words: number }).total_words;
  }
  return out;
}

export async function getSubtopicsByTopic(supabase: Supabase, topicId: string) {
  const { data, error } = await supabase
    .from('vocabulary_subtopics')
    .select('id, topic_id, title')
    .eq('topic_id', topicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: string; topic_id: string; title: string }[];
}

export async function getWordGroupsBySubtopic(supabase: Supabase, subtopicId: string) {
  const { data, error } = await supabase
    .from('vocabulary_word_groups')
    .select('id, subtopic_id, part_id, title, total_words')
    .eq('subtopic_id', subtopicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: number; subtopic_id: string; part_id: string; title: string; total_words: number }[];
}

export async function getWordsByWordGroup(supabase: Supabase, wordGroupId: number) {
  const { data, error } = await supabase
    .from('vocabulary_words')
    .select('id, word_group_id, word, translation')
    .eq('word_group_id', wordGroupId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: number; word_group_id: number; word: string; translation: string }[];
}

export async function getWordGroupById(supabase: Supabase, wordGroupId: number) {
  const { data, error } = await supabase
    .from('vocabulary_word_groups')
    .select('id, subtopic_id, part_id, title, total_words')
    .eq('id', wordGroupId)
    .single();
  if (error || !data) return null;
  return data as { id: number; subtopic_id: string; part_id: string; title: string; total_words: number };
}

export async function getTopicIdBySubtopicId(supabase: Supabase, subtopicId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('vocabulary_subtopics')
    .select('topic_id')
    .eq('id', subtopicId)
    .single();
  if (error || !data) return null;
  return (data as { topic_id: string }).topic_id;
}

// ---- User progress (read from cache tables) ----

export async function getUserTopicProgress(supabase: Supabase, userId: number) {
  const { data, error } = await supabase
    .from('user_topic_progress')
    .select('topic_id, learned_words, total_words, progress_percent, updated_at')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as { topic_id: string; learned_words: number; total_words: number; progress_percent: number; updated_at: string }[];
}

export async function getUserSubtopicProgressForTopic(supabase: Supabase, userId: number, topicId: string) {
  const { data, error } = await supabase
    .from('user_subtopic_progress')
    .select('subtopic_id, learned_words, total_words, progress_percent, updated_at')
    .eq('user_id', userId)
    .eq('subtopic_id', topicId);
  const subtopics = await getSubtopicsByTopic(supabase, topicId);
  const subtopicIds = new Set(subtopics.map((s) => s.id));
  const bySubtopic = (data ?? []).reduce(
    (acc, row) => {
      acc[row.subtopic_id] = row as any;
      return acc;
    },
    {} as Record<string, { subtopic_id: string; learned_words: number; total_words: number; progress_percent: number; updated_at: string }>
  );
  return subtopicIds;
}

export async function getUserSubtopicProgress(supabase: Supabase, userId: number, topicId: string) {
  const subtopics = await getSubtopicsByTopic(supabase, topicId);
  if (subtopics.length === 0) return [];
  const ids = subtopics.map((s) => s.id);
  const { data, error } = await supabase
    .from('user_subtopic_progress')
    .select('subtopic_id, learned_words, total_words, progress_percent, updated_at')
    .eq('user_id', userId)
    .in('subtopic_id', ids);
  if (error) throw error;
  return (data ?? []) as { subtopic_id: string; learned_words: number; total_words: number; progress_percent: number; updated_at: string }[];
}

export async function getUserWordGroupProgress(supabase: Supabase, userId: number, subtopicId: string) {
  const groups = await getWordGroupsBySubtopic(supabase, subtopicId);
  if (groups.length === 0) return { groups: [], progressByGroup: {} as Record<number, { word_group_id: number; learned_words: number; total_words: number; flashcards_completed: boolean; test_best_correct: number; match_completed: boolean; progress_percent: number; updated_at: string }> };
  const groupIds = groups.map((g) => g.id);
  const { data, error } = await supabase
    .from('user_word_group_progress')
    .select('word_group_id, learned_words, total_words, flashcards_completed, test_best_correct, match_completed, progress_percent, updated_at')
    .eq('user_id', userId)
    .in('word_group_id', groupIds);
  if (error) throw error;
  const byGroup = (data ?? []).reduce(
    (acc, row) => {
      acc[row.word_group_id] = row as any;
      return acc;
    },
    {} as Record<
      number,
      {
        word_group_id: number;
        learned_words: number;
        total_words: number;
        flashcards_completed: boolean;
        test_best_correct: number;
        match_completed: boolean;
        progress_percent: number;
        updated_at: string;
      }
    >
  );
  return { groups, progressByGroup: byGroup };
}

export async function getOrCreateUserWordGroupProgress(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  totalWords: number
) {
  const { data: existing, error: fetchErr } = await supabase
    .from('user_word_group_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('word_group_id', wordGroupId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (existing) return existing as any;

  const progressPercent = totalWords > 0 ? 0 : 0;
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
      progress_percent: progressPercent,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;
  return inserted as any;
}

export async function upsertUserWordGroupProgress(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  patch: {
    learned_words?: number;
    total_words?: number;
    flashcards_completed?: boolean;
    flashcards_known?: number;
    flashcards_unknown?: number;
    test_best_correct?: number;
    test_last_correct?: number;
    test_last_incorrect?: number;
    test_last_percentage?: number;
    test_passed?: boolean;
    match_completed?: boolean;
    progress_percent?: number;
  }
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

export async function getProgressRowForWordGroup(supabase: Supabase, userId: number, wordGroupId: number) {
  const { data, error } = await supabase
    .from('user_word_group_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('word_group_id', wordGroupId)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function getSubtopicProgressRows(
  supabase: Supabase,
  userId: number,
  subtopicId: string
): Promise<{ learned_words: number; total_words: number }[]> {
  const groups = await getWordGroupsBySubtopic(supabase, subtopicId);
  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) return [];
  const { data: rows, error: err } = await supabase
    .from('user_word_group_progress')
    .select('learned_words, total_words')
    .eq('user_id', userId)
    .in('word_group_id', groupIds);
  if (err) throw err;
  return (rows ?? []) as { learned_words: number; total_words: number }[];
}

export async function getTopicProgressRows(
  supabase: Supabase,
  userId: number,
  topicId: string
): Promise<{ learned_words: number; total_words: number }[]> {
  const subtopics = await getSubtopicsByTopic(supabase, topicId);
  const results: { learned_words: number; total_words: number }[] = [];
  for (const s of subtopics) {
    const rows = await getSubtopicProgressRows(supabase, userId, s.id);
    results.push(...rows);
  }
  return results;
}

export async function upsertUserSubtopicProgress(
  supabase: Supabase,
  userId: number,
  subtopicId: string,
  learnedWords: number,
  totalWords: number,
  progressPercent: number
) {
  const { error } = await supabase.from('user_subtopic_progress').upsert(
    {
      user_id: userId,
      subtopic_id: subtopicId,
      learned_words: learnedWords,
      total_words: totalWords,
      progress_percent: progressPercent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,subtopic_id' }
  );
  if (error) throw error;
}

export async function upsertUserTopicProgress(
  supabase: Supabase,
  userId: number,
  topicId: string,
  learnedWords: number,
  totalWords: number,
  progressPercent: number
) {
  const { error } = await supabase.from('user_topic_progress').upsert(
    {
      user_id: userId,
      topic_id: topicId,
      learned_words: learnedWords,
      total_words: totalWords,
      progress_percent: progressPercent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,topic_id' }
  );
  if (error) throw error;
}

export async function insertUserVocabularyStep2Attempt(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  activityDate: string,
  correctAnswers: number,
  incorrectAnswers: number,
  totalQuestions: number,
  percentage: number
): Promise<void> {
  const { error } = await supabase.from('user_vocabulary_step2_attempts').insert({
    user_id: userId,
    word_group_id: wordGroupId,
    activity_date: activityDate,
    correct_answers: correctAnswers,
    incorrect_answers: incorrectAnswers,
    total_questions: totalQuestions,
    percentage,
  });
  if (error) throw error;
}

export type VocabularyStep2AttemptAggregateRow = {
  activity_date: string;
  word_group_id: number | string;
  correct_answers: number;
};

export function aggregateVocabularyStep2Stats(
  rows: VocabularyStep2AttemptAggregateRow[],
  recentDates: string[],
  todayStr: string
): { todayWords: number; weekWords: number } {
  const maxByDayAndWordGroup = new Map<string, number>();
  for (const row of rows) {
    const day = row.activity_date;
    const wg = String(row.word_group_id);
    const correct = Number(row.correct_answers ?? 0);
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

  return {
    todayWords: sumByDay.get(todayStr) ?? 0,
    weekWords: recentDates.reduce((sum, dateKey) => sum + (sumByDay.get(dateKey) ?? 0), 0),
  };
}

export async function getUserVocabularyStep2DailyStats(
  supabase: Supabase,
  userId: number
): Promise<{ todayWords: number; weekWords: number }> {
  const recentDates = getRecentAppDateStrings(7);
  const startStr = recentDates[0] ?? formatDateInAppTimezone(new Date());
  const todayStr = recentDates[recentDates.length - 1] ?? formatDateInAppTimezone(new Date());

  const { data, error } = await supabase
    .from('user_vocabulary_step2_attempts')
    .select('activity_date, word_group_id, correct_answers')
    .eq('user_id', userId)
    .gte('activity_date', startStr)
    .lte('activity_date', todayStr);

  if (error) throw error;
  return aggregateVocabularyStep2Stats(
    (data ?? []) as VocabularyStep2AttemptAggregateRow[],
    recentDates,
    todayStr
  );
}
