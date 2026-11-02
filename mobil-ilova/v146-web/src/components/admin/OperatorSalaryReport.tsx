import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';

type SalaryRow = {
  operator_id: number;
  name: string;
  active: boolean;
  soldCourses?: number;
  baseAmount?: number;
  bonusAmount?: number;
  totalAmount?: number;
  sold?: Record<string, number>;
  pendingCourses?: number;
  pending?: Record<string, number>;
  tariffs?: Array<{ tariff: string; sold_courses: number }>;
  days?: Array<{ day: string; soldCourses: number; baseAmount: number; bonusAmount: number; totalAmount: number }>;
};

type SalaryReport = {
  from: string;
  to: string;
  perCourse: number;
  tiers: Array<{ courses: number; amount: number }>;
  rows: SalaryRow[];
};

const TARIFF_LABELS: Record<string, string> = { month: '1 oy', three_month: '3 oy', six_month: '6 oy', year: '1 yil' };

const tashkentToday = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
const money = (amount: number, currency = 'UZS') =>
  `${Math.round(amount).toLocaleString('ru-RU')} ${currency === 'UZS' ? 'so‘m' : currency === 'RUB' ? '₽' : currency}`;
const moneyList = (value: Record<string, number> | undefined) => {
  const parts = Object.entries(value ?? {}).filter(([, amount]) => amount > 0);
  return parts.length ? parts.map(([currency, amount]) => money(amount, currency)).join(' + ') : '—';
};

/** Operator maoshi: sotuv chek yuborilgan kunga yoziladi, bonus har kun alohida. */
export default function OperatorSalaryReport() {
  const today = tashkentToday();
  const [range, setRange] = useState({ from: `${today.slice(0, 8)}01`, to: today });
  const [report, setReport] = useState<SalaryReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    adminApi<SalaryReport>(`/operator-bot/salary?${new URLSearchParams(range)}`)
      .then((data) => { if (!cancelled) setReport(data); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Maosh hisobotini yuklab bo‘lmadi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const rows = report?.rows ?? [];
  const total = rows.reduce(
    (sum, r) => ({
      courses: sum.courses + (r.soldCourses ?? 0),
      base: sum.base + (r.baseAmount ?? 0),
      bonus: sum.bonus + (r.bonusAmount ?? 0),
      pay: sum.pay + (r.totalAmount ?? 0),
    }),
    { courses: 0, base: 0, bonus: 0, pay: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">
          Boshlanish
          <input type="date" className="mt-1 block rounded-lg border bg-white p-2 text-slate-900" value={range.from} max={range.to}
            onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} />
        </label>
        <label className="text-sm font-semibold">
          Tugash
          <input type="date" className="mt-1 block rounded-lg border bg-white p-2 text-slate-900" value={range.to} min={range.from}
            onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} />
        </label>
        <p className="max-w-xl text-xs opacity-70">
          Sotuv operator chekni <b>tekshiruvga yuborgan</b> kunga yoziladi (admin tasdiqlagan kunga emas). Maoshga faqat tasdiqlangan sotuvlar kiradi.
          Qat’iy qism — {money(report?.perCourse ?? 30000)} / kurs; bonus har kun alohida:{' '}
          {(report?.tiers ?? []).map((t) => `${t.courses}+ kurs → ${money(t.amount)}`).join(', ')}.
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
      {loading ? (
        <p role="status" className="py-6 text-center text-sm opacity-70">Yuklanmoqda…</p>
      ) : !rows.length ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm opacity-70">Bu davrda operatorlar sotuvi yo‘q.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-surface">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-app-bg-muted text-xs uppercase opacity-80">
              <tr>
                {['Operator', 'Kurslar', 'Qancha sotdi', 'Qat’iy qism', 'Bonus', 'Jami maosh', 'Tekshiruvda'].map((h) => (
                  <th key={h} className="p-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <SalaryRowView key={r.operator_id} row={r} expanded={open === r.operator_id}
                  onToggle={() => setOpen((id) => (id === r.operator_id ? null : r.operator_id))} />
              ))}
              <tr className="border-t-2 font-bold">
                <td className="p-3">Jami</td>
                <td className="p-3">{total.courses}</td>
                <td className="p-3" />
                <td className="p-3">{money(total.base)}</td>
                <td className="p-3 text-emerald-600">{money(total.bonus)}</td>
                <td className="p-3">{money(total.pay)}</td>
                <td className="p-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SalaryRowView({ row, expanded, onToggle }: { row: SalaryRow; expanded: boolean; onToggle: () => void }) {
  const hasDetails = Boolean(row.days?.length);
  return (
    <>
      <tr className={`border-t ${hasDetails ? 'cursor-pointer hover:bg-app-bg-muted' : ''}`} onClick={hasDetails ? onToggle : undefined}>
        <td className="p-3 font-semibold">
          {hasDetails && <span className="mr-1 inline-block w-3 opacity-60">{expanded ? '▾' : '▸'}</span>}
          {row.name}{!row.active && <span className="ml-2 text-xs opacity-60">(o‘chirilgan)</span>}
          {row.tariffs?.length ? (
            <span className="block text-xs font-normal opacity-60">
              {row.tariffs.map((t) => `${TARIFF_LABELS[t.tariff] ?? t.tariff}: ${t.sold_courses}`).join(' · ')}
            </span>
          ) : null}
        </td>
        <td className="p-3">{row.soldCourses ?? 0}</td>
        <td className="p-3">{moneyList(row.sold)}</td>
        <td className="p-3">{money(row.baseAmount ?? 0)}</td>
        <td className="p-3 font-semibold text-emerald-600">{money(row.bonusAmount ?? 0)}</td>
        <td className="p-3 font-bold">{money(row.totalAmount ?? 0)}</td>
        <td className="p-3 text-xs opacity-80">{row.pendingCourses ? `${row.pendingCourses} kurs · ${moneyList(row.pending)}` : '—'}</td>
      </tr>
      {expanded && row.days?.map((d) => (
        <tr key={d.day} className="bg-app-bg-muted/50 text-xs">
          <td className="p-2 pl-9">{d.day}</td>
          <td className="p-2">{d.soldCourses}</td>
          <td className="p-2" />
          <td className="p-2">{money(d.baseAmount)}</td>
          <td className="p-2 text-emerald-600">{money(d.bonusAmount)}</td>
          <td className="p-2">{money(d.totalAmount)}</td>
          <td className="p-2" />
        </tr>
      ))}
    </>
  );
}
