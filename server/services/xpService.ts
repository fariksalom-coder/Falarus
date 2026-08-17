import type { DatabaseClient } from '../types/progress';
import {
  calculateTotalXp,
  levelFromXp,
  type KunlikDayRowForXp,
} from '../../shared/xpFormula.js';
import { computeActivityStreakFromDateSet } from '../../shared/activityStreakCompute.js';
import { formatDateInAppTimezone } from '../lib/appDate.js';
import * as leaderboardService from './leaderboard.service';
import * as leaderboardCache from './leaderboardCache.service';

/**
 * Fetch every input the XP formula needs and return the recomputed total.
 */
export async function computeUserXp(
  supabase: DatabaseClient,
  userId: number,
): Promise<{ total: number; streakDays: number; bestStreakDays: number; minutesToday: number }> {
  const today = formatDateInAppTimezone(new Date());

  const [kunlikRes, actRes, timeRes, userRes] = await Promise.all([
    supabase
      .from('user_kunlik_day_progress')
      // Yangi XP faqat `phrases_correct` dan — boshqa ustunlar kerak emas.
      .select('phrases_correct')
      .eq('user_id', userId),
    supabase
      .from('user_activity_dates')
      .select('activity_date')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(400),
    supabase
      .from('user_daily_time')
      .select('seconds')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .maybeSingle(),
    // Eski (2026-08-01 gacha yig'ilgan) ball — reyting shu joydan davom etadi.
    supabase.from('users').select('legacy_points').eq('id', userId).maybeSingle(),
  ]);

  const kunlikRows: KunlikDayRowForXp[] = (kunlikRes.data ?? []) as KunlikDayRowForXp[];
  const activityDates = new Set<string>(
    (actRes.data ?? []).map((r: { activity_date: string }) => r.activity_date),
  );
  const streak = computeActivityStreakFromDateSet(activityDates, formatDateInAppTimezone, new Date());
  const secondsToday = Number(timeRes.data?.seconds ?? 0);
  const minutesToday = Math.floor(secondsToday / 60);

  // Streak va vaqt endi XP bermaydi, lekin ular statistika/medallar uchun
  // qaytariladi — shuning uchun hisoblanishi davom etadi.
  //
  // MUHIM: `legacy_points` — platformada 2026-08-01 gacha yig'ilgan jami ball.
  // U MUZLATILGAN baza sifatida qo'shiladi, aks holda har qanday faoliyatdan
  // keyin qayta hisob eski natijani nolga tushirib yuborardi.
  const legacyPoints = Math.max(
    0,
    Number((userRes.data as { legacy_points?: number } | null)?.legacy_points ?? 0),
  );
  const total = legacyPoints + calculateTotalXp({ kunlikRows });

  return {
    total,
    streakDays: streak.streak_days,
    bestStreakDays: streak.best_streak_days,
    minutesToday,
  };
}

/**
 * Recompute XP for one user and persist to users.total_points +
 * best_streak_days + refresh leaderboard.
 */
export async function recomputeUserXp(
  supabase: DatabaseClient,
  userId: number,
): Promise<{ total: number; level: number }> {
  const { total, bestStreakDays } = await computeUserXp(supabase, userId);
  const { level } = levelFromXp(total);

  await supabase
    .from('users')
    .update({ total_points: total, best_streak_days: bestStreakDays })
    .eq('id', userId);

  await leaderboardService.ensureUserInLeaderboard(supabase, userId);
  await leaderboardService.updateUserPoints(supabase, userId, total);
  await leaderboardCache.invalidateLeaderboardCache();

  return { total, level };
}

/**
 * Add seconds to today's per-day time bucket (idempotent upsert) and bump
 * users.total_time_seconds. Then recompute XP so time-bonus flows through.
 */
export async function addUserTime(
  supabase: DatabaseClient,
  userId: number,
  seconds: number,
): Promise<{ todaySeconds: number; totalSeconds: number }> {
  const safe = Math.max(0, Math.min(3600, Math.floor(seconds))); // clamp per-call
  const today = formatDateInAppTimezone(new Date());

  // Read current row (if any), then upsert.
  const { data: existing } = await supabase
    .from('user_daily_time')
    .select('seconds')
    .eq('user_id', userId)
    .eq('activity_date', today)
    .maybeSingle();

  const currentToday = Number(existing?.seconds ?? 0);
  const nextToday = Math.min(86400, currentToday + safe);

  await supabase
    .from('user_daily_time')
    .upsert(
      { user_id: userId, activity_date: today, seconds: nextToday, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,activity_date' },
    );

  // Increment users.total_time_seconds
  const { data: user } = await supabase
    .from('users')
    .select('total_time_seconds')
    .eq('id', userId)
    .single();
  const currentTotal = Number(user?.total_time_seconds ?? 0);
  const nextTotal = currentTotal + safe;
  await supabase.from('users').update({ total_time_seconds: nextTotal }).eq('id', userId);

  return { todaySeconds: nextToday, totalSeconds: nextTotal };
}
