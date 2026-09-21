import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { salesCrmApi, type TaskRow, type TaskSummary } from '../api';

export default function TasksPage() {
  const [params, setParams] = useSearchParams();
  const bucket = (params.get('bucket') as 'overdue' | 'today' | 'done' | 'all') || 'all';
  const [items, setItems] = useState<TaskRow[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    const r = await salesCrmApi.tasks(bucket);
    setItems(r.items);
    setSummary(r.summary);
  }

  useEffect(() => {
    void load().catch((e) => setErr(e instanceof Error ? e.message : 'Xato'));
  }, [bucket]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black">Vazifalar</h2>
        <p className="text-sm text-slate-500">Bugungi qo‘ng‘iroqlar navbati</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <BucketBtn
          active={bucket === 'overdue'}
          label="Muddati o‘tgan"
          value={summary?.overdue ?? 0}
          tone="red"
          onClick={() => setParams({ bucket: 'overdue' })}
        />
        <BucketBtn
          active={bucket === 'today'}
          label="Bugun"
          value={summary?.today ?? 0}
          tone="amber"
          onClick={() => setParams({ bucket: 'today' })}
        />
        <BucketBtn
          active={bucket === 'done'}
          label="Bajarilgan"
          value={summary?.done_today ?? 0}
          tone="green"
          onClick={() => setParams({ bucket: 'done' })}
        />
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="space-y-2">
        {items.map((t) => {
          const digits = String(t.phone || '').replace(/\D+/g, '');
          return (
            <div key={t.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/leads/${t.lead_id}`} className="font-bold text-blue-700">
                    {[t.first_name, t.last_name].filter(Boolean).join(' ') || 'Lid'}
                  </Link>
                  <p className="text-sm text-slate-500">{t.phone}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {new Date(t.scheduled_at).toLocaleString('uz-UZ')}
                  </p>
                  {t.note ? <p className="mt-1 text-sm text-slate-600">{t.note}</p> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {digits ? (
                  <a
                    href={`tel:+${digits}`}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white"
                  >
                    Qo‘ng‘iroq
                  </a>
                ) : null}
                <Link
                  to={`/leads/${t.lead_id}`}
                  className="inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
                >
                  Natija
                </Link>
                {t.status === 'open' ? (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700"
                    onClick={() => void salesCrmApi.completeTask(t.id).then(load)}
                  >
                    Bajarildi
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {items.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
            Vazifa yo‘q
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BucketBtn({
  label,
  value,
  active,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  tone: 'red' | 'amber' | 'green';
  onClick: () => void;
}) {
  const colors = {
    red: 'bg-red-50 text-red-700 ring-red-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-3 text-left ring-1 ${colors} ${active ? 'ring-2 ring-blue-500' : ''}`}
    >
      <p className="text-[11px] font-semibold opacity-80">{label}</p>
      <p className="text-xl font-black tabular-nums">{value}</p>
    </button>
  );
}
