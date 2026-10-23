/**
 * AdminUserJourneyPage — ro'yxatdan o'tgandan keyin foydalanuvchi nima qildi.
 *
 * Yuqorida voronka (ro'yxat → qaytib kirish → 0-kun → video → obuna),
 * pastda har bir foydalanuvchi: 0-kunning qaysi blokigacha yetgani va
 * kurs videosining qaysi daqiqasigacha ko'rgani.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { adminPath } from '../../constants/adminPath';
import { formatClock } from '../../../shared/userJourney';
import {
  DAY0_STATUS_LABEL, Day0Steps, StatusPill, VideoProgress, ago, day0Tone, type JourneyUser,
} from '../../components/admin/journey/JourneyBits';

type Totals = {
  registered: number; returned: number;
  day0_opened: number; day0_grammar: number; day0_vocab: number; day0_reading: number; day0_speaking: number; day0_completed: number;
  video_page: number; video_started: number; video_half: number; video_completed: number; video_avg_watched: number;
  premium: number;
};
type Summary = { days: number | null; totals: Totals; video_duration_seconds: number; video_dropoff: { from_seconds: number; count: number }[] };

const PERIODS = [
  { value: '1', label: 'Bugun' },
  { value: '7', label: '7 kun' },
  { value: '30', label: '30 kun' },
  { value: '90', label: '90 kun' },
  { value: '', label: 'Hammasi' },
] as const;

const FILTERS = [
  { value: '', label: 'Hammasi' },
  { value: 'no_return', label: 'Qaytib kirmagan' },
  { value: 'day0_none', label: '0-kunga kirmagan' },
  { value: 'day0_started', label: '0-kunga kirgan' },
  { value: 'video_none', label: "Video ko'rmagan" },
  { value: 'video_started', label: "Video ko'rgan" },
  { value: 'video_completed', label: 'Video oxirigacha' },
  { value: 'premium', label: 'Obunasi bor' },
] as const;

const LIMIT = 50;

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

function FunnelRow({ label, value, base, hint }: { label: string; value: number; base: number; hint?: string }) {
  const p = pct(value, base);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
      <span className="truncate text-[13.5px] font-bold text-app-text" title={hint}>{label}</span>
      <span className="text-right text-[13.5px] font-black tabular-nums text-app-text">
        {value.toLocaleString()} <span className="font-bold text-app-text-muted">· {p}%</span>
      </span>
      <span className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-blue-600 transition-[width] duration-500" style={{ width: `${p}%` }} />
      </span>
    </li>
  );
}

function Card({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
      <h2 className="text-[13px] font-black uppercase tracking-wide text-app-text-muted">{title}</h2>
      {note && <p className="mt-1 text-[12.5px] text-app-text-muted">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AdminUserJourneyPage() {
  const [params, setParams] = useSearchParams();
  const days = params.get('days') ?? '30';
  const status = params.get('status') ?? '';
  const query = params.get('q') ?? '';
  const offset = Math.max(0, Number(params.get('offset')) || 0);
  const [search, setSearch] = useState(query);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<JourneyUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'offset') next.delete('offset');
    setParams(next, { replace: true });
  };

  // Qidiruv yozilayotganda har harfga so'rov ketmasin.
  useEffect(() => {
    if (search === query) return;
    const t = window.setTimeout(() => set('q', search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    adminApi<Summary>(`/user-journey/summary?days=${days}`)
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Xatolik'); });
    return () => { cancelled = true; };
  }, [days, reload]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    const qs = new URLSearchParams({ days, limit: String(LIMIT), offset: String(offset) });
    if (status) qs.set('status', status);
    if (query) qs.set('q', query);
    adminApi<{ rows: JourneyUser[]; total: number }>(`/user-journey/list?${qs}`)
      .then((r) => { if (!cancelled) { setRows(r.rows); setTotal(r.total); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Xatolik'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, status, query, offset, reload]);

  const t = summary?.totals;
  const maxDrop = Math.max(1, ...(summary?.video_dropoff ?? []).map((d) => d.count));

  return (
    <div className="max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold text-app-text">Foydalanuvchi yo'li</h1>
          <p className="mt-1 text-sm text-app-text-muted">Ro'yxatdan o'tgandan keyin: qaytib kirdimi, 0-kunda qayergacha yetdi, kurs videosini qancha ko'rdi.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl border border-app-border bg-app-surface p-1" role="group" aria-label="Ro'yxatdan o'tgan davr">
          {PERIODS.map((p) => (
            <button key={p.label} type="button" onClick={() => set('days', p.value || '0')} aria-pressed={days === (p.value || '0')}
              className={`min-h-11 rounded-xl px-3 text-[13px] font-bold transition-colors ${days === (p.value || '0') ? 'bg-blue-600 text-white' : 'text-app-text hover:bg-app-bg-muted'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setReload((n) => n + 1)} aria-label="Yangilash" className="ui-button ui-button--secondary min-h-11"><RefreshCw size={18} /></button>
      </header>

      {error && <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} />{error}</p>}

      {t ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Ro'yxat va qaytish">
            <p className="text-3xl font-black tabular-nums text-app-text">{t.registered.toLocaleString()}</p>
            <p className="text-[12.5px] text-app-text-muted">ro'yxatdan o'tgan</p>
            <ul className="mt-4 space-y-3">
              <FunnelRow label="Qaytib kirgan" value={t.returned} base={t.registered} hint="Ro'yxatdan 30 daqiqadan keyin yana ko'ringan" />
              <FunnelRow label="Obuna olgan" value={t.premium} base={t.registered} />
            </ul>
          </Card>
          <Card title="0-kun (sinov darsi)">
            <ul className="space-y-3">
              <FunnelRow label="Ochgan" value={t.day0_opened} base={t.registered} />
              <FunnelRow label="Grammatika" value={t.day0_grammar} base={t.registered} />
              <FunnelRow label="Lug'at" value={t.day0_vocab} base={t.registered} />
              <FunnelRow label="O'qish" value={t.day0_reading} base={t.registered} />
              <FunnelRow label="Gapirish" value={t.day0_speaking} base={t.registered} />
              <FunnelRow label="To'liq tugatgan" value={t.day0_completed} base={t.registered} />
            </ul>
          </Card>
          <Card title="Kurs haqida video" note={`Davomiyligi ${formatClock(summary!.video_duration_seconds)} · o'rtacha ko'rilgan ${formatClock(t.video_avg_watched)}`}>
            <ul className="space-y-3">
              <FunnelRow label="Sahifani ochgan" value={t.video_page} base={t.registered} />
              <FunnelRow label="Boshlagan" value={t.video_started} base={t.registered} />
              <FunnelRow label="Yarmidan o'tgan" value={t.video_half} base={t.registered} />
              <FunnelRow label="Oxirigacha" value={t.video_completed} base={t.registered} />
            </ul>
            {summary!.video_dropoff.length > 0 && (
              <div className="mt-4">
                <p className="text-[12px] font-bold text-app-text-muted">Qayerda to'xtatgan (tugatmaganlar)</p>
                <div className="mt-2 flex h-16 items-end gap-0.5" aria-label="Videoni to'xtatish joylari">
                  {summary!.video_dropoff.map((d) => (
                    <div key={d.from_seconds} className="group relative flex-1" title={`${formatClock(d.from_seconds)}–${formatClock(d.from_seconds + 30)}: ${d.count} kishi`}>
                      <div className="w-full rounded-t bg-amber-400" style={{ height: `${Math.max(6, (d.count / maxDrop) * 64)}px` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] tabular-nums text-app-text-muted">
                  <span>{formatClock(summary!.video_dropoff[0].from_seconds)}</span>
                  <span>{formatClock(summary!.video_dropoff[summary!.video_dropoff.length - 1].from_seconds + 30)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : !error ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : null}

      <section className="rounded-2xl border border-app-border bg-app-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-app-border p-4">
          <p className="mr-auto text-[15px] font-black text-app-text">Foydalanuvchilar <span className="text-slate-400">({total.toLocaleString()})</span></p>
          <label className="relative block w-full sm:w-64">
            <span className="sr-only">Qidirish</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism, telefon, email yoki ID"
              className="min-h-11 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-[13.5px] text-app-text" />
          </label>
          <select value={status} onChange={(e) => set('status', e.target.value)} aria-label="Holat bo'yicha filtr"
            className="min-h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 text-[13px] font-bold text-app-text sm:w-auto">
            {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Telefon: kartochkalar */}
        <ul className="divide-y divide-app-border md:hidden">
          {rows.map((u) => (
            <li key={u.id}>
              <Link to={adminPath(`/users/${u.id}`)} className="block space-y-3 p-4 active:bg-app-bg-muted">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-app-text">{u.name || `#${u.id}`}</p>
                    <p className="truncate text-[12.5px] text-app-text-muted">{u.phone || u.email || '—'}</p>
                  </div>
                  <StatusPill tone={day0Tone(u.day0.status)}>{DAY0_STATUS_LABEL[u.day0.status]}</StatusPill>
                </div>
                <Day0Steps blocks={u.day0.blocks} compact />
                <VideoProgress video={u.video} compact />
                <p className="text-[12px] text-app-text-muted">Ro'yxat: {ago(u.created_at)} · oxirgi: {ago(u.last_seen_at)}</p>
              </Link>
            </li>
          ))}
        </ul>

        {/* Kompyuter: jadval */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-app-border bg-app-bg-muted text-[11.5px] uppercase tracking-wide text-app-text-muted">
                {['Foydalanuvchi', "Ro'yxat", 'Oxirgi faollik', '0-kun', 'Kurs videosi', 'Obuna'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 font-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-app-border align-top last:border-0 hover:bg-app-bg-muted">
                  <td className="px-3 py-3">
                    <Link to={adminPath(`/users/${u.id}`)} className="block font-bold text-app-text hover:text-blue-700">{u.name || `#${u.id}`}</Link>
                    <span className="block text-[12px] text-app-text-muted">{u.phone || u.email || '—'}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-app-text">{ago(u.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="block text-app-text">{ago(u.last_seen_at)}</span>
                    <span className="block text-[12px] text-app-text-muted">{u.visit_days} kun faol{u.login_count ? ` · ${u.login_count} kirish` : ''}</span>
                  </td>
                  <td className="w-[300px] px-3 py-3">
                    <div className="mb-2 flex items-center gap-2">
                      <StatusPill tone={day0Tone(u.day0.status)}>{DAY0_STATUS_LABEL[u.day0.status]}</StatusPill>
                      <span className="text-[12px] tabular-nums text-app-text-muted">{u.day0.doneBlocks}/{u.day0.totalBlocks}</span>
                    </div>
                    <Day0Steps blocks={u.day0.blocks} compact />
                  </td>
                  <td className="w-[240px] px-3 py-3"><VideoProgress video={u.video} /></td>
                  <td className="px-3 py-3">{u.premium ? <StatusPill tone="green">Faol</StatusPill> : <span className="text-app-text-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && rows.length === 0 && <p className="p-8 text-center text-app-text-muted" role="status">Yuklanmoqda…</p>}
        {!loading && rows.length === 0 && !error && <p className="p-8 text-center text-slate-400">Bu filtr bo'yicha foydalanuvchi yo'q</p>}

        {total > LIMIT && (
          <div className="flex items-center justify-between gap-3 border-t border-app-border p-3">
            <button type="button" disabled={offset === 0} onClick={() => set('offset', String(Math.max(0, offset - LIMIT)))}
              className="min-h-11 rounded-xl border border-app-border px-4 text-[13px] font-bold text-app-text disabled:opacity-40">← Oldingi</button>
            <span className="text-[13px] font-bold tabular-nums text-app-text-muted">{offset + 1}–{Math.min(offset + LIMIT, total)} / {total}</span>
            <button type="button" disabled={offset + LIMIT >= total} onClick={() => set('offset', String(offset + LIMIT))}
              className="min-h-11 rounded-xl border border-app-border px-4 text-[13px] font-bold text-app-text disabled:opacity-40">Keyingi →</button>
          </div>
        )}
      </section>

      <p className="text-[12px] text-app-text-muted">
        0-kun bloklari: <span className="font-bold text-emerald-700">yashil</span> — bajarildi, <span className="font-bold text-amber-700">sariq</span> — boshlangan, <span className="font-bold text-blue-700">ko'k</span> — faqat ochilgan.
        Kuzatuv 2026-10-23 dan boshlangan: undan oldingi 0-kun bloklari bajarilgani ko'rinadi, lekin ochilgani va video ko'rilgani yozilmagan.
      </p>
    </div>
  );
}
