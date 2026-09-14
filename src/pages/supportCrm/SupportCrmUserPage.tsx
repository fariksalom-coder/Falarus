import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card } from '../../components/ui/Foundation';
import {
  getSupportCrmUser,
  postSupportCrmContact,
  type ContactChannel,
  type ContactOutcome,
  type ContactResult,
  type SupportCrmUserDetail,
} from '../../api/supportCrm';
import { supportCrmPath } from '../../constants/supportCrmPath';
import {
  formatCrmDate,
  formatDurationShort,
  idleDaysFromHours,
} from '../../utils/supportCrmFormat';

const CHANNELS: { id: ContactChannel; label: string }[] = [
  { id: 'phone', label: 'Telefon' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'max', label: 'Max' },
  { id: 'other', label: 'Boshqa' },
];

const OUTCOMES: { id: ContactOutcome; label: string }[] = [
  { id: 'reached', label: 'Bog‘landi' },
  { id: 'no_pickup', label: 'Ko‘tarmadi' },
  { id: 'no_answer', label: 'Javob yo‘q' },
  { id: 'no_contact', label: 'Kontakt yo‘q' },
  { id: 'no_telegram', label: 'Telegram yo‘q' },
  { id: 'no_whatsapp', label: 'WhatsApp yo‘q' },
  { id: 'other', label: 'Boshqa' },
];

const RESULTS: { id: ContactResult; label: string }[] = [
  { id: 'returned_ok', label: 'Muammo yo‘q' },
  { id: 'helped_login', label: 'Kirishga yordam' },
  { id: 'needs_fix', label: 'Yaxshilash kerak' },
  { id: 'feedback', label: 'Fikr' },
  { id: 'other', label: 'Boshqa' },
];

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-2xl px-3 text-sm font-medium transition ${
        active
          ? 'bg-[#2563EB] text-white shadow-sm'
          : 'bg-white text-app-text ring-1 ring-app-border hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function stageTone(status: 'done' | 'active' | 'todo'): string {
  if (status === 'done') return 'bg-emerald-50 text-emerald-800';
  if (status === 'active') return 'bg-amber-50 text-amber-900';
  return 'bg-slate-100 text-slate-500';
}

function stageWord(status: 'done' | 'active' | 'todo'): string {
  if (status === 'done') return 'tayyor';
  if (status === 'active') return 'hozir';
  return 'yo‘q';
}

export default function SupportCrmUserPage() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<SupportCrmUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [channel, setChannel] = useState<ContactChannel>('phone');
  const [channelOther, setChannelOther] = useState('');
  const [outcome, setOutcome] = useState<ContactOutcome>('reached');
  const [result, setResult] = useState<ContactResult>('returned_ok');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!Number.isInteger(userId) || userId <= 0) {
      setError('Noto‘g‘ri foydalanuvchi');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSupportCrmUser(userId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Xatolik');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const name = useMemo(() => {
    if (!data) return '';
    return [data.user.first_name, data.user.last_name].filter(Boolean).join(' ').trim() || `User #${data.user.id}`;
  }, [data]);

  async function save(goNext: boolean) {
    setFormError('');
    if (channel === 'other' && !channelOther.trim()) {
      setFormError('Boshqa kanal nomini yozing');
      return;
    }
    setSaving(true);
    try {
      const res = await postSupportCrmContact({
        userId,
        channel,
        channelOther: channel === 'other' ? channelOther.trim() : undefined,
        outcome,
        result: outcome === 'reached' ? result : null,
        commentText: comment.trim() || undefined,
      });
      if (goNext && res.nextUserId && res.nextUserId !== userId) {
        navigate(supportCrmPath(`/users/${res.nextUserId}`), { replace: true });
      } else if (goNext) {
        navigate(supportCrmPath('/queue'), { replace: true });
      } else {
        const fresh = await getSupportCrmUser(userId);
        setData(fresh);
        setComment('');
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlash amalga oshmadi');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-app-muted">Yuklanmoqda…</p>;
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-app-danger">
          {error || 'Topilmadi'}
        </p>
        <Link to={supportCrmPath('/queue')} className="text-sm text-[#2563EB]">
          ← Navbatga qaytish
        </Link>
      </div>
    );
  }

  const u = data.user;
  const idleDays = u.idle_days ?? idleDaysFromHours(u.idle_hours);
  const progress = data.progress;

  return (
    <div className="space-y-4 pb-8">
      <Link
        to={supportCrmPath('/queue')}
        className="inline-flex min-h-10 items-center gap-2 text-sm text-app-muted hover:text-app-text"
      >
        <ArrowLeft size={18} />
        Navbat
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-app-text">{name}</h1>
        <p className="mt-0.5 text-xs text-app-muted">#{u.id}</p>
      </div>

      {/* Asosiy: necha kundan beri kirmagan — aniq va katta */}
      <div className="rounded-[22px] bg-amber-50 px-4 py-4 ring-1 ring-amber-100">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-800/80">
          Kirmagan
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-amber-950">{idleDays}</span>
          <span className="text-base font-medium text-amber-900">kun</span>
        </p>
        <p className="mt-1 text-sm text-amber-900/70">
          {u.last_kunlik_at
            ? `Oxirgi kunlik: ${formatCrmDate(u.last_kunlik_at)}`
            : 'Kunlik reja hali boshlanmagan'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <MiniCard label="Telefon">
          {u.phone ? (
            <a href={`tel:${u.phone}`} className="break-all font-semibold text-[#2563EB] hover:underline">
              {u.phone}
            </a>
          ) : (
            <span className="font-semibold text-app-muted">—</span>
          )}
        </MiniCard>
        <MiniCard label="Email">
          {u.email ? (
            <a href={`mailto:${u.email}`} className="break-all font-semibold text-[#2563EB] hover:underline">
              {u.email}
            </a>
          ) : (
            <span className="font-semibold text-app-muted">—</span>
          )}
        </MiniCard>
        <MiniCard label="Tarif">
          <span className="font-semibold text-app-text">{u.plan_name || '—'}</span>
        </MiniCard>
        <MiniCard label="Platformada">
          <span className="font-semibold text-app-text">{formatDurationShort(u.total_time_seconds)}</span>
        </MiniCard>
        <MiniCard label="Obuna tugashi" className="col-span-2">
          <span className="font-semibold text-app-text">
            {u.plan_expires_at ? formatCrmDate(u.plan_expires_at) : '—'}
          </span>
          {u.plan_days_left != null ? (
            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              {u.plan_days_left} kun qoldi
            </span>
          ) : null}
        </MiniCard>
        <MiniCard label="Boshlagan">
          <span className="font-semibold text-app-text">
            {u.plan_started_at ? formatCrmDate(u.plan_started_at) : '—'}
          </span>
        </MiniCard>
        <MiniCard label="Oxirgi kunlik">
          <span className="font-semibold text-app-text">
            {u.last_kunlik_at ? formatCrmDate(u.last_kunlik_at) : 'Boshlanmagan'}
          </span>
        </MiniCard>
      </div>

      {progress ? (
        <Card className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-app-text">Kunlik progress</h2>
            <p className="text-sm tabular-nums text-app-muted">
              {progress.current_day}/{progress.total_days}
            </p>
          </div>
          <p className="text-sm text-app-muted">
            {progress.completed_days} kun tugagan · hozir {progress.current_day}-kun
          </p>
          <ul className="space-y-1.5">
            {progress.stages.map((s, i) => (
              <li
                key={s.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${stageTone(s.status)}`}
              >
                <span>
                  {i + 1}. {s.label}
                </span>
                <span className="font-medium">{stageWord(s.status)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-app-text">Oldingi aloqalar</h2>
        {data.contacts.length === 0 ? (
          <Card className="p-4 text-sm text-app-muted">Hali yozuv yo‘q.</Card>
        ) : (
          <ul className="space-y-2">
            {data.contacts.map((c) => (
              <li key={c.id} className="rounded-2xl bg-white p-3 text-sm ring-1 ring-app-border">
                <p className="font-medium text-app-text">
                  {CHANNELS.find((x) => x.id === c.channel)?.label ?? c.channel}
                  {c.channel === 'other' && c.channel_other ? ` (${c.channel_other})` : ''}
                  {' · '}
                  {OUTCOMES.find((x) => x.id === c.outcome)?.label ?? c.outcome}
                </p>
                <p className="mt-0.5 text-app-muted">
                  {c.result ? RESULTS.find((x) => x.id === c.result)?.label ?? c.result : '—'}
                  {' · '}
                  {formatCrmDate(c.created_at)}
                </p>
                {c.comment_text ? <p className="mt-2 text-app-text">{c.comment_text}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-app-text">Aloqa yozish</h2>

        <div>
          <p className="mb-2 text-xs font-medium text-app-muted">Kanal</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <Chip key={c.id} label={c.label} active={channel === c.id} onClick={() => setChannel(c.id)} />
            ))}
          </div>
          {channel === 'other' ? (
            <input
              className="mt-2 w-full min-h-11 rounded-2xl border border-app-border bg-white px-4 text-base outline-none focus:border-[#2563EB]"
              placeholder="Masalan: Instagram"
              value={channelOther}
              onChange={(e) => setChannelOther(e.target.value)}
            />
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-app-muted">Natija</p>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <Chip key={o.id} label={o.label} active={outcome === o.id} onClick={() => setOutcome(o.id)} />
            ))}
          </div>
        </div>

        {outcome === 'reached' ? (
          <div>
            <p className="mb-2 text-xs font-medium text-app-muted">Gaplashuv</p>
            <div className="flex flex-wrap gap-2">
              {RESULTS.map((r) => (
                <Chip key={r.id} label={r.label} active={result === r.id} onClick={() => setResult(r.id)} />
              ))}
            </div>
          </div>
        ) : null}

        <textarea
          className="min-h-[64px] w-full resize-none rounded-2xl border border-app-border bg-white px-4 py-3 text-base outline-none focus:border-[#2563EB]"
          placeholder="Qisqa izoh"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
        />

        {formError ? (
          <p role="alert" className="text-sm text-app-danger">
            {formError}
          </p>
        ) : null}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" loading={saving} className="min-h-12 flex-1" onClick={() => void save(false)}>
            Saqlash
          </Button>
          <Button loading={saving} className="min-h-12 flex-[1.4]" onClick={() => void save(true)}>
            Saqlash → keyingi
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MiniCard({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[20px] bg-white p-3.5 shadow-sm ring-1 ring-app-border ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-app-muted">{label}</p>
      <div className="mt-1.5 flex flex-col items-start gap-1 text-sm">{children}</div>
    </div>
  );
}
