import { Router } from 'express';
import type { DatabaseClient } from '../types/progress';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion.js';
import { mergeKunlikDayPatch } from '../../shared/kunlikProgressMerge.js';
import { applyKunlikDayCompletionSideEffects } from '../lib/kunlikCompletionSideEffects.js';
import { READING_QUESTIONS_PASS_PERCENT } from '../../shared/dailyCourseDay.js';
import { getAccessForRequest } from './accessRoutes.js';
import * as accessControlService from '../services/accessControl.service.js';

export type KunlikDayRow = {
  day_number:    number;
  grammar_1:     boolean;
  grammar_2:     boolean;
  grammar_3:     boolean;
  /** Grammatika testidagi to'g'ri javoblar soni — har biri 1 XP. */
  grammar_correct: number;
  words_learned: number;
  words_correct: number;
  words_match:   boolean;
  /** Lug'atning 4-vazifasi: ibora testlari (kun mezoniga kirmaydi). */
  phrases_done:  boolean;
  /** Iboralarda to'g'ri javoblar soni — har biri 1 XP. */
  phrases_correct: number;
  /** Matn savollaridagi eng yaxshi natija (XP bermaydi, 70% chegarasi uchun). */
  text_questions_correct: number;
  /** Gapirish testidan keyingi qo'shimcha topshiriqlardan nechtasi bajarilgan. */
  speaking_tasks_done: number;
  oqish_done:    boolean;
  /** 5-blok: ustoz bilan jonli savol-javob. */
  suhbat_done:   boolean;
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
      const [progressRes, promptsRes, speakingTasksRes] = await Promise.all([
        supabase
          .from('user_kunlik_day_progress')
          .select(
            'day_number, grammar_1, grammar_2, grammar_3, grammar_correct, words_learned, words_correct, words_match, phrases_done, phrases_correct, text_questions_correct, speaking_tasks_done, oqish_done, suhbat_done, speaking_level'
          )
          .eq('user_id', req.userId),
        supabase.from('daily_practice_prompts').select('day_number'),
        // Gapirish testidan keyingi qo'shimcha topshiriqlar — bosh sahifadagi
        // blok faqat kontenti bor kunlarda ko'rinishi uchun.
        supabase.from('daily_speaking_tasks').select('day_number'),
      ]);

      if (progressRes.error) throw progressRes.error;
      if (promptsRes.error) throw promptsRes.error;
      if (speakingTasksRes.error) throw speakingTasksRes.error;

      const counts: Record<number, number> = {};
      for (const row of promptsRes.data ?? []) {
        const d = row.day_number as number;
        counts[d] = (counts[d] ?? 0) + 1;
      }

      const speakingTaskCounts: Record<number, number> = {};
      for (const row of speakingTasksRes.data ?? []) {
        const d = row.day_number as number;
        speakingTaskCounts[d] = (speakingTaskCounts[d] ?? 0) + 1;
      }

      res.json({
        rows: progressRes.data ?? [],
        practice_prompt_counts: counts,
        speaking_task_counts: speakingTaskCounts,
      });
    } catch (e) {
      console.error('[GET /api/kunlik-progress]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * Kun progressiga patch qo'llash: birlashtirish (faqat oldinga), saqlash,
   * kun yakunlanishi ta'siri, XP qayta hisobi va medallar.
   *
   * Alohida funksiya, chunki uni IKKI joy chaqiradi: klient yuboradigan
   * PATCH va iboralar javobini SERVERDA tekshiradigan POST.
   */
  async function applyDayPatch(
    userId: number,
    dayNumber: number,
    patch: Partial<KunlikDayRow>,
  ): Promise<{ noop: boolean }> {
    const { data: existing, error: fetchErr } = await supabase
      .from('user_kunlik_day_progress')
      .select(
        'grammar_1, grammar_2, grammar_3, grammar_correct, words_learned, words_correct, words_match, phrases_done, phrases_correct, text_questions_correct, speaking_tasks_done, oqish_done, suhbat_done, speaking_level'
      )
      .eq('user_id', userId)
      .eq('day_number', dayNumber)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    const defaults: KunlikDayRow = {
      day_number: dayNumber,
      grammar_1: false,
      grammar_2: false,
      grammar_3: false,
      grammar_correct: 0,
      words_learned: 0,
      words_correct: 0,
      words_match: false,
      phrases_done: false,
      phrases_correct: 0,
      text_questions_correct: 0,
      speaking_tasks_done: 0,
      oqish_done: false,
      suhbat_done: false,
      speaking_level: 0,
    };

    const prevRow = existing
      ? ({ ...defaults, ...existing, day_number: dayNumber } satisfies KunlikDayRow)
      : defaults;

    const diff = mergeKunlikDayPatch(prevRow, patch);
    if (Object.keys(diff).length === 0) return { noop: true };

    const merged: KunlikDayRow = { ...prevRow, ...diff, day_number: dayNumber };

    const { error } = await supabase.from('user_kunlik_day_progress').upsert(
      {
        user_id: userId,
        day_number: dayNumber,
        grammar_1: merged.grammar_1,
        grammar_2: merged.grammar_2,
        grammar_3: merged.grammar_3,
        grammar_correct: merged.grammar_correct,
        words_learned: merged.words_learned,
        words_correct: merged.words_correct,
        words_match: merged.words_match,
        phrases_done: merged.phrases_done,
        phrases_correct: merged.phrases_correct,
        text_questions_correct: merged.text_questions_correct,
        speaking_tasks_done: merged.speaking_tasks_done,
        oqish_done: merged.oqish_done,
        suhbat_done: merged.suhbat_done,
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

    const slice = (r: KunlikDayRow) => ({
      day_number: dayNumber,
      grammar_1: r.grammar_1,
      grammar_2: r.grammar_2,
      grammar_3: r.grammar_3,
      words_match: r.words_match,
      oqish_done: r.oqish_done,
      suhbat_done: r.suhbat_done,
      speaking_level: r.speaking_level,
    });

    const wasFullyComplete = isKunlikDayRowFullyComplete(slice(prevRow), practicePromptCountByDay);
    const nowFullyComplete = isKunlikDayRowFullyComplete(slice(merged), practicePromptCountByDay);
    await applyKunlikDayCompletionSideEffects(supabase, userId, wasFullyComplete, nowFullyComplete);

    // Recompute XP for this user so the leaderboard/level reflect the update.
    try {
      const { recomputeUserXp } = await import('../services/xpService.js');
      await recomputeUserXp(supabase, userId);
    } catch (xpErr) {
      console.warn('[kunlik-progress] xp recompute skipped', xpErr);
    }

    try {
      const { evaluateAndUnlockAchievements } = await import(
        '../services/achievementService.js'
      );
      await evaluateAndUnlockAchievements(supabase, userId);
    } catch (achErr) {
      console.warn('[kunlik-progress] achievement check skipped', achErr);
    }

    return { noop: false };
  }

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

      // DIQQAT: `phrases_done` va `phrases_correct` bu ro'yxatda YO'Q.
      // Ular XP manbai bo'lgani uchun klientdan qabul qilinmaydi —
      // faqat `POST /kunlik-progress/:day/phrases` javoblarni SERVERDA
      // tekshirib yozadi. Aks holda istalgan ball yuborib bo'lardi.
      const allowed: (keyof KunlikDayRow)[] = [
        'grammar_1', 'grammar_2', 'grammar_3',
        'words_learned', 'words_correct', 'words_match',
        'speaking_tasks_done', 'oqish_done', 'suhbat_done', 'speaking_level',
      ];

      const patch: Partial<KunlikDayRow> = {};
      for (const key of allowed) {
        if (key in req.body) patch[key] = req.body[key] as never;
      }

      /*
       * O'qish bloki: shu kunda matn savollari BO'LSA, `oqish_done` ni klient
       * o'zi yoza olmaydi — u faqat testdan 70% to'plangach
       * `/text-questions/finish` da qo'yiladi. Aks holda savollarni chetlab
       * o'tib, keyingi vazifaga o'tib ketish mumkin bo'lardi.
       */
      if (patch.oqish_done) {
        const { data: qs, error: qErr } = await supabase
          .from('daily_text_questions')
          .select('id')
          .eq('day_number', dayNumber)
          .limit(1);
        if (qErr) throw qErr;
        if ((qs ?? []).length > 0) delete patch.oqish_done;
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }

      const { noop } = await applyDayPatch(userId, dayNumber, patch);
      if (noop) return res.json({ success: true, noop: true });

      res.json({ success: true });
    } catch (e) {
      console.error('[PATCH /api/kunlik-progress/:dayNumber]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /** Kun raqami + ruxsatni tekshiradi; xato bo'lsa javob yuborib `null` qaytaradi. */
  async function requirePhraseDayAccess(req: any, res: any): Promise<number | null> {
    const dayNumber = parseInt(req.params.dayNumber);
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 182) {
      res.status(400).json({ error: 'Invalid day_number' });
      return null;
    }
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) {
      res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });
      return null;
    }
    const access = await getAccessForRequest(supabase, userId);
    if (!accessControlService.canAccessKunlikDay(dayNumber, access)) {
      res.status(403).json({ error: 'Obuna kerak' });
      return null;
    }
    return dayNumber;
  }

  /** Shu kundagi iboralar (javob kaliti bilan) — faqat server ichida ishlatiladi. */
  async function loadPhraseKey(dayNumber: number) {
    const { data, error } = await supabase
      .from('daily_phrase_mcqs')
      .select('id, correct_index')
      .eq('day_number', dayNumber);
    if (error) throw error;
    return (data ?? []) as { id: number; correct_index: number }[];
  }

  /**
   * POST /api/kunlik-progress/:dayNumber/phrases/start
   *
   * Yangi urinish: shu kundagi eski javoblar o'chiriladi. Mashq sahifasi
   * ochilganda chaqiriladi.
   */
  router.post('/kunlik-progress/:dayNumber/phrases/start', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const phrases = await loadPhraseKey(dayNumber);
      if (phrases.length === 0) return res.status(404).json({ error: 'Bu kunda ibora testlari yo‘q' });

      const { error } = await supabase
        .from('user_phrase_answers')
        .delete()
        .eq('user_id', Number(req.userId))
        .in('phrase_id', phrases.map((p) => p.id));
      if (error) throw error;

      res.json({ started: true, total: phrases.length });
    } catch (e) {
      console.error('[POST /api/kunlik-progress/:dayNumber/phrases/start]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * POST /api/kunlik-progress/:dayNumber/phrases/answer
   *
   * Bitta javobni tekshiradi VA qayd etadi. Javob kaliti brauzerga
   * yuborilmagani uchun "to'g'ri/xato" faqat shu yerdan bilinadi.
   *
   * Bir savolga faqat BIR marta javob beriladi: qayta so'ralsa, saqlangan
   * javob qaytariladi. Shu sababli "avval so'rab bilib olib, keyin to'g'risini
   * belgilash" ishlamaydi.
   *
   * Body: `{ "phraseId": <id>, "choice": <0..3> }`
   */
  router.post('/kunlik-progress/:dayNumber/phrases/answer', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const userId = Number(req.userId);

      const phraseId = Number(req.body?.phraseId);
      const choice = Number(req.body?.choice);
      if (!Number.isFinite(phraseId) || !Number.isInteger(choice) || choice < 0 || choice > 3) {
        return res.status(400).json({ error: 'Javob noto‘g‘ri' });
      }

      const phrases = await loadPhraseKey(dayNumber);
      const phrase = phrases.find((p) => Number(p.id) === phraseId);
      if (!phrase) return res.status(404).json({ error: 'Savol topilmadi' });

      // Allaqachon javob berilgan bo'lsa — o'shani qaytaramiz (o'zgartirilmaydi).
      const { data: existing, error: exErr } = await supabase
        .from('user_phrase_answers')
        .select('choice, is_correct')
        .eq('user_id', userId)
        .eq('phrase_id', phraseId)
        .maybeSingle();
      if (exErr) throw exErr;

      if (existing) {
        const row = existing as { choice: number; is_correct: boolean };
        return res.json({
          correct: Boolean(row.is_correct),
          correctIndex: Number(phrase.correct_index),
          choice: Number(row.choice),
          alreadyAnswered: true,
        });
      }

      const isCorrect = choice === Number(phrase.correct_index);
      const { error: insErr } = await supabase.from('user_phrase_answers').insert({
        user_id: userId,
        phrase_id: phraseId,
        choice,
        is_correct: isCorrect,
      });
      if (insErr) throw insErr;

      res.json({
        correct: isCorrect,
        // Javob berilgandan KEYIN to'g'ri variant aytiladi — o'quvchi
        // xatosini ko'rishi uchun. Bu allaqachon qayd etilgan.
        correctIndex: Number(phrase.correct_index),
        choice,
        alreadyAnswered: false,
      });
    } catch (e) {
      console.error('[POST /api/kunlik-progress/:dayNumber/phrases/answer]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * POST /api/kunlik-progress/:dayNumber/phrases/finish
   *
   * Ballni QAYD ETILGAN javoblardan sanaydi — klient hech qanday son
   * yubormaydi. `phrases_correct` faqat oshadi (eski natija yaxshiroq bo'lsa
   * o'sha qoladi).
   */
  router.post('/kunlik-progress/:dayNumber/phrases/finish', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const userId = Number(req.userId);

      const phrases = await loadPhraseKey(dayNumber);
      if (phrases.length === 0) return res.status(404).json({ error: 'Bu kunda ibora testlari yo‘q' });

      const { data: answered, error } = await supabase
        .from('user_phrase_answers')
        .select('phrase_id, is_correct')
        .eq('user_id', userId)
        .in('phrase_id', phrases.map((p) => p.id));
      if (error) throw error;

      const rows = (answered ?? []) as { phrase_id: number; is_correct: boolean }[];
      const correct = rows.filter((r) => r.is_correct).length;

      await applyDayPatch(userId, dayNumber, { phrases_done: true, phrases_correct: correct });

      const { data: saved } = await supabase
        .from('user_kunlik_day_progress')
        .select('phrases_correct')
        .eq('user_id', userId)
        .eq('day_number', dayNumber)
        .maybeSingle();

      // Yangi XP va o'rin SHU YERDA qaytariladi — klient qo'shimcha so'rov
      // yubormasdan, natija ekranida darhol ko'rsatadi.
      let rank: unknown = null;
      try {
        const { getUserRank } = await import('../services/userRank.service.js');
        const { formatDateInAppTimezone } = await import('../lib/appDate.js');
        rank = await getUserRank(supabase as any, userId, formatDateInAppTimezone(new Date()), {
          // Snapshot yozilmaydi: XP olgandan keyin yozilsa, ko'tarilish
          // darhol "o'zgarishsiz" bo'lib qolardi.
          updateSnapshot: false,
        });
      } catch (rankErr) {
        console.warn('[phrases/finish] rank skipped', rankErr);
      }

      res.json({
        correct,
        answered: rows.length,
        total: phrases.length,
        best: Number((saved as { phrases_correct?: number } | null)?.phrases_correct ?? correct),
        rank,
      });
    } catch (e) {
      console.error('[POST /api/kunlik-progress/:dayNumber/phrases/finish]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ─── Grammatika testi (javoblar qayd etiladi, ball serverda sanaladi) ───

  /**
   * NIMA UCHUN SERVER: `grammar_correct` XP beradi, shuning uchun uni klient
   * yubora olmaydi — javob kaliti faqat shu yerda. Ibora testlari ham xuddi
   * shu tartibda ishlaydi.
   *
   * Ikkinchi foydasi: har bir javob (to'g'ri va xato) `user_grammar_answers`
   * ga tushadi va shundan "Xatolaring" hamda haftalik takrorlash quriladi.
   */
  async function loadGrammarKey(dayNumber: number) {
    const { data, error } = await supabase
      .from('daily_grammar_mcqs')
      .select('id, correct_index')
      .eq('day_number', dayNumber)
      .eq('quiz_kind', 'rule');
    if (error) throw error;
    return (data ?? []) as { id: number; correct_index: number }[];
  }

  /** Yangi urinish: shu kundagi eski javoblar o'chiriladi. */
  router.post('/kunlik-progress/:dayNumber/grammar/start', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const mcqs = await loadGrammarKey(dayNumber);
      if (mcqs.length === 0) return res.status(404).json({ error: 'Bu kunda test yo‘q' });

      const { error } = await supabase
        .from('user_grammar_answers')
        .delete()
        .eq('user_id', Number(req.userId))
        .in('mcq_id', mcqs.map((m) => m.id));
      if (error) throw error;

      res.json({ started: true, total: mcqs.length });
    } catch (e) {
      console.error('[POST /api/kunlik-progress/:dayNumber/grammar/start]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /** Bitta javob: to'g'riligini SERVER aytadi va yozib qo'yadi. */
  router.post('/kunlik-progress/:dayNumber/grammar/answer', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const userId = Number(req.userId);

      const mcqId = Number(req.body?.mcqId);
      const choice = Number(req.body?.choice);
      if (!Number.isFinite(mcqId) || !Number.isInteger(choice) || choice < 0 || choice > 3) {
        return res.status(400).json({ error: 'Javob noto‘g‘ri' });
      }

      const mcqs = await loadGrammarKey(dayNumber);
      const mcq = mcqs.find((m) => Number(m.id) === mcqId);
      if (!mcq) return res.status(404).json({ error: 'Savol topilmadi' });

      // Allaqachon javob berilgan bo'lsa — birinchi javob qoladi.
      const { data: existing, error: exErr } = await supabase
        .from('user_grammar_answers')
        .select('choice, is_correct')
        .eq('user_id', userId)
        .eq('mcq_id', mcqId)
        .maybeSingle();
      if (exErr) throw exErr;

      if (existing) {
        const row = existing as { choice: number; is_correct: boolean };
        return res.json({
          correct: Boolean(row.is_correct),
          correctIndex: Number(mcq.correct_index),
          choice: Number(row.choice),
          alreadyAnswered: true,
        });
      }

      const isCorrect = choice === Number(mcq.correct_index);
      const { error: insErr } = await supabase.from('user_grammar_answers').insert({
        user_id: userId,
        mcq_id: mcqId,
        choice,
        is_correct: isCorrect,
      });
      if (insErr) throw insErr;

      res.json({
        correct: isCorrect,
        correctIndex: Number(mcq.correct_index),
        choice,
        alreadyAnswered: false,
      });
    } catch (e) {
      console.error('[POST /api/kunlik-progress/:dayNumber/grammar/answer]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * Test tugadi: ball QAYD ETILGAN javoblardan sanaladi — klient son
   * yubormaydi. `grammar_correct` faqat oshadi.
   */
  router.post('/kunlik-progress/:dayNumber/grammar/finish', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const userId = Number(req.userId);

      const mcqs = await loadGrammarKey(dayNumber);
      if (mcqs.length === 0) return res.status(404).json({ error: 'Bu kunda test yo‘q' });

      const { data: answered, error } = await supabase
        .from('user_grammar_answers')
        .select('mcq_id, is_correct')
        .eq('user_id', userId)
        .in('mcq_id', mcqs.map((m) => m.id));
      if (error) throw error;

      const rows = (answered ?? []) as { mcq_id: number; is_correct: boolean }[];
      const correct = rows.filter((r) => r.is_correct).length;

      await applyDayPatch(userId, dayNumber, { grammar_1: true, grammar_correct: correct });

      const { data: saved } = await supabase
        .from('user_kunlik_day_progress')
        .select('grammar_correct')
        .eq('user_id', userId)
        .eq('day_number', dayNumber)
        .maybeSingle();

      res.json({
        correct,
        answered: rows.length,
        total: mcqs.length,
        best: Number((saved as { grammar_correct?: number } | null)?.grammar_correct ?? correct),
      });
    } catch (e) {
      console.error('[POST /api/kunlik-progress/:dayNumber/grammar/finish]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ─── Xatolar va haftalik takrorlash ─────────────────────────────────────

  /*
   * DIQQAT: bu yerdagi so'rovlar ATAYLAB ikki bosqichli.
   * `postgresFacade` PostgREST'ning ichma-ich (embedded) tanlovlarini
   * qo'llab-quvvatlamaydi — `daily_grammar_mcqs!inner(...)` jimgina kesib
   * tashlanadi va filtr ishlamay qoladi. Shuning uchun avval savollar,
   * keyin javoblar o'qiladi.
   */

  type McqQator = {
    id: number;
    day_number: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_index: number;
    explanation?: string | null;
  };

  const MCQ_MAYDONLARI =
    'id, day_number, question_text, option_a, option_b, option_c, option_d, correct_index, explanation';

  /** Kun oralig'idagi barcha qoida testlari. */
  async function loadMcqRows(fromDay: number, toDay: number): Promise<McqQator[]> {
    const { data, error } = await supabase
      .from('daily_grammar_mcqs')
      .select(MCQ_MAYDONLARI)
      .eq('quiz_kind', 'rule')
      .gte('day_number', fromDay)
      .lte('day_number', toDay);
    if (error) throw error;
    return (data ?? []) as McqQator[];
  }

  /** Berilgan savollardan foydalanuvchi XATO javob berganlari. */
  async function loadWrongAnswers(
    userId: number,
    mcqIds: number[],
  ): Promise<Map<number, number>> {
    const chiqdi = new Map<number, number>();
    if (mcqIds.length === 0) return chiqdi;
    const { data, error } = await supabase
      .from('user_grammar_answers')
      .select('mcq_id, choice, is_correct')
      .eq('user_id', userId)
      .eq('is_correct', false)
      .in('mcq_id', mcqIds);
    if (error) throw error;
    for (const r of (data ?? []) as { mcq_id: number; choice: number }[]) {
      chiqdi.set(Number(r.mcq_id), Number(r.choice));
    }
    return chiqdi;
  }

  function mcqShaklga(m: McqQator, chosenIndex: number) {
    return {
      id: Number(m.id),
      dayNumber: Number(m.day_number),
      questionText: String(m.question_text),
      options: [m.option_a, m.option_b, m.option_c, m.option_d].map(String),
      correctIndex: Number(m.correct_index),
      chosenIndex,
      explanation: String(m.explanation ?? ''),
    };
  }

  /**
   * GET /api/kunlik-progress/:dayNumber/grammar/mistakes
   *
   * Shu kundagi XATO javoblar — test tugagach "Xatolaring" bloki shundan
   * chiziladi. Javob to'g'rilangan savol ro'yxatdan o'zi chiqib ketadi.
   */
  router.get('/kunlik-progress/:dayNumber/grammar/mistakes', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;

      const mcqs = await loadMcqRows(dayNumber, dayNumber);
      const wrong = await loadWrongAnswers(Number(req.userId), mcqs.map((m) => Number(m.id)));

      const mistakes = mcqs
        .filter((m) => wrong.has(Number(m.id)))
        .map((m) => mcqShaklga(m, wrong.get(Number(m.id)) ?? -1));

      res.json({ mistakes });
    } catch (e) {
      console.error('[GET /api/kunlik-progress/:dayNumber/grammar/mistakes]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * GET /api/kunlik-takrorlash/:dayNumber
   *
   * HAFTALIK TAKRORLASH. Til o'rganishda eng katta yo'qotish — o'tilgan
   * mavzuning qaytarilmasligi: 5-kun grammatikasi 40-kunda hech qayerda
   * uchramaydi va unutiladi. Shuning uchun har 7-kunda oldingi 6 kunning
   * XATO javoblari qaytadan so'raladi.
   *
   * Xato yetarli bo'lmasa (o'quvchi yaxshi ishlagan) — o'sha kunlarning
   * tasodifiy savollari bilan to'ldiriladi, ya'ni mini-test har doim to'liq.
   */
  router.get('/kunlik-takrorlash/:dayNumber', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const userId = Number(req.userId);

      const KERAK = 10;
      const boshlanish = Math.max(1, dayNumber - 6);

      const mcqs = await loadMcqRows(boshlanish, dayNumber);
      const wrong = await loadWrongAnswers(userId, mcqs.map((m) => Number(m.id)));

      const xatolar = mcqs.filter((m) => wrong.has(Number(m.id)));
      const qolgan = mcqs.filter((m) => !wrong.has(Number(m.id)));

      // Tasodifiy tanlov: har hafta bir xil savollar chiqmasin.
      const aralashtir = <T,>(arr: T[]): T[] => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      const tanlangan = [
        ...aralashtir(xatolar).slice(0, KERAK),
        ...aralashtir(qolgan).slice(0, Math.max(0, KERAK - Math.min(xatolar.length, KERAK))),
      ];

      res.json({
        fromDay: boshlanish,
        toDay: dayNumber,
        xatoSoni: xatolar.length,
        // Javob kaliti YUBORILMAYDI: javob serverda tekshiriladi.
        questions: tanlangan.map((m) => ({
          id: Number(m.id),
          dayNumber: Number(m.day_number),
          questionText: String(m.question_text),
          options: [m.option_a, m.option_b, m.option_c, m.option_d].map(String),
          xatoEdi: wrong.has(Number(m.id)),
        })),
      });
    } catch (e) {
      console.error('[GET /api/kunlik-takrorlash/:dayNumber]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * POST /api/kunlik-takrorlash/answer
   *
   * Takrorlashdagi javob. To'g'ri javob berilsa eski XATO yozuvi ustiga
   * yoziladi — ya'ni savol "xatolar" ro'yxatidan chiqadi va o'sha kunning
   * `grammar_correct` i qayta sanaladi (ball faqat oshadi).
   */
  router.post('/kunlik-takrorlash/answer', authenticate, async (req: any, res: any) => {
    try {
      const userId = Number(req.userId);
      if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Yaroqsiz foydalanuvchi' });

      const mcqId = Number(req.body?.mcqId);
      const choice = Number(req.body?.choice);
      if (!Number.isFinite(mcqId) || !Number.isInteger(choice) || choice < 0 || choice > 3) {
        return res.status(400).json({ error: 'Javob noto‘g‘ri' });
      }

      const { data: mcq, error: mErr } = await supabase
        .from('daily_grammar_mcqs')
        .select('id, day_number, correct_index, explanation')
        .eq('id', mcqId)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!mcq) return res.status(404).json({ error: 'Savol topilmadi' });

      const row = mcq as { day_number: number; correct_index: number; explanation: string | null };
      const dayNumber = Number(row.day_number);
      const access = await getAccessForRequest(supabase, userId);
      if (!accessControlService.canAccessKunlikDay(dayNumber, access)) {
        return res.status(403).json({ error: 'Obuna kerak' });
      }

      const isCorrect = choice === Number(row.correct_index);
      const { error: upErr } = await supabase.from('user_grammar_answers').upsert(
        { user_id: userId, mcq_id: mcqId, choice, is_correct: isCorrect, answered_at: new Date().toISOString() },
        { onConflict: 'user_id,mcq_id' },
      );
      if (upErr) throw upErr;

      // Shu kunning balli qayta sanaladi: xato tuzatilsa XP o'sadi.
      if (isCorrect) {
        const mcqs = await loadGrammarKey(dayNumber);
        if (mcqs.length > 0) {
          const { data: answered } = await supabase
            .from('user_grammar_answers')
            .select('is_correct')
            .eq('user_id', userId)
            .in('mcq_id', mcqs.map((m) => m.id));
          const correct = ((answered ?? []) as { is_correct: boolean }[]).filter((a) => a.is_correct).length;
          await applyDayPatch(userId, dayNumber, { grammar_correct: correct });
        }
      }

      res.json({
        correct: isCorrect,
        correctIndex: Number(row.correct_index),
        explanation: String(row.explanation ?? ''),
      });
    } catch (e) {
      console.error('[POST /api/kunlik-takrorlash/answer]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ─── Matn savollari (o'qish blokidan keyin, 70% chegarasi) ──────────────

  /** Shu kundagi matn savollari (javob kaliti bilan) — faqat server ichida. */
  async function loadTextQuestionKey(dayNumber: number) {
    const { data, error } = await supabase
      .from('daily_text_questions')
      .select('id, correct_index')
      .eq('day_number', dayNumber);
    if (error) throw error;
    return (data ?? []) as { id: number; correct_index: number }[];
  }

  /** Yangi urinish: shu kundagi eski javoblar o'chiriladi. */
  router.post('/kunlik-progress/:dayNumber/text-questions/start', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const questions = await loadTextQuestionKey(dayNumber);
      if (questions.length === 0) return res.status(404).json({ error: 'Bu kunda savollar yo‘q' });

      const { error } = await supabase
        .from('user_text_question_answers')
        .delete()
        .eq('user_id', Number(req.userId))
        .in('question_id', questions.map((q) => q.id));
      if (error) throw error;

      res.json({ started: true, total: questions.length });
    } catch (e) {
      console.error('[POST /text-questions/start]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /** Bitta javobni tekshiradi VA qayd etadi (bir savolga bir marta). */
  router.post('/kunlik-progress/:dayNumber/text-questions/answer', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const userId = Number(req.userId);

      const questionId = Number(req.body?.questionId);
      const choice = Number(req.body?.choice);
      if (!Number.isFinite(questionId) || !Number.isInteger(choice) || choice < 0 || choice > 3) {
        return res.status(400).json({ error: 'Javob noto‘g‘ri' });
      }

      const questions = await loadTextQuestionKey(dayNumber);
      const question = questions.find((q) => Number(q.id) === questionId);
      if (!question) return res.status(404).json({ error: 'Savol topilmadi' });

      const { data: existing, error: exErr } = await supabase
        .from('user_text_question_answers')
        .select('choice, is_correct')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .maybeSingle();
      if (exErr) throw exErr;

      if (existing) {
        const row = existing as { choice: number; is_correct: boolean };
        return res.json({
          correct: Boolean(row.is_correct),
          correctIndex: Number(question.correct_index),
          choice: Number(row.choice),
          alreadyAnswered: true,
        });
      }

      const isCorrect = choice === Number(question.correct_index);
      const { error: insErr } = await supabase.from('user_text_question_answers').insert({
        user_id: userId,
        question_id: questionId,
        choice,
        is_correct: isCorrect,
      });
      if (insErr) throw insErr;

      res.json({
        correct: isCorrect,
        correctIndex: Number(question.correct_index),
        choice,
        alreadyAnswered: false,
      });
    } catch (e) {
      console.error('[POST /text-questions/answer]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * Yakunlash: ball qayd etilgan javoblardan sanaladi.
   *
   * 70% dan KAM bo'lsa `oqish_done` QO'YILMAYDI — ya'ni o'qish bloki
   * yakunlanmaydi va o'quvchi keyingi vazifaga o'ta olmaydi, testni
   * qaytadan ishlashi kerak.
   */
  router.post('/kunlik-progress/:dayNumber/text-questions/finish', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const userId = Number(req.userId);

      const questions = await loadTextQuestionKey(dayNumber);
      if (questions.length === 0) return res.status(404).json({ error: 'Bu kunda savollar yo‘q' });

      const { data: answered, error } = await supabase
        .from('user_text_question_answers')
        .select('question_id, is_correct')
        .eq('user_id', userId)
        .in('question_id', questions.map((q) => q.id));
      if (error) throw error;

      const rows = (answered ?? []) as { question_id: number; is_correct: boolean }[];
      const correct = rows.filter((r) => r.is_correct).length;
      const total = questions.length;
      const percent = Math.round((correct / total) * 100);
      const passed = percent >= READING_QUESTIONS_PASS_PERCENT;

      await applyDayPatch(userId, dayNumber, {
        text_questions_correct: correct,
        // Faqat 70% dan yuqori natijada o'qish bloki yopiladi.
        ...(passed ? { oqish_done: true } : {}),
      });

      res.json({
        correct,
        answered: rows.length,
        total,
        percent,
        passed,
        passPercent: READING_QUESTIONS_PASS_PERCENT,
      });
    } catch (e) {
      console.error('[POST /text-questions/finish]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ─── Gapirish testidan keyingi topshiriqlar ──────────────────────────────

  /**
   * POST /api/kunlik-progress/:dayNumber/speaking-tasks/check
   *
   * Ochiq gapirish topshirig'iga berilgan javobni AI baholaydi. Etalon javob
   * yo'q — model javob topshiriqqa mos va tushunarli ruschami, shuni ko'radi.
   *
   * Body: `{ "taskId": <id>, "answer": "..." , "attempt": 1 }`
   */
  router.post('/kunlik-progress/:dayNumber/speaking-tasks/check', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;

      const taskId = Number(req.body?.taskId);
      const answer = String(req.body?.answer ?? '').trim();
      const attempt = Math.max(1, Number(req.body?.attempt) || 1);
      // Ekranda ko'rsatilgan namuna javob — uni qaytarsa AI'siz to'g'ri sanaladi.
      const shownAnswer = String(req.body?.shownAnswer ?? '').trim().slice(0, 500);
      if (!Number.isFinite(taskId)) return res.status(400).json({ error: 'taskId kerak' });
      if (!answer) return res.status(400).json({ error: 'Javob kiritilmagan' });

      const { data: task, error } = await supabase
        .from('daily_speaking_tasks')
        .select('id, prompt_ru')
        .eq('id', taskId)
        .eq('day_number', dayNumber)
        .maybeSingle();
      if (error) throw error;
      if (!task) return res.status(404).json({ error: 'Topshiriq topilmadi' });

      const { checkOpenSpeaking } = await import('../lib/openai.js');
      const result = await checkOpenSpeaking(
        String((task as { prompt_ru: string }).prompt_ru),
        answer,
        attempt,
        shownAnswer,
      );
      res.json(result);
    } catch (e) {
      console.error('[POST /speaking-tasks/check]', e);
      res.status(500).json({ error: 'Tekshirishda xatolik' });
    }
  });

  /**
   * POST /api/kunlik-progress/:dayNumber/speaking-tasks/progress
   *
   * Nechta topshiriq bajarilganini saqlaydi (faqat oshadi).
   * Body: `{ "done": <soni> }`
   */
  router.post('/kunlik-progress/:dayNumber/speaking-tasks/progress', authenticate, async (req: any, res: any) => {
    try {
      const dayNumber = await requirePhraseDayAccess(req, res);
      if (dayNumber === null) return;
      const userId = Number(req.userId);

      const done = Math.max(0, Number(req.body?.done) || 0);
      // Shu kundagi topshiriqlar sonidan oshib ketmasin.
      const { data: rows, error } = await supabase
        .from('daily_speaking_tasks')
        .select('id')
        .eq('day_number', dayNumber);
      if (error) throw error;
      const total = (rows ?? []).length;
      if (total === 0) return res.status(404).json({ error: 'Bu kunda topshiriq yo‘q' });

      await applyDayPatch(userId, dayNumber, { speaking_tasks_done: Math.min(done, total) });
      res.json({ done: Math.min(done, total), total });
    } catch (e) {
      console.error('[POST /speaking-tasks/progress]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
