import { Router } from 'express';
import type { DatabaseClient } from '../types/progress';
import { formatDateInAppTimezone } from '../lib/appDate.js';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion.js';

const TOTAL_COURSE_DAYS = 182;

export function createStatsRoutes(
  supabase: DatabaseClient,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  // GET /api/stats/course-progress — yakunlangan kunlar soni faqat kunlik DB bo‘yicha (har bir kun alohida row)
  router.get('/stats/course-progress', authenticate, async (req: any, res: any) => {
    try {
      const [{ data, error }, promptsRes] = await Promise.all([
        supabase
          .from('user_kunlik_day_progress')
          .select(
            'day_number, grammar_1, grammar_2, grammar_3, words_match, oqish_done, speaking_level',
          )
          .eq('user_id', req.userId),
        supabase.from('daily_practice_prompts').select('day_number'),
      ]);

      if (error) throw error;
      if (promptsRes.error) throw promptsRes.error;

      const practicePromptCountByDay = new Map<number, number>();
      for (const row of promptsRes.data ?? []) {
        const d = row.day_number as number;
        practicePromptCountByDay.set(d, (practicePromptCountByDay.get(d) ?? 0) + 1);
      }

      const completed = (data ?? []).filter((r) =>
        isKunlikDayRowFullyComplete(
          {
            day_number: r.day_number as number,
            grammar_1: !!r.grammar_1,
            grammar_2: !!r.grammar_2,
            grammar_3: !!r.grammar_3,
            words_match: !!r.words_match,
            oqish_done: !!r.oqish_done,
            speaking_level: r.speaking_level as number | null | undefined,
          },
          practicePromptCountByDay,
        ),
      ).length;

      const capped = Math.min(completed, TOTAL_COURSE_DAYS);
      const pct = Math.round((capped / TOTAL_COURSE_DAYS) * 100);

      res.json({ completed_days: capped, total_days: TOTAL_COURSE_DAYS, pct });
    } catch (e) {
      console.error('[GET /api/stats/course-progress]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/stats/record-course-day — called when a kunlik reja day is completed
  router.post('/stats/record-course-day', authenticate, async (req: any, res: any) => {
    try {
      const today = formatDateInAppTimezone(new Date());

      const { data: existing } = await supabase
        .from('user_course_daily_activity')
        .select('course_days_completed')
        .eq('user_id', req.userId)
        .eq('activity_date', today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_course_daily_activity')
          .update({ course_days_completed: existing.course_days_completed + 1 })
          .eq('user_id', req.userId)
          .eq('activity_date', today);
      } else {
        await supabase
          .from('user_course_daily_activity')
          .insert({ user_id: req.userId, activity_date: today, course_days_completed: 1 });
      }

      res.json({ success: true });
    } catch (e) {
      console.error('[POST /api/stats/record-course-day]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/stats/activity-calendar?year=YYYY&month=MM
  router.get('/stats/activity-calendar', authenticate, async (req: any, res: any) => {
    try {
      const now = new Date();
      const year = parseInt(req.query.year as string) || now.getFullYear();
      const month = parseInt(req.query.month as string) || now.getMonth() + 1;

      const pad = (n: number) => String(n).padStart(2, '0');
      const startDate = `${year}-${pad(month)}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;
      const today = formatDateInAppTimezone(now);

      const [{ data: actDates }, { data: courseAct }, { data: firstRow }] = await Promise.all([
        supabase
          .from('user_activity_dates')
          .select('activity_date')
          .eq('user_id', req.userId)
          .gte('activity_date', startDate)
          .lte('activity_date', endDate),
        supabase
          .from('user_course_daily_activity')
          .select('activity_date, course_days_completed')
          .eq('user_id', req.userId)
          .gte('activity_date', startDate)
          .lte('activity_date', endDate),
        supabase
          .from('user_activity_dates')
          .select('activity_date')
          .eq('user_id', req.userId)
          .order('activity_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const activeSet = new Set((actDates ?? []).map((r) => r.activity_date as string));
      const courseMap = new Map(
        (courseAct ?? []).map((r) => [r.activity_date as string, r.course_days_completed as number])
      );
      const firstDate: string = (firstRow as any)?.activity_date ?? today;

      const days = [];
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${pad(month)}-${pad(d)}`;
        const extraDays = courseMap.get(dateStr) ?? 0;
        /** Taqvimda ko‘rinishi: streak sanalari yoki kunlik tugatilgan kunlar hisobi */
        const isActive = activeSet.has(dateStr) || extraDays > 0;

        let status: string;
        if (dateStr > today) {
          status = 'future';
        } else if (dateStr === today) {
          status = isActive ? 'done' : 'today';
        } else if (isActive) {
          status = extraDays > 1 ? 'extra' : 'done';
        } else if (dateStr >= firstDate) {
          status = 'missed';
        } else {
          status = 'none';
        }

        days.push({ date: dateStr, status, extra_days: extraDays });
      }

      res.json({ year, month, days });
    } catch (e) {
      console.error('[GET /api/stats/activity-calendar]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
