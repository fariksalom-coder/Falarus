import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesCrmApi } from '../api';
import { useSalesCrmAuth } from '../auth';

export default function HomePage() {
  const { agent, tasks, refresh } = useSalesCrmAuth();
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    void salesCrmApi
      .dashboard('30d')
      .then(setDash)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Xato'));
    void refresh();
  }, [refresh]);

  const totals = (dash?.totals ?? {}) as Record<string, number>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black">
          Salom{agent?.name ? `, ${agent.name}` : ''}!
        </h2>
        <p className="text-sm text-slate-500">Bugun kimga qo‘ng‘iroq qilish kerak?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="red" label="Muddati o‘tgan" value={tasks?.overdue ?? 0} to="/tasks?bucket=overdue" />
        <StatCard tone="amber" label="Bugun" value={tasks?.today ?? 0} to="/tasks?bucket=today" />
        <StatCard tone="blue" label="Yangi" value={totals.new ?? 0} to="/leads?status=NEW" />
        <StatCard tone="green" label="Bajarilgan" value={tasks?.done_today ?? 0} to="/tasks?bucket=done" />
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-sm font-bold">30 kunlik ko‘rsatkichlar</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Mini label="Jami lid" value={totals.leads} />
          <Mini label="Qo‘ng‘iroq" value={totals.to_call} />
          <Mini label="Javob berdi" value={totals.answered} />
          <Mini label="Javob yo‘q" value={totals.no_answer} />
          <Mini label="To‘lov kutilmoqda" value={totals.payment_pending} />
          <Mini label="To‘ladi" value={totals.paid} />
          <Mini label="Keyingi amal yo‘q" value={totals.no_next_action} />
        </div>
      </div>

      <Link
        to="/leads"
        className="block rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white"
      >
        Voronka doskasini ochish
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  to,
  tone,
}: {
  label: string;
  value: number;
  to: string;
  tone: 'red' | 'amber' | 'blue' | 'green';
}) {
  const colors = {
    red: 'bg-red-50 text-red-700 ring-red-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }[tone];
  return (
    <Link to={to} className={`rounded-2xl p-3 ring-1 ${colors}`}>
      <p className="text-[11px] font-semibold opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="font-bold tabular-nums">{value ?? '—'}</p>
    </div>
  );
}
