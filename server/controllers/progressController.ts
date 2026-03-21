import type { Request, Response } from 'express';
import type { Supabase } from '../types/progress';
import * as statisticsService from '../services/statisticsService';
import * as leaderboardService from '../services/leaderboardService';

export function getLessonProgress(_supabase: Supabase) {
  return async (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'deprecated',
      message:
        'lesson_plan / task_plan olib tashlangan. Darslar: /api/lessons va /api/lesson-task-results',
    });
  };
}

export function postTaskStart(_supabase: Supabase) {
  return async (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'deprecated',
      message: 'task_plan / user_tasks olib tashlangan',
    });
  };
}

export function postTaskFinish(_supabase: Supabase) {
  return async (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'deprecated',
      message: 'task_plan / user_tasks olib tashlangan. POST /api/lesson-task-results',
    });
  };
}

export function getTaskResult(_supabase: Supabase) {
  return async (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'deprecated',
      message: 'user_tasks olib tashlangan',
    });
  };
}

export function getUserStatisticsHandler(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const stats = await statisticsService.getUserStatistics(supabase, userId);
      res.json(stats);
    } catch (e) {
      console.error('[getUserStatistics]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function getLeaderboardHandler(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const list = await leaderboardService.getLeaderboard(supabase, limit);
      res.json(list);
    } catch (e) {
      console.error('[getLeaderboard]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}
