/**
 * O'QITUVCHILAR → «Darslar»: maktab jadvalidek hafta — ustunlar kunlar, qatorlar soatlar
 * (Toshkent vaqti). Katakda bitta dars bo'lsa o'qituvchi va o'quvchi ismi, bir nechta
 * bo'lsa «N ta dars»; bosilganda oynada ro'yxat va «Darsga kirish». Pullik va sinov
 * darslari birga. Ikkinchi ko'rinish — kunlar bo'yicha ro'yxat.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, Radio, Video, X } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { adminPath } from '../../../constants/adminPath';
import { LESSON_STATUS_LABEL, type LessonStatus } from '../../../../shared/teacherLessons';
import { fmtSum, tashkentDay, timeOnly } from './shared';

type Item = {
  kind: 'paid' | 'trial'; id: number; teacher_user_id: number; starts_at: string; ends_at: string | null; status: string; price_uzs: number;
  teacher_first_name: string; teacher_last_name: string; student_first_name: string; student_last_name: string; student_phone: string | null;
};
type Resp = { from: string; to: string; rows: Item[]; teachers: { user_id: number; first_name: string; last_name: string }[] };

const TZ_MS = 5 * 3600_000;
// Brauzerlarda uz-UZ oy/kun nomlari ko'pincha yo'q («M10 23, Fri») — o'zimiz yozamiz.
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const WD_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

const TRIAL_STATUS: Record<string, string> = {
  paid: 'Toʻlangan', teacher_notified: 'Ustozga yuborilgan', scheduled: 'Rejalashtirilgan', completed_by_teacher: 'Ustoz yakunladi',
  completed: 'Oʻtkazilgan', cancelled: 'Bekor qilingan', refunded: 'Qaytarilgan',
};
const DONE = new Set(['completed', 'completed_by_teacher']);
const OFF = new Set(['cancelled', 'refunded']);

const local = (iso: string) => new Date(new Date(iso).getTime() + TZ_MS);
const dayOf = (iso: string) => local(iso).toISOString().slice(0, 10);
const hourOf = (iso: string) => local(iso).getUTCHours();
const isLive = (it: Item, now: number) => !OFF.has(it.status) && new Date(it.starts_at).getTime() <= now && now < new Date(it.ends_at ?? it.starts_at).getTime();
const teacherName = (it: Item) => `${it.teacher_first_name} ${it.teacher_last_name}`.trim();
const studentName = (it: Item) => `${it.student_first_name ?? ''} ${it.student_last_name ?? ''}`.trim() || 'Oʻquvchi';

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function mondayOf(day: string) {
  const wd = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, wd === 0 ? -6 : 1 - wd);
}
function dayLabel(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`;
}
function statusOf(it: Item) {
  const text = it.kind === 'paid' ? LESSON_STATUS_LABEL[it.status as LessonStatus]?.uz ?? it.status : TRIAL_STATUS[it.status] ?? it.status;
  const tone = OFF.has(it.status) ? 'bg-red-50 text-red-700' : DONE.has(it.status) ? 'bg-emerald-50 text-emerald-800'
    : it.status === 'disputed' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800';
  return { text, tone };
}

export default function ScheduleTab() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view = params.get('view') === 'list' ? 'list' : 'week';
  const teacher = params.get('teacher') ?? '';
  const today = tashkentDay(0);
  const week = mondayOf(params.get('week') ?? today);
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<{ title: string; items: Item[] } | null>(null);
  const [now, setNow] = useState(Date.now());
  const grid = useRef<HTMLDivElement>(null);

  // «Hozir» belgisi va jonli darslar daqiqasiga bir yangilansin.
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(t); }, []);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    setError('');
    adminApi<Resp>(`/teacher-money/schedule?from=${week}&to=${addDays(week, 6)}${teacher ? `&teacher=${teacher}` : ''}`)
      .then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [week, teacher]);
  useEffect(() => { setData(null); load(); }, [load]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);
  // Telefonda jadval yon tomonga suriladi — bugungi kun ustuni darhol ko'rinsin.
  useEffect(() => {
    const el = grid.current;
    const idx = days.indexOf(today);
    if (!el || idx < 0 || el.scrollWidth <= el.clientWidth) return;
    const col = (el.scrollWidth - 64) / 7;
    el.scrollLeft = Math.max(0, idx * col - col / 2);
  }, [data, days, today]);
  const cells = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of data?.rows ?? []) {
      const key = `${dayOf(it.starts_at)}|${hourOf(it.starts_at)}`;
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return map;
  }, [data]);
  // Soatlar: odatda 08–21, lekin darslar tashqarida bo'lsa kengayadi.
  const hours = useMemo(() => {
    const hs = (data?.rows ?? []).map((r) => hourOf(r.starts_at));
    const from = Math.min(8, ...hs), to = Math.max(21, ...hs);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [data]);

  const active = (data?.rows ?? []).filter((r) => !OFF.has(r.status));
  const liveNow = active.filter((r) => isLive(r, now));
  const todayCount = active.filter((r) => dayOf(r.starts_at) === today).length;
  const nowHour = local(new Date(now).toISOString()).getUTCHours();
  const enter = (it: Item) => navigate(adminPath(`/teachers/dars/${it.kind}/${it.id}`));
  const weekTitle = (() => {
    const a = new Date(`${days[0]}T00:00:00Z`), b = new Date(`${days[6]}T00:00:00Z`);
    return a.getUTCMonth() === b.getUTCMonth()
      ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`
      : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  })();
  const navBtn = 'flex h-11 w-11 items-center justify-center rounded-xl border border-app-border bg-app-surface text-app-text hover:bg-app-bg-muted';

  return (
    <div className="space-y-4">
      {/* Tezkor holat: hozir va bugun */}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={!liveNow.length} onClick={() => setOpen({ title: 'Hozir ketayotgan darslar', items: liveNow })}
          className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:p-3.5 ${liveNow.length ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-app-border bg-app-surface'}`}>
          <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${liveNow.length ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Radio className="h-5 w-5" /></span>
          <span><span className="block text-xs text-app-text-muted">Hozir</span><span className="text-base font-bold tabular-nums text-app-text sm:text-lg">{liveNow.length} ta dars</span></span>
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-3 sm:p-3.5">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 sm:flex"><CalendarDays className="h-5 w-5" /></span>
          <span><span className="block text-xs text-app-text-muted">Bugun</span><span className="text-base font-bold tabular-nums text-app-text sm:text-lg">{week <= today && today <= days[6] ? `${todayCount} ta dars` : '—'}</span></span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-3 sm:p-3.5">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 sm:flex"><LayoutGrid className="h-5 w-5" /></span>
          <span><span className="block text-xs text-app-text-muted">Shu hafta</span><span className="text-base font-bold tabular-nums text-app-text sm:text-lg">{active.length} ta dars</span></span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Oldingi hafta" onClick={() => set({ week: addDays(week, -7) })} className={navBtn}><ChevronLeft className="h-5 w-5" /></button>
        <p className="min-w-[150px] text-center text-sm font-bold text-app-text">{weekTitle}</p>
        <button type="button" aria-label="Keyingi hafta" onClick={() => set({ week: addDays(week, 7) })} className={navBtn}><ChevronRight className="h-5 w-5" /></button>
        <button type="button" onClick={() => set({ week: null })} className="min-h-11 rounded-xl border border-app-border bg-app-surface px-3.5 text-sm font-semibold text-app-text hover:bg-app-bg-muted">Bugun</button>
        <div className="flex rounded-xl border border-app-border bg-app-surface p-0.5">
          {([['week', 'Hafta', LayoutGrid], ['list', 'Roʻyxat', List]] as const).map(([k, l, Icon]) => (
            <button key={k} type="button" onClick={() => set({ view: k === 'week' ? null : k })} aria-pressed={view === k}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${view === k ? 'bg-blue-600 text-white' : 'text-app-text'}`}><Icon className="h-4 w-4" />{l}</button>
          ))}
        </div>
        <select value={teacher} onChange={(e) => set({ teacher: e.target.value || null })} aria-label="Oʻqituvchi"
          className="min-h-11 min-w-[200px] flex-1 rounded-xl border border-app-border bg-app-surface px-3 text-sm sm:ml-auto sm:flex-none">
          <option value="">Hamma oʻqituvchilar</option>
          {data?.teachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.first_name} {t.last_name}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!data ? <div className="h-96 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />
        : view === 'list' ? <ListView rows={data.rows} now={now} onEnter={enter} />
        : (
          <div ref={grid} className="overflow-x-auto rounded-2xl border border-app-border bg-app-surface">
            <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-16 border-b border-app-border bg-app-surface" />
                  {days.map((d) => {
                    const dt = new Date(`${d}T00:00:00Z`);
                    const isToday = d === today;
                    return (
                      <th key={d} className={`border-b border-l border-app-border px-2 py-2.5 text-center ${isToday ? 'bg-blue-50' : ''}`}>
                        <span className={`block text-xs font-semibold ${isToday ? 'text-blue-700' : 'text-app-text-muted'}`}>{WD_SHORT[dt.getUTCDay()]}</span>
                        <span className={`mx-auto mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-bold tabular-nums ${isToday ? 'bg-blue-600 text-white' : 'text-app-text'}`}>{dt.getUTCDate()}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h}>
                    <th className={`sticky left-0 z-10 border-b border-app-border bg-app-surface px-2 py-1 text-right align-top font-mono text-xs font-semibold tabular-nums ${h === nowHour ? 'text-emerald-700' : 'text-app-text-muted'}`}>
                      {String(h).padStart(2, '0')}:00
                    </th>
                    {days.map((d) => {
                      const items = cells.get(`${d}|${h}`) ?? [];
                      const live = items.some((it) => isLive(it, now));
                      const allOff = items.length > 0 && items.every((it) => OFF.has(it.status));
                      const current = d === today && h === nowHour;
                      return (
                        <td key={d} className={`h-[60px] border-b border-l border-app-border p-1 align-top ${current ? 'bg-emerald-50/60' : d === today ? 'bg-blue-50/40' : ''}`}>
                          {items.length > 0 && (
                            <button type="button" onClick={() => setOpen({ title: `${dayLabel(d)} · ${String(h).padStart(2, '0')}:00`, items })}
                              className={`flex h-full w-full flex-col justify-center rounded-lg px-2 py-1 text-left transition hover:brightness-95 active:scale-[0.98] ${
                                live ? 'bg-emerald-500 text-white shadow-[0_8px_20px_-10px_rgba(16,185,129,0.8)]' : allOff ? 'bg-slate-100 text-slate-400 line-through' : items.length > 1 ? 'bg-violet-200 text-violet-950' : 'bg-blue-100 text-blue-900'
                              }`}>
                              {items.length === 1 ? (
                                <>
                                  <span className="block truncate text-[12px] font-bold leading-tight">{teacherName(items[0])}</span>
                                  <span className="block truncate text-[11.5px] leading-tight opacity-80">{studentName(items[0])}</span>
                                </>
                              ) : (
                                <span className="text-[13px] font-bold">{items.length} ta dars</span>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <div className="flex flex-wrap gap-3 text-xs text-app-text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-100" />Bitta dars</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-violet-200" />Bir nechta dars</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" />Hozir ketmoqda</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100" />Bekor qilingan</span>
      </div>

      {open && <LessonsModal title={open.title} items={open.items} now={now} onClose={() => setOpen(null)} onEnter={enter} />}
    </div>
  );
}

function LessonRow({ it, now, onEnter }: { it: Item; now: number; onEnter?: (it: Item) => void }) {
  const st = statusOf(it);
  const live = isLive(it, now);
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${OFF.has(it.status) ? 'opacity-60' : ''}`}>
      <span className={`w-[104px] shrink-0 font-mono text-[15px] font-bold tabular-nums ${live ? 'text-emerald-700' : 'text-app-text'}`}>
        {timeOnly(it.starts_at)}{it.ends_at ? `–${timeOnly(it.ends_at)}` : ''}
      </span>
      <span className="min-w-[200px] flex-1">
        <span className="block truncate text-sm font-semibold text-app-text">Ustoz: {teacherName(it)}</span>
        <span className="block truncate text-xs text-app-text-muted">Oʻquvchi: {studentName(it)}{it.student_phone ? ` · ${it.student_phone}` : ''}</span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        {live && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">Hozir</span>}
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${it.kind === 'trial' ? 'bg-violet-50 text-violet-800' : 'bg-slate-100 text-slate-700'}`}>{it.kind === 'trial' ? 'Sinov' : 'Pullik'}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.tone}`}>{st.text}</span>
        <span className="text-sm font-semibold tabular-nums text-app-text">{fmtSum(it.price_uzs)}</span>
      </span>
      {onEnter && !OFF.has(it.status) && (
        <button type="button" onClick={() => onEnter(it)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold transition active:scale-[0.98] ${live ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-app-border text-app-text hover:bg-app-bg-muted'}`}>
          <Video className="h-4 w-4" />Darsga kirish
        </button>
      )}
    </li>
  );
}

function LessonsModal({ title, items, now, onClose, onEnter }: { title: string; items: Item[]; now: number; onClose: () => void; onEnter: (it: Item) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0F172A]/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-[24px] bg-app-surface pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_24px_60px_rgba(15,23,42,0.35)] sm:max-w-[640px] sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-app-border bg-app-surface px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-app-text">{title}</h2>
            <p className="text-xs text-app-text-muted">{items.length} ta dars</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full text-app-text-muted hover:bg-app-bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <ul className="divide-y divide-app-border">{items.map((it) => <LessonRow key={`${it.kind}${it.id}`} it={it} now={now} onEnter={onEnter} />)}</ul>
      </div>
    </div>
  );
}

function ListView({ rows, now, onEnter }: { rows: Item[]; now: number; onEnter: (it: Item) => void }) {
  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of rows) map.set(dayOf(it.starts_at), [...(map.get(dayOf(it.starts_at)) ?? []), it]);
    return [...map.entries()];
  }, [rows]);
  if (!byDay.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-app-border p-10 text-center">
        <CalendarDays className="h-8 w-8 text-slate-300" />
        <p className="font-semibold text-app-text">Bu haftada dars yoʻq</p>
        <p className="text-sm text-app-text-muted">Keyingi haftaga oʻting yoki boshqa oʻqituvchini tanlang.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {byDay.map(([day, items]) => (
        <section key={day} className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
          <h3 className="flex items-center justify-between border-b border-app-border bg-app-bg-muted px-4 py-2.5 text-sm font-bold text-app-text">
            {day === tashkentDay(0) ? `Bugun · ${dayLabel(day)}` : dayLabel(day)}<span className="text-xs font-semibold text-app-text-muted">{items.length} ta dars</span>
          </h3>
          <ul className="divide-y divide-app-border">
            {items.map((it) => <LessonRow key={`${it.kind}${it.id}`} it={it} now={now} onEnter={onEnter} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
