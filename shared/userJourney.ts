/**
 * FOYDALANUVCHI YO'LI — klient, server va admin uchun umumiy qoidalar.
 *
 * Qadam kalitlari va video kalitlari shu yerda RO'YXAT bo'lib turadi:
 * server ro'yxatda yo'q kalitni yozmaydi, ya'ni klient bazaga ixtiyoriy
 * matn tashlay olmaydi.
 */

export const DAY0_SECTIONS = ['grammatika', 'lugat', 'oqish', 'gapirish', 'savol-javob'] as const;
export type Day0Section = (typeof DAY0_SECTIONS)[number];

export const JOURNEY_STEPS = [
  'login',
  'day0_open',
  ...DAY0_SECTIONS.map((s) => `day0:${s}` as const),
  'course_video_page',
] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

export function isJourneyStep(value: unknown): value is JourneyStep {
  return typeof value === 'string' && (JOURNEY_STEPS as readonly string[]).includes(value);
}

/** Kuzatiladigan videolar. Davomiylik — media metama'lumoti kelmasa zaxira. */
export const TRACKED_VIDEOS = {
  course_intro: { label: 'Kurs haqida video', durationSeconds: 298.607 },
} as const;
export type TrackedVideoKey = keyof typeof TRACKED_VIDEOS;

export function isTrackedVideo(value: unknown): value is TrackedVideoKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TRACKED_VIDEOS, value);
}

/** Klient har shuncha soniyada hisobot yuboradi. */
export const VIDEO_REPORT_INTERVAL_MS = 15_000;
/**
 * Bitta hisobotdagi ko'rilgan soniyalar chegarasi. 15 soniyalik oraliq
 * 2.5× tezlikda ~38 soniya beradi; sahifa uzoq fonda qolsa ham bitta
 * hisobot jami hisobni buzmasin.
 */
export const VIDEO_MAX_WATCHED_PER_REPORT = 90;
/** Shuncha foizdan keyin «oxirigacha ko'rdi» hisoblanadi (yakuniy titrlar uchun zaxira). */
export const VIDEO_COMPLETE_RATIO = 0.95;

export type VideoReport = {
  video: TrackedVideoKey;
  position: number;
  watched: number;
  duration: number;
  started: boolean;
  ended: boolean;
};

const finite = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Klientdan kelgan video hisobotini tekshiradi va chegaralaydi; yaroqsiz bo'lsa null. */
export function parseVideoReport(body: unknown): VideoReport | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (!isTrackedVideo(b.video)) return null;
  const fallback = TRACKED_VIDEOS[b.video].durationSeconds;
  const rawDuration = finite(b.duration);
  // Metama'lumot bo'lmasa yoki g'alati bo'lsa — ma'lum davomiylik.
  const duration = rawDuration && rawDuration > 1 && rawDuration < 6 * 3600 ? rawDuration : fallback;
  const position = finite(b.position);
  const watched = finite(b.watched);
  if (position === null || watched === null || position < 0 || watched < 0) return null;
  return {
    video: b.video,
    duration: round1(duration),
    position: round1(Math.min(position, duration)),
    watched: round1(Math.min(watched, VIDEO_MAX_WATCHED_PER_REPORT)),
    started: b.event === 'play',
    ended: b.event === 'ended' || position >= duration * VIDEO_COMPLETE_RATIO,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/* ─────────────────────────── 0-kun ─────────────────────────── */

export type Day0Row = {
  grammar_1: boolean;
  grammar_2: boolean;
  grammar_3: boolean;
  words_learned: number;
  words_match: boolean;
  text_questions_correct: number;
  oqish_done: boolean;
  speaking_level: number;
  suhbat_done: boolean;
};

export type Day0BlockState = 'done' | 'started' | 'opened' | 'none';

export type Day0Block = {
  section: Day0Section;
  label: string;
  state: Day0BlockState;
  /** Qisqa izoh: «2/3 mashq», «12 so'z» va h.k. */
  detail: string | null;
};

export type Day0Status = 'not_started' | 'opened' | 'in_progress' | 'completed';

export type Day0Progress = {
  status: Day0Status;
  doneBlocks: number;
  totalBlocks: number;
  blocks: Day0Block[];
  /** Eng uzoq yetib borgan blok (bajarilgan yoki ochilgan). */
  reached: Day0Section | null;
};

export const DAY0_LABELS: Record<Day0Section, string> = {
  grammatika: 'Grammatika',
  lugat: "Lug'at",
  oqish: "O'qish",
  gapirish: 'Gapirish',
  'savol-javob': 'Savol-javob',
};

/**
 * 0-kun holatini hisoblaydi. `opened` — qaysi bo'limlar ochilgani
 * (journey qadamlaridan), `dayOpened` — 0-kun sahifasi ochilganmi.
 * Bajarilgan blok mezoni ilovadagi bilan bir xil (kunlikBloklar.ts).
 */
export function summarizeDay0(
  row: Day0Row | null,
  speakingPromptCount: number,
  opened: ReadonlySet<Day0Section>,
  dayOpened: boolean,
): Day0Progress {
  const r = row;
  const grammarCount = r ? [r.grammar_1, r.grammar_2, r.grammar_3].filter(Boolean).length : 0;
  const speakingNeeded = Math.max(0, speakingPromptCount);
  const speakingLevel = r ? Math.max(0, r.speaking_level ?? 0) : 0;

  const facts: Record<Day0Section, { done: boolean; started: boolean; detail: string | null }> = {
    grammatika: {
      done: grammarCount === 3,
      started: grammarCount > 0,
      detail: grammarCount > 0 ? `${grammarCount}/3 mashq` : null,
    },
    lugat: {
      done: Boolean(r?.words_match),
      started: (r?.words_learned ?? 0) > 0,
      detail: (r?.words_learned ?? 0) > 0 ? `${r!.words_learned} so'z` : null,
    },
    oqish: {
      done: Boolean(r?.oqish_done),
      started: (r?.text_questions_correct ?? 0) > 0,
      detail: (r?.text_questions_correct ?? 0) > 0 ? `${r!.text_questions_correct} to'g'ri javob` : null,
    },
    gapirish: {
      // Topshiriq bo'lmasa ilova blokni o'tkazib yuboradi: o'qishdan keyin bajarilgan deb sanaymiz.
      done: Boolean(r) && (speakingNeeded === 0 ? Boolean(r?.oqish_done) : speakingLevel >= speakingNeeded),
      started: speakingLevel > 0,
      detail: speakingNeeded > 0 && speakingLevel > 0 ? `${Math.min(speakingLevel, speakingNeeded)}/${speakingNeeded}` : null,
    },
    'savol-javob': {
      done: Boolean(r?.suhbat_done),
      started: false,
      detail: null,
    },
  };

  const blocks: Day0Block[] = DAY0_SECTIONS.map((section) => {
    const f = facts[section];
    const state: Day0BlockState = f.done ? 'done' : f.started ? 'started' : opened.has(section) ? 'opened' : 'none';
    return { section, label: DAY0_LABELS[section], state, detail: f.detail };
  });

  const doneBlocks = blocks.filter((b) => b.state === 'done').length;
  let reached: Day0Section | null = null;
  for (const b of blocks) if (b.state !== 'none') reached = b.section;

  const anyActivity = reached !== null;
  const status: Day0Status =
    doneBlocks === blocks.length ? 'completed'
      : anyActivity ? 'in_progress'
        : dayOpened ? 'opened'
          : 'not_started';

  return { status, doneBlocks, totalBlocks: blocks.length, blocks, reached };
}

/* ─────────────────────────── Video ─────────────────────────── */

export type VideoProgressRow = {
  duration_seconds: number | null;
  max_position_seconds: number;
  watched_seconds: number;
  plays: number;
  completed_at: string | null;
  first_started_at: string;
  last_watched_at: string;
};

export type VideoStatus = 'not_opened' | 'page_only' | 'started' | 'half' | 'completed';

/** Videoni ko'rish holati: sahifani ochdimi, boshladimi, yarmidan o'tdimi, tugatdimi. */
export function videoStatus(row: VideoProgressRow | null, pageOpened: boolean, fallbackDuration: number): VideoStatus {
  if (!row || (row.plays === 0 && row.max_position_seconds <= 0)) return pageOpened ? 'page_only' : 'not_opened';
  if (row.completed_at) return 'completed';
  const duration = row.duration_seconds && row.duration_seconds > 0 ? row.duration_seconds : fallbackDuration;
  return row.max_position_seconds >= duration / 2 ? 'half' : 'started';
}

export function formatClock(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
