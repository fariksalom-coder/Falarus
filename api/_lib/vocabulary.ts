import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './supabase.js';
import { parseBody } from './request.js';
import * as vocabularyProgressService from '../../server/services/vocabularyProgress.service.js';
import * as matchPairsService from '../../server/services/matchPairs.service.js';
import * as flashcardsService from '../../server/services/flashcards.service.js';
import * as vocabularyTestService from '../../server/services/vocabularyTest.service.js';
import {
  applySubtopicsLock,
  canAccessSubtopic,
  getSubtopicPreview,
} from '../../server/services/accessControl.service.js';
import { getAccessInfo } from '../../server/services/subscription.service.js';
import { getUserVocabularyStep2DailyStats } from '../../server/repositories/vocabularyRepository.js';
import { buildRequestLogContext, logError } from '../../server/lib/logger.js';

async function handleVocabularyRootGet(userId: number, res: VercelResponse) {
  const { data: words, error } = await supabase
    .from('vocabulary')
    .select(
      'id, user_id, word_ru, translation_uz, example_ru, learned, repetition_stage, next_review, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json(words ?? []);
}

async function handleVocabularyRootPost(
  userId: number,
  req: VercelRequest,
  res: VercelResponse
) {
  const body = parseBody(req.body);
  const word_ru = body.word_ru as string | undefined;
  const translation_uz = body.translation_uz as string | undefined;
  const example_ru = body.example_ru as string | undefined;
  const { error } = await supabase.from('vocabulary').insert({
    user_id: userId,
    word_ru: word_ru ?? '',
    translation_uz: translation_uz ?? '',
    example_ru: example_ru ?? '',
  });
  if (error) {
    return res.status(500).json({ error: error.message });
  }
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

async function getUserTopicProgress(userId: number) {
  const { data, error } = await supabase
    .from('user_topic_progress')
    .select('topic_id, learned_words, total_words, progress_percent')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as {
    topic_id: string;
    learned_words: number;
    total_words: number;
    progress_percent: number;
  }[];
}

async function getSubtopicsByTopic(topicId: string) {
  const { data, error } = await supabase
    .from('vocabulary_subtopics')
    .select('id, topic_id, title')
    .eq('topic_id', topicId)
    .order('id');
  if (error) throw error;
  return (data ?? []) as { id: string; topic_id: string; title: string }[];
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
    .select('id, total_words')
    .eq('id', wordGroupId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: number; total_words: number };
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
  const ids = subtopics.map((subtopic) => subtopic.id);
  const { data, error } = await supabase
    .from('user_subtopic_progress')
    .select('subtopic_id, learned_words, total_words, progress_percent')
    .eq('user_id', userId)
    .in('subtopic_id', ids);
  if (error) throw error;
  return (data ?? []) as {
    subtopic_id: string;
    learned_words: number;
    total_words: number;
    progress_percent: number;
  }[];
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

async function handleSubtopicPreview(subtopicId: string, res: VercelResponse) {
  const preview = await getSubtopicPreview(supabase, subtopicId);
  if (!preview) {
    return res.status(404).json({ error: 'Subtopic topilmadi' });
  }
  return res.status(200).json(preview);
}

async function handleWordGroups(
  userId: number,
  subtopicId: string,
  res: VercelResponse
) {
  const { data: subtopic, error: subErr } = await supabase
    .from('vocabulary_subtopics')
    .select('topic_id')
    .eq('id', subtopicId)
    .maybeSingle();
  if (subErr) {
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }

  const topicId = (subtopic as { topic_id?: string } | null)?.topic_id ?? '';
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
    const state = await vocabularyProgressService.saveStep1Result(
      supabase,
      userId,
      wordGroupId,
      {
        known: Number(body.known ?? 0),
        unknown: Number(body.unknown ?? 0),
      }
    );
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
    const state = await vocabularyProgressService.saveStep2Result(
      supabase,
      userId,
      wordGroupId,
      {
        correct: Math.max(0, Number(body.correct ?? 0)),
        incorrect: Math.max(0, Number(body.incorrect ?? 0)),
        totalQuestions:
          body.totalQuestions != null ? Number(body.totalQuestions) : undefined,
      }
    );
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
    const result = await matchPairsService.finishMatch(
      supabase,
      userId,
      wordGroupId,
      correctPairs
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
    const result = await flashcardsService.completeFlashcards(
      supabase,
      userId,
      wordGroupId
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
    const result = await vocabularyTestService.finishTest(
      supabase,
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
  const stats = await getUserVocabularyStep2DailyStats(supabase, userId);
  return res.status(200).json(stats);
}

async function handleProgress(
  userId: number,
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'GET') {
    const { data: rows, error } = await supabase
      .from('vocabulary_progress')
      .select(
        'topic_id, subtopic_id, part_id, result_count, stage_cards, stage_test, stage_pairs'
      )
      .eq('user_id', userId);
    if (error) throw error;
    return res.status(200).json(rows ?? []);
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
    const row: Record<string, unknown> = {
      user_id: userId,
      topic_id: topicId,
      subtopic_id: subtopicId,
      part_id: partId,
      result_count: typeof body.result_count === 'number' ? body.result_count : 0,
      updated_at: new Date().toISOString(),
    };
    if (body.stage_cards !== undefined) row.stage_cards = body.stage_cards;
    if (body.stage_test !== undefined) row.stage_test = body.stage_test;
    if (body.stage_pairs !== undefined) row.stage_pairs = body.stage_pairs;
    const { error } = await supabase.from('vocabulary_progress').upsert(row, {
      onConflict: 'user_id,topic_id,subtopic_id,part_id',
    });
    if (error) throw error;
    return res.status(200).json({ success: true });
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

    if (segments.length === 2 && segments[0] === 'subtopics') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return await handleSubtopics(userId, segments[1], res);
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
