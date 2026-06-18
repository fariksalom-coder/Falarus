import type { DbClient } from '../types/dbClient';
import * as repo from '../repositories/wordSwipeGameRepository';

export class WordSwipeAccessError extends Error {
  constructor() {
    super('Stage access denied');
    this.name = 'WordSwipeAccessError';
  }
}

export type WordSwipeProgressDto = {
  levelNumber: number;
  stageNumber: number;
  completedStages: Record<string, number[]>;
  completedAvailableStages: boolean;
};

export type AvailableStageSlot = {
  levelNumber: number;
  stageNumber: number;
};

function mapProgress(
  row: repo.UserWordSwipeProgressRow,
  completedAvailableStages: boolean,
): WordSwipeProgressDto {
  return {
    levelNumber: row.level_number,
    stageNumber: row.stage_number,
    completedStages: row.completed_stages ?? {},
    completedAvailableStages,
  };
}

export function findNextAvailableStage(
  slots: AvailableStageSlot[],
  afterLevel: number,
  afterStage: number,
): AvailableStageSlot | null {
  for (const slot of slots) {
    if (slot.levelNumber > afterLevel) return slot;
    if (slot.levelNumber === afterLevel && slot.stageNumber > afterStage) return slot;
  }
  return null;
}

function isStagePlayable(
  slots: AvailableStageSlot[],
  levelNumber: number,
  stageNumber: number,
): boolean {
  return slots.some(
    (slot) => slot.levelNumber === levelNumber && slot.stageNumber === stageNumber,
  );
}

export function snapProgressToAvailable(
  progress: Omit<WordSwipeProgressDto, 'completedAvailableStages'>,
  slots: AvailableStageSlot[],
): Omit<WordSwipeProgressDto, 'completedAvailableStages'> {
  if (slots.length === 0) return progress;
  if (isStagePlayable(slots, progress.levelNumber, progress.stageNumber)) return progress;

  const next = slots.find(
    (slot) =>
      slot.levelNumber > progress.levelNumber ||
      (slot.levelNumber === progress.levelNumber && slot.stageNumber >= progress.stageNumber),
  );
  if (next) {
    return { ...progress, levelNumber: next.levelNumber, stageNumber: next.stageNumber };
  }

  const last = slots[slots.length - 1];
  return { ...progress, levelNumber: last.levelNumber, stageNumber: last.stageNumber };
}

function computeCompletedAvailableStages(
  slots: AvailableStageSlot[],
  levelNumber: number,
  stageNumber: number,
  completedStages: Record<string, number[]>,
): boolean {
  if (findNextAvailableStage(slots, levelNumber, stageNumber) !== null) return false;
  const completed = completedStages[String(levelNumber)] ?? [];
  return completed.includes(stageNumber);
}

async function buildProgressDto(
  supabase: DbClient,
  row: repo.UserWordSwipeProgressRow,
): Promise<WordSwipeProgressDto> {
  const slots = await repo.fetchStagesWithWords(supabase);
  const base = snapProgressToAvailable(
    {
      levelNumber: row.level_number,
      stageNumber: row.stage_number,
      completedStages: row.completed_stages ?? {},
    },
    slots,
  );

  const completedAvailableStages = computeCompletedAvailableStages(
    slots,
    base.levelNumber,
    base.stageNumber,
    base.completedStages,
  );

  if (
    base.levelNumber !== row.level_number ||
    base.stageNumber !== row.stage_number
  ) {
    const saved = await repo.upsertUserProgress(supabase, row.user_id, {
      levelNumber: base.levelNumber,
      stageNumber: base.stageNumber,
      completedStages: base.completedStages,
    });
    return mapProgress(saved, completedAvailableStages);
  }

  return mapProgress(row, completedAvailableStages);
}

export async function getLevels(supabase: DbClient) {
  const levels = await repo.fetchLevelsSummary(supabase);
  return { levels };
}

export async function getStage(
  supabase: DbClient,
  levelNumber: number,
  stageNumber: number,
  userId: number | null,
) {
  const stageData = await repo.fetchStageWithWords(supabase, levelNumber, stageNumber);
  if (!stageData) return { kind: 'not_found' as const };

  const { stage, words } = stageData;
  if (words.length === 0) return { kind: 'not_found' as const };

  if (userId) {
    const progress = await getOrCreateProgress(supabase, userId);
    if (!canAccessStage(progress, levelNumber, stageNumber)) {
      return { kind: 'forbidden' as const };
    }
  } else if (levelNumber !== 1 || stageNumber !== 1) {
    return { kind: 'forbidden' as const };
  }

  return {
    kind: 'ok' as const,
    payload: {
      levelNumber: stage.level_number,
      stageNumber: stage.stage_number,
      gridRows: stage.grid_rows,
      gridCols: stage.grid_cols,
      words: repo.normalizeStageWords(words),
    },
  };
}

export function canAccessStage(
  progress: WordSwipeProgressDto,
  levelNumber: number,
  stageNumber: number,
): boolean {
  if (levelNumber < progress.levelNumber) return true;
  if (levelNumber > progress.levelNumber) return false;
  return stageNumber <= progress.stageNumber;
}

export async function getOrCreateProgress(
  supabase: DbClient,
  userId: number,
): Promise<WordSwipeProgressDto> {
  const existing = await repo.fetchUserProgress(supabase, userId);
  if (existing) return buildProgressDto(supabase, existing);

  const created = await repo.upsertUserProgress(supabase, userId, {
    levelNumber: 1,
    stageNumber: 1,
    completedStages: {},
  });
  return buildProgressDto(supabase, created);
}

export async function saveProgress(
  supabase: DbClient,
  userId: number,
  payload: { levelNumber: number; stageNumber: number; completed: boolean },
): Promise<WordSwipeProgressDto> {
  const current = await getOrCreateProgress(supabase, userId);

  if (!canAccessStage(current, payload.levelNumber, payload.stageNumber)) {
    throw new WordSwipeAccessError();
  }

  const slots = await repo.fetchStagesWithWords(supabase);
  const completedStages: Record<string, number[]> = { ...current.completedStages };

  let nextLevel = current.levelNumber;
  let nextStage = current.stageNumber;
  let completedAvailableStages = current.completedAvailableStages;

  if (payload.completed) {
    const levelKey = String(payload.levelNumber);
    const list = new Set(completedStages[levelKey] ?? []);
    list.add(payload.stageNumber);
    completedStages[levelKey] = [...list].sort((a, b) => a - b);

    if (payload.levelNumber === current.levelNumber && payload.stageNumber === current.stageNumber) {
      const next = findNextAvailableStage(slots, payload.levelNumber, payload.stageNumber);
      if (next) {
        nextLevel = next.levelNumber;
        nextStage = next.stageNumber;
        completedAvailableStages = false;
      } else {
        nextLevel = payload.levelNumber;
        nextStage = payload.stageNumber;
        completedAvailableStages = true;
      }
    } else {
      completedAvailableStages = computeCompletedAvailableStages(
        slots,
        nextLevel,
        nextStage,
        completedStages,
      );
    }
  }

  const saved = await repo.upsertUserProgress(supabase, userId, {
    levelNumber: nextLevel,
    stageNumber: nextStage,
    completedStages,
  });

  return mapProgress(saved, completedAvailableStages);
}
