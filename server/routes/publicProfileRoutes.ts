import { Router } from 'express';
import type { DatabaseClient } from '../types/progress';
import { computeActivityStreakFromDateSet } from '../../shared/activityStreakCompute.js';
import { formatDateInAppTimezone } from '../lib/appDate.js';
import { ALL_ACHIEVEMENTS, TOTAL_ACHIEVEMENTS } from '../../shared/achievements.js';
import { levelFromXp } from '../../shared/xpFormula.js';

const HIDDEN_USER_IDS = new Set<number>([1]); // Farmon test account — hidden from public profile too.

/**
 * GET /api/users/:userId/public
 * Public-safe snapshot of a user for the "click a user in Reyting" flow.
 * Returns only fields safe to show anyone: name, avatar, points, streak, level,
 * member-since year, and the achievement catalog with unlock flags.
 */
export function createPublicProfileRoutes(
  supabase: DatabaseClient,
  authenticate: (req: any, res: any, next: any) => void,
): Router {
  const router = Router();

  router.get('/users/:userId/public', authenticate, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user id' });
      }
      if (HIDDEN_USER_IDS.has(userId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Fetch the target user
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select(
          'id, first_name, last_name, avatar_url, total_points, created_at, plan_name, plan_expires_at',
        )
        .eq('id', userId)
        .maybeSingle();
      if (userErr) throw userErr;
      if (!user) return res.status(404).json({ error: 'Not found' });

      // Streak: derive from activity dates
      const { data: activityRows } = await supabase
        .from('user_activity_dates')
        .select('activity_date')
        .eq('user_id', userId)
        .order('activity_date', { ascending: false })
        .limit(400);
      const dateSet = new Set<string>(
        (activityRows ?? []).map((r: { activity_date: string }) => r.activity_date),
      );
      const streak = computeActivityStreakFromDateSet(
        dateSet,
        formatDateInAppTimezone,
        new Date(),
      );

      // Achievements: catalog + unlock timestamps for this user
      const { data: userAch } = await supabase
        .from('user_achievements')
        .select('achievement_key, unlocked_at')
        .eq('user_id', userId);
      const unlockedByKey = new Map<string, string>(
        (userAch ?? []).map((r: { achievement_key: string; unlocked_at: string }) => [
          r.achievement_key,
          r.unlocked_at,
        ]),
      );
      const achievements = ALL_ACHIEVEMENTS.map((def) => {
        const unlockedAt = unlockedByKey.get(def.key) ?? null;
        return {
          key: def.key,
          kind: def.kind,
          threshold: def.threshold,
          icon: def.icon,
          reward: def.reward,
          order: def.order,
          unlocked: unlockedAt !== null,
          unlocked_at: unlockedAt,
        };
      });
      const unlockedCount = achievements.filter((a) => a.unlocked).length;

      // Level derived from total_points (same formula as own-profile).
      const totalPoints = Number(user.total_points ?? 0);
      const { level } = levelFromXp(totalPoints);

      // Premium status
      const planExpires = user.plan_expires_at as string | null;
      const hasPremium =
        !!planExpires && Date.parse(planExpires) > Date.now() && !!user.plan_name;

      // Member since year
      const createdYear = user.created_at
        ? new Date(user.created_at as string).getFullYear()
        : new Date().getFullYear();

      res.json({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        points: totalPoints,
        streakDays: streak.streak_days,
        bestStreakDays: streak.best_streak_days,
        level,
        hasPremium,
        memberSinceYear: createdYear,
        achievements,
        unlockedAchievementsCount: unlockedCount,
        totalAchievementsCount: TOTAL_ACHIEVEMENTS,
      });
    } catch (e) {
      console.error('[GET /api/users/:userId/public]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
