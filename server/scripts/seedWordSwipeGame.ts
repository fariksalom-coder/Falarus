/**
 * Seed word-swipe level 1 (50 stages, first 5 with words).
 * Run: npx tsx server/scripts/seedWordSwipeGame.ts
 */
import 'dotenv/config';
import { supabase } from '../lib/dbFacadeClient';
import { normalizeWordRu } from '../../shared/wordSwipeUtils';

type SeedWord = { uz: string; ru: string };

const STAGE_WORDS: Record<number, SeedWord[]> = {
  1: [
    { uz: 'ism', ru: 'ИМЯ' },
    { uz: 'yosh', ru: 'ВОЗРАСТ' },
    { uz: 'telefon', ru: 'ТЕЛЕФОН' },
    { uz: 'manzil', ru: 'АДРЕС' },
    { uz: 'pochta', ru: 'ПОЧТА' },
  ],
  2: [
    { uz: 'ona', ru: 'МАМА' },
    { uz: 'ota', ru: 'ПАПА' },
    { uz: 'uy', ru: 'ДОМ' },
    { uz: "o'g'il", ru: 'СЫН' },
    { uz: 'qiz', ru: 'ДОЧЬ' },
  ],
  3: [
    { uz: 'non', ru: 'ХЛЕБ' },
    { uz: 'suv', ru: 'ВОДА' },
    { uz: 'choy', ru: 'ЧАЙ' },
    { uz: 'sut', ru: 'МОЛОКО' },
    { uz: "go'sht", ru: 'МЯСО' },
  ],
  4: [
    { uz: 'dars', ru: 'УРОК' },
    { uz: 'kitob', ru: 'КНИГА' },
    { uz: 'ruchka', ru: 'РУЧКА' },
    { uz: 'stol', ru: 'СТОЛ' },
    { uz: 'klass', ru: 'КЛАСС' },
  ],
  5: [
    { uz: 'qizil', ru: 'КРАСНЫЙ' },
    { uz: "ko'k", ru: 'СИНИЙ' },
    { uz: 'oq', ru: 'БЕЛЫЙ' },
    { uz: 'qora', ru: 'ЧЕРНЫЙ' },
    { uz: 'yashil', ru: 'ЗЕЛЕНЫЙ' },
  ],
};

async function upsertStage(levelNumber: number, stageNumber: number, words: SeedWord[]) {
  const { data: existing, error: fetchErr } = await supabase
    .from('game_word_swipe_stages')
    .select('id')
    .eq('level_number', levelNumber)
    .eq('stage_number', stageNumber)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  let stageId = existing?.id as number | undefined;

  if (stageId) {
    const { error } = await supabase
      .from('game_word_swipe_stages')
      .update({
        title: `Level ${levelNumber} · Stage ${stageNumber}`,
        grid_rows: 5,
        grid_cols: 6,
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
        stage_number: stageNumber,
        title: `Level ${levelNumber} · Stage ${stageNumber}`,
        grid_rows: 5,
        grid_cols: 6,
        is_active: true,
      })
      .select('id')
      .single();
    if (error) throw error;
    stageId = data.id;
  }

  await supabase.from('game_word_swipe_words').delete().eq('stage_id', stageId);

  if (words.length > 0) {
    const rows = words.map((word, index) => ({
      stage_id: stageId,
      sort_order: index,
      word_uz: word.uz,
      word_ru: word.ru,
      word_ru_normalized: normalizeWordRu(word.ru),
      is_active: true,
    }));

    const { error: wordsError } = await supabase.from('game_word_swipe_words').insert(rows);
    if (wordsError) throw wordsError;
  }

  console.log(`Stage ${levelNumber}/${stageNumber}: ${words.length} words`);
}

async function main() {
  const levelNumber = 1;

  for (let stageNumber = 1; stageNumber <= 50; stageNumber++) {
    const words = STAGE_WORDS[stageNumber] ?? [];
    await upsertStage(levelNumber, stageNumber, words);
  }

  console.log('Word-swipe level 1 seeded (50 stages, 5 with words).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
