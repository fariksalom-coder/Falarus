import type { Supabase } from '../types/vocabulary';
import type { VocabularyTasksStatus } from '../types/vocabulary';
import type { AccessInfo } from './subscription.service';
import * as repo from '../repositories/vocabularyRepository';

const MATCH_UNLOCK_PERCENT = 80;

/**
 * Get tasks status for a word group: flashcards completed, test/match locked or not.
 * Rule: Stage 2 (Test) opens after completing Stage 1 (Cards).
 *       Stage 3 (Find pair) opens after Stage 2 with ≥80% correct.
 */
export async function getTasksStatus(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  access: AccessInfo
): Promise<VocabularyTasksStatus | null> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) return null;

  const progress = await repo.getProgressRowForWordGroup(supabase, userId, wordGroupId);
  const total_words = group.total_words;
  const learned_words = progress?.learned_words ?? 0;
  const flashcards_completed = progress?.flashcards_completed ?? false;
  const test_best_correct = progress?.test_best_correct ?? 0;
  const match_completed = progress?.match_completed ?? false;

  // Stage 2 opens after Stage 1 (cards) completed.
  const test_status: 'locked' | 'not_started' | 'completed' = !flashcards_completed
    ? 'locked'
    : test_best_correct > 0
      ? 'completed'
      : 'not_started';

  // Stage 3 opens after Stage 2 with ≥80% correct.
  const match_unlocked =
    total_words > 0 && (test_best_correct / total_words) * 100 >= MATCH_UNLOCK_PERCENT;
  const match_status: 'locked' | 'not_started' | 'completed' = !flashcards_completed
    ? 'locked'
    : !match_unlocked
      ? 'locked'
      : match_completed
        ? 'completed'
        : 'not_started';

  return {
    flashcards_status: flashcards_completed ? 'completed' : 'not_started',
    test_status,
    match_status,
    learned_words,
    total_words,
    test_best_correct,
    match_unlocked,
  };
}
