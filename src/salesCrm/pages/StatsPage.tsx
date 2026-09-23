import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  salesCrmApi,
  sheetsApi,
  type OperatorStatRow,
  type SheetsStatus,
  type SheetsSyncResult,
} from '../api';
import { useSalesCrmAuth } from '../auth';

const BAR_COLORS = {
  leads: '#2563EB',
  processed: '#0EA5E9',
  paid: '#22A552',
  conversion: '#7C3AED',
};

export default function StatsPage() {
  const { agent } = useSalesCrmAuth();
  const [items, setItems] = useState<OperatorStatRow[]>([]);
  const [period, setPeriod] = useState('30d');
  const [mode, setMode] = useState('round_robin');
  const [synced, setSynced] = useState<number | null>(null);
  const [sheets, setSheets] = useState<SheetsStatus | null>(null);
  const [sheetMsg, setSheetMsg] = useState('');
  const [sheetBusy, setSheetBusy] = useState(false);
  const [err, setErr] = useState('');

  const reloadSheets = useCallback(async () => {
    try {
      setSheets(await sheetsApi.status());
    } catch (e) {
      setSheetMsg(e instanceof Error ? e.message : 'Google Sheets temporarily unavailable.');
    }
  }, []);

  useEffect(() => {
    if (agent?.role !== 'admin') return;
    void salesCrmApi
      .operatorStats(period)
      .then((r) => setItems(r.items))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Xato'));
    void salesCrmApi.operators().then((r) => setMode(r.assignment.mode));
    void reloadSheets();
  }, [agent?.role, period, reloadSheets]);

  const totals = useMemo(() => {
    const leads = items.reduce((s, o) => s + Number(o.leads || 0), 0);
    const processed = items.reduce((s, o) => s + Number(o.processed || 0), 0);
    const paid = items.reduce((s, o) => s + Number(o.paid || 0), 0);
    const calls = items.reduce((s, o) => s + Number(o.calls || 0), 0);
    return {
      leads,
      processed,
      paid,
      calls,
      conversion: leads ? paid / leads : 0,
    };
  }, [items]);

  if (agent?.role !== 'admin') {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
        Statistika faqat admin uchun. O‘z navbatingizni Asosiy / Vazifalar bo‘limidan ko‘ring.
      </div>
    );
  }

  async function runSheets(action: 'sync' | 'check') {
    setSheetBusy(true);
    setSheetMsg('');
    try {
      const result: SheetsSyncResult =
        action === 'sync' ? await sheetsApi.sync() : await sheetsApi.check();
      if (!result.ok) {
        setSheetMsg(result.errorMessage || 'Google Sheets temporarily unavailable.');
      } else if (action === 'sync') {
        setSheetMsg(
          `Tekshirildi: ${result.rowsChecked}, yangi: ${result.newLeads}, dublikat: ${result.duplicates}, xato: ${result.errors}`,
        );
      } else {
        setSheetMsg('Ulanish OK');
      }
      await reloadSheets();
    } catch (e) {
      setSheetMsg(e instanceof Error ? e.message : 'Google Sheets temporarily unavailable.');
    } finally {
      setSheetBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Statistika</h2>
          <p className="text-sm text-slate-500">Operatorlar: lidlar, ishlov, konversiya</p>
        </div>
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
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Berilgan lid" value={totals.leads} tone="blue" />
        <Kpi label="Ishlangan" value={totals.processed} tone="sky" />
        <Kpi label="To‘lagan" value={totals.paid} tone="green" />
        <Kpi
          label="Konversiya"
          value={`${Math.round(totals.conversion * 100)}%`}
          tone="violet"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Lidlar: berilgan vs to‘lagan" subtitle="Har bir operator">
          <GroupedBars
            items={items}
            series={[
              { key: 'leads', label: 'Berilgan', color: BAR_COLORS.leads },
              { key: 'paid', label: 'To‘lagan', color: BAR_COLORS.paid },
            ]}
          />
        </ChartCard>

        <ChartCard title="Ishlov" subtitle="Berilgan → ishlangan">
          <GroupedBars
            items={items}
            series={[
              { key: 'leads', label: 'Berilgan', color: BAR_COLORS.leads },
              { key: 'processed', label: 'Ishlangan', color: BAR_COLORS.processed },
            ]}
          />
        </ChartCard>

        <ChartCard title="Konversiya %" subtitle="To‘lov / berilgan lid">
          <ConversionBars items={items} />
        </ChartCard>

        <ChartCard title="Operator ulushi" subtitle="Lidlar taqsimoti">
          <ShareBars items={items} total={totals.leads} />
        </ChartCard>
      </div>

      {/* Operator cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((o) => (
          <OperatorCard key={o.id} op={o} />
        ))}
        {items.length === 0 ? (
          <p className="col-span-full rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
            Operatorlar yo‘q yoki tanlangan davrda ma’lumot yo‘q
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Google Sheets</p>
            <h3 className="text-sm font-black">Integration</h3>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              sheets?.connected
                ? 'bg-emerald-50 text-emerald-700'
                : sheets?.configured
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {sheets?.connected ? '🟢 Connected' : sheets?.configured ? '🟡 Sozlangan' : '⚪ Sozlanmagan'}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Last sync</dt>
            <dd className="font-semibold">
              {sheets?.lastSyncAt ? new Date(sheets.lastSyncAt).toLocaleString('uz-UZ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Last error</dt>
            <dd className="font-semibold text-slate-700">{sheets?.lastError || 'None'}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={sheetBusy}
            onClick={() => void runSheets('sync')}
            className="min-h-11 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            Синхронизировать сейчас
          </button>
          <button
            type="button"
            disabled={sheetBusy}
            onClick={() => void runSheets('check')}
            className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-800 disabled:opacity-60"
          >
            Проверить подключение
          </button>
        </div>
        {sheetMsg ? <p className="mt-2 text-sm text-slate-700">{sheetMsg}</p> : null}
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-xs font-bold text-slate-600">Avtomatik taqsimlash</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['round_robin', 'manual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`min-h-10 rounded-full px-3 text-xs font-bold ${
                mode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                void salesCrmApi.setAssignment(m).then(() => setMode(m));
              }}
            >
              {m === 'round_robin' ? 'Round-robin' : 'Qo‘lda'}
            </button>
          ))}
          <button
            type="button"
            className="min-h-10 rounded-full bg-slate-900 px-3 text-xs font-bold text-white"
            onClick={() => {
              void salesCrmApi.sync().then((r) => setSynced(r.synced));
            }}
          >
            Register lidlarini sinxronlash
          </button>
        </div>
        {synced != null ? (
          <p className="mt-2 text-sm text-emerald-700">{synced} ta lid qo‘shildi/yangilandi</p>
        ) : null}
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Operator</th>
              <th className="px-3 py-3">Berilgan</th>
              <th className="px-3 py-3">Ishlangan</th>
              <th className="px-3 py-3">Qo‘ng‘iroq</th>
              <th className="px-3 py-3">To‘lov</th>
              <th className="px-3 py-3">Conv</th>
              <th className="px-3 py-3">Kutilmoqda</th>
              <th className="px-3 py-3">Rad</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-3 py-3 font-semibold">{o.name}</td>
                <td className="px-3 py-3 tabular-nums">{o.leads}</td>
                <td className="px-3 py-3 tabular-nums">{o.processed ?? 0}</td>
                <td className="px-3 py-3 tabular-nums">{o.calls}</td>
                <td className="px-3 py-3 tabular-nums font-semibold text-emerald-700">{o.paid}</td>
                <td className="px-3 py-3 tabular-nums font-bold text-violet-700">
                  {Math.round((o.conversion || 0) * 100)}%
                </td>
                <td className="px-3 py-3 tabular-nums">{o.payment_pending ?? 0}</td>
                <td className="px-3 py-3 tabular-nums">{o.refused ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'blue' | 'sky' | 'green' | 'violet';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-800 ring-blue-100',
    sky: 'bg-sky-50 text-sky-800 ring-sky-100',
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-800 ring-violet-100',
  }[tone];
  return (
    <div className={`rounded-2xl p-4 ring-1 ${colors}`}>
      <p className="text-[11px] font-semibold opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function GroupedBars({
  items,
  series,
}: {
  items: OperatorStatRow[];
  series: { key: 'leads' | 'paid' | 'processed'; label: string; color: string }[];
}) {
  const max = Math.max(
    1,
    ...items.flatMap((o) => series.map((s) => Number(o[s.key] || 0))),
  );

  if (!items.length) {
    return <p className="py-8 text-center text-sm text-slate-400">Ma’lumot yo‘q</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      {items.map((o) => (
        <div key={o.id}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-bold text-slate-800">{o.name}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {series.map((s) => Number(o[s.key] || 0)).join(' / ')}
            </span>
          </div>
          <div className="flex h-8 items-end gap-1.5">
            {series.map((s) => {
              const v = Number(o[s.key] || 0);
              const pct = Math.max(v > 0 ? 8 : 0, (v / max) * 100);
              return (
                <div key={s.key} className="relative flex-1 overflow-hidden rounded-lg bg-slate-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                    style={{ width: `${pct}%`, background: s.color }}
                    title={`${s.label}: ${v}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversionBars({ items }: { items: OperatorStatRow[] }) {
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-slate-400">Ma’lumot yo‘q</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((o) => {
        const pct = Math.round((o.conversion || 0) * 100);
        return (
          <div key={o.id}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-bold text-slate-800">{o.name}</span>
              <span className="font-black tabular-nums text-violet-700">{pct}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all duration-500"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              {o.paid} / {o.leads} lid to‘ladi
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ShareBars({ items, total }: { items: OperatorStatRow[]; total: number }) {
  if (!items.length || !total) {
    return <p className="py-8 text-center text-sm text-slate-400">Ma’lumot yo‘q</p>;
  }
  const palette = ['#2563EB', '#0EA5E9', '#22A552', '#F59E0B', '#7C3AED', '#EF4444'];
  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
        {items.map((o, i) => {
          const w = (Number(o.leads) / total) * 100;
          if (w <= 0) return null;
          return (
            <div
              key={o.id}
              style={{ width: `${w}%`, background: palette[i % palette.length] }}
              title={`${o.name}: ${o.leads}`}
            />
          );
        })}
      </div>
      <ul className="space-y-2">
        {items.map((o, i) => (
          <li key={o.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-slate-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="truncate">{o.name}</span>
            </span>
            <span className="tabular-nums text-slate-500">
              {o.leads} · {Math.round((Number(o.leads) / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OperatorCard({ op }: { op: OperatorStatRow }) {
  const conv = Math.round((op.conversion || 0) * 100);
  const proc = Math.round((op.process_rate || (op.leads ? op.processed / op.leads : 0)) * 100);
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-black text-slate-900">{op.name}</p>
          <p className="text-xs text-slate-500">Operator</p>
        </div>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
          {conv}%
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-blue-50 px-2 py-2">
          <dt className="text-[10px] font-semibold text-blue-700">Berilgan</dt>
          <dd className="text-lg font-black tabular-nums text-blue-900">{op.leads}</dd>
        </div>
        <div className="rounded-xl bg-sky-50 px-2 py-2">
          <dt className="text-[10px] font-semibold text-sky-700">Ishlangan</dt>
          <dd className="text-lg font-black tabular-nums text-sky-900">{op.processed ?? 0}</dd>
        </div>
        <div className="rounded-xl bg-emerald-50 px-2 py-2">
          <dt className="text-[10px] font-semibold text-emerald-700">To‘lov</dt>
          <dd className="text-lg font-black tabular-nums text-emerald-900">{op.paid}</dd>
        </div>
      </dl>
      <div className="mt-3 space-y-1.5">
        <MiniBar label={`Ishlov ${proc}%`} pct={proc} color="#0EA5E9" />
        <MiniBar label={`Conv ${conv}%`} pct={conv} color="#7C3AED" />
      </div>
    </div>
  );
}

function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-semibold text-slate-500">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
    </div>
  );
}
