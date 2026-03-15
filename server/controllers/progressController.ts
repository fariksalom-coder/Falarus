import type { Request, Response } from 'express';
import type { Supabase } from '../types/progress';
import * as progressService from '../services/progressService';
import * as progressRepository from '../repositories/progressRepository';
import * as pointsService from '../services/pointsService';
import * as statisticsService from '../services/statisticsService';
import * as leaderboardService from '../services/leaderboardService';
import * as streakService from '../services/streakService';

export function getLessonProgress(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const lessonId = Number(req.params.id);
      const userId = (req as any).userId as number | undefined;
      if (!userId || Number.isNaN(lessonId)) {
        return res.status(400).json({ error: 'userId and lesson id required' });
      }
      const progress = await progressService.getLessonProgress(
        supabase,
        userId,
        lessonId
      );
      if (!progress) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      res.json(progress);
    } catch (e) {
      console.error('[getLessonProgress]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function postTaskStart(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number | undefined;
      const { userId: bodyUserId, taskId } = req.body || {};
      const uid = userId ?? bodyUserId;
      const taskIdNum = typeof taskId === 'number' ? taskId : Number(taskId);
      if (!uid || !taskIdNum || Number.isNaN(taskIdNum)) {
        return res
          .status(400)
          .json({ error: 'userId and taskId required (or auth + taskId in body)' });
      }
      await progressService.updateTaskStatus(
        supabase,
        Number(uid),
        taskIdNum,
        'IN_PROGRESS'
      );
      res.json({ success: true, status: 'IN_PROGRESS' });
    } catch (e) {
      console.error('[postTaskStart]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function postTaskFinish(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number | undefined;
      const {
        userId: bodyUserId,
        taskId,
        correct_answers,
        total_questions,
      } = req.body || {};
      const uid = userId ?? bodyUserId;
      const taskIdNum = typeof taskId === 'number' ? taskId : Number(taskId);
      const correct = Number(correct_answers ?? req.body?.correct_answers ?? 0);
      const total = Number(total_questions ?? req.body?.total_questions ?? 0);

      if (!uid || !taskIdNum || Number.isNaN(taskIdNum)) {
        return res
          .status(400)
          .json({ error: 'userId and taskId required in body' });
      }
      if (total <= 0) {
        return res.status(400).json({ error: 'total_questions must be > 0' });
      }

      const percentage = progressService.calculateScore(correct, total);
      const status = progressService.getTaskStatusAfterFinish(percentage);
      const points = pointsService.calculatePoints(correct);

      await progressService.updateTaskStatus(
        supabase,
        Number(uid),
        taskIdNum,
        status,
        {
          correctAnswers: correct,
          totalQuestions: total,
          percentage,
          points,
        }
      );

      await pointsService.updateUserTotalPoints(supabase, Number(uid), points);

      const taskPlan = await progressRepository.getTaskPlanById(supabase, taskIdNum);
      const lessonId = taskPlan?.lesson_id;
      if (lessonId != null) {
        await progressService.updateLessonStatus(
          supabase,
          Number(uid),
          lessonId
        );
      }

      await streakService.recordActivity(supabase, Number(uid));

      res.json({
        success: true,
        taskId: taskIdNum,
        total_questions: total,
        correct_answers: correct,
        percentage,
        points,
        status,
      });
    } catch (e) {
      console.error('[postTaskFinish]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  };
}

export function getTaskResult(supabase: Supabase) {
  return async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as number | undefined;
      const taskId = Number(req.params.taskId);
      if (!userId || Number.isNaN(taskId)) {
        return res.status(400).json({ error: 'userId (auth) and taskId required' });
      }
      const row = await progressRepository.getUserTask(supabase, userId, taskId);
      if (!row || row.status === 'NOT_STARTED') {
        return res.status(404).json({ error: 'Task result not found' });
      }
      res.json({
        taskId: row.task_id,
        total_questions: row.total_questions,
        correct_answers: row.correct_answers,
        percentage: row.percentage,
        points: row.points ?? 0,
        status: row.status,
      });
    } catch (e) {
      console.error('[getTaskResult]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
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
