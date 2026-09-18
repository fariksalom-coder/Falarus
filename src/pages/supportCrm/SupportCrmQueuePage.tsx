import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Foundation';
import {
  getSupportCrmContacted,
  getSupportCrmQueue,
  type SupportCrmContactedRow,
  type SupportCrmQueueRow,
} from '../../api/supportCrm';
import { supportCrmPath } from '../../constants/supportCrmPath';
import {
  daysLeftUntil,
  formatCrmDate,
  formatDurationShort,
  idleDaysFromHours,
} from '../../utils/supportCrmFormat';

function fullName(row: { first_name: string | null; last_name: string | null; id: number }): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || `User #${row.id}`;
}

/** Asia/Tashkent YYYY-MM-DD */
function todayTashkent(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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

const OUTCOME_LABEL: Record<string, string> = {
  reached: 'Bog‘landi',
  no_pickup: 'Ko‘tarmadi',
  no_answer: 'Javob yo‘q',
  no_contact: 'Kontakt yo‘q',
  no_telegram: 'Telegram yo‘q',
  no_whatsapp: 'WhatsApp yo‘q',
  no_imo: 'IMO yo‘q',
  in_progress: 'Jarayonda',
  other: 'Boshqa',
};

type Tab = 'needs_contact' | 'contacted';

function formatContactTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('uz', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function SupportCrmQueuePage() {
  const [tab, setTab] = useState<Tab>('needs_contact');
  const [contactDate, setContactDate] = useState(todayTashkent);
  const [queueRows, setQueueRows] = useState<SupportCrmQueueRow[]>([]);
  const [contactedRows, setContactedRows] = useState<SupportCrmContactedRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isToday = contactDate === todayTashkent();

  const contactedTitle = useMemo(() => {
    if (isToday) return 'Bugun bog‘langanlar';
    return `${formatCrmDate(`${contactDate}T12:00:00+05:00`)} bog‘langanlar`;
  }, [contactDate, isToday]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'needs_contact') {
        const data = await getSupportCrmQueue('needs_contact');
        setQueueRows(data.rows);
        setContactedRows([]);
        setTotal(data.total);
      } else {
        const data = await getSupportCrmContacted(contactDate);
        setContactedRows(data.rows);
        setQueueRows([]);
        setTotal(data.total);
        if (data.date && data.date !== contactDate) setContactDate(data.date);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [tab, contactDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-app-text">Navbat</h1>
        <span className="text-sm tabular-nums text-app-muted">{total}</span>
      </div>

      <div className="flex gap-2">
        {(
          [
            { id: 'needs_contact' as const, label: 'Bog‘lanish kerak' },
            { id: 'contacted' as const, label: 'Bog‘langanlar' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-10 flex-1 rounded-2xl px-3 text-sm font-medium ${
              tab === item.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-app-muted ring-1 ring-app-border'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'contacted' ? (
        <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-app-border">
          <label className="block text-xs font-medium text-app-muted">
            Sana (Toshkent)
            <input
              type="date"
              value={contactDate}
              max={todayTashkent()}
              onChange={(e) => setContactDate(e.target.value || todayTashkent())}
              className="mt-1.5 w-full min-h-11 rounded-2xl border border-app-border bg-app-bg-muted px-3 text-sm text-app-text outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <p className="mt-2 text-sm text-app-text">{contactedTitle}</p>
          <p className="mt-0.5 text-xs text-app-muted">Shu kunda qayd etilgan barcha bog‘lanishlar.</p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-app-muted">Yuklanmoqda…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-app-danger">
          {error}
        </p>
      ) : tab === 'needs_contact' ? (
        queueRows.length === 0 ? (
          <Card className="p-5 text-sm text-app-muted">Hozircha bo‘sh.</Card>
        ) : (
          <ul className="space-y-2.5">
            {queueRows.map((row) => {
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
        )
      ) : contactedRows.length === 0 ? (
        <Card className="p-5 text-sm text-app-muted">Shu kunda bog‘lanish yo‘q.</Card>
      ) : (
        <ul className="space-y-2.5">
          {contactedRows.map((row) => (
            <li key={row.contact_id}>
              <Link
                to={supportCrmPath(`/users/${row.id}`)}
                className="block rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-app-border transition hover:ring-[#2563EB]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-app-text">{fullName(row)}</p>
                    <p className="mt-1 text-sm font-medium text-app-text">{row.phone || 'Telefon yo‘q'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-emerald-900">
                    {formatContactTime(row.contact_at)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
                  <span>{CHANNEL_LABEL[row.contact_channel] ?? row.contact_channel}</span>
                  <span>{OUTCOME_LABEL[row.contact_outcome] ?? row.contact_outcome}</span>
                  {row.agent_name ? <span>{row.agent_name}</span> : null}
                  {row.plan_name ? <span>{row.plan_name}</span> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
