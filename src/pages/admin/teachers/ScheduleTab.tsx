/**
 * O'QITUVCHILAR → «Darslar»: kim, qachon, kim bilan dars o'tadi. Pullik va sinov
 * darslari bitta jadvalda, kunlar bo'yicha guruhlangan (Toshkent vaqti).
 * Filtr: sana (bugun / ertaga / hafta / oy / o'tgan hafta yoki qo'lda) va o'qituvchi.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { LESSON_STATUS_LABEL, type LessonStatus } from '../../../../shared/teacherLessons';
import { fmtSum, tashkentDay, timeOnly } from './shared';

type Item = {
  kind: 'paid' | 'trial'; id: number; teacher_user_id: number; starts_at: string; ends_at: string | null; status: string; price_uzs: number;
  teacher_first_name: string; teacher_last_name: string; student_first_name: string; student_last_name: string; student_phone: string | null;
};
type Resp = { from: string; to: string; rows: Item[]; teachers: { user_id: number; first_name: string; last_name: string }[] };

const PRESETS = [
  { key: 'today', label: 'Bugun', range: () => [tashkentDay(0), tashkentDay(0)] },
  { key: 'tomorrow', label: 'Ertaga', range: () => [tashkentDay(1), tashkentDay(1)] },
  { key: 'week', label: '7 kun', range: () => [tashkentDay(0), tashkentDay(6)] },
  { key: 'month', label: '30 kun', range: () => [tashkentDay(0), tashkentDay(29)] },
  { key: 'past', label: 'Oʻtgan 7 kun', range: () => [tashkentDay(-7), tashkentDay(-1)] },
] as const;

const TRIAL_STATUS: Record<string, string> = {
  paid: 'Toʻlangan', teacher_notified: 'Ustozga yuborilgan', scheduled: 'Rejalashtirilgan', completed_by_teacher: 'Ustoz yakunladi',
  completed: 'Oʻtkazilgan', cancelled: 'Bekor qilingan', refunded: 'Qaytarilgan',
};
const DONE = new Set(['completed', 'completed_by_teacher']);
const OFF = new Set(['cancelled', 'refunded']);

function statusOf(it: Item) {
  const text = it.kind === 'paid' ? LESSON_STATUS_LABEL[it.status as LessonStatus]?.uz ?? it.status : TRIAL_STATUS[it.status] ?? it.status;
  const tone = OFF.has(it.status) ? 'bg-red-50 text-red-700' : DONE.has(it.status) ? 'bg-emerald-50 text-emerald-800'
    : it.status === 'disputed' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800';
  return { text, tone };
}

// Brauzerlarda uz-UZ oy/kun nomlari ko'pincha yo'q («M10 23, Fri») — o'zimiz yozamiz.
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

function dayTitle(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  const label = `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`;
  const rel = day === tashkentDay(0) ? 'Bugun' : day === tashkentDay(1) ? 'Ertaga' : day === tashkentDay(-1) ? 'Kecha' : '';
  return rel ? `${rel} · ${label}` : label;
}

export default function ScheduleTab() {
  const [params, setParams] = useSearchParams();
  const preset = params.get('range') ?? 'today';
  const teacher = params.get('teacher') ?? '';
  const [custom, setCustom] = useState({ from: params.get('from') ?? tashkentDay(0), to: params.get('to') ?? tashkentDay(6) });
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState('');

  const range = useMemo(() => {
    const p = PRESETS.find((x) => x.key === preset);
    return p ? p.range() : [custom.from, custom.to <= custom.from ? custom.from : custom.to];
  }, [preset, custom]);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    setData(null); setError('');
    adminApi<Resp>(`/teacher-money/schedule?from=${range[0]}&to=${range[1]}${teacher ? `&teacher=${teacher}` : ''}`)
      .then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [range, teacher]);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of data?.rows ?? []) {
      const day = new Date(new Date(it.starts_at).getTime() + 5 * 3600_000).toISOString().slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), it]);
    }
    return [...map.entries()];
  }, [data]);
  const now = Date.now();
  const chip = (on: boolean) => `min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-semibold transition ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-app-border bg-app-surface text-app-text hover:bg-app-bg-muted'}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => <button key={p.key} type="button" onClick={() => set({ range: p.key })} aria-pressed={preset === p.key} className={chip(preset === p.key)}>{p.label}</button>)}
        <button type="button" onClick={() => set({ range: 'custom' })} aria-pressed={preset === 'custom'} className={`${chip(preset === 'custom')} inline-flex items-center gap-1.5`}><CalendarDays className="h-4 w-4" />Sana</button>
        <select value={teacher} onChange={(e) => set({ teacher: e.target.value || null })} aria-label="Oʻqituvchi"
          className="min-h-11 min-w-[200px] flex-1 rounded-xl border border-app-border bg-app-surface px-3 text-sm sm:ml-auto sm:flex-none">
          <option value="">Hamma oʻqituvchilar</option>
          {data?.teachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.first_name} {t.last_name}</option>)}
        </select>
      </div>
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={custom.from} onChange={(e) => { setCustom((c) => ({ ...c, from: e.target.value })); set({ from: e.target.value }); }} className="min-h-11 rounded-xl border border-app-border bg-app-surface px-3" aria-label="Boshlanish" />
          <span className="text-app-text-muted">—</span>
          <input type="date" value={custom.to} onChange={(e) => { setCustom((c) => ({ ...c, to: e.target.value })); set({ to: e.target.value }); }} className="min-h-11 rounded-xl border border-app-border bg-app-surface px-3" aria-label="Tugash" />
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!data ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />
        : !days.length ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-app-border p-10 text-center">
            <CalendarDays className="h-8 w-8 text-slate-300" />
            <p className="font-semibold text-app-text">Bu davrda dars yoʻq</p>
            <p className="text-sm text-app-text-muted">Boshqa sanani yoki «30 kun» ni tanlab koʻring.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-app-text-muted">Jami <b className="text-app-text">{data.rows.length}</b> ta dars · {data.rows.filter((r) => r.kind === 'trial').length} ta sinov</p>
            {days.map(([day, items]) => (
              <section key={day} className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
                <h3 className="flex items-center justify-between border-b border-app-border bg-app-bg-muted px-4 py-2.5 text-sm font-bold text-app-text">
                  {dayTitle(day)}<span className="text-xs font-semibold normal-case text-app-text-muted">{items.length} ta dars</span>
                </h3>
                <ul className="divide-y divide-app-border">
                  {items.map((it) => {
                    const st = statusOf(it);
                    const live = new Date(it.starts_at).getTime() <= now && now < new Date(it.ends_at ?? it.starts_at).getTime();
                    return (
                      <li key={`${it.kind}${it.id}`} className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 ${OFF.has(it.status) ? 'opacity-60' : ''}`}>
                        <span className={`w-[104px] shrink-0 font-mono text-[15px] font-bold tabular-nums ${live ? 'text-emerald-700' : 'text-app-text'}`}>
                          {timeOnly(it.starts_at)}{it.ends_at ? `–${timeOnly(it.ends_at)}` : ''}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-app-text">{it.teacher_first_name} {it.teacher_last_name}</span>
                          <span className="block truncate text-xs text-app-text-muted">Oʻquvchi: {it.student_first_name} {it.student_last_name}{it.student_phone ? ` · ${it.student_phone}` : ''}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {live && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">Hozir</span>}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${it.kind === 'trial' ? 'bg-violet-50 text-violet-800' : 'bg-slate-100 text-slate-700'}`}>{it.kind === 'trial' ? 'Sinov' : 'Pullik'}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.tone}`}>{st.text}</span>
                          <span className="w-[100px] text-right text-sm font-semibold tabular-nums text-app-text">{fmtSum(it.price_uzs)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
    </div>
  );
}
