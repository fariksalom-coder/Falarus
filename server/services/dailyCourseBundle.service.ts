import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DailyCourseDayBundle,
  DailyCourseMcq,
  DailyCourseMatchSet,
  DailyGrammarSection,
  DailyGrammarSentenceArrange,
  DailyPracticePrompt,
  DailyReadingLexeme,
  DailyReadingSection,
  DailyVocabularySection,
} from '../../shared/dailyCourseDay.ts';
import { normalizeRuWord } from '../../shared/russianLexemeNormalize.ts';

type DbMcq = {
  id: number;
  quiz_kind?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_index: number;
};

type DbFlatMatch = {
  block_sort_order: number;
  pair_sort_order: number;
  left_text: string;
  right_text: string;
};

function mapMcq(row: DbMcq): DailyCourseMcq {
  return {
    id: row.id,
    questionText: row.question_text,
    optionA: row.option_a,
    optionB: row.option_b,
    optionC: row.option_c,
    optionD: row.option_d,
    correctIndex: row.correct_index,
  };
}

function buildMatchBlocks(rows: DbFlatMatch[] | null): DailyCourseMatchSet[] {
  const byBlock = new Map<number, DbFlatMatch[]>();
  for (const r of rows ?? []) {
    const k = r.block_sort_order;
    const list = byBlock.get(k) ?? [];
    list.push(r);
    byBlock.set(k, list);
  }
  const blockKeys = [...byBlock.keys()].sort((a, b) => a - b);
  return blockKeys.map((blockSortOrder) => ({
    blockSortOrder,
    pairs: (byBlock.get(blockSortOrder) ?? [])
      .sort((a, b) => a.pair_sort_order - b.pair_sort_order)
      .map((p) => ({ left: p.left_text, right: p.right_text })),
  }));
}

function grammarSectionEmpty(g: DailyGrammarSection): boolean {
  return (
    g.topic === null &&
    g.ruleMcqs.length === 0 &&
    g.sentenceMcqs.length === 0 &&
    g.sentenceArrange.length === 0 &&
    g.matchSets.length === 0
  );
}

function vocabSectionEmpty(v: DailyVocabularySection): boolean {
  return v.words.length === 0;
}

function parseWordBank(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  return [];
}

/** Bump when changing daily-course fetch logic (visible in /api/health for deploy checks). */
export const DAILY_COURSE_BUNDLE_FETCH_REV = 'split-reading-v2';

export async function fetchDailyCourseDayBundle(
  sb: SupabaseClient,
  dayNumber: number,
): Promise<{ ok: true; bundle: DailyCourseDayBundle } | { ok: false; error: string }> {
  const [
    topicRes,
    grammarMcqRes,
    grammarMatchesRes,
    grammarSentenceArrangeRes,
    vocabWordsRes,
    readingPassageRes,
    practiceRes,
  ] = await Promise.all([
    sb.from('daily_grammar_topics').select('title, theory_text').eq('day_number', dayNumber).maybeSingle(),
    sb.from('daily_grammar_mcqs').select('*').eq('day_number', dayNumber).order('sort_order', { ascending: true }),
    sb
      .from('daily_grammar_matches')
      .select('block_sort_order, pair_sort_order, left_text, right_text')
      .eq('day_number', dayNumber)
      .order('block_sort_order', { ascending: true })
      .order('pair_sort_order', { ascending: true }),
    sb
      .from('daily_grammar_sentence_arrange')
      .select('id, prompt_lang, prompt_text, word_bank, answer_ru, sort_order')
      .eq('day_number', dayNumber)
      .order('sort_order', { ascending: true }),
    sb
      .from('daily_vocab_words')
      .select('id, sort_order, word_uz, word_ru')
      .eq('day_number', dayNumber)
      .order('sort_order', { ascending: true }),
    sb.from('daily_reading_passages').select('title, body_ru, text_id').eq('day_number', dayNumber).maybeSingle(),
    sb
      .from('daily_practice_prompts')
      .select('id, sort_order, uz_text, ru_correct')
      .eq('day_number', dayNumber)
      .order('sort_order', { ascending: true }),
  ]);

  const labeledResults: { label: string; error: { message?: string } | null }[] = [
    { label: 'daily_grammar_topics', error: topicRes.error },
    { label: 'daily_grammar_mcqs', error: grammarMcqRes.error },
    { label: 'daily_grammar_matches', error: grammarMatchesRes.error },
    { label: 'daily_grammar_sentence_arrange', error: grammarSentenceArrangeRes.error },
    { label: 'daily_vocab_words', error: vocabWordsRes.error },
    { label: 'daily_reading_passages', error: readingPassageRes.error },
    { label: 'daily_practice_prompts', error: practiceRes.error },
  ];

  const failed = labeledResults.find((r) => r.error);
  if (failed?.error) {
    const msg = failed.error.message ?? 'Maʼlumot yuklanmadi';
    return { ok: false, error: `${failed.label}: ${msg}` };
  }

  const passageRow = readingPassageRes.data as {
    title?: string;
    body_ru?: string;
    text_id?: string;
  } | null;
  const passageTextId =
    passageRow && passageRow.text_id != null ? String(passageRow.text_id).trim() : '';

  let lexRaw: Array<Record<string, unknown>> = [];
  if (passageTextId !== '') {
    const lexRes = await sb
      .from('daily_reading_lexemes')
      .select('id, word_ru, word_ru_normalized, translation_uz, audio_ru, text_id')
      .eq('text_id', passageTextId);
    if (lexRes.error) {
      return {
        ok: false,
        error: `daily_reading_lexemes: ${lexRes.error.message ?? 'Maʼlumot yuklanmadi'}`,
      };
    }
    lexRaw = (lexRes.data ?? []) as Array<Record<string, unknown>>;
  }

  const topicRow = topicRes.data as { title?: string; theory_text?: string } | null;
  const hasTopic =
    topicRow &&
    (String(topicRow.title ?? '').trim() !== '' || String(topicRow.theory_text ?? '').trim() !== '');
  const grammarMcqs = (grammarMcqRes.data ?? []) as DbMcq[];
  // Legacy rows may have null/empty quiz_kind; treat them as rule tasks, not as "missing grammar".
  const sentenceMcqs = grammarMcqs.filter((r) => String(r.quiz_kind ?? '').trim() === 'sentence').map(mapMcq);
  const ruleMcqs = grammarMcqs.filter((r) => String(r.quiz_kind ?? '').trim() !== 'sentence').map(mapMcq);

  const arrangeRows = grammarSentenceArrangeRes.data ?? [];
  const sentenceArrange: DailyGrammarSentenceArrange[] = (arrangeRows as Array<Record<string, unknown>>).map(
    (row) => ({
      id: Number(row.id),
      promptLang: row.prompt_lang === 'ru' ? 'ru' : 'uz',
      promptText: String(row.prompt_text ?? ''),
      wordBank: parseWordBank(row.word_bank),
      answerRu: String(row.answer_ru ?? ''),
      sortOrder: Number(row.sort_order ?? 0),
    }),
  );

  const grammarSection: DailyGrammarSection = {
    topic: hasTopic
      ? {
          title: String(topicRow!.title ?? '').trim(),
          theoryText: String(topicRow!.theory_text ?? '').trim(),
        }
      : null,
    ruleMcqs,
    sentenceMcqs,
    sentenceArrange,
    matchSets: buildMatchBlocks(grammarMatchesRes.data as DbFlatMatch[] | null),
  };

  const vocabRows = vocabWordsRes.data ?? [];
  const vocabSection: DailyVocabularySection = {
    words: [...vocabRows].map((row, idx) => ({
      id: Number((row as Record<string, unknown>).id),
      wordUz: String((row as Record<string, unknown>).word_uz ?? ''),
      wordRu: String((row as Record<string, unknown>).word_ru ?? ''),
      sortOrder:
        (row as Record<string, unknown>).sort_order != null
          ? Number((row as Record<string, unknown>).sort_order)
          : idx,
    })),
  };

  const bodyRu = passageRow ? String(passageRow.body_ru ?? '').trim() : '';
  const lexemesSorted = [...lexRaw].sort((a, b) => Number(a.id) - Number(b.id));

  const lexemes: DailyReadingLexeme[] = lexemesSorted.map((row, idx) => ({
    id: Number(row.id),
    textId: row.text_id != null ? String(row.text_id) : passageTextId,
    wordRu: String(row.word_ru ?? ''),
    wordRuNormalized: String(row.word_ru_normalized ?? ''),
    translationUz: String(row.translation_uz ?? ''),
    audioRu: row.audio_ru != null ? String(row.audio_ru) : null,
    sortOrder: row.sort_order != null ? Number(row.sort_order) : idx,
    createdAt: row.created_at != null ? String(row.created_at) : null,
    updatedAt: row.updated_at != null ? String(row.updated_at) : null,
  }));

  /** Kun lug‘ati (`daily_vocab_words`) — matnda shu shaklda uchraganda tarjima chiqishi uchun. */
  const lexemeNormKeys = new Set(
    lexemes.map((l) => normalizeRuWord(l.wordRuNormalized || l.wordRu)).filter(Boolean),
  );
  let synthExtra = 0;
  const passageKey = passageTextId !== '' ? passageTextId : '';
  for (const row of vocabRows) {
    const ru = String((row as Record<string, unknown>).word_ru ?? '').trim();
    const uz = String((row as Record<string, unknown>).word_uz ?? '').trim();
    if (!ru || !uz) continue;
    const nk = normalizeRuWord(ru);
    if (!nk || lexemeNormKeys.has(nk)) continue;
    lexemeNormKeys.add(nk);
    lexemes.push({
      id: -(dayNumber * 100000 + synthExtra),
      textId: passageKey,
      wordRu: ru,
      wordRuNormalized: nk,
      translationUz: uz,
      audioRu: null,
      sortOrder: 90000 + lexemes.length,
      createdAt: null,
      updatedAt: null,
    });
    synthExtra += 1;
  }

  let reading: DailyReadingSection | null = null;
  if (bodyRu !== '' || lexemes.length > 0 || passageTextId !== '') {
    reading = {
      textId: passageTextId !== '' ? passageTextId : null,
      title: passageRow ? String(passageRow.title ?? '').trim() || null : null,
      bodyRu,
      lexemes,
    };
  }

  const practiceRows = practiceRes.data ?? [];
  const practice: DailyPracticePrompt[] | null =
    practiceRows.length > 0
      ? (practiceRows as Array<Record<string, unknown>>).map((row, idx) => ({
          id: Number(row.id),
          uzText: String(row.uz_text ?? ''),
          ruCorrect: String(row.ru_correct ?? ''),
          sortOrder: row.sort_order != null ? Number(row.sort_order) : idx,
        }))
      : null;

  const bundle: DailyCourseDayBundle = {
    dayNumber,
    grammar: grammarSectionEmpty(grammarSection) ? null : grammarSection,
    vocabulary: vocabSectionEmpty(vocabSection) ? null : vocabSection,
    reading,
    practice,
  };

  return { ok: true, bundle };
}
