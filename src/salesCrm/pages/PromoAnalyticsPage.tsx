import { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { salesCrmApi, type PromoAnalytics, type PromoSession } from '../api';
import { useSalesCrmAuth } from '../auth';

const metrics = [
  { key: 'page_views', label: 'Ochdi' },
  { key: 'name_inputs', label: 'Ism' },
  { key: 'phone_inputs', label: 'Telefon' },
  { key: 'submit_clicks', label: 'Yuborish' },
  { key: 'accepted', label: 'Qabul' },
  { key: 'db_leads', label: 'CRM lid' },
  { key: 'form_errors', label: 'Xato' },
  { key: 'platform_clicks', label: 'Platforma' },
] as const;

type MetricKey = (typeof metrics)[number]['key'];

function n(value: unknown) {
  return Number(value || 0).toLocaleString('ru-RU');
}

function countText(value: unknown) {
  const num = Number(value || 0);
  return num ? n(num) : '−';
}

function pct(a: number, b: number) {
  if (!b) return '−';
  return `${Math.round((a / b) * 100)}%`;
}

const monthShort = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];

function shortDay(value: string) {
  const [, monthRaw, dayRaw] = value.split('-');
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!month || !day) return value;
  return `${day} ${monthShort[month - 1] ?? ''}`.trim();
}

function tashkentDayKey() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function hasActivity(row: PromoAnalytics['daily'][number]) {
  return metrics.some(({ key }) => Number(row[key] || 0) > 0);
}

function dayValue(row: PromoAnalytics['daily'][number], key: MetricKey, todayKey: string) {
  const value = Number(row[key] || 0);
  if (row.day > todayKey || !value) return '−';
  return n(value);
}

const stepLabels: Record<PromoSession['last_step'], { label: string; className: string }> = {
  open: { label: 'Faqat ochdi', className: 'bg-slate-100 text-slate-600' },
  name: { label: 'Ism yozdi', className: 'bg-blue-50 text-blue-700' },
  phone: { label: 'Telefon yozdi', className: 'bg-indigo-50 text-indigo-700' },
  submit: { label: 'Yubordi', className: 'bg-amber-50 text-amber-700' },
  error: { label: 'Xato', className: 'bg-red-50 text-red-700' },
  accepted: { label: 'Qabul', className: 'bg-emerald-50 text-emerald-700' },
  crm: { label: 'CRM lid', className: 'bg-[#071B3A] text-white' },
};

function timeText(session: PromoSession) {
  const seconds = Math.max(session.duration_seconds || 0, Math.round((session.time_ms || 0) / 1000));
  if (!seconds) return '−';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PromoAnalyticsPage() {
  const { agent } = useSalesCrmAuth();
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<PromoAnalytics | null>(null);
  const [view, setView] = useState<'summary' | 'sessions'>('summary');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      setData(await salesCrmApi.promoAnalytics(period));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Xato');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (agent?.role === 'admin') void load();
  }, [agent?.role, period]);

  if (agent?.role !== 'admin') {
    return <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">Faqat admin uchun.</div>;
  }

  const totals = data?.totals;
  const submitRate = pct(Number(totals?.submit_clicks || 0), Number(totals?.page_views || 0));
  const leadRate = pct(Number(totals?.db_leads || 0), Number(totals?.submit_clicks || 0));
  const todayKey = tashkentDayKey();
  const visibleDays = (data?.daily ?? [])
    .filter((row) => row.day >= todayKey || hasActivity(row))
    .sort((a, b) => a.day.localeCompare(b.day));
  const primaryTotal = Number(totals?.page_views || 0);
  const crmTotal = Number(totals?.db_leads || 0);
  const platformTotal = Number(totals?.platform_clicks || 0);
  const sessions = data?.sessions ?? [];
  const openedOnly = sessions.filter((session) => session.last_step === 'open').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Promo Russian</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Landing tahlil</h2>
        </div>
        <div className="flex gap-2">
          <select
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="today">Bugun</option>
            <option value="yesterday">Kecha</option>
            <option value="7d">7 kun</option>
            <option value="30d">30 kun</option>
            <option value="month">Shu oy</option>
            <option value="all">Hammasi</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#071B3A] px-4 text-sm font-black text-white shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>
      </div>

      {err ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{err}</div> : null}

      <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-200 p-1 md:w-[360px]">
        {[
          ['summary', 'Umumiy'],
          ['sessions', 'Sessiyalar'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key as 'summary' | 'sessions')}
            className={`h-10 rounded-xl text-sm font-black ${view === key ? 'bg-white text-[#071B3A] shadow-sm' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'sessions' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Sessiya</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{countText(sessions.length)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Faqat ochdi</p>
              <p className="mt-2 text-2xl font-black text-red-600">{countText(openedOnly)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Xato</p>
              <p className="mt-2 text-2xl font-black text-amber-600">{countText(totals?.form_errors)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">CRM lid</p>
              <p className="mt-2 text-2xl font-black text-emerald-600">{countText(totals?.db_leads)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-black text-slate-950">Oxirgi sessiyalar</h3>
              <p className="text-xs font-bold text-slate-400">Shaxsiy ma’lumotlarsiz: faqat qadamlar, UTM va qurilma.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {sessions.length ? sessions.map((session) => {
                const badge = stepLabels[session.last_step] ?? stepLabels.open;
                return (
                  <article key={session.session_id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${badge.className}`}>{badge.label}</span>
                          <span className="text-xs font-bold text-slate-400">{dateTime(session.first_at)} · {timeText(session)}</span>
                        </div>
                        <p className="mt-2 text-sm font-black text-slate-950">
                          {session.utm_source || 'source yo‘q'} · {session.utm_campaign || 'campaign yo‘q'}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {session.device || 'device yo‘q'} · {session.lang || 'lang yo‘q'} · {session.referrer_host || 'referrer yo‘q'}
                        </p>
                      </div>
                      {session.error_code ? (
                        <span className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">{session.error_code}</span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[
                        ['page_view', 'Ochdi'],
                        ['name_input', 'Ism'],
                        ['phone_input', 'Telefon'],
                        ['submit_click', 'Yuborish'],
                        ['lead_saved', 'Qabul'],
                        ['crm_lead_saved', 'CRM'],
                      ].map(([key, label]) => (
                        <span
                          key={key}
                          className={`rounded-lg px-2 py-1 text-[11px] font-black ${
                            session.steps?.[key as keyof PromoSession['steps']]
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              }) : (
                <p className="p-4 text-sm font-semibold text-slate-500">Bu davrda sessiya yo‘q.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
      <div className="rounded-[22px] bg-[#071B3A] p-4 text-white shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-100/70">Ochdi</p>
            <p className="mt-2 text-3xl font-black">{countText(primaryTotal)}</p>
          </div>
          <ArrowRight className="hidden h-5 w-5 text-blue-100/50 lg:block" />
          <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-100/70">Yuborish</p>
            <p className="mt-2 text-3xl font-black">{countText(totals?.submit_clicks)}</p>
            <p className="mt-1 text-xs font-bold text-blue-100/70">{submitRate}</p>
          </div>
          <ArrowRight className="hidden h-5 w-5 text-blue-100/50 lg:block" />
          <div className="rounded-2xl bg-white p-4 text-[#071B3A]">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">CRM lid</p>
            <p className="mt-2 text-3xl font-black">{countText(crmTotal)}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{leadRate}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics
          .filter(({ key }) => !['page_views', 'submit_clicks', 'db_leads', 'platform_clicks'].includes(key))
          .map(({ key, label }) => (
            <div key={key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{countText(totals?.[key])}</p>
            </div>
          ))}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Platformaga o‘tdi</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{countText(platformTotal)}</p>
        </div>
      </div>
        </>
      )}

      {view === 'summary' ? <div className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-base font-black text-slate-950">Kunlar bo‘yicha</h3>
            <p className="text-xs font-bold text-slate-400">Bo‘sh kunlar yashirildi, kelmagan kunlar “−”.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{shortDay(todayKey)} bugun</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Ko‘rsatkich</th>
                <th className="px-4 py-3 text-right">Jami</th>
                {visibleDays.map((row) => (
                  <th
                    key={row.day}
                    className={`whitespace-nowrap px-3 py-3 text-right ${row.day === todayKey ? 'bg-blue-600 text-white' : ''}`}
                  >
                    {shortDay(row.day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map(({ key, label }) => (
                <tr key={key} className="font-bold text-slate-800">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-slate-950">{label}</td>
                  <td className="px-4 py-3 text-right text-slate-950">{countText(totals?.[key])}</td>
                  {visibleDays.map((row) => (
                    <td
                      key={`${key}-${row.day}`}
                      className={`px-3 py-3 text-right ${row.day === todayKey ? 'bg-blue-50 text-slate-950' : ''} ${
                        row.day > todayKey || !Number(row[key] || 0) ? 'text-slate-300' : ''
                      }`}
                    >
                      {dayValue(row, key, todayKey)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div> : null}
    </div>
  );
}
