import CrmStudentActivityCalendar from '../../components/supportCrm/CrmStudentActivityCalendar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft,Copy } from 'lucide-react';
import { Button, Card } from '../../components/ui/Foundation';
import {
  getSupportCrmUser,
  postSupportCrmContact,
  supportCrmParolTiklash,
  type ContactChannel,
  type SupportCrmUserDetail,
} from '../../api/supportCrm';
import ParolTiklashPanel from '../../components/support/ParolTiklashPanel';
import { supportCrmPath } from '../../constants/supportCrmPath';
import { formatCrmDate } from '../../utils/supportCrmFormat';

const CHANNELS: { id: ContactChannel; label: string }[] = [
  { id: 'phone', label: 'Telefon' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'max', label: 'MAX' },
  { id: 'imo', label: 'IMO' },
  { id: 'email', label: 'Email' },
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
      aria-pressed={active}
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

  const [data, setData] = useState<SupportCrmUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calendarRevision,setCalendarRevision]=useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [channel, setChannel] = useState<ContactChannel>('phone');
  const [channelOther, setChannelOther] = useState('');
  const [saved, setSaved] = useState(false);
  const [copyMessage,setCopyMessage]=useState('');

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

  async function save() {
    if (saving) return;
    setFormError('');setSaved(false);
    if (channel === 'other' && !channelOther.trim()) {
      setFormError('Boshqa kanal nomini yozing');return;
    }
    setSaving(true);
    try {
      const response = await postSupportCrmContact({
        userId, channel,
        channelOther: channel === 'other' ? channelOther.trim() : undefined,
        // A channel log records an attempt, without claiming the student answered.
        outcome: 'other',
      });
      setData(previous => previous ? {...previous,contacts:[response.contact,...previous.contacts]} : previous);
      setCalendarRevision(value=>value+1);setSaved(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saqlash amalga oshmadi');
    } finally {setSaving(false);}
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
  const progress = data.progress;
  return (
    <div className="space-y-4 pb-8">
      <Link to={supportCrmPath('/queue')} className="inline-flex min-h-10 items-center gap-2 text-sm text-app-muted hover:text-app-text"><ArrowLeft size={18}/>Navbat</Link>
      <h1 className="text-xl font-semibold text-app-text">{name}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MiniCard label="Telefon">{u.phone?<><a href={`tel:${u.phone}`} className="break-all font-semibold text-blue-600">{u.phone}</a><button type="button" aria-label="Telefon raqamini nusxalash" className="inline-flex min-h-10 items-center gap-2 text-xs text-blue-600" onClick={async()=>{try{await navigator.clipboard.writeText(u.phone!);setCopyMessage('Nusxalandi');}catch{setCopyMessage('Raqamni belgilang va nusxalang');}}}><Copy size={14}/>{copyMessage||'Nusxalash'}</button></>:'—'}</MiniCard>
        <MiniCard label="Email">{u.email?<a href={`mailto:${u.email}`} className="break-all font-semibold text-blue-600">{u.email}</a>:'—'}</MiniCard>
        <MiniCard label="Tarif"><strong>{u.plan_name||'—'}</strong></MiniCard>
        <MiniCard label="Sotib olgan sana"><strong>{u.plan_started_at?formatCrmDate(u.plan_started_at):'—'}</strong></MiniCard>
        <MiniCard label="Qolgan kunlar"><strong className="text-lg tabular-nums">{u.plan_days_left!=null?`${Math.max(0,u.plan_days_left)} kun`:'—'}</strong></MiniCard>
        <MiniCard label="Ro‘yxatdan o‘tgan"><strong>{formatCrmDate(u.created_at)}</strong></MiniCard>
      </div>

      <CrmStudentActivityCalendar key={userId} userId={userId} revision={calendarRevision}/>

      <div className="grid items-start gap-4 lg:grid-cols-2">
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
          <ul className="grid gap-2 sm:grid-cols-2">
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

        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-app-text">Oldingi aloqalar</h2>
          {data.contacts.length===0?<p className="text-sm text-app-muted">Hali yozuv yo‘q.</p>:<ul className="max-h-80 space-y-2 overflow-y-auto">
            {data.contacts.map(contact=><li key={contact.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <time dateTime={contact.created_at} className="text-app-muted">{formatCrmDate(contact.created_at)}</time>
              <span className="font-medium">{CHANNELS.find(item=>item.id===contact.channel)?.label??contact.channel}{contact.channel==='other'&&contact.channel_other?` (${contact.channel_other})`:''}</span>
            </li>)}
          </ul>}
        </Card>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
      <ParolTiklashPanel
        boshlangich={u.phone ?? u.email ?? `#${u.id}`}
        qulf
        onTikla={() => supportCrmParolTiklash(userId)}
      />

        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-app-text">Aloqa qayd etish</h2>
          <p className="text-xs text-app-muted">Foydalanilgan kanalni tanlang va saqlang.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Aloqa kanali">
            {CHANNELS.map(item=><Chip key={item.id} label={item.label} active={channel===item.id} onClick={()=>{setChannel(item.id);setSaved(false);}}/>)}
          </div>
          {channel==='other'&&<input aria-label="Boshqa kanal" className="min-h-11 w-full rounded-xl border border-app-border px-3" placeholder="Masalan: Instagram" maxLength={100} value={channelOther} onChange={event=>{setChannelOther(event.target.value);setSaved(false);}}/>}
          {formError&&<p role="alert" className="text-sm text-app-danger">{formError}</p>}
          {saved&&<p role="status" className="text-sm text-emerald-700">Aloqa saqlandi. O‘quvchi 24 soatga «Bog‘langanlar» ro‘yxatiga o‘tdi. <Link className="underline" to={supportCrmPath('/queue?tab=contacted')}>Ro‘yxatni ochish</Link></p>}
          <Button loading={saving} disabled={saving} className="min-h-12 w-full" onClick={()=>void save()}>Saqlash</Button>
        </Card>
      </div>
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
