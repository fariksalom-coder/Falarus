/**
 * O'QITUVCHI ONBORDINGI — 8 qadamli usta (TZ).
 *
 * Har qadam kiritilayotganda avtomatik qoralama sifatida saqlanadi
 * (`?draft=1`), «Saqlash va davom etish» esa to'liq tekshirib keyingi
 * qadamga o'tkazadi. Aloqa bo'lmasa qoralama brauzerda turadi va aloqa
 * qaytgach yuboriladi — sahifa yangilansa ham hech narsa yo'qolmaydi.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock3, CloudOff, Loader2 } from 'lucide-react';
import { usePanel } from '../panel/panelContext';
import { Card, ErrorNote, GhostButton, PrimaryButton, ProgressBar, Skeleton } from '../panel/ui';
import {
  ERRORS, ONBOARDING_STEPS, stepsForPath, validateStep, type FieldErrors, type OnboardingData, type OnboardingPath,
} from '../../../../shared/teacherOnboarding';
import {
  getOnboarding, OnboardingError, savePosition, saveStep, submitOnboarding, type FieldError, type OnboardingState,
} from '../../../api/teacherOnboarding';
import { ONBOARDING_TEXT } from './text';
import { StepAbout, StepCertification, StepEducation, StepPersonal, StepPricing } from './StepForms';
import StepPhoto from './StepPhoto';
import StepVideo from './StepVideo';
import StepSchedule from './StepSchedule';

export type StepProps = {
  state: OnboardingState;
  setState: (s: OnboardingState) => void;
  /** Kiritilgan qiymatlar — avtosaqlash uchun (qoralama). */
  onDraft: (body: unknown) => void;
  errors: Record<string, string>;
  lang: 'uz' | 'ru';
  token: string;
};

const DRAFT_KEY = (step: number) => `falarus.teacherOnboarding.draft.${step}`;
const readDraft = (step: number): unknown => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY(step)) ?? 'null'); } catch { return null; } };
const writeDraft = (step: number, body: unknown) => { try { localStorage.setItem(DRAFT_KEY(step), JSON.stringify(body)); } catch { /* xotira to'la — server baribir saqlaydi */ } };
const clearDraft = (step: number) => { try { localStorage.removeItem(DRAFT_KEY(step)); } catch { /* */ } };

/** Qadamdan saqlanadigan qismni ajratish (klient tekshiruvi uchun). */
function applyBody(data: OnboardingData, step: number, body: any): OnboardingData {
  switch (step) {
    case 1: return { ...data, personal: { ...data.personal, ...body } };
    case 3: return { ...data, certificates: body.certificates ?? [] };
    case 4: return { ...data, education: body.education ?? [] };
    case 5: return { ...data, about_answers: body.answers ?? {}, about: body.about ?? '' };
    case 7: return { ...data, schedule: body.schedule };
    case 8: return { ...data, lesson_price_uzs: body.lesson_price_uzs ?? null, terms_accepted: body.terms_accepted === true };
    default: return data;
  }
}

export default function OnboardingWizard() {
  const { token, lang } = usePanel();
  const t = ONBOARDING_TEXT[lang];
  const [state, setState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState(1);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const pending = useRef<{ step: number; body: unknown } | null>(null);
  const timer = useRef<number | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const msg = useCallback((code: keyof typeof ERRORS) => ERRORS[code][lang], [lang]);
  const fromServer = useCallback((fields: Record<string, FieldError>) =>
    Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[lang]])), [lang]);

  useEffect(() => {
    let alive = true;
    getOnboarding(token).then((s) => {
      if (!alive) return;
      setState(s);
      setStep(s.status === 'needs_revision' && s.review?.step ? s.review.step : s.step);
    }).catch((e) => alive && setLoadError(e instanceof Error ? e.message : 'Xatolik'));
    return () => { alive = false; };
  }, [token]);

  /** Qoralamani serverga yuborish; aloqa bo'lmasa brauzerda qoladi. */
  const flush = useCallback(async () => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    setSaving('saving');
    try {
      const s = await saveStep(token, p.step, p.body, true);
      clearDraft(p.step);
      setState((prev) => (prev ? { ...prev, ...s, step: prev.step } : s));
      setSaving('saved');
    } catch (e) {
      if (e instanceof OnboardingError && e.status === 0) { pending.current = pending.current ?? p; setSaving('offline'); }
      else setSaving('idle');
    }
  }, [token]);

  useEffect(() => {
    const online = () => { const draft = readDraft(step); if (draft && !pending.current) pending.current = { step, body: draft }; void flush(); };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [flush, step]);

  const onDraft = useCallback((body: unknown) => {
    writeDraft(step, body);
    pending.current = { step, body };
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 900);
  }, [flush, step]);

  const goTo = (n: number) => {
    if (timer.current) { window.clearTimeout(timer.current); void flush(); }
    setErrors({}); setFormError('');
    setStep(n);
    void savePosition(token, n);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  if (loadError) return <ErrorNote text={loadError} />;
  if (!state) return <Card className="p-6"><Skeleton rows={6} /></Card>;

  const path = (state.data.personal.path || null) as OnboardingPath | null;
  const visible = stepsForPath(path);
  const locked = state.status === 'pending_review' || state.status === 'rejected';
  // Bajarilgan = o'qituvchi qadamni o'tgan VA ma'lumot to'g'ri. Faqat to'g'rilik yetmaydi:
  // bo'sh ta'lim (ixtiyoriy) va shablon jadval boshidanoq «to'g'ri» hisoblanardi.
  const passed = (n: number) => n < state.step || state.status !== 'draft' || (n === 8 && state.data.terms_accepted);
  const done = (n: number) => passed(n) && Object.keys(validateStep(n, state.data, state.settings)).length === 0;
  const doneCount = visible.filter(done).length;
  const info = ONBOARDING_STEPS.find((s) => s.step === step)!;
  const isLast = step === visible[visible.length - 1];

  /** «Saqlash va davom etish»: klientda tekshirib, serverga to'liq saqlash. */
  const saveAndNext = async (body: unknown) => {
    setFormError('');
    const local: FieldErrors = validateStep(step, applyBody(state.data, step, body), state.settings);
    if (Object.keys(local).length) {
      setErrors(Object.fromEntries(Object.entries(local).map(([k, c]) => [k, msg(c)])));
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    pending.current = null;
    setBusy(true);
    try {
      const s = await saveStep(token, step, body);
      clearDraft(step);
      setState(s);
      setErrors({});
      const nextVisible = stepsForPath((s.data.personal.path || null) as OnboardingPath | null).find((n) => n > step);
      if (nextVisible) goTo(nextVisible);
    } catch (e) {
      if (e instanceof OnboardingError && Object.keys(e.fields).length) setErrors(fromServer(e.fields));
      else setFormError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true); setFormError('');
    try {
      setState(await submitOnboarding(token));
    } catch (e) {
      if (e instanceof OnboardingError && typeof e.extra.step === 'number') { goTo(e.extra.step); setFormError(t.notReady(e.extra.step)); }
      else setFormError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const props: StepProps = { state, setState, onDraft, errors, lang, token };
  const formProps = { ...props, busy, onSubmit: saveAndNext };

  return (
    <div ref={top} className="mx-auto max-w-3xl space-y-4 pb-24">
      <StatusBanner state={state} lang={lang} onFix={(n) => goTo(n)} />

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-app-text-muted">{t.stepOf(step, ONBOARDING_STEPS.length)}</p>
            <h1 className="truncate text-[20px] font-bold text-app-text">{info[lang]}</h1>
          </div>
          <SaveIndicator state={saving} lang={lang} />
        </div>
        <div className="mt-3"><ProgressBar percent={(doneCount / visible.length) * 100} tone={doneCount === visible.length ? 'green' : 'violet'} /></div>
        <ol className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label={t.title}>
          {ONBOARDING_STEPS.map((s) => {
            const skipped = !visible.includes(s.step);
            const active = s.step === step;
            const ok = !skipped && done(s.step);
            return (
              <li key={s.step} className="shrink-0">
                <button type="button" disabled={skipped || (!locked && s.step > Math.max(state.step, step) && !ok)} onClick={() => goTo(s.step)}
                  aria-current={active ? 'step' : undefined} title={s[lang]}
                  className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[12px] px-3 text-[12.5px] font-semibold transition active:scale-[0.97]
                    ${active ? 'bg-app-primary text-white' : skipped ? 'bg-app-bg-subtle text-app-text-muted line-through opacity-60' : ok ? 'bg-[#E8F7EE] text-[#17803D]' : 'border border-app-border-strong bg-app-surface text-app-text'}
                    disabled:cursor-not-allowed`}>
                  {ok && !active ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                  <span className="hidden md:inline">{s[lang]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <fieldset disabled={locked} className="min-w-0 space-y-4 disabled:opacity-70">
        {step === 1 && <StepPersonal {...formProps} key={`1-${state.status}`} initial={readDraft(1)} />}
        {step === 2 && <StepPhoto {...props} onNext={() => goTo(visible.find((n) => n > 2) ?? 2)} />}
        {step === 3 && <StepCertification {...formProps} initial={readDraft(3)} />}
        {step === 4 && <StepEducation {...formProps} initial={readDraft(4)} />}
        {step === 5 && <StepAbout {...formProps} initial={readDraft(5)} />}
        {step === 6 && <StepVideo {...props} onNext={() => goTo(7)} />}
        {step === 7 && <StepSchedule {...formProps} initial={readDraft(7)} />}
        {step === 8 && <StepPricing {...formProps} initial={readDraft(8)} />}
      </fieldset>

      {formError && <ErrorNote text={formError} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <GhostButton onClick={() => goTo(visible.filter((n) => n < step).at(-1) ?? step)} disabled={step === visible[0] || busy}>{t.back}</GhostButton>
        {isLast && !locked && state.status !== 'active' && (
          <PrimaryButton onClick={() => void submit()} disabled={busy || state.ready_step !== null}>
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t.submit}
          </PrimaryButton>
        )}
      </div>
      {isLast && !locked && state.status !== 'active' && state.ready_step !== null && (
        <p className="text-right text-[12px] text-app-text-muted">{t.notReady(state.ready_step)}</p>
      )}
    </div>
  );
}

function SaveIndicator({ state, lang }: { state: 'idle' | 'saving' | 'saved' | 'offline'; lang: 'uz' | 'ru' }) {
  const t = ONBOARDING_TEXT[lang];
  if (state === 'idle') return null;
  return (
    <span role="status" className={`flex shrink-0 items-center gap-1.5 text-[12px] font-semibold ${state === 'offline' ? 'text-[#B45309]' : 'text-app-text-muted'}`}>
      {state === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t.saving}</>}
      {state === 'saved' && <><CheckCircle2 className="h-3.5 w-3.5 text-[#17A34A]" />{t.saved}</>}
      {state === 'offline' && <><CloudOff className="h-3.5 w-3.5" /><span className="max-w-[180px] leading-tight">{t.offline}</span></>}
    </span>
  );
}

function StatusBanner({ state, lang, onFix }: { state: OnboardingState; lang: 'uz' | 'ru'; onFix: (step: number) => void }) {
  const t = ONBOARDING_TEXT[lang];
  if (state.status === 'draft' || state.status === 'paused') return null;
  const tone = {
    pending_review: { icon: Clock3, cls: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]', title: t.statusPending, hint: t.statusPendingHint },
    active: { icon: BadgeCheck, cls: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#14532D]', title: t.statusActive, hint: t.statusActiveHint },
    needs_revision: { icon: AlertTriangle, cls: 'border-[#FDE68A] bg-[#FFFBEB] text-[#78350F]', title: t.statusRevision, hint: '' },
    rejected: { icon: AlertTriangle, cls: 'border-[#FECACA] bg-[#FEF2F2] text-[#7F1D1D]', title: t.statusRejected, hint: '' },
  }[state.status];
  const Icon = tone.icon;
  return (
    <div role="status" className={`rounded-[18px] border p-4 ${tone.cls}`}>
      <p className="flex items-center gap-2 text-[14px] font-bold"><Icon className="h-5 w-5 shrink-0" />{tone.title}</p>
      {tone.hint && <p className="mt-1 text-[13px]">{tone.hint}</p>}
      {state.review?.comment && (state.status === 'needs_revision' || state.status === 'rejected') && (
        <p className="mt-2 text-[13px]"><b>{t.reviewComment}:</b> {state.review.comment}</p>
      )}
      {state.status === 'needs_revision' && state.review?.step && (
        <button type="button" onClick={() => onFix(state.review!.step!)} className="mt-3 min-h-11 rounded-[12px] bg-[#78350F] px-4 text-[13px] font-semibold text-white active:scale-[0.98]">
          {t.goFix} ({state.review.step})
        </button>
      )}
    </div>
  );
}
