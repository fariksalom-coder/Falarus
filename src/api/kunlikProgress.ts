import { apiUrl } from '../api';

/** Bir qator = bir foydalanuvchi + bir kun (1–182). PATCH har safar shu juftlikni yangilaydi (grammar_1 keyin grammar_2 va h.k.). */
export type KunlikDayProgress = {
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
};

export async function fetchKunlikProgress(token: string | null): Promise<KunlikProgressPayload> {
  const empty = (): KunlikProgressPayload => ({ rows: [], practicePromptCounts: new Map() });
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
      return { rows, practicePromptCounts };
    }
    const obj = json as {
      rows?: KunlikDayProgress[];
      practice_prompt_counts?: Record<string, number>;
    };
    const rows = Array.isArray(obj.rows) ? obj.rows : [];
    const practicePromptCounts = new Map<number, number>();
    for (const [k, v] of Object.entries(obj.practice_prompt_counts ?? {})) {
      const dayNum = Number(k);
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(dayNum) && Number.isFinite(n)) practicePromptCounts.set(dayNum, n);
    }
    return { rows, practicePromptCounts };
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
