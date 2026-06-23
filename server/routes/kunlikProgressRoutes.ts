import { Router } from 'express';
import type { DatabaseClient } from '../types/progress';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion.js';
import { mergeKunlikDayPatch } from '../../shared/kunlikProgressMerge.js';
import { applyKunlikDayCompletionSideEffects } from '../lib/kunlikCompletionSideEffects.js';
import { getAccessForRequest } from './accessRoutes.js';
import * as accessControlService from '../services/accessControl.service.js';

export type KunlikDayRow = {
  day_number:    number;
  grammar_1:     boolean;
  grammar_2:     boolean;
  grammar_3:     boolean;
  words_learned: number;
  words_correct: number;
  words_match:   boolean;
  oqish_done:    boolean;
  speaking_level: number;
};

export function createKunlikProgressRoutes(
  supabase: DatabaseClient,
  authenticate: (req: any, res: any, next: any) => void
): Router {
  const router = Router();

  // GET /api/daily-practice-prompt-counts → gapirish topshiriqlari soni (kun bo‘yicha), rejada «to‘liq tugagan» uchun
  router.get('/daily-practice-prompt-counts', authenticate, async (_req: any, res: any) => {
    try {
      const { data, error } = await supabase.from('daily_practice_prompts').select('day_number');
      if (error) throw error;
      const counts: Record<number, number> = {};
      for (const row of data ?? []) {
        const d = row.day_number as number;
        counts[d] = (counts[d] ?? 0) + 1;
      }
      res.json(counts);
    } catch (e) {
      console.error('[GET /api/daily-practice-prompt-counts]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/kunlik-progress  →  rows + practice_prompt_counts (bir so‘rovda — alohida endpoint ishlmasa ham gapirish sloti «0» bo‘lib qolmaydi)
  router.get('/kunlik-progress', authenticate, async (req: any, res: any) => {
    try {
      const [progressRes, promptsRes] = await Promise.all([
        supabase
          .from('user_kunlik_day_progress')
          .select(
            'day_number, grammar_1, grammar_2, grammar_3, words_learned, words_correct, words_match, oqish_done, speaking_level'
          )
          .eq('user_id', req.userId),
        supabase.from('daily_practice_prompts').select('day_number'),
      ]);

      if (progressRes.error) throw progressRes.error;
      if (promptsRes.error) throw promptsRes.error;

      const counts: Record<number, number> = {};
      for (const row of promptsRes.data ?? []) {
        const d = row.day_number as number;
        counts[d] = (counts[d] ?? 0) + 1;
      }

      res.json({ rows: progressRes.data ?? [], practice_prompt_counts: counts });
    } catch (e) {
      console.error('[GET /api/kunlik-progress]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PATCH /api/kunlik-progress/:dayNumber  →  partial upsert for one day
  router.patch('/kunlik-progress/:dayNumber', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = parseInt(req.params.dayNumber);
      if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 182) {
        return res.status(400).json({ error: 'Invalid day_number' });
      }

      const userId = Number(req.userId);
      if (!Number.isFinite(userId)) {
        return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      }
      const access = await getAccessForRequest(supabase, userId);
      if (!accessControlService.canAccessKunlikDay(dayNumber, access)) {
        return res.status(403).json({ error: 'Obuna kerak' });
      }

      const allowed: (keyof KunlikDayRow)[] = [
        'grammar_1', 'grammar_2', 'grammar_3',
        'words_learned', 'words_correct', 'words_match',
        'oqish_done', 'speaking_level',
      ];

      const patch: Partial<KunlikDayRow> = {};
      for (const key of allowed) {
        if (key in req.body) patch[key] = req.body[key] as never;
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }

      const { data: existing, error: fetchErr } = await supabase
        .from('user_kunlik_day_progress')
        .select(
          'grammar_1, grammar_2, grammar_3, words_learned, words_correct, words_match, oqish_done, speaking_level'
        )
        .eq('user_id', req.userId)
        .eq('day_number', dayNumber)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const defaults: KunlikDayRow = {
        day_number: dayNumber,
        grammar_1: false,
        grammar_2: false,
        grammar_3: false,
        words_learned: 0,
        words_correct: 0,
        words_match: false,
        oqish_done: false,
        speaking_level: 0,
      };

      const prevRow = existing
        ? ({ ...defaults, ...existing, day_number: dayNumber } satisfies KunlikDayRow)
        : defaults;

      const diff = mergeKunlikDayPatch(prevRow, patch);
      if (Object.keys(diff).length === 0) {
        return res.json({ success: true, noop: true });
      }

      const merged: KunlikDayRow = {
        ...prevRow,
        ...diff,
        day_number: dayNumber,
      };

      const { error } = await supabase.from('user_kunlik_day_progress').upsert(
        {
          user_id: req.userId,
          day_number: dayNumber,
          grammar_1: merged.grammar_1,
          grammar_2: merged.grammar_2,
          grammar_3: merged.grammar_3,
          words_learned: merged.words_learned,
          words_correct: merged.words_correct,
          words_match: merged.words_match,
          oqish_done: merged.oqish_done,
          speaking_level: merged.speaking_level,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,day_number' },
      );

      if (error) throw error;

      const { data: promptsRows, error: promptsErr } = await supabase
        .from('daily_practice_prompts')
        .select('day_number');
      if (promptsErr) throw promptsErr;
      const practicePromptCountByDay = new Map<number, number>();
      for (const row of promptsRows ?? []) {
        const d = row.day_number as number;
        practicePromptCountByDay.set(d, (practicePromptCountByDay.get(d) ?? 0) + 1);
      }

      const prevSlice = {
        day_number: dayNumber,
        grammar_1: prevRow.grammar_1,
        grammar_2: prevRow.grammar_2,
        grammar_3: prevRow.grammar_3,
        words_match: prevRow.words_match,
        oqish_done: prevRow.oqish_done,
        speaking_level: prevRow.speaking_level,
      };
      const mergedSlice = {
        day_number: dayNumber,
        grammar_1: merged.grammar_1,
        grammar_2: merged.grammar_2,
        grammar_3: merged.grammar_3,
        words_match: merged.words_match,
        oqish_done: merged.oqish_done,
        speaking_level: merged.speaking_level,
      };

      const wasFullyComplete = isKunlikDayRowFullyComplete(prevSlice, practicePromptCountByDay);
      const nowFullyComplete = isKunlikDayRowFullyComplete(mergedSlice, practicePromptCountByDay);
      await applyKunlikDayCompletionSideEffects(supabase, req.userId, wasFullyComplete, nowFullyComplete);

      res.json({ success: true });
    } catch (e) {
      console.error('[PATCH /api/kunlik-progress/:dayNumber]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
