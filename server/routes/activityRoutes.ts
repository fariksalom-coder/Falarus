import { Router } from 'express';
import type { Supabase } from '../types/progress';
import * as streakService from '../services/streakService';

export function createActivityRoutes(
  supabase: Supabase,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  router.post('/activity', authenticate, async (req: any, res: any) => {
    try {
      await streakService.recordActivity(supabase, req.userId);
      res.json({ success: true });
    } catch (e) {
      console.error('[POST /api/activity]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  const getStreakHandler = async (req: any, res: any) => {
    try {
      const result = await streakService.getStreak(supabase, req.userId);
      res.json(result);
    } catch (e) {
      console.error('[GET /api/activity/streak]', e);
      res.status(500).json({ error: 'Server error' });
    }
  };
  router.get('/activity/streak', authenticate, getStreakHandler);
  /** Same payload as Vercel `api/streak.ts` (frontend uses /api/streak). */
  router.get('/streak', authenticate, getStreakHandler);

  return router;
}
