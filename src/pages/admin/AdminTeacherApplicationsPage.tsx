/**
 * O'QITUVCHI ARIZALARI (onboarding v2): tekshiruv va qaror.
 *
 * Chapda — holat bo'yicha ro'yxat, o'ngda — tanlangan ariza: barcha qadamlar,
 * yopiq hujjatlar (token bilan ochiladi), video, jadval, narx va rozilik tarixi.
 * Qaror: tasdiqlash / qadamni ko'rsatib qaytarish / rad etish (izoh bilan).
 * Pastda — narx chegaralari va komissiya shkalasi (kodsiz o'zgartiriladi).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BadgeCheck, CheckCircle2, FileText, Loader2, RotateCcw, Settings2, XCircle } from 'lucide-react';
import { adminApi, getAdminToken } from '../../lib/adminApi';
import { apiUrl, resolveAssetUrl } from '../../api';
import {
  COUNTRIES, DEGREES, ERRORS, ONBOARDING_STEPS, PROFICIENCY, ABOUT_QUESTIONS, commissionStatus, validateTiers,
  type CommissionTier, type ErrorCode, type OnboardingData,
} from '../../../shared/teacherOnboarding';

type Row = {
  user_id: number; first_name: string; last_name: string; avatar_url: string | null; onboarding_path: string | null; proficiency: string | null;
  birth_country: string | null; profile_status: string; onboarding_step: number; onboarding_submitted_at: string | null; lesson_price_uzs: number | null;
  reviewed_at: string | null; review_step: number | null; phone: string | null; email: string | null;
};
type Detail = {
  profile: Row & { data: OnboardingData; review_comment: string | null; certified_verified: boolean; video_duration_sec: number | null; terms_version: string | null };
  documents: { id: number; kind: string; original_name: string; mime: string | null; size_bytes: number | null; status: string; private: boolean; file_url: string; created_at: string }[];
  events: { action: string; step: number | null; comment: string | null; actor: string | null; created_at: string }[];
  terms: { terms_version: string; lesson_price_uzs: number | null; accepted_at: string }[];
  steps: { step: number; errors: Record<string, ErrorCode> }[];
  commission: { completed: number; percent: number; next_percent: number | null; lessons_until_next: number | null };
};
type Settings = { price_min_uzs: number; price_max_uzs: number; commission_tiers: CommissionTier[]; terms_version: string; terms: { uz: string[]; ru: string[] } };

const STATUSES = [
  { key: 'pending_review', label: 'Tekshiruvda' },
  { key: 'needs_revision', label: 'Tuzatishda' },
  { key: 'active', label: 'Tasdiqlangan' },
  { key: 'rejected', label: 'Rad etilgan' },
  { key: 'draft', label: 'Qoralama' },
  { key: '', label: 'Hammasi' },
] as const;
const STATUS_LABEL: Record<string, string> = { pending_review: 'Tekshiruvda', needs_revision: 'Tuzatishda', active: 'Tasdiqlangan', rejected: 'Rad etilgan', draft: 'Qoralama', paused: 'Toʻxtatilgan' };
const STATUS_TONE: Record<string, string> = {
  pending_review: 'bg-blue-50 text-blue-800', needs_revision: 'bg-amber-50 text-amber-800', active: 'bg-emerald-50 text-emerald-800',
  rejected: 'bg-red-50 text-red-800', draft: 'bg-slate-100 text-slate-700', paused: 'bg-slate-100 text-slate-700',
};
const DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const label = (list: { code: string; uz: string }[], code: string | null | undefined) => list.find((x) => x.code === code)?.uz ?? code ?? '—';

async function openPrivate(teacherId: number, docId: number) {
  const win = window.open('', '_blank');
  const res = await fetch(apiUrl(`/api/admin/teacher-applications/${teacherId}/documents/${docId}/file`), { headers: { Authorization: `Bearer ${getAdminToken() ?? ''}` } });
  if (!res.ok) { win?.close(); window.alert('Hujjat ochilmadi'); return; }
  const url = URL.createObjectURL(await res.blob());
  if (win) win.location.href = url; else window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function AdminTeacherApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'pending_review';
  const selected = Number(params.get('id')) || null;
  const [list, setList] = useState<{ rows: Row[]; counts: Record<string, number> } | null>(null);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    setError('');
    adminApi<{ rows: Row[]; counts: Record<string, number> }>(`/teacher-applications${status && status !== 'all' ? `?status=${status}` : ''}`)
      .then(setList).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold text-app-text">Oʻqituvchi arizalari</h1>
          <p className="mt-1 text-sm text-app-text-muted">8 qadamli anketa: tekshirish, tuzatishga qaytarish, tasdiqlash. Faqat tasdiqlangan profil katalogda chiqadi.</p>
        </div>
        <button type="button" onClick={() => setShowSettings((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 text-sm font-semibold text-app-text hover:bg-app-bg-muted">
          <Settings2 className="h-4 w-4" />Narx va komissiya
        </button>
      </header>

      {showSettings && <SettingsCard />}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-app-border bg-app-surface p-1">
        {STATUSES.map((s) => (
          <button key={s.label} type="button" onClick={() => { set('status', s.key || 'all'); set('id', null); }} aria-pressed={status === (s.key || 'all')}
            className={`min-h-11 shrink-0 rounded-xl px-3.5 text-sm font-semibold transition ${status === (s.key || 'all') ? 'bg-blue-600 text-white' : 'text-app-text hover:bg-app-bg-muted'}`}>
            {s.label}{s.key && list?.counts[s.key] ? <span className="ml-1.5 tabular-nums opacity-75">{list.counts[s.key]}</span> : null}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className={`rounded-2xl border border-app-border bg-app-surface ${selected ? 'hidden lg:block' : ''}`}>
          {!list ? <p className="p-6 text-center text-app-text-muted" role="status">Yuklanmoqda…</p>
            : !list.rows.length ? <p className="p-6 text-center text-slate-400">Ariza yoʻq</p> : (
              <ul className="divide-y divide-app-border">
                {list.rows.map((r) => (
                  <li key={r.user_id}>
                    <button type="button" onClick={() => set('id', String(r.user_id))}
                      className={`flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-app-bg-muted ${selected === r.user_id ? 'bg-blue-50' : ''}`}>
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {r.avatar_url ? <img src={resolveAssetUrl(r.avatar_url) ?? r.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-app-text">{r.first_name} {r.last_name}</span>
                        <span className="block truncate text-xs text-app-text-muted">
                          {r.onboarding_path === 'certified' ? 'Sertifikatli' : r.onboarding_path === 'experienced' ? 'Tajribali' : '—'} · {r.lesson_price_uzs ? `${fmt(r.lesson_price_uzs)} soʻm` : 'narx yoʻq'}
                        </span>
                        <span className="block text-xs text-app-text-muted">{r.onboarding_submitted_at ? `Yuborilgan: ${date(r.onboarding_submitted_at)}` : `Qadam ${r.onboarding_step}/8`}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[r.profile_status] ?? ''}`}>{STATUS_LABEL[r.profile_status] ?? r.profile_status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section className={selected ? '' : 'hidden lg:block'}>
          {selected ? <ApplicationDetail id={selected} onBack={() => set('id', null)} onDecided={load} />
            : <p className="rounded-2xl border border-dashed border-app-border p-10 text-center text-app-text-muted">Chapdan arizani tanlang</p>}
        </section>
      </div>
    </div>
  );
}

function Block({ title, step, errors, children }: { title: string; step?: number; errors?: Record<string, ErrorCode>; children: ReactNode }) {
  const bad = errors && Object.keys(errors).length > 0;
  return (
    <section className="rounded-2xl border border-app-border bg-app-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-app-text">
        {step ? <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-xs">{step}</span> : null}
        {title}
        {bad ? <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{Object.values(errors!).map((c) => ERRORS[c].uz).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span>
          : step ? <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" /> : null}
      </h3>
      {children}
    </section>
  );
}

function Pair({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-app-border py-1.5 text-sm last:border-0"><span className="text-app-text-muted">{k}</span><span className="text-right font-medium text-app-text">{v}</span></div>;
}

function ApplicationDetail({ id, onBack, onDecided }: { id: number; onBack: () => void; onDecided: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<number>(1);
  const [certified, setCertified] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setD(null); setError('');
    adminApi<Detail>(`/teacher-applications/${id}`).then((r) => {
      setD(r);
      setStep(r.steps.find((s) => Object.keys(s.errors).length)?.step ?? 1);
    }).catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [id]);
  useEffect(() => { load(); setComment(''); }, [load]);

  const decide = async (decision: 'approve' | 'reject' | 'revision') => {
    if (decision === 'reject' && !window.confirm('Arizani rad etasizmi? Oʻqituvchi qayta yubora olmaydi.')) return;
    setBusy(decision); setError('');
    try {
      await adminApi(`/teacher-applications/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, comment, step: decision === 'revision' ? step : undefined, certified }) });
      onDecided(); load(); setComment('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };

  if (error && !d) return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!d) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />;
  const p = d.profile;
  const data = p.data;
  const err = (n: number) => d.steps.find((s) => s.step === n)?.errors ?? {};
  const certDocs = new Map(d.documents.map((x) => [x.id, x]));
  const oldDocs = d.documents.filter((x) => !data.certificates.some((c) => c.document_ids.includes(x.id)));

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 lg:hidden"><ArrowLeft className="h-4 w-4" />Roʻyxat</button>

      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-app-border bg-app-surface p-4">
        <span className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
          {data.avatar_url ? <img src={resolveAssetUrl(data.avatar_url) ?? data.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-app-text">{data.personal.first_name} {data.personal.last_name}</p>
          <p className="text-sm text-app-text-muted">{p.phone ?? ''} {p.email ? `· ${p.email}` : ''}</p>
          <p className="mt-1 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-bold ${STATUS_TONE[p.profile_status] ?? ''}`}>{STATUS_LABEL[p.profile_status] ?? p.profile_status}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{data.personal.path === 'certified' ? 'Sertifikatli yoʻl' : 'Tajribali yoʻl'}</span>
            {p.certified_verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" />Sertifikat tasdiqlangan</span>}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">Komissiya {d.commission.percent}% · {d.commission.completed} dars</span>
          </p>
        </div>
      </section>

      <Block title="Shaxsiy maʼlumotlar" step={1} errors={err(1)}>
        <Pair k="Tugʻilgan davlat" v={label(COUNTRIES, data.personal.birth_country)} />
        <Pair k="Fan" v="Rus tili" />
        <Pair k="Bilish darajasi" v={label(PROFICIENCY, data.personal.proficiency)} />
      </Block>

      {data.personal.path === 'certified' && (
        <Block title="Sertifikatlar" step={3} errors={err(3)}>
          {data.certificates.map((c, i) => (
            <div key={i} className="mb-3 rounded-xl bg-app-bg-muted p-3 text-sm">
              <p className="font-semibold text-app-text">{c.title || '—'}</p>
              <p className="text-app-text-muted">{c.institution} {c.year_from || c.year_to ? `· ${c.year_from ?? ''}–${c.year_to ?? ''}` : ''}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.document_ids.map((docId) => (
                  <button key={docId} type="button" onClick={() => void openPrivate(id, docId)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 text-xs font-semibold text-blue-700">
                    <FileText className="h-3.5 w-3.5" />{certDocs.get(docId)?.original_name ?? `#${docId}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Block>
      )}

      <Block title="Taʼlim" step={4} errors={err(4)}>
        {data.education.length ? data.education.map((e, i) => (
          <p key={i} className="text-sm text-app-text">{e.institution} — {e.specialty} <span className="text-app-text-muted">({label(DEGREES, e.degree)}, {e.year_from ?? '?'}–{e.year_to ?? '?'})</span></p>
        )) : <p className="text-sm text-app-text-muted">Koʻrsatilmagan (ixtiyoriy)</p>}
      </Block>

      <Block title="Oʻzi haqida" step={5} errors={err(5)}>
        <details className="mb-2 text-sm"><summary className="min-h-11 cursor-pointer font-semibold text-blue-700">Savollarga javoblar</summary>
          <dl className="mt-2 space-y-2">{ABOUT_QUESTIONS.map((q) => <div key={q.key}><dt className="text-xs text-app-text-muted">{q.uz}</dt><dd className="text-app-text">{data.about_answers[q.key] ?? '—'}</dd></div>)}</dl>
        </details>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-app-text">{data.about || '—'}</p>
      </Block>

      <Block title={`Video${p.video_duration_sec ? ` · ${Math.floor(p.video_duration_sec / 60)}:${String(p.video_duration_sec % 60).padStart(2, '0')}` : ''}`} step={6} errors={err(6)}>
        {data.video_url ? <video src={resolveAssetUrl(data.video_url) ?? data.video_url} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black" /> : <p className="text-sm text-app-text-muted">Video yoʻq</p>}
      </Block>

      <Block title={`Jadval · ${data.schedule.timezone}`} step={7} errors={err(7)}>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
            const s = data.schedule.slots.filter((x) => x.weekday === wd);
            return <li key={wd} className="flex gap-2"><span className="w-7 font-semibold text-app-text">{DAYS[wd - 1]}</span><span className="text-app-text-muted">{s.length ? s.map((x) => `${x.start}–${x.end}`).join(', ') : '—'}</span></li>;
          })}
        </ul>
      </Block>

      <Block title="Narx va shartlar" step={8} errors={err(8)}>
        <Pair k="Bir dars narxi" v={data.lesson_price_uzs ? `${fmt(data.lesson_price_uzs)} soʻm` : '—'} />
        <Pair k="Shartlarga rozilik" v={d.terms[0] ? `${date(d.terms[0].accepted_at)} · v${d.terms[0].terms_version}` : 'yoʻq'} />
      </Block>

      {oldDocs.length > 0 && (
        <Block title="Eski anketadagi hujjatlar">
          <div className="flex flex-wrap gap-2">
            {oldDocs.map((x) => x.private
              ? <button key={x.id} type="button" onClick={() => void openPrivate(id, x.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-app-border px-3 text-xs font-semibold text-blue-700"><FileText className="h-3.5 w-3.5" />{x.kind}: {x.original_name}</button>
              : <a key={x.id} href={resolveAssetUrl(x.file_url) ?? x.file_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-app-border px-3 text-xs font-semibold text-blue-700"><FileText className="h-3.5 w-3.5" />{x.kind}: {x.original_name}</a>)}
          </div>
        </Block>
      )}

      <section className="space-y-3 rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4">
        <h3 className="text-sm font-bold text-app-text">Qaror</h3>
        {p.profile_status !== 'pending_review' && <p className="text-xs text-app-text-muted">Ariza hozir «{STATUS_LABEL[p.profile_status] ?? p.profile_status}» holatida — qarorni baribir oʻzgartirish mumkin.</p>}
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Izoh (qaytarish va rad etish uchun shart): nimani tuzatish kerak"
          className="w-full rounded-xl border border-app-border bg-app-surface p-3 text-sm text-app-text" />
        <div className="flex flex-wrap items-center gap-2">
          {data.personal.path === 'certified' && (
            <label className="mr-auto inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-app-text">
              <input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} className="h-5 w-5 accent-emerald-600" />
              Sertifikat hujjatlari tekshirildi
            </label>
          )}
          <button type="button" disabled={!!busy} onClick={() => void decide('approve')} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">
            {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Tasdiqlash
          </button>
          <span className="inline-flex items-center gap-1">
            <select value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label="Qaysi qadam" className="min-h-11 rounded-xl border border-app-border bg-app-surface px-2 text-sm">
              {ONBOARDING_STEPS.map((s) => <option key={s.step} value={s.step}>{s.step}. {s.uz}</option>)}
            </select>
            <button type="button" disabled={!!busy} onClick={() => void decide('revision')} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white disabled:opacity-50">
              {busy === 'revision' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Tuzatishga
            </button>
          </span>
          <button type="button" disabled={!!busy} onClick={() => void decide('reject')} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-red-300 bg-app-surface px-4 text-sm font-bold text-red-700 disabled:opacity-50">
            {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}Rad etish
          </button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {d.events.length > 0 && (
        <Block title="Tarix">
          <ol className="space-y-1.5 text-sm">
            {d.events.map((e, i) => (
              <li key={i} className="text-app-text"><span className="text-app-text-muted">{date(e.created_at)}</span> · {{ submitted: 'Yuborildi', approved: 'Tasdiqlandi', rejected: 'Rad etildi', needs_revision: `Tuzatishga (${e.step}-qadam)` }[e.action] ?? e.action}{e.actor ? ` · ${e.actor}` : ''}{e.comment ? ` — «${e.comment}»` : ''}</li>
            ))}
          </ol>
        </Block>
      )}
    </div>
  );
}

function SettingsCard() {
  const [s, setS] = useState<Settings | null>(null);
  const [tiers, setTiers] = useState<{ up_to: string; percent: string }[]>([]);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = (r: Settings) => {
    setS(r); setMin(String(r.price_min_uzs)); setMax(String(r.price_max_uzs));
    setTiers(r.commission_tiers.map((x) => ({ up_to: x.up_to == null ? '' : String(x.up_to), percent: String(x.percent) })));
  };
  useEffect(() => { adminApi<Settings>('/teacher-onboarding-settings').then(apply).catch(() => {}); }, []);

  const parsed = useMemo(() => validateTiers(tiers.map((x, i) => ({ up_to: i === tiers.length - 1 ? null : Number(x.up_to), percent: Number(x.percent) }))), [tiers]);
  const preview = parsed ? [1, 20, 21, 50, 51, 200, 201, 400, 401].map((n) => `${n}: ${commissionStatus(n - 1, parsed).percent}%`).join(' · ') : '';

  const save = async () => {
    if (!parsed) { setMsg({ ok: false, text: 'Shkala notoʻgʻri: chegaralar oʻsib borsin, oxirgisi cheksiz' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await adminApi<Settings>('/teacher-onboarding-settings', { method: 'PUT', body: JSON.stringify({ price_min_uzs: Number(min), price_max_uzs: Number(max), commission_tiers: parsed }) });
      const full = await adminApi<Settings>('/teacher-onboarding-settings');
      apply(full);
      setMsg({ ok: true, text: r.terms_version !== s?.terms_version ? `Saqlandi. Shartlar yangi versiyasi: ${r.terms_version} — oʻqituvchilar qayta rozilik beradi.` : 'Saqlandi' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Xatolik' });
    } finally {
      setBusy(false);
    }
  };

  if (!s) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  return (
    <section className="space-y-4 rounded-2xl border border-app-border bg-app-surface p-4">
      <h2 className="text-base font-bold text-app-text">Narx chegaralari va komissiya shkalasi</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-app-text">Minimal narx (soʻm)<input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} className="mt-1 min-h-11 w-full rounded-xl border border-app-border px-3" /></label>
        <label className="text-sm font-semibold text-app-text">Maksimal narx (soʻm)<input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} className="mt-1 min-h-11 w-full rounded-xl border border-app-border px-3" /></label>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-app-text">Shkala (dars raqami boʻyicha)</p>
        <ul className="space-y-2">
          {tiers.map((x, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-28 text-app-text-muted">{i === 0 ? '1' : `${Number(tiers[i - 1].up_to || 0) + 1}`} –</span>
              {i === tiers.length - 1
                ? <span className="w-24 text-app-text-muted">cheksiz</span>
                : <input inputMode="numeric" aria-label="gacha" value={x.up_to} onChange={(e) => setTiers((t) => t.map((y, j) => (j === i ? { ...y, up_to: e.target.value.replace(/\D/g, '') } : y)))} className="min-h-11 w-24 rounded-xl border border-app-border px-3" />}
              <input inputMode="decimal" aria-label="foiz" value={x.percent} onChange={(e) => setTiers((t) => t.map((y, j) => (j === i ? { ...y, percent: e.target.value.replace(/[^\d.]/g, '') } : y)))} className="min-h-11 w-20 rounded-xl border border-app-border px-3" />
              <span>%</span>
              {tiers.length > 1 && <button type="button" onClick={() => setTiers((t) => t.filter((_, j) => j !== i))} className="min-h-11 px-2 text-xs font-semibold text-red-700">oʻchirish</button>}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setTiers((t) => [...t.slice(0, -1), { up_to: '', percent: t.at(-1)?.percent ?? '18' }, t.at(-1)!])} className="mt-2 min-h-11 text-sm font-semibold text-blue-700">+ pogʻona qoʻshish</button>
        <p className="mt-2 text-xs text-app-text-muted">{preview || 'Shkala notoʻgʻri'}</p>
      </div>
      <details className="text-sm"><summary className="min-h-11 cursor-pointer font-semibold text-blue-700">Shartlar matni (v{s.terms_version})</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-app-text">{s.terms.uz.map((l, i) => <li key={i}>{l}</li>)}</ol>
      </details>
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy} onClick={() => void save()} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
