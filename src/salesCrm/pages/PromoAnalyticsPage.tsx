import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { salesCrmApi, type PromoAnalytics } from '../api';
import { useSalesCrmAuth } from '../auth';

const metrics = [
  ['page_views', 'Ochdi'],
  ['name_inputs', 'Ism'],
  ['phone_inputs', 'Telefon'],
  ['submit_clicks', 'Yuborish'],
  ['accepted', 'Qabul'],
  ['db_leads', 'CRM lid'],
  ['platform_clicks', 'Platforma'],
] as const;

function n(value: unknown) {
  return Number(value || 0).toLocaleString('ru-RU');
}

function pct(a: number, b: number) {
  if (!b) return '0%';
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

export default function PromoAnalyticsPage() {
  const { agent } = useSalesCrmAuth();
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<PromoAnalytics | null>(null);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Promo Russian</p>
          <h2 className="mt-1 text-xl font-black">Landing tahlil</h2>
        </div>
        <div className="flex gap-2">
          <select
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold"
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
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#071B3A] px-4 text-sm font-black text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>
      </div>

      {err ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{err}</div> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
        {metrics.map(([key, label]) => (
          <div key={key} className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{n(totals?.[key])}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Ochdi → yubordi</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{submitRate}</p>
        </div>
        <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Yubordi → CRM lid</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{leadRate}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Ko‘rsatkich</th>
                <th className="px-4 py-3 text-right">Jami</th>
                {(data?.daily ?? []).map((row) => (
                  <th key={row.day} className="px-3 py-3 text-right whitespace-nowrap">{shortDay(row.day)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map(([key, label]) => (
                <tr key={key} className="font-bold text-slate-800">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-slate-950">{label}</td>
                  <td className="px-4 py-3 text-right text-slate-950">{n(totals?.[key])}</td>
                  {(data?.daily ?? []).map((row) => (
                    <td key={`${key}-${row.day}`} className="px-3 py-3 text-right">{n(row[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
