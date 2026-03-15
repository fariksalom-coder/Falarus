import type { Supabase } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository';

/**
 * Recalculate and persist subtopic progress from user_word_group_progress.
 */
export async function updateSubtopicProgress(
  supabase: Supabase,
  userId: number,
  subtopicId: string
): Promise<void> {
  const rows = await repo.getSubtopicProgressRows(supabase, userId, subtopicId);
  const learned_words = rows.reduce((s, r) => s + r.learned_words, 0);
  const total_words = rows.reduce((s, r) => s + r.total_words, 0);
  const progress_percent = total_words > 0 ? (learned_words / total_words) * 100 : 0;
  await repo.upsertUserSubtopicProgress(supabase, userId, subtopicId, learned_words, total_words, progress_percent);
}

/**
 * Recalculate and persist topic progress from user_subtopic_progress.
 */
export async function updateTopicProgress(
  supabase: Supabase,
  userId: number,
  topicId: string
): Promise<void> {
  const subtopics = await repo.getSubtopicsByTopic(supabase, topicId);
  let learned_words = 0;
  let total_words = 0;
  for (const s of subtopics) {
    const rows = await repo.getSubtopicProgressRows(supabase, userId, s.id);
    learned_words += rows.reduce((sum, r) => sum + r.learned_words, 0);
    total_words += rows.reduce((sum, r) => sum + r.total_words, 0);
  }
  const progress_percent = total_words > 0 ? (learned_words / total_words) * 100 : 0;
  await repo.upsertUserTopicProgress(supabase, userId, topicId, learned_words, total_words, progress_percent);
}

/**
 * Update word group progress (percent from learned_words/total_words),
 * then recalc subtopic and topic.
 */
export async function updateWordGroupProgress(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  learnedWords: number,
  totalWords: number
): Promise<void> {
  const progress_percent = totalWords > 0 ? (learnedWords / totalWords) * 100 : 0;
  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    learned_words: learnedWords,
    total_words: totalWords,
    progress_percent: progress_percent,
  });

  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (group) {
    await updateSubtopicProgress(supabase, userId, group.subtopic_id);
    const subtopicRow = await supabase
      .from('vocabulary_subtopics')
      .select('topic_id')
      .eq('id', group.subtopic_id)
      .single();
    if (subtopicRow?.data?.topic_id) {
      await updateTopicProgress(supabase, userId, subtopicRow.data.topic_id);
    }
  }
}
