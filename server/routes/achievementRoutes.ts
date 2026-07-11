import { Router } from 'express';
import type { DatabaseClient } from '../types/progress';
import * as achievementService from '../services/achievementService';
import {
  ACHIEVEMENTS_BY_KEY,
  ALL_ACHIEVEMENTS,
  TOTAL_ACHIEVEMENTS,
} from '../../shared/achievements.js';

/**
 * Endpoints:
 *   GET  /api/achievements       → catalog + which are unlocked + pending unlocks
 *   POST /api/achievements/check → force re-evaluate now (returns new medals)
 *   POST /api/achievements/ack   → mark pending medals as notified
 */
export function createAchievementRoutes(
  supabase: DatabaseClient,
  authenticate: (req: any, res: any, next: any) => void,
): Router {
  const router = Router();

  router.get('/achievements', authenticate, async (req: any, res: any) => {
    try {
      // Auto-evaluate on read: cheap enough and guarantees the client always
      // sees fresh medals without a second round-trip.
      await achievementService.evaluateAndUnlockAchievements(supabase, req.userId);

      const [unlocked, progress] = await Promise.all([
        achievementService.listUserAchievements(supabase, req.userId),
        achievementService.computeUserProgress(supabase, req.userId),
      ]);

      const unlockedByKey = new Map(unlocked.map((r) => [r.achievement_key, r]));

      const items = ALL_ACHIEVEMENTS.map((def) => {
        const row = unlockedByKey.get(def.key);
        const currentValue = def.kind === 'days'
          ? progress.completedDays
          : progress.wordsLearned;
        return {
          key: def.key,
          kind: def.kind,
          threshold: def.threshold,
          icon: def.icon,
          reward: def.reward,
          order: def.order,
          unlocked: Boolean(row),
          unlocked_at: row?.unlocked_at ?? null,
          notified: row?.notified ?? true,
          progress: Math.min(currentValue, def.threshold),
          progress_pct: Math.min(100, Math.round((currentValue / def.threshold) * 100)),
        };
      });

      const pending = items
        .filter((it) => it.unlocked && !it.notified)
        .map((it) => it.key);

      const unlockedCount = items.filter((it) => it.unlocked).length;

      res.json({
        items,
        total: TOTAL_ACHIEVEMENTS,
        unlocked_count: unlockedCount,
        pending,
        completed_days: progress.completedDays,
        words_learned: progress.wordsLearned,
      });
    } catch (e) {
      console.error('[GET /api/achievements]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/achievements/check', authenticate, async (req: any, res: any) => {
    try {
      const newly = await achievementService.evaluateAndUnlockAchievements(
        supabase,
        req.userId,
      );
      res.json({
        newly_unlocked: newly.map((d) => ({
          key: d.key,
          kind: d.kind,
          threshold: d.threshold,
          icon: d.icon,
          reward: d.reward,
        })),
      });
    } catch (e) {
      console.error('[POST /api/achievements/check]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/achievements/ack', authenticate, async (req: any, res: any) => {
    try {
      const rawKeys = req.body?.keys;
      const keys = Array.isArray(rawKeys)
        ? rawKeys.filter((k): k is string => typeof k === 'string' && k in ACHIEVEMENTS_BY_KEY)
        : [];
      await achievementService.markAchievementsNotified(supabase, req.userId, keys);
      res.json({ success: true, acked: keys });
    } catch (e) {
      console.error('[POST /api/achievements/ack]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
