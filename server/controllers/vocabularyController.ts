import type { Request, Response } from 'express';
import type { Supabase } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository';
import * as flashcardsService from '../services/flashcards.service';
import * as vocabularyTestService from '../services/vocabularyTest.service';
import * as matchPairsService from '../services/matchPairs.service';
import * as vocabularyProgressService from '../services/vocabularyProgress.service';
import * as streakService from '../services/streakService';
import * as accessControlService from '../services/accessControl.service';
import * as subscriptionService from '../services/subscription.service';
import * as redis from '../lib/redis';

function getUserId(req: Request): number | null {
  const raw = (req as any).userId;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function getTopics(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const cached = await redis.getCached<any[]>(redis.cacheKeyTopics(userId));
      if (cached != null) return res.json(cached);
      const topics = await repo.getTopics(supabase);
      const progressRows = await repo.getUserTopicProgress(supabase, userId);
      const progressByTopic = Object.fromEntries(
        progressRows.map((p) => [p.topic_id, { learned_words: p.learned_words, total_words: p.total_words, progress_percent: p.progress_percent }])
      );
      const list = await Promise.all(
        topics.map(async (t) => {
          const prog = progressByTopic[t.id];
          const total_words = prog?.total_words ?? (await repo.getTopicTotalWords(supabase, t.id));
          return {
            id: t.id,
            title: t.title,
            learned_words: prog?.learned_words ?? 0,
            total_words,
            progress_percent: prog?.progress_percent ?? (total_words ? 0 : 0),
          };
        })
      );
      await redis.setCached(redis.cacheKeyTopics(userId), list);
      res.json(list);
    } catch (e) {
      console.error('[vocabulary/getTopics]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function getSubtopics(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const topicId = req.params.topicId as string;
      const [access, cached] = await Promise.all([
        subscriptionService.getAccessInfo(supabase, userId),
        redis.getCached<any[]>(redis.cacheKeySubtopics(userId, topicId)),
      ]);
      let list: any[];
      if (cached != null) {
        list = cached;
      } else {
        const subtopics = await repo.getSubtopicsByTopic(supabase, topicId);
        const [progressRows, totalWordsBySubtopic] = await Promise.all([
          repo.getUserSubtopicProgress(supabase, userId, topicId),
          repo.getTotalWordsBySubtopicIds(supabase, subtopics.map((s) => s.id)),
        ]);
        const progressBySubtopic = Object.fromEntries(
          progressRows.map((p) => [p.subtopic_id, { learned_words: p.learned_words, total_words: p.total_words, progress_percent: p.progress_percent }])
        );
        list = subtopics.map((s) => {
          const prog = progressBySubtopic[s.id];
          const total_words = prog?.total_words ?? totalWordsBySubtopic[s.id] ?? 0;
          return {
            id: s.id,
            slug: s.slug,
            topic_id: s.topic_id,
            title: s.title,
            learned_words: prog?.learned_words ?? 0,
            total_words,
            progress_percent: prog?.progress_percent ?? (total_words ? 0 : 0),
          };
        });
        await redis.setCached(redis.cacheKeySubtopics(userId, topicId), list);
      }
      const withLock = accessControlService.applySubtopicsLock(list, topicId, access);
      res.json(withLock);
    } catch (e) {
      console.error('[vocabulary/getSubtopics]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

async function sendSubtopicPreviewJson(
  supabase: Supabase,
  param: string,
  res: Response
) {
  const resolved = await repo.resolveSubtopicFromPathParam(supabase, param);
  if (!resolved) return res.status(404).json({ error: 'Subtopic topilmadi' });
  const preview = await accessControlService.getSubtopicPreview(supabase, resolved.id);
  if (!preview) return res.status(404).json({ error: 'Subtopic topilmadi' });
  res.json(preview);
}

export function getSubtopicPreview(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      await sendSubtopicPreviewJson(supabase, req.params.subtopicId as string, res);
    } catch (e) {
      console.error('[vocabulary/getSubtopicPreview]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

/** Query form avoids `/subtopic/:id/preview` depth issues on some hosts. */
export function getSubtopicPreviewQuery(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const raw = req.query.subtopic ?? req.query.subtopic_id;
      const s = Array.isArray(raw) ? raw[0] : raw;
      const param = typeof s === 'string' ? s.trim() : '';
      if (!param) {
        return res.status(400).json({ error: 'subtopic query parameter required' });
      }
      await sendSubtopicPreviewJson(supabase, param, res);
    } catch (e) {
      console.error('[vocabulary/getSubtopicPreviewQuery]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function getWordGroups(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const subtopicSlug = req.params.subtopicId as string;
      let subtopic: { id: string; topic_id: string };
      try {
        const resolved = await repo.resolveSubtopicFromPathParam(supabase, subtopicSlug);
        if (!resolved) {
          const normalized = repo.normalizeVocabularySubtopicParam(subtopicSlug);
          return res.status(404).json({
            error: 'Subtopic not found',
            code: 'SUBTOPIC_NOT_FOUND',
            param: normalized || subtopicSlug,
            hint:
              'No vocabulary_subtopics row for this slug/id — seed DB or check Supabase project linked to this server.',
          });
        }
        subtopic = resolved;
      } catch (e) {
        console.error('[vocabulary/getWordGroups] subtopic fetch', e);
        return res.status(500).json({ error: 'Xatolik yuz berdi' });
      }
      const subtopicId = subtopic.id;
      const access = await subscriptionService.getAccessInfo(supabase, userId);
      const topicId = subtopic.topic_id ?? '';
      const allowed =
        accessControlService.canAccessSubtopic(topicId, subtopicId, access) ||
        (!access.subscription_active && String(subtopicId) === 'salomlashish-xayrlashish-odob');
      if (!allowed) {
        return res.status(403).json({ error: 'locked', message: 'Ushbu mavzu uchun tarif kerak' });
      }
      const cached = await redis.getCached<any[]>(redis.cacheKeyWordGroups(userId, subtopicId));
      if (cached != null) return res.json(cached);
      const { groups, progressByGroup } = await repo.getUserWordGroupProgress(supabase, userId, subtopicId);
      const list = groups.map((g) => {
        const p = progressByGroup[g.id];
        return {
          id: g.id,
          subtopic_id: g.subtopic_id,
          part_id: g.part_id,
          title: g.title,
          total_words: g.total_words,
          learned_words: p?.learned_words ?? 0,
          progress_percent: p?.progress_percent ?? 0,
          flashcards_completed: p?.flashcards_completed ?? false,
          test_best_correct: p?.test_best_correct ?? 0,
          match_completed: p?.match_completed ?? false,
        };
      });
      await redis.setCached(redis.cacheKeyWordGroups(userId, subtopicId), list);
      res.json(list);
    } catch (e) {
      console.error('[vocabulary/getWordGroups]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function getTasks(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const wordGroupId = Number(req.params.wordGroupId);
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'wordGroupId required' });
      }
      const access = await subscriptionService.getAccessInfo(supabase, userId);
      const status = await vocabularyProgressService.getTasksStatus(supabase, userId, wordGroupId, access);
      if (!status) return res.status(404).json({ error: 'Word group not found' });
      res.json({
        flashcards_status: status.flashcards_status,
        test_status: status.test_status,
        match_status: status.match_status,
        learned_words: status.learned_words,
        total_words: status.total_words,
        test_best_correct: status.test_best_correct,
        match_unlocked: status.match_unlocked,
      });
    } catch (e) {
      console.error('[vocabulary/getTasks]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function getWords(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const wordGroupId = Number(req.params.wordGroupId);
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'wordGroupId required' });
      }
      const words = await repo.getWordsByWordGroup(supabase, wordGroupId);
      res.json(words.map((w) => ({ id: w.id, word: w.word, translation: w.translation })));
    } catch (e) {
      console.error('[vocabulary/getWords]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function postFlashcardsComplete(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const wordGroupId = Number(req.body?.word_group_id ?? req.body?.wordGroupId);
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'word_group_id required' });
      }
      await flashcardsService.completeFlashcards(supabase, userId, wordGroupId);
      await redis.invalidateUserVocabularyCache(userId);
      await streakService.recordActivity(supabase, userId);
      res.json({ success: true });
    } catch (e) {
      console.error('[vocabulary/flashcards/complete]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik yuz berdi' });
    }
  };
}

export function postTestFinish(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const wordGroupId = Number(req.body?.word_group_id ?? req.body?.wordGroupId);
      const correctAnswers = Number(req.body?.correct_answers ?? req.body?.correctAnswers ?? 0);
      const totalQuestions = Number(req.body?.total_questions ?? req.body?.totalQuestions ?? 0);
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'word_group_id required' });
      }
      const result = await vocabularyTestService.finishTest(
        supabase,
        userId,
        wordGroupId,
        correctAnswers,
        totalQuestions
      );
      await redis.invalidateUserVocabularyCache(userId);
      await streakService.recordActivity(supabase, userId);
      res.json(result);
    } catch (e) {
      console.error('[vocabulary/test/finish]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik yuz berdi' });
    }
  };
}

export function postMatchFinish(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const wordGroupId = Number(req.body?.word_group_id ?? req.body?.wordGroupId);
      const correctPairs = Math.max(0, Math.floor(Number(req.body?.correct_pairs ?? req.body?.correctPairs ?? 0)));
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'word_group_id required' });
      }
      const result = await matchPairsService.finishMatch(supabase, userId, wordGroupId, correctPairs);
      await redis.invalidateUserVocabularyCache(userId);
      await streakService.recordActivity(supabase, userId);
      res.json(result);
    } catch (e) {
      console.error('[vocabulary/match/finish]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik yuz berdi' });
    }
  };
}

export function getWordGroupStepsState(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const wordGroupId = Number(req.params.wordGroupId);
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'wordGroupId required' });
      }
      const state = await vocabularyProgressService.getWordGroupStepsState(
        supabase,
        userId,
        wordGroupId
      );
      res.json(state);
    } catch (e) {
      console.error('[vocabulary/steps/state]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik yuz berdi' });
    }
  };
}

export function postStep1Result(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const wordGroupId = Number(req.params.wordGroupId);
      const known = Number(req.body?.known ?? 0);
      const unknown = Number(req.body?.unknown ?? 0);
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'wordGroupId required' });
      }
      if (known < 0 || unknown < 0) {
        return res.status(400).json({ error: 'known and unknown must be >= 0' });
      }
      const state = await vocabularyProgressService.saveStep1Result(
        supabase,
        userId,
        wordGroupId,
        { known, unknown }
      );
      await redis.invalidateUserVocabularyCache(userId);
      await streakService.recordActivity(supabase, userId);
      res.json(state);
    } catch (e) {
      console.error('[vocabulary/steps/1]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik yuz berdi' });
    }
  };
}

export function postStep2Result(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      const wordGroupId = Number(req.params.wordGroupId);
      const correct = Number(req.body?.correct ?? 0);
      const incorrect = Number(req.body?.incorrect ?? 0);
      const totalQuestions = req.body?.totalQuestions != null ? Number(req.body.totalQuestions) : undefined;
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'wordGroupId required' });
      }
      if (correct < 0 || incorrect < 0) {
        return res.status(400).json({ error: 'correct and incorrect must be >= 0' });
      }
      const state = await vocabularyProgressService.saveStep2Result(
        supabase,
        userId,
        wordGroupId,
        { correct, incorrect, totalQuestions }
      );
      await redis.invalidateUserVocabularyCache(userId);
      await streakService.recordActivity(supabase, userId);
      res.json(state);
    } catch (e) {
      console.error('[vocabulary/steps/2]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik yuz berdi' });
    }
  };
}

export function getVocabularyDailyWordStats(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (userId == null) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });

      const stats = await repo.getUserVocabularyStep2DailyStats(supabase, userId);
      res.json(stats);
    } catch (e) {
      console.error('[vocabulary/daily-word-stats]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}
