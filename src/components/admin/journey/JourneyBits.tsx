/**
 * «Foydalanuvchi yo'li» — ro'yxat sahifasi va profil kartasi uchun umumiy
 * bo'laklar: API turlari, 0-kun bosqichlari, video chizig'i, vaqt matni.
 */
import type { ReactNode } from 'react';
import { adminApi } from '../../../lib/adminApi';
import { formatClock, type Day0Block, type Day0Status, type VideoStatus } from '../../../../shared/userJourney';

export type JourneyUser = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  premium: boolean;
  visit_days: number;
  login_count: number;
  last_login_at: string | null;
  day0: {
    status: Day0Status;
    doneBlocks: number;
    totalBlocks: number;
    blocks: Day0Block[];
    reached: string | null;
    opened_at: string | null;
    updated_at: string | null;
  };
  video: {
    status: VideoStatus;
    page_opened_at: string | null;
    duration_seconds: number;
    max_position_seconds: number;
    watched_seconds: number;
    plays: number;
    completed_at: string | null;
    first_started_at: string | null;
    last_watched_at: string | null;
  };
};

export type JourneyStepRow = { step_key: string; first_at: string; last_at: string; hits: number };

export const getJourneyUser = (id: number) =>
  adminApi<{ user: JourneyUser; steps: JourneyStepRow[] }>(`/user-journey/user/${id}`);

/** «5 daqiqa oldin», «3 kun oldin» — admin tez o'qishi uchun. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff)) return '—';
  const min = Math.round(diff / 60000);
  if (min < 1) return 'hozir';
  if (min < 60) return `${min} daq oldin`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} kun oldin`;
  return new Date(iso).toLocaleDateString('uz-UZ');
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const DAY0_STATUS_LABEL: Record<Day0Status, string> = {
  not_started: 'Kirmagan',
  opened: 'Ochgan, boshlamagan',
  in_progress: 'Jarayonda',
  completed: 'Tugatgan',
};

export const VIDEO_STATUS_LABEL: Record<VideoStatus, string> = {
  not_opened: 'Ochmagan',
  page_only: "Sahifani ochgan, ko'rmagan",
  started: 'Boshlagan',
  half: "Yarmidan o'tgan",
  completed: 'Oxirigacha',
};

const BLOCK_STYLE: Record<Day0Block['state'], string> = {
  done: 'bg-emerald-500',
  started: 'bg-amber-400',
  opened: 'bg-blue-300',
  none: 'bg-slate-200',
};

const BLOCK_STATE_TEXT: Record<Day0Block['state'], string> = {
  done: 'bajarildi',
  started: 'boshlangan',
  opened: 'ochilgan',
  none: 'kirmagan',
};

/** 0-kunning beshta bloki bir qatorda: yashil — bajarildi, sariq — boshlangan, ko'k — ochilgan. */
export function Day0Steps({ blocks, compact = false }: { blocks: Day0Block[]; compact?: boolean }) {
  return (
    <ol className={compact ? 'flex gap-1' : 'grid grid-cols-5 gap-1.5'} aria-label="0-kun bloklari">
      {blocks.map((b) => (
        <li key={b.section} title={`${b.label}: ${BLOCK_STATE_TEXT[b.state]}${b.detail ? ` · ${b.detail}` : ''}`} className="min-w-0">
          <span className={`block rounded-full ${compact ? 'h-2 w-6' : 'h-2.5 w-full'} ${BLOCK_STYLE[b.state]}`} />
          {!compact && (
            <span className="mt-1.5 block truncate text-[12px] font-bold text-app-text">{b.label}</span>
          )}
          {!compact && (
            <span className="block truncate text-[11.5px] text-app-text-muted">{b.detail ?? BLOCK_STATE_TEXT[b.state]}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Video chizig'i: qaysi joygacha yetgani va jami ko'rilgan vaqt. */
export function VideoProgress({ video, compact = false }: { video: JourneyUser['video']; compact?: boolean }) {
  const duration = Math.max(1, video.duration_seconds);
  const pct = Math.min(100, Math.round((video.max_position_seconds / duration) * 100));
  const started = video.plays > 0 || video.max_position_seconds > 0;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className={`font-bold ${video.status === 'completed' ? 'text-emerald-700' : 'text-app-text'}`}>
          {started ? `${formatClock(video.max_position_seconds)} / ${formatClock(duration)}` : VIDEO_STATUS_LABEL[video.status]}
        </span>
        {started && <span className="tabular-nums text-app-text-muted">{pct}%</span>}
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Videoni ko'rish">
        <div className={`h-full rounded-full ${video.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
      </div>
      {!compact && started && (
        <p className="mt-1 text-[11.5px] text-app-text-muted">
          Ko'rgan vaqti {formatClock(video.watched_seconds)} · {video.plays} marta boshlagan
        </p>
      )}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: 'green' | 'amber' | 'blue' | 'slate'; children: ReactNode }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    blue: 'bg-blue-50 text-blue-800 ring-blue-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  } as const;
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold ring-1 ${tones[tone]}`}>{children}</span>;
}

export const day0Tone = (s: Day0Status) => (s === 'completed' ? 'green' : s === 'in_progress' ? 'amber' : s === 'opened' ? 'blue' : 'slate');
