/**
 * BILDIRISHNOMALAR — admin: qoidalar (qachon, kimga, qanday matn va ovoz),
 * sinov yuborish va qo'lda ommaviy xabar.
 *
 * Qoidalar O'CHIQ boshlanadi. Yoqilgan qoida o'z soatida (Toshkent) shartga
 * mos odamlarga bir marta yuboradi; «Kun yopildi» — darhol, ilova ichida.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Bell, CheckCircle2, Loader2, Mic, Pause, Play, Send, Smartphone, Upload, Users, Wand2 } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { resolveAssetUrl } from '../../api';

type Trigger = 'no_study_today' | 'inactive_days' | 'registered_not_started' | 'day_completed';
type Rule = {
  id: number; code: string; trigger: Trigger; param: number; send_hour: number; title: string; body: string; url: string;
  voice_text: string | null; audio_url: string | null; enabled: boolean; stats: { today: number; week: number; opened: number };
};
type Campaign = { id: number; segment: string; param: number; title: string; total: number; pushed: number; opened: number; created_at: string };
type Overview = {
  reach: { web_people: number; web_devices: number; app_people: number };
  rules: Rule[]; campaigns: Campaign[]; channels: { web: boolean; app: boolean };
};
type Segment = 'all' | 'subscribers' | 'inactive' | 'not_started' | 'user';

const TRIGGERS: Record<Trigger, { name: string; param?: string; when: (r: Rule) => string }> = {
  no_study_today: { name: 'Bugun dars qilmagan', param: 'oxirgi necha kunda faol bo‘lgan', when: (r) => `Har kuni ${r.send_hour}:00 da — oxirgi ${r.param} kunda dars qilgan, bugun hali qilmaganlarga` },
  inactive_days: { name: 'Uzoq kirmagan', param: 'necha kun kirmagan', when: (r) => `Har kuni ${r.send_hour}:00 da — aynan ${r.param} kundan beri kirmaganlarga (bir marta)` },
  registered_not_started: { name: 'Ro‘yxatdan o‘tib, boshlamagan', param: 'ro‘yxatdan necha kun o‘tgan', when: (r) => `Har kuni ${r.send_hour}:00 da — ${r.param} kun oldin ro‘yxatdan o‘tib, darsni boshlamaganlarga` },
  day_completed: { name: 'Kun yopildi', when: () => 'Darhol — o‘quvchi kunni yopganda, ilova ichida ovoz bilan' },
};
const SEGMENTS: { value: Segment; label: string; param?: string }[] = [
  { value: 'all', label: 'Hamma foydalanuvchilar' },
  { value: 'subscribers', label: 'Faol obunachilar' },
  { value: 'inactive', label: 'Uzoq kirmaganlar', param: 'necha kundan beri' },
  { value: 'not_started', label: 'Darsni boshlamaganlar' },
  { value: 'user', label: 'Bitta foydalanuvchi (sinov)', param: 'foydalanuvchi ID' },
];

const CARD = 'rounded-[24px] border border-app-border bg-app-surface p-5 shadow-app-card';
const INPUT = 'min-h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-blue-400';
const LABEL = 'block text-xs font-semibold text-app-text-muted';

function useNotice() {
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const show = (ok: boolean, text: string) => { setNotice({ ok, text }); window.setTimeout(() => setNotice(null), 5000); };
  const node = notice ? (
    <p role="status" className={`flex items-center gap-2 rounded-2xl p-3 text-sm font-semibold ${notice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {notice.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{notice.text}
    </p>
  ) : null;
  return { show, node };
}

function AudioButton({ url }: { url: string | null }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => ref.current?.pause(), []);
  if (!url) return <span className="text-xs text-app-text-muted">Ovoz yo‘q</span>;
  const toggle = () => {
    if (!ref.current) {
      ref.current = new Audio(resolveAssetUrl(url) ?? url);
      ref.current.onended = () => setPlaying(false);
      ref.current.onpause = () => setPlaying(false);
      ref.current.onplay = () => setPlaying(true);
    }
    if (ref.current.paused) void ref.current.play(); else ref.current.pause();
  };
  return (
    <button type="button" onClick={toggle} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-[0.98]">
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? 'To‘xtatish' : 'Eshitish'}
    </button>
  );
}

async function uploadVoice(file: File): Promise<string> {
  const form = new FormData();
  form.append('audio', file);
  return (await adminApi<{ url: string }>('/notifications/voice-upload', { method: 'POST', body: form })).url;
}

function Toggle({ on, busy, onChange, label }: { on: boolean; busy: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={busy} onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

function RuleCard({ rule, onSaved, notify }: { rule: Rule; onSaved: () => void; notify: (ok: boolean, t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(rule);
  const [busy, setBusy] = useState<string | null>(null);
  const [testUser, setTestUser] = useState('');
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => setDraft(rule), [rule]);
  const meta = TRIGGERS[rule.trigger];

  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); notify(true, ok); onSaved(); } catch (e) { notify(false, e instanceof Error ? e.message : 'Xatolik'); } finally { setBusy(null); }
  };
  const save = (patch: Partial<Rule>, ok = 'Saqlandi') => act('save', () => adminApi(`/notifications/rules/${rule.id}`, { method: 'PUT', body: JSON.stringify(patch) }), ok);

  return (
    <article className={CARD}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><Bell className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{meta.name}</p>
          <h3 className="mt-0.5 font-bold text-app-text">{rule.title}</h3>
          <p className="mt-0.5 text-sm text-app-text-muted">{rule.body}</p>
          <p className="mt-2 text-xs font-medium text-blue-700">{meta.when(rule)}</p>
        </div>
        <Toggle on={rule.enabled} busy={busy === 'save'} label={`${meta.name}: yoqish`} onChange={(v) => void save({ enabled: v }, v ? 'Qoida yoqildi' : 'Qoida o‘chirildi')} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-app-border pt-3 text-xs text-app-text-muted">
        <span className="rounded-full bg-app-bg-muted px-2.5 py-1">Bugun: <b className="text-app-text">{rule.stats.today}</b></span>
        <span className="rounded-full bg-app-bg-muted px-2.5 py-1">7 kunda: <b className="text-app-text">{rule.stats.week}</b></span>
        <span className="rounded-full bg-app-bg-muted px-2.5 py-1">Ochilgan: <b className="text-app-text">{rule.stats.week ? Math.round((rule.stats.opened / rule.stats.week) * 100) : 0}%</b></span>
        <span className="ml-auto"><AudioButton url={rule.audio_url} /></span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-h-10 rounded-xl border border-app-border px-3 text-sm font-semibold text-app-text hover:bg-app-bg-muted">{open ? 'Yopish' : 'Sozlash'}</button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>Sarlavha<input className={`${INPUT} mt-1`} maxLength={80} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label className={LABEL}>Ochiladigan sahifa<input className={`${INPUT} mt-1`} value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="/" /></label>
          </div>
          <label className={LABEL}>Matn<textarea className={`${INPUT} mt-1 min-h-20 py-2`} maxLength={240} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></label>
          {rule.trigger !== 'day_completed' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={LABEL}>Soat (Toshkent)
                <select className={`${INPUT} mt-1`} value={draft.send_hour} onChange={(e) => setDraft({ ...draft, send_hour: Number(e.target.value) })}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
              </label>
              {meta.param && <label className={LABEL}>Shart: {meta.param}<input type="number" min={0} max={365} className={`${INPUT} mt-1`} value={draft.param} onChange={(e) => setDraft({ ...draft, param: Number(e.target.value) })} /></label>}
            </div>
          )}
          {rule.trigger === 'day_completed' && <p className="text-xs text-app-text-muted">Matnda <code>{'{kun}'}</code> — yopilgan kun raqami bilan almashadi.</p>}
          <button type="button" disabled={busy !== null} onClick={() => void save({ title: draft.title, body: draft.body, url: draft.url, send_hour: draft.send_hour, param: draft.param })}
            className="min-h-11 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60">Saqlash</button>

          <div className="rounded-2xl bg-app-bg-muted p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-app-text"><Mic className="h-4 w-4" />Ovoz</p>
            <label className={LABEL}>Ovozda aytiladigan matn (200 belgigacha)
              <textarea className={`${INPUT} mt-1 min-h-16 py-2`} maxLength={200} value={draft.voice_text ?? ''} onChange={(e) => setDraft({ ...draft, voice_text: e.target.value })} />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" disabled={busy !== null || !(draft.voice_text ?? '').trim()}
                onClick={() => void act('voice', () => adminApi(`/notifications/rules/${rule.id}/voice`, { method: 'POST', body: JSON.stringify({ text: draft.voice_text }) }), 'Ovoz yaratildi — «Eshitish» bilan tekshiring')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-60">
                {busy === 'voice' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}Matndan ovoz yaratish
              </button>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 text-sm font-semibold text-app-text hover:bg-blue-50">
                <Upload className="h-4 w-4" />O‘z ovozingizni yuklash
                <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav" className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void act('upload', async () => adminApi(`/notifications/rules/${rule.id}`, { method: 'PUT', body: JSON.stringify({ audio_url: await uploadVoice(f) }) }), 'Ovoz yuklandi'); }} />
              </label>
              {rule.audio_url && <button type="button" disabled={busy !== null} onClick={() => void save({ audio_url: null } as Partial<Rule>, 'Ovoz olib tashlandi')} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-red-600 hover:bg-red-50">Ovozni olib tashlash</button>}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-dashed border-app-border p-4">
            <label className={`${LABEL} min-w-[160px] flex-1`}>Sinov: foydalanuvchi ID
              <input inputMode="numeric" className={`${INPUT} mt-1`} value={testUser} onChange={(e) => setTestUser(e.target.value.replace(/\D/g, ''))} placeholder="Masalan, o‘zingizniki" />
            </label>
            <button type="button" disabled={busy !== null || !testUser}
              onClick={() => void act('test', () => adminApi('/notifications/send', { method: 'POST', body: JSON.stringify({ segment: 'user', param: Number(testUser), title: rule.title, body: rule.body, url: rule.url, audio_url: rule.audio_url }) }), 'Sinov xabari yuborildi')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-60"><Send className="h-4 w-4" />Sinab ko‘rish</button>
            {rule.trigger !== 'day_completed' && (
              <button type="button" disabled={busy !== null}
                onClick={() => void act('count', async () => setCount((await adminApi<{ count: number }>('/notifications/preview', { method: 'POST', body: JSON.stringify({ rule_id: rule.id }) })).count), 'Hisoblandi')}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-app-border px-4 text-sm font-semibold text-app-text hover:bg-app-bg-muted"><Users className="h-4 w-4" />Hozir nechta odamga ketardi?</button>
            )}
            {count !== null && <span className="text-sm font-bold text-app-text">{count.toLocaleString('ru-RU')} kishi</span>}
          </div>
        </div>
      )}
    </article>
  );
}

function Broadcast({ onSent, notify }: { onSent: () => void; notify: (ok: boolean, t: string) => void }) {
  const [f, setF] = useState({ segment: 'all' as Segment, param: 7, title: '', body: '', url: '/', audio_url: null as string | null });
  const [count, setCount] = useState<number | null>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const seg = SEGMENTS.find((s) => s.value === f.segment)!;
  useEffect(() => { setCount(null); setConfirm(''); }, [f.segment, f.param]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e) { notify(false, e instanceof Error ? e.message : 'Xatolik'); } finally { setBusy(false); }
  };
  const ready = f.title.trim() && f.body.trim();
  const isTest = f.segment === 'user';

  return (
    <section className={CARD} aria-labelledby="bc-h">
      <h2 id="bc-h" className="text-base font-bold text-app-text">Qo‘lda xabar yuborish</h2>
      <p className="mt-0.5 text-sm text-app-text-muted">Ilova ichida (ovozi bilan) va push orqali. Avval bitta odamga sinab ko‘ring.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>Kimga
          <select className={`${INPUT} mt-1`} value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value as Segment, param: e.target.value === 'inactive' ? 7 : 0 })}>
            {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        {seg.param && <label className={LABEL}>{seg.param}<input inputMode="numeric" className={`${INPUT} mt-1`} value={f.param || ''} onChange={(e) => setF({ ...f, param: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></label>}
        <label className={LABEL}>Sarlavha<input className={`${INPUT} mt-1`} maxLength={80} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label className={LABEL}>Ochiladigan sahifa<input className={`${INPUT} mt-1`} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></label>
      </div>
      <label className={`${LABEL} mt-3`}>Matn<textarea className={`${INPUT} mt-1 min-h-20 py-2`} maxLength={240} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-app-border px-3 text-sm font-semibold text-app-text hover:bg-blue-50">
          <Upload className="h-4 w-4" />{f.audio_url ? 'Ovozni almashtirish' : 'Ovoz qo‘shish (MP3)'}
          <input type="file" accept="audio/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run(async () => { setF({ ...f, audio_url: await uploadVoice(file) }); notify(true, 'Ovoz yuklandi'); }); }} />
        </label>
        <AudioButton url={f.audio_url} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-app-border pt-4">
        {!isTest && (
          <button type="button" disabled={busy} onClick={() => void run(async () => setCount((await adminApi<{ count: number }>('/notifications/preview', { method: 'POST', body: JSON.stringify({ segment: f.segment, param: f.param }) })).count))}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-app-border px-4 text-sm font-semibold text-app-text hover:bg-app-bg-muted"><Users className="h-4 w-4" />Nechta odam?</button>
        )}
        {count !== null && <span className="text-sm font-bold text-app-text">{count.toLocaleString('ru-RU')} kishi</span>}
        {!isTest && count !== null && <input className={`${INPUT} w-48`} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="YUBORISH deb yozing" aria-label="Tasdiqlash" />}
        <button type="button" disabled={busy || !ready || (isTest ? !f.param : confirm !== 'YUBORISH')}
          onClick={() => void run(async () => {
            const r = await adminApi<{ total: number; created: number; pushed: number }>('/notifications/send', { method: 'POST', body: JSON.stringify({ ...f, confirm }) });
            notify(true, `Yuborildi: ${r.created} kishiga yozildi, ${r.pushed} kishiga push yetdi`);
            setConfirm(''); setCount(null); onSent();
          })}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{isTest ? 'Sinov yuborish' : 'Yuborish'}
        </button>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Bell; label: string; value: ReactNode; hint: string }) {
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between"><p className="text-sm text-app-text-muted">{label}</p><Icon className="h-5 w-5 text-blue-600" /></div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-app-text">{value}</p>
      <p className="mt-1 text-xs text-app-text-muted">{hint}</p>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const { show, node } = useNotice();
  const load = useCallback(() => {
    adminApi<Overview>('/notifications/overview').then((d) => { setData(d); setError(''); }).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-app-text">Bildirishnomalar</h1>
        <p className="mt-1 text-sm text-app-text-muted">Eslatmalar matn va ovoz bilan: qoida bo‘yicha (vaqt va shart) yoki qo‘lda.</p>
      </div>
      {node}
      {error && <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5" />{error}</p>}
      {!data && !error ? <div className="h-64 animate-pulse rounded-[24px] bg-slate-100" aria-busy="true" /> : data && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Stat icon={Bell} label="Sayt / PWA push" value={data.reach.web_people.toLocaleString('ru-RU')} hint={data.channels.web ? `${data.reach.web_devices} qurilma · ruxsat bergan odamlar` : 'VAPID kalitlari sozlanmagan'} />
            <Stat icon={Smartphone} label="Mobil ilova push" value={data.reach.app_people.toLocaleString('ru-RU')} hint={data.channels.app ? 'FCM ulangan' : 'Ilovaning keyingi versiyasi + Firebase kaliti kerak'} />
            <Stat icon={Mic} label="Ilova ichida (ovozli)" value="Hammaga" hint="Ilova ochilganda ko‘rilmagan xabar ovozi bilan chiqadi" />
          </section>
          <section aria-labelledby="rules-h" className="space-y-3">
            <h2 id="rules-h" className="text-base font-bold text-app-text">Avtomatik qoidalar</h2>
            {data.rules.map((r) => <RuleCard key={r.id} rule={r} onSaved={load} notify={show} />)}
          </section>
          <Broadcast onSent={load} notify={show} />
          {data.campaigns.length > 0 && (
            <section className={CARD} aria-labelledby="hist-h">
              <h2 id="hist-h" className="mb-3 text-base font-bold text-app-text">Qo‘lda yuborilganlar</h2>
              <ul className="divide-y divide-app-border text-sm">
                {data.campaigns.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                    <span className="min-w-0 flex-1 font-semibold text-app-text">{c.title}</span>
                    <span className="text-app-text-muted">{SEGMENTS.find((s) => s.value === c.segment)?.label ?? c.segment}{c.segment === 'user' ? ` #${c.param}` : ''}</span>
                    <span className="tabular-nums text-app-text-muted">{c.total} kishi · push {c.pushed} · ochildi {c.opened}</span>
                    <span className="tabular-nums text-xs text-app-text-muted">{new Date(c.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
