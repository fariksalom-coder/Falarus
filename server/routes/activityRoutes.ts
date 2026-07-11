import { Router } from 'express';
import type { DatabaseClient } from '../types/progress';
import * as streakService from '../services/streakService';
import * as xpService from '../services/xpService';
import * as achievementService from '../services/achievementService';
import { formatDateInAppTimezone } from '../lib/appDate.js';
import { levelFromXp } from '../../shared/xpFormula.js';

export function createActivityRoutes(
  supabase: DatabaseClient,
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

  /**
   * POST /api/activity/heartbeat  body: { seconds?: number }
   * Called by the client every 60s while the tab is active.
   * Adds `seconds` (default 60, clamped 0..300 to defend against replay) to
   * `user_daily_time` + `users.total_time_seconds`, then recomputes XP.
   */
  router.post('/activity/heartbeat', authenticate, async (req: any, res: any) => {
    try {
      const raw = Number(req.body?.seconds ?? 60);
      const seconds = Number.isFinite(raw) ? Math.max(0, Math.min(300, Math.floor(raw))) : 60;
      // Also mark today active so streak reflects presence, not just point-earning.
      await streakService.recordActivity(supabase, req.userId).catch(() => {});
      const bucket = await xpService.addUserTime(supabase, req.userId, seconds);
      const recompute = await xpService.recomputeUserXp(supabase, req.userId);
      // Streak may have grown → check for medal unlocks. Fire-and-forget so a
      // slow achievement query never blocks the heartbeat response.
      achievementService
        .evaluateAndUnlockAchievements(supabase, req.userId)
        .catch((e) => console.warn('[heartbeat] achievement check failed', e));
      res.json({
        today_seconds: bucket.todaySeconds,
        total_seconds: bucket.totalSeconds,
        total_points: recompute.total,
        level: recompute.level,
      });
    } catch (e) {
      console.error('[POST /api/activity/heartbeat]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  const getStreakHandler = async (req: any, res: any) => {
    try {
      const result = await streakService.getStreak(supabase, req.userId);
      // Attach time totals so the client can render O'qish vaqti / Umumiy vaqt
      // without a second round-trip.
      const today = formatDateInAppTimezone(new Date());
      const [{ data: todayRow }, { data: userRow }] = await Promise.all([
        supabase
          .from('user_daily_time')
          .select('seconds')
          .eq('user_id', req.userId)
          .eq('activity_date', today)
          .maybeSingle(),
        supabase
          .from('users')
          .select('total_time_seconds, total_points, best_streak_days')
          .eq('id', req.userId)
          .single(),
      ]);
      const totalPoints = Number(userRow?.total_points ?? 0);
      const { level } = levelFromXp(totalPoints);
      res.json({
        ...result,
        // Fall back to the freshly-computed best if the cached column is missing/older.
        best_streak_days: Math.max(result.best_streak_days ?? 0, Number(userRow?.best_streak_days ?? 0)),
        today_seconds: Number(todayRow?.seconds ?? 0),
        total_seconds: Number(userRow?.total_time_seconds ?? 0),
        total_points: totalPoints,
        level,
      });
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
