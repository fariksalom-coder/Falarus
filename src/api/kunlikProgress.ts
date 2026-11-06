import { voiceRequest } from '../utils/voiceRequest';
import { requireAIConsent } from '../utils/aiConsent';
import { apiUrl } from '../api';
import { publishMyRank, type MyRankResponse } from './leaderboard';
import { pendingOptimisticPatches, sendOrQueue } from '../offline/outbox';
import { loadProgress, saveProgress } from '../offline/courseCache';
import { mergeKunlikDayPatch } from '../../shared/kunlikProgressMerge';
import { READING_QUESTIONS_PASS_PERCENT } from '../../shared/dailyCourseDay';

/** Bir qator = bir foydalanuvchi + bir kun (1–182). PATCH har safar shu juftlikni yangilaydi (grammar_1 keyin grammar_2 va h.k.). */
export type KunlikDayProgress = {
  day_number:    number;
  grammar_1:     boolean;
  grammar_2:     boolean;
  grammar_3:     boolean;
  /** Grammatika testidagi to'g'ri javoblar (har biri 1 XP, server yozadi). */
  grammar_correct: number;
  words_learned: number;
  words_correct: number;
  words_match:   boolean;
  /** Lug'atning 4-vazifasi: ibora testlari. */
  phrases_done:  boolean;
  /** Iboralarda to'g'ri javoblar soni (har biri 1 XP). */
  phrases_correct: number;
  /** Matn savollaridagi eng yaxshi natija (70% chegarasi uchun). */
  text_questions_correct: number;
  /** Gapirish testidan keyingi topshiriqlardan nechtasi bajarilgan. */
  speaking_tasks_done: number;
  oqish_done:    boolean;
  /** 5-blok: ustoz bilan jonli savol-javob. */
  suhbat_done:   boolean;
  speaking_level: number;
};

export type KunlikDayPatch = Partial<Omit<KunlikDayProgress, 'day_number'>>;

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>).Authorization = `Bearer ${token}`;
  return h;
}

/** Kunlik kun uchun `daily_practice_prompts` qatorlari soni (gapirish slotining «to‘liq» chegarasi). */
export async function fetchDailyPracticePromptCounts(
  token: string | null,
): Promise<Map<number, number>> {
  const empty = new Map<number, number>();
  if (!token) return empty;
  try {
    const res = await fetch(apiUrl('/api/daily-practice-prompt-counts'), {
      headers: authHeaders(token),
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as Record<string, number>;
    const m = new Map<number, number>();
    for (const [k, v] of Object.entries(data)) {
      const dayNum = Number(k);
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(dayNum) && Number.isFinite(n)) m.set(dayNum, n);
    }
    return m;
  } catch {
    return empty;
  }
}

export type KunlikProgressPayload = {
  rows: KunlikDayProgress[];
  practicePromptCounts: Map<number, number>;
  /** Gapirish testidan keyingi qo'shimcha topshiriqlar soni (kun bo'yicha). */
  speakingTaskCounts: Map<number, number>;
};

/**
 * Progress — serverdan; internet bo'lmasa QURILMADAGI oxirgi nusxadan.
 * Ikkala holatda ham hali yuborilmagan (navbatdagi) natijalar ustiga qo'shiladi —
 * oflayn bajarilgan bosqich xaritada darhol "bajarildi" bo'lib ko'rinadi.
 */
export async function fetchKunlikProgress(token: string | null): Promise<KunlikProgressPayload> {
  const fresh = await fetchKunlikProgressFromServer(token);
  let payload = fresh;
  if (fresh) {
    saveProgress({
      rows: fresh.rows,
      practicePromptCounts: [...fresh.practicePromptCounts],
      speakingTaskCounts: [...fresh.speakingTaskCounts],
    });
  } else {
    const cached = loadProgress();
    payload = cached
      ? {
          rows: cached.rows,
          practicePromptCounts: new Map(cached.practicePromptCounts),
          speakingTaskCounts: new Map(cached.speakingTaskCounts),
        }
      : null;
  }
  if (!payload) return { rows: [], practicePromptCounts: new Map(), speakingTaskCounts: new Map() };
  return { ...payload, rows: withPendingPatches(payload.rows) };
}

function withPendingPatches(rows: KunlikDayProgress[]): KunlikDayProgress[] {
  const pending = pendingOptimisticPatches();
  if (!pending.length) return rows;
  const byDay = new Map(rows.map((r) => [r.day_number, { ...r }]));
  for (const { day, patch } of pending) {
    const prev = byDay.get(day) ?? emptyDayRow(day);
    byDay.set(day, { ...prev, ...mergeKunlikDayPatch(prev, patch) } as KunlikDayProgress);
  }
  return [...byDay.values()];
}

function emptyDayRow(day: number): KunlikDayProgress {
  return {
    day_number: day,
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
}

/** `null` — server javob bermadi (internet yo'q yoki xato). */
async function fetchKunlikProgressFromServer(token: string | null): Promise<KunlikProgressPayload | null> {
  if (!token) return null;
  try {
    const res = await fetch(apiUrl('/api/kunlik-progress'), {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (Array.isArray(json)) {
      const rows = json as KunlikDayProgress[];
      const practicePromptCounts = await fetchDailyPracticePromptCounts(token);
      return { rows, practicePromptCounts, speakingTaskCounts: new Map() };
    }
    const obj = json as {
      rows?: KunlikDayProgress[];
      practice_prompt_counts?: Record<string, number>;
      speaking_task_counts?: Record<string, number>;
    };
    const rows = Array.isArray(obj.rows) ? obj.rows : [];
    const practicePromptCounts = new Map<number, number>();
    for (const [k, v] of Object.entries(obj.practice_prompt_counts ?? {})) {
      const dayNum = Number(k);
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(dayNum) && Number.isFinite(n)) practicePromptCounts.set(dayNum, n);
    }
    const speakingTaskCounts = new Map<number, number>();
    for (const [k, v] of Object.entries(obj.speaking_task_counts ?? {})) {
      const dayNum = Number(k);
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(dayNum) && Number.isFinite(n)) speakingTaskCounts.set(dayNum, n);
    }
    return { rows, practicePromptCounts, speakingTaskCounts };
  } catch {
    return null;
  }
}

export async function patchKunlikDayProgress(
  token: string | null,
  dayNumber: number,
  patch: KunlikDayPatch
): Promise<void> {
  if (!token || Object.keys(patch).length === 0) return;
  // Internet yo'q — navbatga; qaytgach yuboriladi.
  await sendOrQueue(token, 'PATCH', `/api/kunlik-progress/${dayNumber}`, patch, {
    day: dayNumber,
    optimistic: patch,
  }).catch(() => undefined);
}

async function readJson<T>(res: Response, fallbackError: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || fallbackError);
  return data as T;
}

/** Bitta javob natijasi — SERVER tekshiradi va QAYD ETADI. */
export type PhraseAnswerResult = {
  correct: boolean;
  /** To'g'ri variant — javob berilgandan KEYIN, xatoni ko'rsatish uchun. */
  correctIndex: number;
  choice: number;
  /** Bu savolga allaqachon javob berilgan edi (javob o'zgartirilmaydi). */
  alreadyAnswered: boolean;
};

/** Yakuniy natija — server qayd etilgan javoblardan sanaydi. */
export type PhraseFinishResult = {
  correct: number;
  answered: number;
  total: number;
  /** Saqlangan eng yaxshi natija (XP shundan). */
  best: number;
  /** Yangilangan XP va o'rin — server shu yerda qaytaradi (qo'shimcha so'rovsiz). */
  rank: MyRankResponse | null;
};

/** Yangi urinish: serverdagi eski javoblarni tozalaydi. */
export async function startDailyPhrases(
  token: string | null,
  dayNumber: number,
): Promise<{ total: number }> {
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/phrases/start`, {});
  return res ? readJson<{ total: number }>(res, 'Mashq boshlanmadi') : { total: 0 };
}

/**
 * Bitta javobni serverga yuboradi. To'g'ri/xato ekani FAQAT shu javobdan
 * bilinadi — javob kaliti brauzerda yo'q.
 */
export async function answerDailyPhrase(
  token: string | null,
  dayNumber: number,
  phraseId: number,
  choice: number,
  /** Kun materialidagi to'g'ri javob — internetsiz shu bilan tekshiriladi. */
  offlineCorrectIndex?: number,
): Promise<PhraseAnswerResult> {
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/phrases/answer`, { phraseId, choice });
  if (res) return readJson<PhraseAnswerResult>(res, 'Javob tekshirilmadi');
  return offlineAnswer(choice, offlineCorrectIndex);
}

/** Oflayn javob: kalit kun materialida. Kalit yo'q bo'lsa — internet kerak. */
function offlineAnswer(choice: number, correctIndex: number | undefined) {
  if (typeof correctIndex !== 'number') {
    throw new Error('Internet yo‘q. Bu savolni tekshirish uchun internetga ulaning.');
  }
  return { correct: choice === correctIndex, correctIndex, choice, alreadyAnswered: false };
}

/** Mashqni yakunlaydi: ball serverdagi javoblardan hisoblanadi. */
export async function finishDailyPhrases(
  token: string | null,
  dayNumber: number,
  /** Oflayn natija — qurilmada sanalgan; server keyin javoblardan qayta hisoblaydi. */
  offline?: { correct: number; total: number },
): Promise<PhraseFinishResult> {
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/phrases/finish`, {}, {
    day: dayNumber,
    optimistic: offline ? { phrases_done: true, phrases_correct: offline.correct } : undefined,
  });
  if (!res) {
    const correct = offline?.correct ?? 0;
    const total = offline?.total ?? 0;
    return { correct, answered: total, total, best: correct, rank: null };
  }
  const result = await readJson<PhraseFinishResult>(res, 'Natija saqlanmadi');
  // Yangi XP/o'rinni butun ilovaga tarqatamiz — bosh sahifadagi raqam
  // sahifani yangilamasdan o'zgaradi.
  if (result.rank) publishMyRank(result.rank);
  return result;
}

/** Matn savoli natijasi — SERVER tekshiradi va qayd etadi. */
export type TextQuestionAnswerResult = {
  correct: boolean;
  correctIndex: number;
  choice: number;
  alreadyAnswered: boolean;
};

/** O'qish testining yakuni. 70% dan kam bo'lsa blok yopilmaydi. */
export type TextQuestionFinishResult = {
  correct: number;
  answered: number;
  total: number;
  percent: number;
  passed: boolean;
  passPercent: number;
};

export async function startTextQuestions(
  token: string | null,
  dayNumber: number,
): Promise<{ total: number }> {
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/text-questions/start`, {});
  return res ? readJson<{ total: number }>(res, 'Test boshlanmadi') : { total: 0 };
}

export async function answerTextQuestion(
  token: string | null,
  dayNumber: number,
  questionId: number,
  choice: number,
  offlineCorrectIndex?: number,
): Promise<TextQuestionAnswerResult> {
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/text-questions/answer`, { questionId, choice });
  if (res) return readJson<TextQuestionAnswerResult>(res, 'Javob tekshirilmadi');
  return offlineAnswer(choice, offlineCorrectIndex);
}

export async function finishTextQuestions(
  token: string | null,
  dayNumber: number,
  offline?: { correct: number; total: number },
): Promise<TextQuestionFinishResult> {
  const local = offline ?? { correct: 0, total: 0 };
  const percent = local.total > 0 ? Math.round((local.correct / local.total) * 100) : 0;
  const passed = percent >= READING_QUESTIONS_PASS_PERCENT;
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/text-questions/finish`, {}, {
    day: dayNumber,
    optimistic: offline && passed ? { oqish_done: true, text_questions_correct: local.correct } : undefined,
  });
  if (res) return readJson<TextQuestionFinishResult>(res, 'Natija saqlanmadi');
  return {
    correct: local.correct,
    answered: local.total,
    total: local.total,
    percent,
    passed,
    passPercent: READING_QUESTIONS_PASS_PERCENT,
  };
}

/** Gapirish topshirig'i natijasi — AI baholaydi (etalon javob yo'q). */
export type SpeakingTaskCheckResult = {
  status: 'correct' | 'partial' | 'wrong';
  feedback: string;
  error_explanation: string;
  hint: string;
  correct_answer: string;
};

export async function checkDailySpeakingTask(
  token: string | null,
  dayNumber: number,
  taskId: number,
  answer: string,
  attempt: number,
  /** Ekranda ko'rsatilgan namuna javob — uni qaytarsa AI'siz to'g'ri sanaladi. */
  shownAnswer: string = '',
): Promise<SpeakingTaskCheckResult> {
  await requireAIConsent();
  return voiceRequest<SpeakingTaskCheckResult>(apiUrl(`/api/kunlik-progress/${dayNumber}/speaking-tasks/check`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ taskId, answer, attempt, ...(shownAnswer ? { shownAnswer } : {}) }),
  });
}

/** Bajarilgan topshiriqlar sonini saqlaydi (faqat oshadi). */
export async function saveDailySpeakingTaskProgress(
  token: string | null,
  dayNumber: number,
  done: number,
): Promise<void> {
  await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/speaking-tasks/progress`, { done }, {
    day: dayNumber,
    optimistic: { speaking_tasks_done: done },
  }).catch(() => undefined);
}

// ─── Grammatika testi: javoblar SERVERDA tekshiriladi va qayd etiladi ──────

export type GrammarAnswerResult = {
  correct: boolean;
  correctIndex: number;
  choice: number;
  alreadyAnswered: boolean;
};

export type GrammarFinishResult = {
  correct: number;
  answered: number;
  total: number;
  /** Shu kun uchun eng yaxshi natija (kamaymaydi). */
  best: number;
};

/** Xato javob berilgan savol — "Xatolaring" bloki shundan chiziladi. */
export type GrammarMistake = {
  id: number;
  dayNumber: number;
  questionText: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number;
  explanation: string;
};

/** Yangi urinish: shu kundagi eski javoblar o'chiriladi. */
export async function startGrammarTest(
  token: string | null,
  dayNumber: number,
): Promise<{ total: number }> {
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/grammar/start`, {});
  return res ? readJson<{ total: number }>(res, 'Test boshlanmadi') : { total: 0 };
}

/**
 * Bitta javob. To'g'ri/xato ekanini SERVER aytadi — ball shu javoblardan
 * sanaladi, shuning uchun kalit brauzerga berilmaydi.
 */
export async function answerGrammarQuestion(
  token: string | null,
  dayNumber: number,
  mcqId: number,
  choice: number,
): Promise<GrammarAnswerResult> {
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/grammar/answer`, { mcqId, choice });
  // Navbatga yozildi — sahifa javobni kalit bo'yicha o'zi tekshiradi.
  if (!res) return { correct: false, correctIndex: -1, choice, alreadyAnswered: false };
  return readJson<GrammarAnswerResult>(res, 'Javob tekshirilmadi');
}

/** Testni yakunlaydi: `grammar_correct` (XP) serverda hisoblanadi. */
export async function finishGrammarTest(
  token: string | null,
  dayNumber: number,
): Promise<GrammarFinishResult> {
  const res = await sendOrQueue(token, 'POST', `/api/kunlik-progress/${dayNumber}/grammar/finish`, {});
  // Oflayn: ball internet qaytgach serverda hisoblanadi.
  if (!res) throw new Error('Natija internet qaytganda saqlanadi');
  return readJson<GrammarFinishResult>(res, 'Natija saqlanmadi');
}

/** Shu kundagi xato javoblar. */
export async function fetchGrammarMistakes(
  token: string | null,
  dayNumber: number,
): Promise<GrammarMistake[]> {
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/grammar/mistakes`), {
    headers: authHeaders(token),
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { mistakes?: GrammarMistake[] };
  return data.mistakes ?? [];
}

// ─── Haftalik takrorlash ──────────────────────────────────────────────────

export type TakrorlashSavol = {
  id: number;
  dayNumber: number;
  questionText: string;
  options: string[];
  /** Ilgari shu savolda xato qilinganmi. */
  xatoEdi: boolean;
};

export type TakrorlashTest = {
  fromDay: number;
  toDay: number;
  xatoSoni: number;
  questions: TakrorlashSavol[];
};

export async function fetchTakrorlash(
  token: string | null,
  dayNumber: number,
): Promise<TakrorlashTest> {
  const res = await fetch(apiUrl(`/api/kunlik-takrorlash/${dayNumber}`), {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Takrorlash yuklanmadi');
  return data as TakrorlashTest;
}

export async function answerTakrorlash(
  token: string | null,
  mcqId: number,
  choice: number,
): Promise<{ correct: boolean; correctIndex: number; explanation: string }> {
  const res = await fetch(apiUrl('/api/kunlik-takrorlash/answer'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ mcqId, choice }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Javob tekshirilmadi');
  return data as { correct: boolean; correctIndex: number; explanation: string };
}
