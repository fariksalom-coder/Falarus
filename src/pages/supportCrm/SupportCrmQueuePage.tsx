import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Foundation';
import { getSupportCrmQueue, type SupportCrmQueueRow } from '../../api/supportCrm';
import { supportCrmPath } from '../../constants/supportCrmPath';
import {
  daysLeftUntil,
  formatCrmDate,
  formatDurationShort,
  idleDaysFromHours,
} from '../../utils/supportCrmFormat';

function fullName(row: SupportCrmQueueRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || `User #${row.id}`;
}

type Filter = 'needs_contact' | 'contacted_today';

export default function SupportCrmQueuePage() {
  const [filter, setFilter] = useState<Filter>('needs_contact');
  const [rows, setRows] = useState<SupportCrmQueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async (f: Filter) => {
    setLoading(true);
    setError('');
    try {
      const data = await getSupportCrmQueue(f);
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(filter);
  }, [filter, reload]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-app-text">Navbat</h1>
        <span className="text-sm tabular-nums text-app-muted">{total}</span>
      </div>

      <div className="flex gap-2">
        {(
          [
            { id: 'needs_contact', label: 'Bog‘lanish kerak' },
            { id: 'contacted_today', label: 'Bugun qilingan' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`min-h-10 flex-1 rounded-2xl px-3 text-sm font-medium ${
              filter === tab.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-app-muted ring-1 ring-app-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-app-muted">Yuklanmoqda…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-app-danger">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <Card className="p-5 text-sm text-app-muted">Hozircha bo‘sh.</Card>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const idleDays = idleDaysFromHours(row.idle_hours);
            const left = daysLeftUntil(row.plan_expires_at);
            return (
              <li key={row.id}>
                <Link
                  to={supportCrmPath(`/users/${row.id}`)}
                  className="block rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-app-border transition hover:ring-[#2563EB]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-app-text">{fullName(row)}</p>
                      <p className="mt-1 text-sm font-medium text-app-text">{row.phone || 'Telefon yo‘q'}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-amber-900"
                      title="Necha kun kirmagan"
                    >
                      {idleDays} kun
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
                    <span>{row.plan_name || 'Tarif'}</span>
                    <span>tugashi {formatCrmDate(row.plan_expires_at)}</span>
                    {left != null ? <span>{left} kun qoldi</span> : null}
                    <span>{formatDurationShort(row.total_time_seconds)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
