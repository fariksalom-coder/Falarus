import type { DbClient } from '../types/dbClient';
import { normalizeWordRu } from '../../shared/wordSwipeUtils';

export type WordSwipeStageRow = {
  id: number;
  level_number: number;
  stage_number: number;
  title: string | null;
  grid_rows: number;
  grid_cols: number;
};

export type WordSwipeWordRow = {
  id: number;
  word_uz: string;
  word_ru: string;
  sort_order: number;
};

export type UserWordSwipeProgressRow = {
  user_id: number;
  level_number: number;
  stage_number: number;
  completed_stages: Record<string, number[]>;
  last_played_at: string;
  updated_at: string;
};

export async function fetchLevelsSummary(supabase: DbClient) {
  const { data: stages, error } = await supabase
    .from('game_word_swipe_stages')
    .select('id, level_number, stage_number')
    .eq('is_active', true)
    .order('level_number')
    .order('stage_number');

  if (error) throw error;

  const stageIds = (stages ?? []).map((s) => s.id);
  if (stageIds.length === 0) return [];

  const { data: words, error: wordsError } = await supabase
    .from('game_word_swipe_words')
    .select('stage_id')
    .eq('is_active', true)
    .in('stage_id', stageIds);

  if (wordsError) throw wordsError;

  const wordCountByStage = new Map<number, number>();
  for (const row of words ?? []) {
    wordCountByStage.set(row.stage_id, (wordCountByStage.get(row.stage_id) ?? 0) + 1);
  }

  const byLevel = new Map<number, { stagesCount: number; availableStagesCount: number }>();
  for (const stage of stages ?? []) {
    const entry = byLevel.get(stage.level_number) ?? { stagesCount: 0, availableStagesCount: 0 };
    entry.stagesCount += 1;
    if ((wordCountByStage.get(stage.id) ?? 0) > 0) {
      entry.availableStagesCount += 1;
    }
    byLevel.set(stage.level_number, entry);
  }

  return [...byLevel.entries()]
    .sort(([a], [b]) => a - b)
    .map(([levelNumber, counts]) => ({
      levelNumber,
      stagesCount: counts.stagesCount,
      availableStagesCount: counts.availableStagesCount,
    }));
}

export async function fetchStageWithWords(
  supabase: DbClient,
  levelNumber: number,
  stageNumber: number,
): Promise<{ stage: WordSwipeStageRow; words: WordSwipeWordRow[] } | null> {
  const { data: stage, error } = await supabase
    .from('game_word_swipe_stages')
    .select('id, level_number, stage_number, title, grid_rows, grid_cols')
    .eq('level_number', levelNumber)
    .eq('stage_number', stageNumber)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!stage) return null;

  const { data: words, error: wordsError } = await supabase
    .from('game_word_swipe_words')
    .select('id, word_uz, word_ru, sort_order')
    .eq('stage_id', stage.id)
    .eq('is_active', true)
    .order('sort_order')
    .order('id');

  if (wordsError) throw wordsError;

  return { stage, words: words ?? [] };
}

export async function fetchUserProgress(
  supabase: DbClient,
  userId: number,
): Promise<UserWordSwipeProgressRow | null> {
  const { data, error } = await supabase
    .from('user_game_word_swipe_progress')
    .select('user_id, level_number, stage_number, completed_stages, last_played_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    completed_stages: (data.completed_stages ?? {}) as Record<string, number[]>,
  };
}

export async function upsertUserProgress(
  supabase: DbClient,
  userId: number,
  payload: {
    levelNumber: number;
    stageNumber: number;
    completedStages: Record<string, number[]>;
  },
): Promise<UserWordSwipeProgressRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_game_word_swipe_progress')
    .upsert(
      {
        user_id: userId,
        level_number: payload.levelNumber,
        stage_number: payload.stageNumber,
        completed_stages: payload.completedStages,
        last_played_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )
    .select('user_id, level_number, stage_number, completed_stages, last_played_at, updated_at')
    .single();

  if (error) throw error;

  return {
    ...data,
    completed_stages: (data.completed_stages ?? {}) as Record<string, number[]>,
  };
}

export function normalizeStageWords(words: WordSwipeWordRow[]) {
  return words.map((w) => ({
    id: w.id,
    uz: w.word_uz,
    ru: normalizeWordRu(w.word_ru),
  }));
}

export type AvailableStageSlot = {
  levelNumber: number;
  stageNumber: number;
};

export async function fetchStagesWithWords(supabase: DbClient): Promise<AvailableStageSlot[]> {
  const { data: stages, error } = await supabase
    .from('game_word_swipe_stages')
    .select('id, level_number, stage_number')
    .eq('is_active', true)
    .order('level_number')
    .order('stage_number');

  if (error) throw error;
  if (!stages?.length) return [];

  const stageIds = stages.map((stage) => stage.id);
  const { data: words, error: wordsError } = await supabase
    .from('game_word_swipe_words')
    .select('stage_id')
    .eq('is_active', true)
    .in('stage_id', stageIds);

  if (wordsError) throw wordsError;

  const wordCountByStage = new Map<number, number>();
  for (const row of words ?? []) {
    wordCountByStage.set(row.stage_id, (wordCountByStage.get(row.stage_id) ?? 0) + 1);
  }

  return stages
    .filter((stage) => (wordCountByStage.get(stage.id) ?? 0) > 0)
    .map((stage) => ({
      levelNumber: stage.level_number,
      stageNumber: stage.stage_number,
    }));
}
