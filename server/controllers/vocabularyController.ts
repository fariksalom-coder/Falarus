import type { Request, Response } from 'express';
import type { Supabase } from '../types/vocabulary';
import * as repo from '../repositories/vocabularyRepository';
import * as flashcardsService from '../services/flashcards.service';
import * as vocabularyTestService from '../services/vocabularyTest.service';
import * as matchPairsService from '../services/matchPairs.service';
import * as vocabularyProgressService from '../services/vocabularyProgress.service';
import * as streakService from '../services/streakService';
import * as redis from '../lib/redis';

export function getTopics(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number;
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
      const userId = (req as any).userId as number;
      const topicId = req.params.topicId as string;
      const cached = await redis.getCached<any[]>(redis.cacheKeySubtopics(userId, topicId));
      if (cached != null) return res.json(cached);
      const subtopics = await repo.getSubtopicsByTopic(supabase, topicId);
      const progressRows = await repo.getUserSubtopicProgress(supabase, userId, topicId);
      const progressBySubtopic = Object.fromEntries(
        progressRows.map((p) => [p.subtopic_id, { learned_words: p.learned_words, total_words: p.total_words, progress_percent: p.progress_percent }])
      );
      const list = await Promise.all(
        subtopics.map(async (s) => {
          const prog = progressBySubtopic[s.id];
          const total_words = prog?.total_words ?? (await repo.getSubtopicTotalWords(supabase, s.id));
          return {
            id: s.id,
            topic_id: s.topic_id,
            title: s.title,
            learned_words: prog?.learned_words ?? 0,
            total_words,
            progress_percent: prog?.progress_percent ?? (total_words ? 0 : 0),
          };
        })
      );
      await redis.setCached(redis.cacheKeySubtopics(userId, topicId), list);
      res.json(list);
    } catch (e) {
      console.error('[vocabulary/getSubtopics]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function getWordGroups(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number;
      const subtopicId = req.params.subtopicId as string;
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
      const userId = (req as any).userId as number;
      const wordGroupId = Number(req.params.wordGroupId);
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'wordGroupId required' });
      }
      const status = await vocabularyProgressService.getTasksStatus(supabase, userId, wordGroupId);
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
      const userId = (req as any).userId as number;
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
      const userId = (req as any).userId as number;
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
      const userId = (req as any).userId as number;
      const wordGroupId = Number(req.body?.word_group_id ?? req.body?.wordGroupId);
      const pointsAwarded = Math.max(0, Number(req.body?.points ?? req.body?.points_awarded ?? 0));
      if (Number.isNaN(wordGroupId)) {
        return res.status(400).json({ error: 'word_group_id required' });
      }
      const result = await matchPairsService.finishMatch(supabase, userId, wordGroupId, pointsAwarded);
      await redis.invalidateUserVocabularyCache(userId);
      await streakService.recordActivity(supabase, userId);
      res.json(result);
    } catch (e) {
      console.error('[vocabulary/match/finish]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik yuz berdi' });
    }
  };
}
