/**
 * Seed word-swipe levels from db/seeds/*.json
 * Run: npm run seed:word-swipe
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { supabase } from '../lib/dbFacadeClient';
import { normalizeWordRu } from '../../shared/wordSwipeUtils';

type SeedWord = { uz: string; ru: string };

type SeedStage = {
  stageNumber: number;
  themeUz: string;
  themeRu: string;
  words: SeedWord[];
};

type SeedLevel = {
  levelNumber: number;
  stages: SeedStage[];
};

const GRID_ROWS = 5;
const GRID_COLS = 6;
const STAGES_PER_LEVEL = 50;
const WORDS_PER_STAGE = 5;
const RU_CYRILLIC_RE = /^[А-ЯЁ]+$/;
const SEED_FILE = resolve(process.cwd(), 'db/seeds/word_swipe_level_1.json');

function loadSeedLevel(): SeedLevel {
  const raw = readFileSync(SEED_FILE, 'utf8');
  return JSON.parse(raw) as SeedLevel;
}

function validateSeedLevel(level: SeedLevel): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(level.levelNumber) || level.levelNumber < 1) {
    errors.push('levelNumber must be a positive integer');
  }

  if (!Array.isArray(level.stages)) {
    errors.push('stages must be an array');
    return errors;
  }

  if (level.stages.length !== STAGES_PER_LEVEL) {
    errors.push(`expected exactly ${STAGES_PER_LEVEL} stages, got ${level.stages.length}`);
  }

  const seenStageNumbers = new Set<number>();
  const seenNormalizedRu = new Map<string, { stageNumber: number; wordRu: string }>();

  for (const stage of level.stages) {
    const stageLabel = `stage ${stage.stageNumber}`;

    if (!Number.isInteger(stage.stageNumber) || stage.stageNumber < 1 || stage.stageNumber > STAGES_PER_LEVEL) {
      errors.push(`${stageLabel}: stageNumber must be between 1 and ${STAGES_PER_LEVEL}`);
      continue;
    }

    if (seenStageNumbers.has(stage.stageNumber)) {
      errors.push(`${stageLabel}: duplicate stageNumber`);
    }
    seenStageNumbers.add(stage.stageNumber);

    if (!Array.isArray(stage.words)) {
      errors.push(`${stageLabel}: words must be an array`);
      continue;
    }

    if (stage.words.length !== WORDS_PER_STAGE) {
      errors.push(`${stageLabel}: expected exactly ${WORDS_PER_STAGE} words, got ${stage.words.length}`);
    }

    for (let wordIndex = 0; wordIndex < stage.words.length; wordIndex++) {
      const word = stage.words[wordIndex];
      const wordLabel = `${stageLabel}, word ${wordIndex + 1}`;

      const uz = word.uz?.trim() ?? '';
      const ru = word.ru?.trim() ?? '';

      if (!uz) {
        errors.push(`${wordLabel}: uz is empty`);
      }
      if (!ru) {
        errors.push(`${wordLabel}: ru is empty`);
        continue;
      }

      const ruUpper = ru.toUpperCase();
      if (!RU_CYRILLIC_RE.test(ruUpper)) {
        errors.push(`${wordLabel}: ru must contain only Cyrillic letters (got "${ru}")`);
      }

      const normalized = normalizeWordRu(ru);
      const ruLength = normalized.length;
      if (ruLength < 4 || ruLength > 9) {
        errors.push(`${wordLabel}: ru length must be 4–9 letters after normalization (got ${ruLength} for "${ru}")`);
      }

      const duplicate = seenNormalizedRu.get(normalized);
      if (duplicate) {
        errors.push(
          `${wordLabel}: duplicate normalized ru "${normalized}" (also in stage ${duplicate.stageNumber}: "${duplicate.wordRu}")`,
        );
      } else {
        seenNormalizedRu.set(normalized, { stageNumber: stage.stageNumber, wordRu: ru });
      }
    }
  }

  for (let stageNumber = 1; stageNumber <= STAGES_PER_LEVEL; stageNumber++) {
    if (!seenStageNumbers.has(stageNumber)) {
      errors.push(`missing stageNumber ${stageNumber}`);
    }
  }

  return errors;
}

async function upsertStage(levelNumber: number, stage: SeedStage) {
  const title = `${stage.themeRu} / ${stage.themeUz}`;

  const { data: existing, error: fetchErr } = await supabase
    .from('game_word_swipe_stages')
    .select('id')
    .eq('level_number', levelNumber)
    .eq('stage_number', stage.stageNumber)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  let stageId = existing?.id as number | undefined;

  if (stageId) {
    const { error } = await supabase
      .from('game_word_swipe_stages')
      .update({
        title,
        grid_rows: GRID_ROWS,
        grid_cols: GRID_COLS,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stageId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('game_word_swipe_stages')
      .insert({
        level_number: levelNumber,
        stage_number: stage.stageNumber,
        title,
        grid_rows: GRID_ROWS,
        grid_cols: GRID_COLS,
        is_active: true,
      })
      .select('id')
      .single();
    if (error) throw error;
    stageId = data.id;
  }

  const { error: deleteError } = await supabase
    .from('game_word_swipe_words')
    .delete()
    .eq('stage_id', stageId);
  if (deleteError) throw deleteError;

  const rows = stage.words.map((word, index) => ({
    stage_id: stageId,
    sort_order: index,
    word_uz: word.uz.trim(),
    word_ru: word.ru.trim(),
    word_ru_normalized: normalizeWordRu(word.ru),
    is_active: true,
  }));

  const { error: wordsError } = await supabase.from('game_word_swipe_words').insert(rows);
  if (wordsError) throw wordsError;
}

async function main() {
  const level = loadSeedLevel();
  const errors = validateSeedLevel(level);

  if (errors.length > 0) {
    console.error('[seed:word-swipe] validation failed:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  let wordsSeeded = 0;

  for (const stage of level.stages.sort((a, b) => a.stageNumber - b.stageNumber)) {
    await upsertStage(level.levelNumber, stage);
    wordsSeeded += stage.words.length;
  }

  console.log(`[seed:word-swipe] level: ${level.levelNumber}`);
  console.log(`[seed:word-swipe] stages seeded: ${level.stages.length}`);
  console.log(`[seed:word-swipe] words seeded: ${wordsSeeded}`);
}

main().catch((e) => {
  console.error('[seed:word-swipe] failed:', e);
  process.exit(1);
});
