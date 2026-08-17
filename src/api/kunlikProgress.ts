import { apiUrl } from '../api';
import { publishMyRank, type MyRankResponse } from './leaderboard';

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

export async function fetchKunlikProgress(token: string | null): Promise<KunlikProgressPayload> {
  const empty = (): KunlikProgressPayload => ({
    rows: [],
    practicePromptCounts: new Map(),
    speakingTaskCounts: new Map(),
  });
  if (!token) return empty();
  try {
    const res = await fetch(apiUrl('/api/kunlik-progress'), {
      headers: authHeaders(token),
    });
    if (!res.ok) return empty();
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
    return empty();
  }
}

export async function patchKunlikDayProgress(
  token: string | null,
  dayNumber: number,
  patch: KunlikDayPatch
): Promise<void> {
  if (!token || Object.keys(patch).length === 0) return;
  try {
    await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}`), {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(patch),
    });
  } catch {
    // fire-and-forget
  }
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
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/phrases/start`), {
    method: 'POST',
    headers: authHeaders(token),
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Mashq boshlanmadi');
  return data as { total: number };
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
): Promise<PhraseAnswerResult> {
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/phrases/answer`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ phraseId, choice }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Javob tekshirilmadi');
  return data as PhraseAnswerResult;
}

/** Mashqni yakunlaydi: ball serverdagi javoblardan hisoblanadi. */
export async function finishDailyPhrases(
  token: string | null,
  dayNumber: number,
): Promise<PhraseFinishResult> {
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/phrases/finish`), {
    method: 'POST',
    headers: authHeaders(token),
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Natija saqlanmadi');
  const result = data as PhraseFinishResult;
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
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/text-questions/start`), {
    method: 'POST',
    headers: authHeaders(token),
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Test boshlanmadi');
  return data as { total: number };
}

export async function answerTextQuestion(
  token: string | null,
  dayNumber: number,
  questionId: number,
  choice: number,
): Promise<TextQuestionAnswerResult> {
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/text-questions/answer`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ questionId, choice }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Javob tekshirilmadi');
  return data as TextQuestionAnswerResult;
}

export async function finishTextQuestions(
  token: string | null,
  dayNumber: number,
): Promise<TextQuestionFinishResult> {
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/text-questions/finish`), {
    method: 'POST',
    headers: authHeaders(token),
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Natija saqlanmadi');
  return data as TextQuestionFinishResult;
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
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/speaking-tasks/check`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ taskId, answer, attempt, ...(shownAnswer ? { shownAnswer } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Tekshirishda xatolik');
  return data as SpeakingTaskCheckResult;
}

/** Bajarilgan topshiriqlar sonini saqlaydi (faqat oshadi). */
export async function saveDailySpeakingTaskProgress(
  token: string | null,
  dayNumber: number,
  done: number,
): Promise<void> {
  await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/speaking-tasks/progress`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ done }),
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
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/grammar/start`), {
    method: 'POST',
    headers: authHeaders(token),
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Test boshlanmadi');
  return data as { total: number };
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
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/grammar/answer`), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ mcqId, choice }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Javob tekshirilmadi');
  return data as GrammarAnswerResult;
}

/** Testni yakunlaydi: `grammar_correct` (XP) serverda hisoblanadi. */
export async function finishGrammarTest(
  token: string | null,
  dayNumber: number,
): Promise<GrammarFinishResult> {
  const res = await fetch(apiUrl(`/api/kunlik-progress/${dayNumber}/grammar/finish`), {
    method: 'POST',
    headers: authHeaders(token),
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Natija saqlanmadi');
  return data as GrammarFinishResult;
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
