import type { Supabase } from '../types/vocabulary';
import type { VocabularyTasksStatus } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository';

const MATCH_UNLOCK_PERCENT = 80;

/**
 * Get tasks status for a word group: flashcards completed, test/match locked or not.
 */
export async function getTasksStatus(
  supabase: Supabase,
  userId: number,
  wordGroupId: number
): Promise<VocabularyTasksStatus | null> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) return null;

  const progress = await repo.getProgressRowForWordGroup(supabase, userId, wordGroupId);
  const total_words = group.total_words;
  const learned_words = progress?.learned_words ?? 0;
  const flashcards_completed = progress?.flashcards_completed ?? false;
  const test_best_correct = progress?.test_best_correct ?? 0;
  const match_completed = progress?.match_completed ?? false;
  const match_unlocked =
    total_words > 0 && (test_best_correct / total_words) * 100 >= MATCH_UNLOCK_PERCENT;

  return {
    flashcards_status: flashcards_completed ? 'completed' : 'not_started',
    test_status: flashcards_completed
      ? test_best_correct > 0
        ? 'completed'
        : 'not_started'
      : 'locked',
    match_status: !flashcards_completed
      ? 'locked'
      : !match_unlocked
        ? 'locked'
        : match_completed
          ? 'completed'
          : 'not_started',
    learned_words,
    total_words,
    test_best_correct,
    match_unlocked,
  };
}
