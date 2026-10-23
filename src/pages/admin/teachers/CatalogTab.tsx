/**
 * O'QITUVCHILAR → «O'qituvchilar»: tekshiruvdan o'tgan hamma o'qituvchi va katalog
 * tumbleri. Tasdiqlangan o'qituvchi katalogda o'zi chiqmaydi — admin tumblerni
 * yoqqandagina o'quvchilar uni ro'yxatda ko'radi va darsga yozila oladi.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { resolveAssetUrl } from '../../../api';
import { ContactLinks, dateTime, fmtSum } from './shared';

type Teacher = {
  user_id: number; first_name: string; last_name: string; avatar_url: string | null; profile_status: string;
  catalog_visible: boolean; catalog_visible_changed_at: string | null; reviewed_at: string | null; lesson_price_uzs: number | null;
  contact_phone: string | null; contact_telegram: string | null; contact_whatsapp: string | null; phone: string | null; email: string | null;
  lessons_done: number; lessons_upcoming: number;
};

function Toggle({ on, busy, onChange, label }: { on: boolean; busy: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={busy} onClick={() => onChange(!on)}
      className={`relative inline-flex h-11 w-[68px] shrink-0 items-center rounded-full p-1 transition disabled:opacity-60 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`h-9 w-9 rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.25)] transition-transform ${on ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
}

export default function CatalogTab() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Teacher[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    adminApi<{ rows: Teacher[] }>('/teacher-catalog').then((r) => setRows(r.rows)).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (t: Teacher, visible: boolean) => {
    if (!visible && !window.confirm(`${t.first_name} ${t.last_name} katalogdan olinsinmi? Oʻquvchilar uni koʻrmaydi va yangi darsga yozila olmaydi.`)) return;
    setBusy(t.user_id); setError('');
    setRows((list) => list?.map((x) => (x.user_id === t.user_id ? { ...x, catalog_visible: visible } : x)) ?? null);
    try {
      await adminApi(`/teacher-applications/${t.user_id}/catalog`, { method: 'POST', body: JSON.stringify({ visible }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
      load();
    }
  };

  const openApplication = (id: number) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'review'); next.set('view', 'history'); next.set('id', String(id));
    setParams(next);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!rows || !needle) return rows ?? [];
    return rows.filter((r) => [r.first_name, r.last_name, r.contact_phone, r.phone, r.contact_telegram, r.contact_whatsapp, String(r.user_id)]
      .some((v) => v && String(v).toLowerCase().includes(needle)));
  }, [rows, q]);
  const visible = rows?.filter((r) => r.catalog_visible).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, telefon yoki Telegram" className="w-full bg-transparent text-sm outline-none" />
        </label>
        {rows && (
          <p className="rounded-xl border border-app-border bg-app-surface px-4 py-2.5 text-sm text-app-text">
            Katalogda <b className="tabular-nums text-emerald-700">{visible}</b> / <span className="tabular-nums">{rows.length}</span>
          </p>
        )}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!rows ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />
        : !filtered.length ? (
          <p className="rounded-2xl border border-dashed border-app-border p-10 text-center text-app-text-muted">
            {rows.length ? 'Hech kim topilmadi' : 'Hali tasdiqlangan oʻqituvchi yoʻq. Arizani «Tekshiruv» tabida tasdiqlang.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((t) => (
              <li key={t.user_id} className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-app-surface p-3.5 sm:flex-nowrap ${t.catalog_visible ? 'border-emerald-200' : 'border-app-border'}`}>
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {t.avatar_url ? <img src={resolveAssetUrl(t.avatar_url) ?? t.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-app-text">{t.first_name} {t.last_name}</p>
                  <p className="text-xs text-app-text-muted">
                    {t.lesson_price_uzs ? fmtSum(t.lesson_price_uzs) : 'narx yoʻq'} · {t.lessons_done} dars oʻtgan{t.lessons_upcoming ? ` · ${t.lessons_upcoming} kutilmoqda` : ''} · tasdiq {dateTime(t.reviewed_at)}
                  </p>
                  <ContactLinks phone={t.contact_phone || t.phone} telegram={t.contact_telegram} whatsapp={t.contact_whatsapp} className="mt-1.5" />
                </div>
                <button type="button" onClick={() => openApplication(t.user_id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-app-border px-3 text-sm font-semibold text-app-text hover:bg-app-bg-muted">
                  <FileText className="h-4 w-4" />Anketa
                </button>
                <div className="flex items-center gap-2.5">
                  <span className={`w-[86px] text-right text-xs font-bold ${t.catalog_visible ? 'text-emerald-700' : 'text-app-text-muted'}`}>{t.catalog_visible ? 'Katalogda' : 'Yashirin'}</span>
                  <Toggle on={t.catalog_visible} busy={busy === t.user_id} onChange={(v) => void toggle(t, v)} label={`${t.first_name} ${t.last_name}: katalogda koʻrsatish`} />
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
