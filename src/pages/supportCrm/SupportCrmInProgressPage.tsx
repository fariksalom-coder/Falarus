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

export default function SupportCrmInProgressPage() {
  const [rows, setRows] = useState<SupportCrmQueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSupportCrmQueue('in_progress');
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-app-text">Jarayonda</h1>
          <p className="mt-0.5 text-xs text-app-muted">Hali yopilmagan aloqalar</p>
        </div>
        <span className="text-sm tabular-nums text-app-muted">{total}</span>
      </div>

      {loading ? (
        <p className="text-sm text-app-muted">Yuklanmoqda…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-app-danger">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <Card className="p-5 text-sm text-app-muted">Hozircha jarayonda yo‘q.</Card>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const idleDays = idleDaysFromHours(row.idle_hours);
            const left = daysLeftUntil(row.plan_expires_at);
            return (
              <li key={row.id}>
                <Link
                  to={supportCrmPath(`/users/${row.id}`)}
                  className="block rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-app-border transition hover:ring-amber-300/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-app-text">{fullName(row)}</p>
                      <p className="mt-1 text-sm font-medium text-app-text">{row.phone || 'Telefon yo‘q'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                      Jarayonda
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
                    <span>{idleDays} kun kirmagan</span>
                    <span>{row.plan_name || 'Tarif'}</span>
                    <span>tugashi {formatCrmDate(row.plan_expires_at)}</span>
                    {left != null ? <span>{left} kun qoldi</span> : null}
                    <span>{formatDurationShort(row.total_time_seconds)}</span>
                    {row.last_contact_at ? (
                      <span>oxirgi: {formatCrmDate(row.last_contact_at)}</span>
                    ) : null}
                    {row.last_contact_channel ? <span>{row.last_contact_channel}</span> : null}
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
