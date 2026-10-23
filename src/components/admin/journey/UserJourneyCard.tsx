/** Profil sahifasidagi «Foydalanuvchi yo'li» kartasi: kirishlar, 0-kun, kurs videosi va qadamlar tarixi. */
import { useEffect, useState } from 'react';
import { DAY0_LABELS, type Day0Section } from '../../../../shared/userJourney';
import {
  DAY0_STATUS_LABEL, Day0Steps, StatusPill, VIDEO_STATUS_LABEL, VideoProgress, ago, dateTime, day0Tone, getJourneyUser,
  type JourneyStepRow, type JourneyUser,
} from './JourneyBits';

const STEP_LABEL = (key: string): string => {
  if (key === 'login') return 'Tizimga kirish';
  if (key === 'day0_open') return '0-kunni ochdi';
  if (key === 'course_video_page') return 'Kurs haqida sahifasi';
  if (key.startsWith('day0:')) return `0-kun · ${DAY0_LABELS[key.slice(5) as Day0Section] ?? key.slice(5)}`;
  return key;
};

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-app-bg-muted p-3">
      <dt className="text-[11.5px] font-bold uppercase tracking-wide text-app-text-muted">{label}</dt>
      <dd className="mt-1 truncate text-[15px] font-bold text-app-text">{value}</dd>
      {sub && <dd className="truncate text-[12px] text-app-text-muted">{sub}</dd>}
    </div>
  );
}

export default function UserJourneyCard({ userId }: { userId: number }) {
  const [data, setData] = useState<{ user: JourneyUser; steps: JourneyStepRow[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setData(null); setError('');
    getJourneyUser(userId)
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Yuklanmadi'); });
    return () => { cancelled = true; };
  }, [userId]);

  if (error) return <section className="rounded-lg border border-app-border bg-app-surface p-5"><h2 className="font-semibold">Foydalanuvchi yo'li</h2><p role="alert" className="mt-2 text-sm text-red-700">{error}</p></section>;
  if (!data) return <section className="h-64 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />;

  const { user: u, steps } = data;
  return (
    <section className="space-y-5 rounded-lg border border-app-border bg-app-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Foydalanuvchi yo'li</h2>
        {u.premium && <StatusPill tone="green">Obunasi faol</StatusPill>}
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="Ro'yxatdan o'tgan" value={ago(u.created_at)} sub={dateTime(u.created_at)} />
        <Fact label="Oxirgi faollik" value={ago(u.last_seen_at)} sub={dateTime(u.last_seen_at)} />
        <Fact label="Faol kunlar" value={`${u.visit_days} kun`} />
        <Fact label="Kirishlar" value={u.login_count ? `${u.login_count} marta` : '—'} sub={u.last_login_at ? `oxirgisi ${ago(u.last_login_at)}` : undefined} />
      </dl>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-[14px] font-bold text-app-text">0-kun (sinov darsi)</h3>
          <StatusPill tone={day0Tone(u.day0.status)}>{DAY0_STATUS_LABEL[u.day0.status]}</StatusPill>
          <span className="text-[12.5px] tabular-nums text-app-text-muted">{u.day0.doneBlocks}/{u.day0.totalBlocks} blok</span>
          {u.day0.opened_at && <span className="text-[12.5px] text-app-text-muted">· birinchi marta {dateTime(u.day0.opened_at)}</span>}
        </div>
        <Day0Steps blocks={u.day0.blocks} />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-[14px] font-bold text-app-text">Kurs haqida video</h3>
          <StatusPill tone={u.video.status === 'completed' ? 'green' : u.video.status === 'not_opened' ? 'slate' : 'blue'}>{VIDEO_STATUS_LABEL[u.video.status]}</StatusPill>
        </div>
        <VideoProgress video={u.video} />
        {u.video.last_watched_at && <p className="mt-1 text-[12px] text-app-text-muted">Oxirgi marta {dateTime(u.video.last_watched_at)}{u.video.completed_at ? ` · oxirigacha ${dateTime(u.video.completed_at)}` : ''}</p>}
      </div>

      {steps.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center text-[13.5px] font-bold text-blue-700">Qadamlar tarixi ({steps.length})</summary>
          <ol className="mt-2 space-y-1.5 border-l-2 border-app-border pl-4">
            {steps.map((s) => (
              <li key={s.step_key} className="text-[13px]">
                <span className="font-bold text-app-text">{STEP_LABEL(s.step_key)}</span>
                <span className="text-app-text-muted"> · {dateTime(s.first_at)}{s.hits > 1 ? ` · ${s.hits} marta, oxirgisi ${ago(s.last_at)}` : ''}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
