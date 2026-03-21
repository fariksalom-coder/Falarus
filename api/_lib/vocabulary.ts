import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './supabase.js';
import { parseBody } from './request.js';
import {
  applySubtopicsLock,
  canAccessSubtopic,
  getSubtopicPreview,
} from './accessControl.js';
import { formatDateInAppTimezone, getRecentAppDateStrings } from './appDate.js';
import { awardUserPoints } from './awardUserPoints.js';
import { buildRequestLogContext, logError, logInfo } from './logger.js';
import { calculateCappedMatchPoints, calculateImprovementDelta } from './scoring.js';
import { getAccessInfo } from './subscription.js';

export { slugifyVocabularyTitle } from './slugifyVocabularyTitle.js';

function normalizeVocabularySubtopicParam(raw: string): string {
  if (typeof raw !== 'string') return '';
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

async function handleVocabularyRootGet(userId: number, res: VercelResponse) {
  // Legacy root vocabulary table (`vocabulary`) might be deleted.
  // Current app reads vocab from `vocabulary_topics/*_subtopics/*_word_groups` and progress caches.
  return res.status(200).json([]);
}

async function handleVocabularyRootPost(
  userId: number,
  req: VercelRequest,
  res: VercelResponse
) {
  // No-op: avoid writing into deleted `vocabulary` table.
  // Step-based vocabulary endpoints handle progress updates.
  parseBody(req.body); // keep request parsing consistent (validate JSON shape, if any)
  return res.status(200).json({ success: true });
}

async function getTopicsList() {
  const { data, error } = await supabase
    .from('vocabulary_topics')
    .select('id, title')
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: string; title: string }[];
}

type VocabWordGroupRow = {
  id: number;
  subtopic_id: string;
  total_words: number;
};

async function loadVocabularyWordGroupProgressIndex(userId: number) {
  const { data: groups, error: gErr } = await supabase
    .from('vocabulary_word_groups')
    .select('id, subtopic_id, total_words');
  if (gErr) throw gErr;
  const groupList = (groups ?? []) as VocabWordGroupRow[];
  if (groupList.length === 0) {
    return {
      groups: groupList,
      progressByWg: new Map<
        number,
        { learned_words: number; total_words: number }
      >(),
      subtopicToTopic: new Map<string, string>(),
    };
  }
  const subtopicIds = [...new Set(groupList.map((g) => g.subtopic_id))];
  const { data: subtopics, error: sErr } = await supabase
    .from('vocabulary_subtopics')
    .select('id, topic_id')
    .in('id', subtopicIds);
  if (sErr) throw sErr;
  const subtopicToTopic = new Map(
    (subtopics ?? []).map((s: { id: string; topic_id: string }) => [
      s.id,
      s.topic_id,
    ])
  );
  const wgIds = groupList.map((g) => g.id);
  const { data: prog, error: pErr } = await supabase
    .from('user_word_group_progress')
    .select('word_group_id, learned_words, total_words')
    .eq('user_id', userId)
    .in('word_group_id', wgIds);
  if (pErr) throw pErr;
  const progressByWg = new Map<
    number,
    { learned_words: number; total_words: number }
  >();
  for (const r of prog ?? []) {
    const row = r as {
      word_group_id: number;
      learned_words: number;
      total_words: number;
    };
    progressByWg.set(Number(row.word_group_id), {
      learned_words: Number(row.learned_words ?? 0),
      total_words: Number(row.total_words ?? 0),
    });
  }
  return { groups: groupList, progressByWg, subtopicToTopic };
}

function accumulateVocabularyProgress(
  groups: VocabWordGroupRow[],
  progressByWg: Map<number, { learned_words: number; total_words: number }>,
  subtopicToTopic: Map<string, string>
) {
  const topicAgg = new Map<string, { lw: number; tw: number }>();
  const subtopicAgg = new Map<string, { lw: number; tw: number }>();
  for (const g of groups) {
    const row = progressByWg.get(g.id);
    const lw = Number(row?.learned_words ?? 0);
    const tw = Math.max(
      Number(row?.total_words ?? 0),
      Number(g.total_words ?? 0)
    );
    const sa = subtopicAgg.get(g.subtopic_id) ?? { lw: 0, tw: 0 };
    sa.lw += lw;
    sa.tw += tw;
    subtopicAgg.set(g.subtopic_id, sa);
    const topicId = subtopicToTopic.get(g.subtopic_id);
    if (topicId) {
      const ta = topicAgg.get(topicId) ?? { lw: 0, tw: 0 };
      ta.lw += lw;
      ta.tw += tw;
      topicAgg.set(topicId, ta);
    }
  }
  return { topicAgg, subtopicAgg };
}

async function getUserTopicProgress(userId: number) {
  const { groups, progressByWg, subtopicToTopic } =
    await loadVocabularyWordGroupProgressIndex(userId);
  const { topicAgg } = accumulateVocabularyProgress(
    groups,
    progressByWg,
    subtopicToTopic
  );
  return [...topicAgg.entries()].map(([topic_id, { lw, tw }]) => ({
    topic_id,
    learned_words: lw,
    total_words: tw,
    progress_percent: tw > 0 ? (lw / tw) * 100 : 0,
  }));
}

async function getSubtopicsByTopic(topicId: string) {
  const { data, error } = await supabase
    .from('vocabulary_subtopics')
    .select('id, topic_id, title, slug')
    .eq('topic_id', topicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    topic_id: string;
    title: string;
    slug: string;
  }[];
}

/**
 * Resolve a path segment to a subtopic row. Tries `slug` first, then legacy `id` (same string as before migration).
 */
async function resolveVocabularySubtopicFromPathParam(rawParam: string) {
  const subtopicSlug = normalizeVocabularySubtopicParam(rawParam);
  if (!subtopicSlug) return null;

  const { data: bySlug, error: slugErr } = await supabase
    .from('vocabulary_subtopics')
    .select('id, topic_id')
    .eq('slug', subtopicSlug)
    .maybeSingle();
  if (slugErr) throw slugErr;
  if (bySlug) {
    return bySlug as { id: string; topic_id: string };
  }

  const { data: byId, error: idErr } = await supabase
    .from('vocabulary_subtopics')
    .select('id, topic_id')
    .eq('id', subtopicSlug)
    .maybeSingle();
  if (idErr) throw idErr;
  return (byId as { id: string; topic_id: string } | null) ?? null;
}

async function getWordGroupsBySubtopic(subtopicId: string) {
  const { data, error } = await supabase
    .from('vocabulary_word_groups')
    .select('id, subtopic_id, part_id, title, total_words')
    .eq('subtopic_id', subtopicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as {
    id: number;
    subtopic_id: string;
    part_id: string | null;
    title: string;
    total_words: number;
  }[];
}

async function getWordGroupById(wordGroupId: number) {
  const { data, error } = await supabase
    .from('vocabulary_word_groups')
    .select('id, subtopic_id, part_id, title, total_words')
    .eq('id', wordGroupId)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: number;
    subtopic_id: string;
    part_id: string | null;
    title: string;
    total_words: number;
  };
}

async function getProgressRowForWordGroup(userId: number, wordGroupId: number) {
  const { data, error } = await supabase
    .from('user_word_group_progress')
    .select(
      'flashcards_completed, flashcards_known, flashcards_unknown, test_last_correct, test_last_incorrect, test_last_percentage, test_passed, test_best_correct, match_completed, learned_words, total_words'
    )
    .eq('user_id', userId)
    .eq('word_group_id', wordGroupId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const MATCH_UNLOCK_PERCENT = 80;

function mapProgressRowToStepsState(row: any, totalWords: number) {
  const flashcards_completed = row?.flashcards_completed ?? false;
  const flashcards_known = row?.flashcards_known ?? 0;
  const flashcards_unknown = row?.flashcards_unknown ?? 0;
  const test_last_correct = row?.test_last_correct ?? 0;
  const test_last_incorrect = row?.test_last_incorrect ?? 0;
  const storedPercentage = row?.test_last_percentage ?? 0;
  const storedPassed = row?.test_passed ?? false;
  const test_best_correct = row?.test_best_correct ?? 0;
  const attemptsTotal = test_last_correct + test_last_incorrect;
  const percentage =
    attemptsTotal > 0 ? (test_last_correct / attemptsTotal) * 100 : storedPercentage;
  const currentAttemptPassed = attemptsTotal > 0 ? percentage >= 80 : false;
  const bestPassed =
    storedPassed ||
    (totalWords > 0 &&
      (Math.max(test_best_correct, test_last_correct) / totalWords) * 100 >= 80);
  return {
    step1: {
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
    step3: { unlocked: bestPassed },
  };
}

async function getTopicTotalWords(topicId: string): Promise<number> {
  const subtopics = await getSubtopicsByTopic(topicId);
  let total = 0;
  for (const subtopic of subtopics) {
    const groups = await getWordGroupsBySubtopic(subtopic.id);
    total += groups.reduce((sum, group) => sum + group.total_words, 0);
  }
  return total;
}

async function getSubtopicTotalWords(subtopicId: string): Promise<number> {
  const groups = await getWordGroupsBySubtopic(subtopicId);
  return groups.reduce((sum, group) => sum + group.total_words, 0);
}

async function getUserSubtopicProgress(userId: number, topicId: string) {
  const subtopics = await getSubtopicsByTopic(topicId);
  if (subtopics.length === 0) return [];
  const { groups, progressByWg, subtopicToTopic } =
    await loadVocabularyWordGroupProgressIndex(userId);
  const { subtopicAgg } = accumulateVocabularyProgress(
    groups,
    progressByWg,
    subtopicToTopic
  );
  return subtopics.map((s) => {
    const a = subtopicAgg.get(s.id) ?? { lw: 0, tw: 0 };
    const tw = a.tw;
    const lw = a.lw;
    return {
      subtopic_id: s.id,
      learned_words: lw,
      total_words: tw,
      progress_percent: tw > 0 ? (lw / tw) * 100 : 0,
    };
  });
}

async function getWordGroupAccessContext(wordGroupId: number) {
  const { data: group, error: groupError } = await supabase
    .from('vocabulary_word_groups')
    .select('id, subtopic_id')
    .eq('id', wordGroupId)
    .maybeSingle();
  if (groupError) throw groupError;
  if (!group) return null;

  const { data: subtopic, error: subtopicError } = await supabase
    .from('vocabulary_subtopics')
    .select('topic_id')
    .eq('id', (group as { subtopic_id: string }).subtopic_id)
    .maybeSingle();
  if (subtopicError) throw subtopicError;

  return {
    wordGroupId: (group as { id: number }).id,
    subtopicId: (group as { subtopic_id: string }).subtopic_id,
    topicId: (subtopic as { topic_id?: string } | null)?.topic_id ?? null,
  };
}

async function ensureWordGroupAccess(userId: number, wordGroupId: number) {
  const context = await getWordGroupAccessContext(wordGroupId);
  if (!context?.topicId) {
    return { status: 'not_found' as const };
  }
  const access = await getAccessInfo(supabase, userId);
  if (!canAccessSubtopic(context.topicId, context.subtopicId, access)) {
    return { status: 'locked' as const };
  }
  return { status: 'ok' as const, context };
}

async function getOrCreateUserWordGroupProgress(
  userId: number,
  wordGroupId: number,
  totalWords: number
) {
  const existing = await getProgressRowForWordGroup(userId, wordGroupId);
  if (existing) return existing;

  const { data: inserted, error } = await supabase
    .from('user_word_group_progress')
    .insert({
      user_id: userId,
      word_group_id: wordGroupId,
      learned_words: 0,
      total_words: totalWords,
      flashcards_completed: false,
      flashcards_known: 0,
      flashcards_unknown: 0,
      test_best_correct: 0,
      test_last_correct: 0,
      test_last_incorrect: 0,
      test_last_percentage: 0,
      test_passed: false,
      match_completed: false,
      progress_percent: 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return inserted;
}

async function upsertUserWordGroupProgress(
  userId: number,
  wordGroupId: number,
  patch: Record<string, unknown>
) {
  const { error } = await supabase.from('user_word_group_progress').upsert(
    {
      user_id: userId,
      word_group_id: wordGroupId,
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: 'user_id,word_group_id' }
  );
  if (error) throw error;
}

async function insertUserVocabularyStep2Attempt(
  userId: number,
  wordGroupId: number,
  activityDate: string,
  correctAnswers: number,
  incorrectAnswers: number,
  totalQuestions: number,
  percentage: number
) {
  const { error } = await supabase.from('user_vocabulary_step2_attempts').insert({
    user_id: userId,
    word_group_id: wordGroupId,
    activity_date: activityDate,
    correct_answers: correctAnswers,
    incorrect_answers: incorrectAnswers,
    total_questions: totalQuestions,
    percentage,
  });
  if (error) throw error;
}

function aggregateVocabularyStep2Stats(
  rows: Array<{ activity_date: string; word_group_id: number | string; correct_answers: number }>,
  recentDates: string[],
  todayStr: string
) {
  const maxByDayAndWordGroup = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.activity_date}:${String(row.word_group_id)}`;
    const prev = maxByDayAndWordGroup.get(key) ?? 0;
    maxByDayAndWordGroup.set(key, Math.max(prev, Number(row.correct_answers ?? 0)));
  }

  const sumByDay = new Map<string, number>();
  for (const [key, correct] of maxByDayAndWordGroup.entries()) {
    const day = key.split(':')[0] ?? '';
    if (!day) continue;
    sumByDay.set(day, (sumByDay.get(day) ?? 0) + correct);
  }

  return {
    todayWords: sumByDay.get(todayStr) ?? 0,
    weekWords: recentDates.reduce(
      (sum, dateKey) => sum + (sumByDay.get(dateKey) ?? 0),
      0
    ),
  };
}

async function getVocabularyStep2DailyStats(userId: number) {
  const recentDates = getRecentAppDateStrings(7);
  const startStr = recentDates[0] ?? formatDateInAppTimezone(new Date());
  const todayStr =
    recentDates[recentDates.length - 1] ?? formatDateInAppTimezone(new Date());
  const { data, error } = await supabase
    .from('user_vocabulary_step2_attempts')
    .select('activity_date, word_group_id, correct_answers')
    .eq('user_id', userId)
    .gte('activity_date', startStr)
    .lte('activity_date', todayStr);
  if (error) throw error;
  return aggregateVocabularyStep2Stats(
    (data ?? []) as Array<{
      activity_date: string;
      word_group_id: number | string;
      correct_answers: number;
    }>,
    recentDates,
    todayStr
  );
}

async function saveStep1Result(
  userId: number,
  wordGroupId: number,
  input: { known: number; unknown: number }
) {
  const group = await getWordGroupById(wordGroupId);
  if (!group) throw new Error('Word group not found');

  const totalWords = group.total_words;
  const known = Math.max(0, Math.min(input.known, totalWords));
  const unknown = Math.max(0, Math.min(input.unknown, totalWords - known));
  await getOrCreateUserWordGroupProgress(userId, wordGroupId, totalWords);
  await upsertUserWordGroupProgress(userId, wordGroupId, {
    flashcards_known: known,
    flashcards_unknown: unknown,
    flashcards_completed: true,
  });
  const row = await getProgressRowForWordGroup(userId, wordGroupId);
  return mapProgressRowToStepsState(row, totalWords);
}

async function applyStep2Progress(
  userId: number,
  wordGroupId: number,
  input: { correct: number; incorrect?: number; totalQuestions?: number }
) {
  const group = await getWordGroupById(wordGroupId);
  if (!group) throw new Error('Word group not found');

  const correct = Math.max(0, Number(input.correct ?? 0));
  const incorrect = Math.max(0, Number(input.incorrect ?? 0));
  let attemptsTotal = correct + incorrect;
  if (input.totalQuestions != null && input.totalQuestions > 0) {
    attemptsTotal = Math.min(Number(input.totalQuestions), attemptsTotal);
  }
  if (attemptsTotal <= 0) {
    throw new Error('Total answers must be > 0');
  }

  const totalWordsForProgress = group.total_words > 0 ? group.total_words : attemptsTotal;
  const percentage = (correct / attemptsTotal) * 100;
  const existingRow = await getOrCreateUserWordGroupProgress(
    userId,
    wordGroupId,
    totalWordsForProgress
  );

  const previousBestCorrect = Number(existingRow?.test_best_correct ?? 0);
  const previousPassed = existingRow?.test_passed ?? false;
  const previousLearned = Number(existingRow?.learned_words ?? 0);
  const nextBestCorrect = Math.max(previousBestCorrect, correct);
  const nextPassed = previousPassed || percentage >= MATCH_UNLOCK_PERCENT;
  const learnedWords = Math.max(
    previousLearned,
    Math.min(nextBestCorrect, totalWordsForProgress)
  );
  const progressPercent =
    totalWordsForProgress > 0 ? (learnedWords / totalWordsForProgress) * 100 : 0;

  await upsertUserWordGroupProgress(userId, wordGroupId, {
    test_last_correct: correct,
    test_last_incorrect: attemptsTotal - correct,
    test_last_percentage: percentage,
    test_passed: nextPassed,
    test_best_correct: nextBestCorrect,
    learned_words: learnedWords,
    total_words: totalWordsForProgress,
    progress_percent: progressPercent,
  });

  const pointsAwarded = calculateImprovementDelta(previousBestCorrect, nextBestCorrect);
  await awardUserPoints(userId, pointsAwarded, {
    source: 'vocabulary_step2',
    sourceRef: `word_group:${wordGroupId}`,
    eventKey: `vocabulary_step2:${userId}:${wordGroupId}:best:${nextBestCorrect}`,
  });

  try {
    await insertUserVocabularyStep2Attempt(
      userId,
      wordGroupId,
      formatDateInAppTimezone(new Date()),
      correct,
      attemptsTotal - correct,
      attemptsTotal,
      percentage
    );
  } catch (error) {
    console.error('[applyStep2Progress] step2 attempt log failed', error);
  }

  const rowFinal = await getProgressRowForWordGroup(userId, wordGroupId);
  return {
    rowFinal,
    totalWordsForProgress,
    learnedWords,
    percentage,
    pointsAwarded,
    matchUnlocked:
      totalWordsForProgress > 0 &&
      (nextBestCorrect / totalWordsForProgress) * 100 >= MATCH_UNLOCK_PERCENT,
  };
}

async function saveStep2Result(
  userId: number,
  wordGroupId: number,
  input: { correct: number; incorrect: number; totalQuestions?: number }
) {
  const result = await applyStep2Progress(userId, wordGroupId, input);
  return mapProgressRowToStepsState(result.rowFinal, result.totalWordsForProgress);
}

async function completeFlashcards(userId: number, wordGroupId: number) {
  const group = await getWordGroupById(wordGroupId);
  if (!group) throw new Error('Word group not found');
  await getOrCreateUserWordGroupProgress(userId, wordGroupId, group.total_words);
  await upsertUserWordGroupProgress(userId, wordGroupId, {
    flashcards_completed: true,
  });
  return { success: true };
}

async function finishMatch(
  userId: number,
  wordGroupId: number,
  correctPairs: number
) {
  const group = await getWordGroupById(wordGroupId);
  if (!group) throw new Error('Word group not found');
  const existing = await getOrCreateUserWordGroupProgress(
    userId,
    wordGroupId,
    group.total_words
  );
  const pointsAwarded = calculateCappedMatchPoints(
    existing?.match_completed === true,
    correctPairs,
    group.total_words
  );
  await upsertUserWordGroupProgress(userId, wordGroupId, {
    match_completed: true,
  });
  await awardUserPoints(userId, pointsAwarded, {
    source: 'vocabulary_match',
    sourceRef: `word_group:${wordGroupId}`,
    eventKey: `vocabulary_match:${userId}:${wordGroupId}:complete`,
  });
  return { success: true, points_awarded: pointsAwarded };
}

async function finishTest(
  userId: number,
  wordGroupId: number,
  correctAnswers: number,
  totalQuestions: number
) {
  const result = await applyStep2Progress(userId, wordGroupId, {
    correct: correctAnswers,
    incorrect: Math.max(0, totalQuestions - correctAnswers),
    totalQuestions,
  });
  return {
    learned_words: result.learnedWords,
    percentage: result.percentage,
    points_awarded: result.pointsAwarded,
    match_unlocked: result.matchUnlocked,
  };
}

async function handleTopics(userId: number, res: VercelResponse) {
  const [topics, progressRows] = await Promise.all([
    getTopicsList(),
    getUserTopicProgress(userId),
  ]);
  const progressByTopic = Object.fromEntries(
    progressRows.map((progress) => [
      progress.topic_id,
      {
        learned_words: progress.learned_words,
        total_words: progress.total_words,
        progress_percent: progress.progress_percent,
      },
    ])
  );

  const list = await Promise.all(
    topics.map(async (topic) => {
      const progress = progressByTopic[topic.id];
      const totalWords = progress?.total_words ?? (await getTopicTotalWords(topic.id));
      return {
        id: topic.id,
        title: topic.title,
        learned_words: progress?.learned_words ?? 0,
        total_words: totalWords,
        progress_percent: progress?.progress_percent ?? 0,
      };
    })
  );

  return res.status(200).json(list);
}

async function handleSubtopics(
  userId: number,
  topicId: string,
  res: VercelResponse
) {
  const [access, subtopics, progressRows] = await Promise.all([
    getAccessInfo(supabase, userId),
    getSubtopicsByTopic(topicId),
    getUserSubtopicProgress(userId, topicId),
  ]);
  const progressBySubtopic = Object.fromEntries(
    progressRows.map((progress) => [
      progress.subtopic_id,
      {
        learned_words: progress.learned_words,
        total_words: progress.total_words,
        progress_percent: progress.progress_percent,
      },
    ])
  );

  const list = await Promise.all(
    subtopics.map(async (subtopic) => {
      const progress = progressBySubtopic[subtopic.id];
      const totalWords =
        progress?.total_words ?? (await getSubtopicTotalWords(subtopic.id));
      return {
        id: subtopic.id,
        slug: subtopic.slug,
        topic_id: subtopic.topic_id,
        title: subtopic.title,
        learned_words: progress?.learned_words ?? 0,
        total_words: totalWords,
        progress_percent: progress?.progress_percent ?? 0,
      };
    })
  );

  return res.status(200).json(applySubtopicsLock(list, topicId, access));
}

async function handleSubtopicPreview(subtopicSlug: string, res: VercelResponse) {
  const subtopic = await resolveVocabularySubtopicFromPathParam(subtopicSlug);
  if (!subtopic) {
    return res.status(404).json({ error: 'Subtopic topilmadi' });
  }
  const preview = await getSubtopicPreview(supabase, subtopic.id);
  if (!preview) {
    return res.status(404).json({ error: 'Subtopic topilmadi' });
  }
  return res.status(200).json(preview);
}

async function handleWordGroups(
  userId: number,
  subtopicSlug: string,
  res: VercelResponse
) {
  const normalized = normalizeVocabularySubtopicParam(subtopicSlug);
  let subtopic: { id: string; topic_id: string } | null;
  try {
    subtopic = await resolveVocabularySubtopicFromPathParam(subtopicSlug);
  } catch (e) {
    logError('vocabulary.word_groups.resolve_subtopic', e, {
      rawParam: subtopicSlug,
      normalized,
    });
    return res.status(500).json({
      error: 'Xatolik yuz berdi',
      code: 'SUBTOPIC_QUERY_FAILED',
      hint: 'Check Vercel logs / Supabase: column slug missing or DB error.',
    });
  }
  if (!subtopic) {
    logInfo('vocabulary.word_groups.subtopic_not_found', {
      rawParam: subtopicSlug,
      normalized,
    });
    return res.status(404).json({
      error: 'Subtopic not found',
      code: 'SUBTOPIC_NOT_FOUND',
      param: normalized || subtopicSlug,
      hint:
        'No vocabulary_subtopics row with this slug or id. Apply migration 025, run npm run seed:vocabulary, and confirm SUPABASE_* env on Vercel matches the project that has data.',
    });
  }

  const subtopicId = subtopic.id;
  const topicId = subtopic.topic_id ?? '';
  const access = await getAccessInfo(supabase, userId);
  if (!canAccessSubtopic(topicId, subtopicId, access)) {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }

  const groups = await getWordGroupsBySubtopic(subtopicId);
  if (groups.length === 0) {
    return res.status(200).json([]);
  }

  const groupIds = groups.map((group) => group.id);
  const { data: progressRows, error: progErr } = await supabase
    .from('user_word_group_progress')
    .select(
      'word_group_id, learned_words, total_words, flashcards_completed, test_best_correct, match_completed, progress_percent'
    )
    .eq('user_id', userId)
    .in('word_group_id', groupIds);
  if (progErr) {
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }

  const progressByGroup = (progressRows ?? []).reduce(
    (
      acc: Record<
        number,
        {
          learned_words: number;
          total_words: number;
          progress_percent: number;
          flashcards_completed: boolean;
          test_best_correct: number;
          match_completed: boolean;
        }
      >,
      row: any
    ) => {
      acc[row.word_group_id] = row;
      return acc;
    },
    {}
  );

  return res.status(200).json(
    groups.map((group) => {
      const progress = progressByGroup[group.id];
      return {
        id: group.id,
        subtopic_id: group.subtopic_id,
        part_id: group.part_id,
        title: group.title,
        total_words: group.total_words,
        learned_words: progress?.learned_words ?? 0,
        progress_percent: progress?.progress_percent ?? 0,
        flashcards_completed: progress?.flashcards_completed ?? false,
        test_best_correct: progress?.test_best_correct ?? 0,
        match_completed: progress?.match_completed ?? false,
      };
    })
  );
}

async function handleWordGroupSteps(
  userId: number,
  wordGroupId: number,
  res: VercelResponse
) {
  const accessCheck = await ensureWordGroupAccess(userId, wordGroupId);
  if (accessCheck.status === 'not_found') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (accessCheck.status === 'locked') {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }

  const group = await getWordGroupById(wordGroupId);
  if (!group) return res.status(404).json({ error: 'Not found' });

  const row = await getProgressRowForWordGroup(userId, wordGroupId);
  return res
    .status(200)
    .json(mapProgressRowToStepsState(row, group.total_words));
}

async function handleTasks(
  userId: number,
  wordGroupId: number,
  res: VercelResponse
) {
  const accessCheck = await ensureWordGroupAccess(userId, wordGroupId);
  if (accessCheck.status === 'not_found') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (accessCheck.status === 'locked') {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }

  const group = await getWordGroupById(wordGroupId);
  if (!group) return res.status(404).json({ error: 'Not found' });

  const row = await getProgressRowForWordGroup(userId, wordGroupId);
  const totalWords = group.total_words;
  const learnedWords = row?.learned_words ?? 0;
  const flashcardsCompleted = row?.flashcards_completed ?? false;
  const testBestCorrect = row?.test_best_correct ?? 0;
  const matchCompleted = row?.match_completed ?? false;
  const testStatus: 'locked' | 'not_started' | 'completed' = !flashcardsCompleted
    ? 'locked'
    : testBestCorrect > 0
      ? 'completed'
      : 'not_started';
  const matchUnlocked =
    totalWords > 0 && (testBestCorrect / totalWords) * 100 >= MATCH_UNLOCK_PERCENT;
  const matchStatus: 'locked' | 'not_started' | 'completed' = !flashcardsCompleted
    ? 'locked'
    : !matchUnlocked
      ? 'locked'
      : matchCompleted
        ? 'completed'
        : 'not_started';

  return res.status(200).json({
    flashcards_status: flashcardsCompleted ? 'completed' : 'not_started',
    test_status: testStatus,
    match_status: matchStatus,
    learned_words: learnedWords,
    total_words: totalWords,
    test_best_correct: testBestCorrect,
    match_unlocked: matchUnlocked,
  });
}

function parseWordGroupIdQuery(req: VercelRequest): number | null {
  const raw = req.query.word_group ?? req.query.wordGroupId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const wordGroupId = Number(value);
  return Number.isFinite(wordGroupId) ? wordGroupId : null;
}

async function handlePostStep1(
  userId: number,
  wordGroupId: number,
  body: Record<string, unknown>,
  res: VercelResponse
) {
  const accessCheck = await ensureWordGroupAccess(userId, wordGroupId);
  if (accessCheck.status === 'not_found') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (accessCheck.status === 'locked') {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }

  try {
    const state = await saveStep1Result(userId, wordGroupId, {
      known: Number(body.known ?? 0),
      unknown: Number(body.unknown ?? 0),
    });
    return res.status(200).json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(400).json({ error: message });
  }
}

async function handlePostStep2(
  userId: number,
  wordGroupId: number,
  body: Record<string, unknown>,
  res: VercelResponse
) {
  const accessCheck = await ensureWordGroupAccess(userId, wordGroupId);
  if (accessCheck.status === 'not_found') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (accessCheck.status === 'locked') {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }

  try {
    const state = await saveStep2Result(userId, wordGroupId, {
      correct: Math.max(0, Number(body.correct ?? 0)),
      incorrect: Math.max(0, Number(body.incorrect ?? 0)),
      totalQuestions:
        body.totalQuestions != null ? Number(body.totalQuestions) : undefined,
    });
    return res.status(200).json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(400).json({ error: message });
  }
}

async function handlePostMatchFinish(
  userId: number,
  body: Record<string, unknown>,
  res: VercelResponse
) {
  const wordGroupId = Number(
    body.word_group_id ?? (body as { wordGroupId?: number }).wordGroupId
  );
  const correctPairs = Number(
    body.correct_pairs ?? (body as { correctPairs?: number }).correctPairs ?? 0
  );
  if (!Number.isFinite(wordGroupId)) {
    return res.status(400).json({ error: 'word_group_id kerak' });
  }

  const accessCheck = await ensureWordGroupAccess(userId, wordGroupId);
  if (accessCheck.status === 'not_found') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (accessCheck.status === 'locked') {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }

  try {
    const result = await finishMatch(userId, wordGroupId, correctPairs);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(400).json({ error: message });
  }
}

async function handlePostFlashcardsComplete(
  userId: number,
  body: Record<string, unknown>,
  res: VercelResponse
) {
  const wordGroupId = Number(
    body.word_group_id ?? (body as { wordGroupId?: number }).wordGroupId
  );
  if (!Number.isFinite(wordGroupId)) {
    return res.status(400).json({ error: 'word_group_id kerak' });
  }

  const accessCheck = await ensureWordGroupAccess(userId, wordGroupId);
  if (accessCheck.status === 'not_found') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (accessCheck.status === 'locked') {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }

  try {
    const result = await completeFlashcards(userId, wordGroupId);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(400).json({ error: message });
  }
}

async function handlePostTestFinish(
  userId: number,
  body: Record<string, unknown>,
  res: VercelResponse
) {
  const wordGroupId = Number(
    body.word_group_id ?? (body as { wordGroupId?: number }).wordGroupId
  );
  const correctAnswers = Number(
    body.correct_answers ?? (body as { correctAnswers?: number }).correctAnswers ?? 0
  );
  const totalQuestions = Number(
    body.total_questions ?? (body as { totalQuestions?: number }).totalQuestions ?? 0
  );
  if (!Number.isFinite(wordGroupId)) {
    return res.status(400).json({ error: 'word_group_id kerak' });
  }

  const accessCheck = await ensureWordGroupAccess(userId, wordGroupId);
  if (accessCheck.status === 'not_found') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (accessCheck.status === 'locked') {
    return res
      .status(403)
      .json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
  }

  try {
    const result = await finishTest(
      userId,
      wordGroupId,
      correctAnswers,
      totalQuestions
    );
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(400).json({ error: message });
  }
}

async function handleDailyWordStats(userId: number, res: VercelResponse) {
  const stats = await getVocabularyStep2DailyStats(userId);
  return res.status(200).json(stats);
}

async function handleProgress(
  userId: number,
  req: VercelRequest,
  res: VercelResponse
) {
  // Legacy `vocabulary_progress` table was removed. Vocabulary state lives in
  // `user_word_group_progress` / step endpoints. Keep this route so older
  // clients and smoke tests do not 500.
  void userId;

  if (req.method === 'GET') {
    return res.status(200).json([]);
  }

  if (req.method === 'POST') {
    const body = parseBody(req.body);
    const topicId = body.topic_id as string | undefined;
    const subtopicId = body.subtopic_id as string | undefined;
    const partId = body.part_id as string | undefined;
    if (!topicId || !subtopicId || !partId) {
      return res
        .status(400)
        .json({ error: 'topic_id, subtopic_id, part_id kerak' });
    }
    return res.status(200).json({ success: true, deprecated: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export async function routeVocabularyRequest(
  req: VercelRequest,
  res: VercelResponse,
  userId: number,
  segments: string[]
) {
  try {
    if (segments.length === 0) {
      if (req.method === 'GET') {
        return await handleVocabularyRootGet(userId, res);
      }
      if (req.method === 'POST') {
        return await handleVocabularyRootPost(userId, req, res);
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (segments.length === 1 && segments[0] === 'topics') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleTopics(userId, res);
    }

    /**
     * Shallow URLs avoid Vercel edge 404 on deep paths like
     * /api/vocabulary/subtopics/:topicId, /api/vocabulary/word-groups/:slug,
     * /api/vocabulary/subtopic/:id/preview, or /api/vocabulary/subtopic/preview.
     */
    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'subtopics') {
      const raw = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
      let topicParam = raw;
      if (raw.includes('%')) {
        try {
          topicParam = decodeURIComponent(raw);
        } catch {
          topicParam = raw;
        }
      }
      if (topicParam) {
        return await handleSubtopics(userId, topicParam, res);
      }
      return res.status(400).json({ error: 'topic query parameter required' });
    }

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'preview') {
      const raw =
        typeof req.query.subtopic === 'string' ? req.query.subtopic.trim() : '';
      let subtopicParam = raw;
      if (raw.includes('%')) {
        try {
          subtopicParam = decodeURIComponent(raw);
        } catch {
          subtopicParam = raw;
        }
      }
      if (!subtopicParam) {
        return res.status(400).json({ error: 'subtopic query parameter required' });
      }
      return await handleSubtopicPreview(subtopicParam, res);
    }

    if (segments.length === 2 && segments[0] === 'subtopics') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleSubtopics(userId, segments[1], res);
    }

    if (
      req.method === 'GET' &&
      segments.length === 2 &&
      segments[0] === 'subtopic' &&
      segments[1] === 'preview'
    ) {
      const raw =
        typeof req.query.subtopic === 'string' ? req.query.subtopic.trim() : '';
      let subtopicParam = raw;
      if (raw.includes('%')) {
        try {
          subtopicParam = decodeURIComponent(raw);
        } catch {
          subtopicParam = raw;
        }
      }
      if (!subtopicParam) {
        return res.status(400).json({ error: 'subtopic query parameter required' });
      }
      return await handleSubtopicPreview(subtopicParam, res);
    }

    if (
      segments.length === 3 &&
      segments[0] === 'subtopic' &&
      segments[2] === 'preview'
    ) {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleSubtopicPreview(segments[1], res);
    }

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'word-groups') {
      const raw =
        typeof req.query.subtopic === 'string' ? req.query.subtopic.trim() : '';
      let subtopicParam = raw;
      if (raw.includes('%')) {
        try {
          subtopicParam = decodeURIComponent(raw);
        } catch {
          subtopicParam = raw;
        }
      }
      if (subtopicParam) {
        return await handleWordGroups(userId, subtopicParam, res);
      }
      return res.status(400).json({ error: 'subtopic query parameter required' });
    }

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'steps') {
      const wordGroupId = parseWordGroupIdQuery(req);
      if (wordGroupId == null) {
        return res.status(400).json({ error: 'word_group query parameter required' });
      }
      return await handleWordGroupSteps(userId, wordGroupId, res);
    }

    if (segments.length === 2 && segments[0] === 'word-groups') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleWordGroups(userId, segments[1], res);
    }

    if (
      segments.length === 3 &&
      segments[0] === 'word-groups' &&
      segments[2] === 'steps'
    ) {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const wordGroupId = Number(segments[1]);
      if (!Number.isFinite(wordGroupId)) {
        return res.status(400).json({ error: 'Invalid wordGroupId' });
      }
      return await handleWordGroupSteps(userId, wordGroupId, res);
    }

    if (
      segments.length === 4 &&
      segments[0] === 'word-groups' &&
      segments[2] === 'steps'
    ) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const wordGroupId = Number(segments[1]);
      if (!Number.isFinite(wordGroupId)) {
        return res.status(400).json({ error: 'Invalid wordGroupId' });
      }
      const body = parseBody(req.body);
      if (segments[3] === '1') {
        return await handlePostStep1(userId, wordGroupId, body, res);
      }
      if (segments[3] === '2') {
        return await handlePostStep2(userId, wordGroupId, body, res);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    if (segments.length === 2 && segments[0] === 'steps') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const wordGroupId = parseWordGroupIdQuery(req);
      if (wordGroupId == null) {
        return res.status(400).json({ error: 'word_group query parameter required' });
      }
      const body = parseBody(req.body);
      if (segments[1] === '1') {
        return await handlePostStep1(userId, wordGroupId, body, res);
      }
      if (segments[1] === '2') {
        return await handlePostStep2(userId, wordGroupId, body, res);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    if (segments.length === 1 && segments[0] === 'step1') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const wordGroupId = parseWordGroupIdQuery(req);
      if (wordGroupId == null) {
        return res.status(400).json({ error: 'word_group query parameter required' });
      }
      const body = parseBody(req.body);
      return await handlePostStep1(userId, wordGroupId, body, res);
    }

    if (segments.length === 1 && segments[0] === 'step2') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const wordGroupId = parseWordGroupIdQuery(req);
      if (wordGroupId == null) {
        return res.status(400).json({ error: 'word_group query parameter required' });
      }
      const body = parseBody(req.body);
      return await handlePostStep2(userId, wordGroupId, body, res);
    }

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'tasks') {
      const wordGroupId = parseWordGroupIdQuery(req);
      if (wordGroupId == null) {
        return res.status(400).json({ error: 'word_group query parameter required' });
      }
      return await handleTasks(userId, wordGroupId, res);
    }

    if (segments.length === 2 && segments[0] === 'tasks') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const wordGroupId = Number(segments[1]);
      if (!Number.isFinite(wordGroupId)) {
        return res.status(400).json({ error: 'Invalid wordGroupId' });
      }
      return await handleTasks(userId, wordGroupId, res);
    }

    if (segments.length === 1 && segments[0] === 'progress') {
      return await handleProgress(userId, req, res);
    }

    if (segments.length === 1 && segments[0] === 'flashcards-complete') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const body = parseBody(req.body);
      return await handlePostFlashcardsComplete(userId, body, res);
    }

    if (segments.length === 1 && segments[0] === 'test-finish') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const body = parseBody(req.body);
      return await handlePostTestFinish(userId, body, res);
    }

    if (segments.length === 1 && segments[0] === 'match-finish') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const body = parseBody(req.body);
      return await handlePostMatchFinish(userId, body, res);
    }

    if (segments.length === 1 && segments[0] === 'daily-word-stats') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleDailyWordStats(userId, res);
    }

    if (segments.length === 2 && segments[0] === 'match' && segments[1] === 'finish') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handlePostMatchFinish(userId, parseBody(req.body), res);
    }

    if (
      segments.length === 2 &&
      segments[0] === 'flashcards' &&
      segments[1] === 'complete'
    ) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handlePostFlashcardsComplete(userId, parseBody(req.body), res);
    }

    if (segments.length === 2 && segments[0] === 'test' && segments[1] === 'finish') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handlePostTestFinish(userId, parseBody(req.body), res);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(
      'api.vocabulary.failed',
      err,
      buildRequestLogContext('vercel', req, { segments, userId })
    );
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}
