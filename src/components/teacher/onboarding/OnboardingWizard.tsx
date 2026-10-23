/**
 * O'QITUVCHI ONBORDINGI — 8 qadamli usta (TZ).
 *
 * Har qadam kiritilayotganda avtomatik qoralama sifatida saqlanadi
 * (`?draft=1`), «Saqlash va davom etish» esa to'liq tekshirib keyingi
 * qadamga o'tkazadi. Aloqa bo'lmasa qoralama brauzerda turadi va aloqa
 * qaytgach yuboriladi — sahifa yangilansa ham hech narsa yo'qolmaydi.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle, Award, BadgeCheck, CalendarDays, Camera, Check, CheckCircle2, Clock3, CloudOff, Flag,
  GraduationCap, Loader2, PenLine, User, Video, Wallet, type LucideIcon,
} from 'lucide-react';
import { usePanel } from '../panel/panelContext';
import { Card, ErrorNote, GhostButton, PrimaryButton, Skeleton } from '../panel/ui';
import { TEACHER_BRAND_GRADIENT } from '../../../constants/teacherPaths';
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

/**
 * `focus` — anketa hali tasdiqlanmagan: kabinet o'rniga yolg'iz shu ekran, tepada katta
 * «yo'l xaritasi». Tasdiqlangan o'qituvchi uchun (kabinetdagi «Anketa» bo'limi) — ixcham ko'rinish.
 */
export default function OnboardingWizard({ focus = false }: { focus?: boolean }) {
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

      <JourneyHeader
        focus={focus} lang={lang} step={step} visible={visible} status={state.status} saving={saving}
        done={done} canOpen={(n) => locked || n <= Math.max(state.step, step) || done(n)} onOpen={goTo}
      />

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

const STEP_ICON: Record<number, LucideIcon> = {
  1: User, 2: Camera, 3: Award, 4: GraduationCap, 5: PenLine, 6: Video, 7: CalendarDays, 8: Wallet,
};

/**
 * Qadamlar yo'li: raqamli tugunlar chiziq bilan ulangan, bajarilgan qism yashil bo'lib to'ladi,
 * oxirida — maqsad («Dars berish»). 375px da ham bir qatorga sig'adi: yozuvlar faqat sm+ da,
 * telefonda joriy qadam nomi tugunlar ostida chiqadi.
 */
function JourneyHeader({ focus, lang, step, visible, status, saving, done, canOpen, onOpen }: {
  focus: boolean; lang: 'uz' | 'ru'; step: number; visible: number[]; status: OnboardingState['status'];
  saving: 'idle' | 'saving' | 'saved' | 'offline';
  done: (n: number) => boolean; canOpen: (n: number) => boolean; onOpen: (n: number) => void;
}) {
  const t = ONBOARDING_TEXT[lang];
  const steps = ONBOARDING_STEPS.filter((s) => visible.includes(s.step));
  const doneCount = steps.filter((s) => done(s.step)).length;
  const allDone = doneCount === steps.length;
  const review = status === 'pending_review';
  const position = steps.findIndex((s) => s.step === step);
  const info = steps[position] ?? steps[0];
  // Chiziq: bajarilgan qadamlar ketma-ketligi qayergacha yetgan bo'lsa, o'sha yergacha yashil.
  const reached = steps.findIndex((s) => !done(s.step));
  const fill = (reached === -1 ? steps.length : reached) / steps.length;

  return (
    <Card className="overflow-hidden p-0">
      {focus && (
        <div className="relative overflow-hidden px-5 pb-6 pt-5 text-white sm:px-7 sm:pt-7" style={{ background: TEACHER_BRAND_GRADIENT }}>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">{t.journeyKicker}</p>
          <h1 className="mt-1.5 max-w-[520px] text-[22px] font-extrabold leading-tight sm:text-[26px]">
            {review ? t.statusPending : t.journeyTitle(steps.length)}
          </h1>
          <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-white/80">{review ? t.statusPendingHint : t.journeyHint}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold tabular-nums">
              <CheckCircle2 className="h-3.5 w-3.5" />{t.journeyProgress(doneCount, steps.length)}
            </span>
            {!review && <span className="text-[12px] text-white/65">{t.journeyLocked}</span>}
          </div>
        </div>
      )}

      <div className="px-3 pb-4 pt-5 sm:px-6">
        <ol className="relative flex items-start" aria-label={t.title}>
          {/* Fon chizig'i va to'lib boruvchi qism — tugun markazlaridan o'tadi. */}
          <span aria-hidden className="absolute top-[22px] h-[3px] rounded-full bg-app-bg-subtle" style={{ left: `${50 / (steps.length + 1)}%`, right: `${50 / (steps.length + 1)}%` }} />
          <motion.span aria-hidden className="absolute top-[22px] h-[3px] origin-left rounded-full bg-[#22A552]"
            style={{ left: `${50 / (steps.length + 1)}%`, width: `${(100 * steps.length) / (steps.length + 1)}%` }}
            initial={false} animate={{ scaleX: fill }} transition={{ type: 'spring', stiffness: 140, damping: 24 }} />

          {steps.map((s, i) => {
            const Icon = STEP_ICON[s.step];
            const active = s.step === step;
            const ok = done(s.step);
            const open = canOpen(s.step);
            return (
              <li key={s.step} className="relative z-10 flex min-w-0 flex-1 flex-col items-center">
                <button type="button" disabled={!open} onClick={() => onOpen(s.step)} aria-current={active ? 'step' : undefined}
                  aria-label={`${i + 1}. ${s[lang]}`} title={s[lang]}
                  className="group flex h-11 w-full items-center justify-center outline-none disabled:cursor-not-allowed">
                  <span className={`relative flex items-center justify-center rounded-full transition-all duration-200 group-active:scale-90
                    ${active ? 'h-10 w-10 sm:h-11 sm:w-11 bg-app-primary text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] ring-4 ring-[#DBEAFE]'
                      : ok ? 'h-7 w-7 sm:h-8 sm:w-8 bg-[#22A552] text-white group-hover:scale-110'
                      : open ? 'h-7 w-7 sm:h-8 sm:w-8 border-2 border-app-border-strong bg-app-surface text-app-text group-hover:border-app-primary'
                      : 'h-7 w-7 sm:h-8 sm:w-8 border-2 border-app-border bg-app-surface text-app-text-muted'}`}>
                    {ok && !active ? <Check className="h-4 w-4" strokeWidth={3} />
                      : active ? <Icon className="h-5 w-5" />
                      : <span className="text-[12px] font-bold tabular-nums">{i + 1}</span>}
                  </span>
                </button>
                <span className={`mt-1.5 hidden px-0.5 text-center text-[11px] font-semibold leading-tight sm:block ${active ? 'text-app-text' : ok ? 'text-[#177A3C]' : 'text-app-text-muted'}`}>
                  {s[lang]}
                </span>
              </li>
            );
          })}

          <li className="relative z-10 flex min-w-0 flex-1 flex-col items-center">
            <span className="flex h-11 items-center justify-center">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full sm:h-8 sm:w-8 ${allDone && !review ? 'bg-[#22A552] text-white' : review ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-app-bg-subtle text-app-text-muted'}`}>
                {review ? <Clock3 className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
              </span>
            </span>
            <span className="mt-1.5 hidden text-center text-[11px] font-semibold leading-tight text-app-text-muted sm:block">
              {review ? t.journeyGoalReview : t.journeyGoal}
            </span>
          </li>
        </ol>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-app-border pt-3.5">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-app-text-muted">{t.stepOf(position + 1, steps.length)}</p>
            <h2 className="truncate text-[18px] font-bold text-app-text sm:text-[20px]">{info[lang]}</h2>
          </div>
          <SaveIndicator state={saving} lang={lang} />
        </div>
      </div>
    </Card>
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
