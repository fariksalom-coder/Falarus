import type { Supabase } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository.js';

/**
 * Mark flashcards as completed for a word group.
 * Unlocks Test (task 2). No points awarded.
 */
export async function completeFlashcards(
  supabase: Supabase,
  userId: number,
  wordGroupId: number
): Promise<{ success: boolean }> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) throw new Error('Word group not found');

  await repo.getOrCreateUserWordGroupProgress(supabase, userId, wordGroupId, group.total_words);
  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    flashcards_completed: true,
  });

  return { success: true };
}
