import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion.js';
import { recordUserActivityDate } from './activityStreak.js';
import { incrementCourseDailyActivityCount } from './courseDailyActivity.js';
import { parseBody } from './request.js';
import { supabase } from './supabase.js';

type KunlikPatchable = {
  grammar_1?: boolean;
  grammar_2?: boolean;
  grammar_3?: boolean;
  words_learned?: number;
  words_correct?: number;
  words_match?: boolean;
  oqish_done?: boolean;
  speaking_level?: number;
};

export async function handleKunlikProgressRequest(
  req: VercelRequest,
  res: VercelResponse,
  userId: number,
  pathTail: string[],
): Promise<VercelResponse> {
  if (pathTail.length === 0 && req.method === 'GET') {
    try {
      const [progressRes, promptsRes] = await Promise.all([
        supabase
          .from('user_kunlik_day_progress')
          .select(
            'day_number, grammar_1, grammar_2, grammar_3, words_learned, words_correct, words_match, oqish_done, speaking_level',
          )
          .eq('user_id', userId),
        supabase.from('daily_practice_prompts').select('day_number'),
      ]);
      if (progressRes.error) throw progressRes.error;
      if (promptsRes.error) throw promptsRes.error;
      const counts: Record<number, number> = {};
      for (const row of promptsRes.data ?? []) {
        const d = row.day_number as number;
        counts[d] = (counts[d] ?? 0) + 1;
      }
      return res.status(200).json({
        rows: progressRes.data ?? [],
        practice_prompt_counts: counts,
      });
    } catch (e) {
      console.error('[GET /api/kunlik-progress]', e);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (pathTail.length === 1 && req.method === 'PATCH') {
    const dayNumber = parseInt(pathTail[0], 10);
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 182) {
      return res.status(400).json({ error: 'Invalid day_number' });
    }

    const allowed = [
      'grammar_1',
      'grammar_2',
      'grammar_3',
      'words_learned',
      'words_correct',
      'words_match',
      'oqish_done',
      'speaking_level',
    ] as const;

    try {
      const body = parseBody(req.body) as Record<string, unknown>;
      const patch: KunlikPatchable = {};
      for (const key of allowed) {
        if (key in body) (patch as Record<string, unknown>)[key] = body[key];
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }

      const { data: existing, error: fetchErr } = await supabase
        .from('user_kunlik_day_progress')
        .select(
          'grammar_1, grammar_2, grammar_3, words_learned, words_correct, words_match, oqish_done, speaking_level',
        )
        .eq('user_id', userId)
        .eq('day_number', dayNumber)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const defaults = {
        grammar_1: false,
        grammar_2: false,
        grammar_3: false,
        words_learned: 0,
        words_correct: 0,
        words_match: false,
        oqish_done: false,
        speaking_level: 0,
      };

      const prevRow = existing ? { ...defaults, ...existing } : defaults;
      const merged = { ...prevRow, ...patch };

      const { error } = await supabase.from('user_kunlik_day_progress').upsert(
        {
          user_id: userId,
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
      const counts: Record<number, number> = {};
      for (const row of promptsRows ?? []) {
        const d = row.day_number as number;
        counts[d] = (counts[d] ?? 0) + 1;
      }

      const prevSlice = {
        day_number: dayNumber,
        grammar_1: !!prevRow.grammar_1,
        grammar_2: !!prevRow.grammar_2,
        grammar_3: !!prevRow.grammar_3,
        words_match: !!prevRow.words_match,
        oqish_done: !!prevRow.oqish_done,
        speaking_level: prevRow.speaking_level as number,
      };
      const mergedSlice = {
        day_number: dayNumber,
        grammar_1: !!merged.grammar_1,
        grammar_2: !!merged.grammar_2,
        grammar_3: !!merged.grammar_3,
        words_match: !!merged.words_match,
        oqish_done: !!merged.oqish_done,
        speaking_level: merged.speaking_level as number,
      };

      const wasFullyComplete = isKunlikDayRowFullyComplete(prevSlice, counts);
      const nowFullyComplete = isKunlikDayRowFullyComplete(mergedSlice, counts);
      if (nowFullyComplete) {
        await recordUserActivityDate(userId);
        if (!wasFullyComplete) await incrementCourseDailyActivityCount(userId);
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error('[PATCH /api/kunlik-progress/:dayNumber]', e);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
