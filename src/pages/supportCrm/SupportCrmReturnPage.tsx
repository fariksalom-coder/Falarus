import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Foundation';
import {
  getSupportCrmReturnTracking,
  type ReturnTrackFilter,
  type SupportCrmReturnTrackRow,
} from '../../api/supportCrm';
import { supportCrmPath } from '../../constants/supportCrmPath';
import {
  formatCrmDate,
  formatLastSeenAgo,
  formatTariffLabel,
} from '../../utils/supportCrmFormat';

function fullName(row: SupportCrmReturnTrackRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || `User #${row.id}`;
}

function formatHoursToReturn(hours: number | null): string {
  if (hours == null) return '';
  if (hours < 24) return `${hours} soat ichida qaytdi`;
  const days = Math.floor(hours / 24);
  return `${days} kun ichida qaytdi`;
}

const CHANNEL_LABEL: Record<string, string> = {
  phone: 'Telefon',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  max: 'MAX',
  imo: 'IMO',
  email: 'Email',
  other: 'Boshqa',
};

export default function SupportCrmReturnPage() {
  const [filter, setFilter] = useState<ReturnTrackFilter>('returned');
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<SupportCrmReturnTrackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [returnedCount, setReturnedCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSupportCrmReturnTracking(filter, days);
      setRows(data.rows);
      setTotal(data.total);
      setReturnedCount(data.returned_count);
      setWaitingCount(data.waiting_count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [filter, days]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-app-text">Qaytish</h1>
        <span className="text-sm tabular-nums text-app-muted">{total}</span>
      </div>
      <p className="text-sm text-app-muted">
        Bog‘langandan keyin platformaga qayta kirganlar. Avval kirmagan, kontakt dan keyin kirgan —
        shu yerda ko‘rinadi.
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'returned' as const, label: `Qaytdi (${returnedCount})` },
            { id: 'waiting' as const, label: `Kutyapti (${waitingCount})` },
            { id: 'all' as const, label: `Hammasi (${returnedCount + waitingCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`min-h-10 rounded-2xl px-3 text-sm font-medium ${
              filter === tab.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-app-muted ring-1 ring-app-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {([7, 14, 30, 60] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`min-h-9 rounded-full px-3 text-xs font-semibold ${
              days === d
                ? 'bg-slate-800 text-white'
                : 'bg-white text-app-muted ring-1 ring-app-border'
            }`}
          >
            {d} kun
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
        <Card className="p-5 text-sm text-app-muted">
          {filter === 'returned'
            ? 'Hali qaytganlar yo‘q.'
            : filter === 'waiting'
              ? 'Kutayotganlar yo‘q.'
              : 'Kontaktlar yo‘q.'}
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={`${row.id}-${row.contact_id}`}>
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
                    className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold ${
                      row.returned
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'bg-amber-50 text-amber-900'
                    }`}
                  >
                    {row.returned ? 'Qaytdi' : 'Kutyapti'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
                  <span>bog‘lanish {formatCrmDate(row.contact_at)}</span>
                  <span>{CHANNEL_LABEL[row.contact_channel] ?? row.contact_channel}</span>
                  {row.agent_name ? <span>{row.agent_name}</span> : null}
                  <span className="font-medium text-app-text">
                    oxirgi kirish: {formatLastSeenAgo(row.last_seen_at)}
                  </span>
                  {row.returned && row.hours_to_return != null ? (
                    <span className="font-medium text-emerald-700">
                      {formatHoursToReturn(row.hours_to_return)}
                    </span>
                  ) : null}
                  {row.plan_name ? (
                    <span>{formatTariffLabel(null, row.plan_name)}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
