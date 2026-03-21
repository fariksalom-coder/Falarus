import type { Supabase } from '../types/vocabulary';
import type { VocabularyTasksStatus } from '../types/vocabulary';
import type { AccessInfo } from './subscription.service';
import * as repo from '../repositories/vocabularyRepository.js';
import { formatDateInAppTimezone } from '../lib/appDate.js';
import { calculateImprovementDelta } from './scoringRules.service.js';

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

export type WordGroupStepsState = {
  step1: {
    completed: boolean;
    known: number;
    unknown: number;
  };
  step2: {
    completed: boolean;
    correct: number;
    incorrect: number;
    percentage: number;
    passed: boolean;
  };
  step3: {
    unlocked: boolean;
  };
};

function mapProgressRowToStepsState(row: any | null, total_words: number): WordGroupStepsState {
  const flashcards_completed: boolean = row?.flashcards_completed ?? false;
  const flashcards_known: number = row?.flashcards_known ?? 0;
  const flashcards_unknown: number = row?.flashcards_unknown ?? 0;

  const test_last_correct: number = row?.test_last_correct ?? 0;
  const test_last_incorrect: number = row?.test_last_incorrect ?? 0;
  const storedPercentage: number = row?.test_last_percentage ?? 0;
  const storedPassed: boolean = row?.test_passed ?? false;
  const testBestCorrect: number = row?.test_best_correct ?? 0;

  const attemptsTotal = test_last_correct + test_last_incorrect;
  const recomputedPercentage =
    attemptsTotal > 0 ? (test_last_correct / attemptsTotal) * 100 : 0;
  const percentage = attemptsTotal > 0 ? recomputedPercentage : storedPercentage;
  const currentAttemptPassed = attemptsTotal > 0 ? percentage >= 80 : false;
  const bestPassed =
    storedPassed ||
    (total_words > 0 && (Math.max(testBestCorrect, test_last_correct) / total_words) * 100 >= 80);

  return {
    step1: {
      // Step 1 is considered completed only when user actually marked at least one word.
      // This prevents a "fake completion" scenario when `flashcards_completed=true` is set but
      // known+unknown is still 0 (which would incorrectly unlock Step 2).
      completed: flashcards_completed && flashcards_known + flashcards_unknown > 0,
      known: flashcards_known,
      unknown: flashcards_unknown,
    },
    step2: {
      completed: attemptsTotal > 0,
      correct: test_last_correct,
      incorrect: test_last_incorrect,
      percentage,
      passed: currentAttemptPassed,
    },
    step3: {
      unlocked: bestPassed,
    },
  };
}

export async function getWordGroupStepsState(
  supabase: Supabase,
  userId: number,
  wordGroupId: number
): Promise<WordGroupStepsState> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) {
    throw new Error('Word group not found');
  }
  const total_words = group.total_words;
  const row = await repo.getProgressRowForWordGroup(supabase, userId, wordGroupId);
  return mapProgressRowToStepsState(row, total_words);
}

export async function saveStep1Result(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  input: { known: number; unknown: number }
): Promise<WordGroupStepsState> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) {
    throw new Error('Word group not found');
  }
  const total_words = group.total_words;
  const known = Math.max(0, Math.min(input.known, total_words));
  const unknown = Math.max(0, Math.min(input.unknown, total_words - known));

  await repo.getOrCreateUserWordGroupProgress(supabase, userId, wordGroupId, total_words);
  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    flashcards_known: known,
    flashcards_unknown: unknown,
    flashcards_completed: true,
  });

  const row = await repo.getProgressRowForWordGroup(supabase, userId, wordGroupId);
  return mapProgressRowToStepsState(row, total_words);
}

export async function saveStep2Result(
  supabase: Supabase,
  userId: number,
  wordGroupId: number,
  input: { correct: number; incorrect: number; totalQuestions?: number }
): Promise<WordGroupStepsState> {
  const group = await repo.getWordGroupById(supabase, wordGroupId);
  if (!group) {
    throw new Error('Word group not found');
  }
  const correct = Math.max(0, input.correct);
  const incorrect = Math.max(0, input.incorrect);
  let attemptsTotal = correct + incorrect;
  if (input.totalQuestions != null && input.totalQuestions > 0) {
    attemptsTotal = Math.min(input.totalQuestions, attemptsTotal);
  }
  if (attemptsTotal <= 0) {
    throw new Error('Total answers must be > 0');
  }

  // Safety: in case vocabulary_word_groups.total_words is missing/0 for some reason,
  // use the actual test attempt total so "learned_words" updates won't clamp to 0.
  const total_words = group.total_words;
  const totalWordsForProgress = total_words > 0 ? total_words : attemptsTotal;
  const percentage = (correct / attemptsTotal) * 100;
  const passed = percentage >= 80;

  const existingRow = await repo.getOrCreateUserWordGroupProgress(
    supabase,
    userId,
    wordGroupId,
    totalWordsForProgress
  );
  const previousBestCorrect = existingRow?.test_best_correct ?? 0;
  const previousPassed = existingRow?.test_passed ?? false;
  const nextBestCorrect = Math.max(previousBestCorrect, correct);
  const nextPassed = previousPassed || passed;

  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    test_last_correct: correct,
    test_last_incorrect: attemptsTotal - correct,
    test_last_percentage: percentage,
    test_passed: nextPassed,
    test_best_correct: nextBestCorrect,
  });

  // Award points for Step 2:
  // 1 point per newly improved correct answer, so retries cannot farm points.
  const pointsAwarded = calculateImprovementDelta(previousBestCorrect, nextBestCorrect);
  if (pointsAwarded > 0) {
    const { data: user } = await supabase
      .from('users')
      .select('points, weekly_points, monthly_points, total_points')
      .eq('id', userId)
      .single();
    if (user) {
      const newTotal = (user.total_points ?? 0) + pointsAwarded;
      await supabase
        .from('users')
        .update({
          points: (user.points ?? 0) + pointsAwarded,
          weekly_points: (user.weekly_points ?? 0) + pointsAwarded,
          monthly_points: (user.monthly_points ?? 0) + pointsAwarded,
          total_points: newTotal,
        })
        .eq('id', userId);

      const leaderboardService = await import('./leaderboard.service.js');
      const leaderboardCache = await import('./leaderboardCache.service.js');
      await leaderboardService.ensureUserInLeaderboard(supabase, userId);
      await leaderboardService.updateUserPoints(supabase, userId, newTotal);
      await leaderboardCache.invalidateLeaderboardCache();
    }
  }

  // Log Step 2 attempt for exact date-based statistics (Bugun / Bu hafta).
  // We store the completion by calendar date and later aggregate via MAX per (day, word_group).
  const activityDate = formatDateInAppTimezone(new Date());
  try {
    await repo.insertUserVocabularyStep2Attempt(
      supabase,
      userId,
      wordGroupId,
      activityDate,
      correct,
      attemptsTotal - correct,
      attemptsTotal,
      percentage
    );
  } catch (e) {
    // If the migration wasn't applied yet, don't block vocabulary progression flow.
    console.error('[saveStep2Result] step2 attempt log failed', e);
  }

  // "so'z o'rganildi" (learned_words) should reflect Step 2 correct answers.
  // Keep monotonic growth to match existing vocabulary progress semantics.
  const rowAfter = await repo.getProgressRowForWordGroup(supabase, userId, wordGroupId);
  const existingLearned = rowAfter?.learned_words ?? 0;
  const learnedWords = Math.max(existingLearned, Math.min(nextBestCorrect, totalWordsForProgress));

  const learnedProgressPercent = totalWordsForProgress > 0 ? (learnedWords / totalWordsForProgress) * 100 : 0;

  // Ensure learned_words is updated in the same place Step 2 is evaluated.
  // Vocabulary list pages rely on `user_word_group_progress.learned_words`.
  await repo.upsertUserWordGroupProgress(supabase, userId, wordGroupId, {
    learned_words: learnedWords,
    total_words: totalWordsForProgress,
    progress_percent: learnedProgressPercent,
  });

  const rowFinal = await repo.getProgressRowForWordGroup(supabase, userId, wordGroupId);
  return mapProgressRowToStepsState(rowFinal, totalWordsForProgress);
}
