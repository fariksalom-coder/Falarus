import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { salesCrmApi, type OperatorStatRow } from '../api';
import { useSalesCrmAuth } from '../auth';

type DashboardData = {
  totals?: {
    leads?: number;
    new?: number;
    answered?: number;
    no_answer?: number;
    payment_pending?: number;
    paid?: number;
    no_next_action?: number;
  };
  conversion?: {
    lead_to_contact?: number;
    lead_to_payment?: number;
  };
};

export default function PlatformPage() {
  const { agent } = useSalesCrmAuth();
  const [period, setPeriod] = useState('30d');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [items, setItems] = useState<OperatorStatRow[]>([]);
  const [synced, setSynced] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (agent?.role !== 'admin') return;
    setErr('');
    void Promise.all([
      salesCrmApi.dashboard(period, 'platform') as Promise<DashboardData>,
      salesCrmApi.operatorStats(period, 'platform'),
    ])
      .then(([dash, stats]) => {
        setDashboard(dash);
        setItems(stats.items);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Xato'));
  }, [agent?.role, period]);

  const operator = items[0] ?? null;
  const totals = dashboard?.totals ?? {};
  const conversion = dashboard?.conversion ?? {};
  const processRate = useMemo(() => {
    if (!operator?.leads) return 0;
    return Math.round((Number(operator.processed || 0) / Number(operator.leads)) * 100);
  }, [operator]);

  if (agent?.role !== 'admin') {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
        Platforma oqimi faqat admin uchun.
      </div>
    );
  }

  async function syncPlatformLeads() {
    setBusy(true);
    setSynced(null);
    setErr('');
    try {
      const result = await salesCrmApi.sync();
      setSynced(result.synced);
      const [dash, stats] = await Promise.all([
        salesCrmApi.dashboard(period, 'platform') as Promise<DashboardData>,
        salesCrmApi.operatorStats(period, 'platform'),
      ]);
      setDashboard(dash);
      setItems(stats.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Xato');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Platforma oqimi</p>
          <h2 className="mt-1 text-xl font-black">Operator 1 nazorati</h2>
          <p className="text-sm text-slate-500">
            Platformadan ro‘yxatdan o‘tgan, hali to‘lov qilmagan foydalanuvchilar alohida hisoblanadi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/leads?flow=platform"
            className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 text-sm font-black text-[#071B3A] ring-1 ring-slate-200"
          >
            Platforma lidlarini ochish
          </Link>
          <select
            className="min-h-11 rounded-2xl border border-slate-200 px-3 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="today">Bugun</option>
            <option value="yesterday">Kecha</option>
            <option value="7d">7 kun</option>
            <option value="30d">30 kun</option>
            <option value="month">Shu oy</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncPlatformLeads()}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#071B3A] px-4 text-sm font-black text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Platforma lid" value={totals.leads ?? 0} />
        <Kpi label="Yangi" value={totals.new ?? 0} />
        <Kpi label="To‘lov kutmoqda" value={totals.payment_pending ?? 0} />
        <Kpi label="To‘lagan" value={totals.paid ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Mas’ul operator</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">{operator?.name ?? 'Operator 1'}</h3>
              <p className="text-sm text-slate-500">{operator?.login ?? 'platform registrations'}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              Platforma
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Berilgan" value={operator?.leads ?? 0} />
            <Metric label="Ishlangan" value={operator?.processed ?? 0} />
            <Metric label="Qo‘ng‘iroq" value={operator?.calls ?? 0} />
            <Metric label="Rad" value={operator?.refused ?? 0} />
          </dl>
          <div className="mt-5 space-y-3">
            <Progress label={`Ishlov ${processRate}%`} value={processRate} color="#0EA5E9" />
            <Progress
              label={`Lid → to‘lov ${Math.round((conversion.lead_to_payment ?? 0) * 100)}%`}
              value={Math.round((conversion.lead_to_payment ?? 0) * 100)}
              color="#22A552"
            />
          </div>
        </div>

        <div className="rounded-[24px] bg-[#071B3A] p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-200">Tez ko‘rinish</p>
          <h3 className="mt-1 text-lg font-black">Ro‘yxatdan o‘tganlar sifati</h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <DarkMetric label="Gaplashildi" value={totals.answered ?? 0} />
            <DarkMetric label="Javob yo‘q" value={totals.no_answer ?? 0} />
            <DarkMetric label="Keyingi qadam yo‘q" value={totals.no_next_action ?? 0} />
            <DarkMetric label="Aloqa konv." value={`${Math.round((conversion.lead_to_contact ?? 0) * 100)}%`} />
          </div>
        </div>
      </div>

      {synced != null ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
          {synced} ta platforma lidi qo‘shildi yoki yangilandi.
        </p>
      ) : null}
      {err ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{err}</p> : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-black tabular-nums text-slate-950">{value}</dd>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
      <p className="text-[11px] font-bold text-blue-100/70">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function Progress({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
    </div>
  );
}
