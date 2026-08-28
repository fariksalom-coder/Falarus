import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Lock, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  deleteTeacherVideo,
  getTeacherProfile,
  saveTeacherProfile,
  uploadTeacherVideo,
  type TeacherProfileResponse,
} from '../../../../api/teacherPanel';
import { removeUserAvatar, uploadUserAvatar, bustAvatarUrl } from '../../../../api/user';
import { uploadCertificateImage } from '../../../../api/teachers';
import { resolveAssetUrl } from '../../../../api';
import {
  getTeacherListingPriceUzs,
  resolveTeacherListingPlanCode,
} from '../../../../../shared/paymentProducts';
import { useAuth } from '../../../../context/AuthContext';
import { usePanel } from '../panelContext';
import {
  LANGUAGE_OPTIONS,
  LEVEL_OPTIONS,
  SUBJECT_OPTIONS,
  VIDEO_QUESTIONS,
  tpl,
  type PanelDict,
  type PanelLang,
} from '../lang';
import {
  Avatar,
  Card,
  Chips,
  ErrorNote,
  Field,
  inputErrorClass,
  GhostButton,
  Modal,
  PrimaryButton,
  ProgressBar,
  Skeleton,
  inputClass,
  textareaClass,
} from '../ui';

type FieldKind = 'text' | 'date' | 'number' | 'textarea' | 'select' | 'chips' | 'edu' | 'cert';

/** Ta'lim va sertifikat qatorlari — bazada JSON massiv bo'lib saqlanadi. */
type Row = Record<string, string>;
type FormValue = string | string[] | Row[];

type Spec = {
  label: keyof PanelDict;
  kind: FieldKind;
  wide?: boolean;
  options?: (lang: PanelLang) => string[];
  square?: boolean;
};

/** Anketa maydonlari — nomlari serverdagi `ANKETA_QADAMLAR` bilan bir xil. */
const SPEC: Record<string, Spec> = {
  first_name: { label: 'fFirstName', kind: 'text' },
  last_name: { label: 'fLastName', kind: 'text' },
  birth_date: { label: 'fBirthDate', kind: 'date' },
  gender: { label: 'fGender', kind: 'select' },
  public_email: { label: 'fEmail', kind: 'text' },
  telegram_username: { label: 'fTelegram', kind: 'text' },
  region: { label: 'fRegion', kind: 'text' },
  city: { label: 'fCity', kind: 'text' },
  passport_number: { label: 'fPassportNumber', kind: 'text' },
  passport_issued_by: { label: 'fPassportIssuedBy', kind: 'text', wide: true },
  passport_issued_at: { label: 'fPassportIssuedAt', kind: 'date' },
  avatar_url: { label: 'fAvatar', kind: 'text', wide: true },
  education: { label: 'fEducation', kind: 'edu', wide: true },
  experience_years: { label: 'fExperience', kind: 'number' },
  subjects: { label: 'fSubjects', kind: 'chips', wide: true, options: (l) => SUBJECT_OPTIONS[l] },
  teaching_levels: {
    label: 'fLevels',
    kind: 'chips',
    wide: true,
    options: () => LEVEL_OPTIONS,
    square: true,
  },
  languages: { label: 'fLanguages', kind: 'chips', wide: true, options: (l) => LANGUAGE_OPTIONS[l] },
  certificates: { label: 'fCertificates', kind: 'cert', wide: true },
  achievements: { label: 'fAchievements', kind: 'textarea', wide: true },
  about: { label: 'fAbout', kind: 'textarea', wide: true },
  headline: { label: 'fHeadline', kind: 'text', wide: true },
  monthly_course_price_amount: { label: 'fPrice', kind: 'number' },
};

/** Bazadagi qiymatni formaga tushuradigan ko'rinishga keltiradi. */
function toForm(value: unknown, kind: FieldKind): FormValue {
  if (kind === 'edu' || kind === 'cert') {
    const arr = Array.isArray(value)
      ? value
      : typeof value === 'string' && value.trim().startsWith('[')
        ? (() => {
            try {
              return JSON.parse(value);
            } catch {
              return [];
            }
          })()
        : [];
    return (Array.isArray(arr) ? arr : []).map((it) => {
      const r = (it ?? {}) as Record<string, unknown>;
      const out: Row = {};
      for (const [k, v] of Object.entries(r)) out[k] = v == null ? '' : String(v);
      return out;
    });
  }
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return arr.map(String);
    } catch {
      /* JSON emas — oddiy matn */
    }
  }
  if (value == null) return kind === 'chips' ? [] : '';
  if (kind === 'date') return String(value).slice(0, 10);
  return String(value);
}

export default function Anketa() {
  const { token, t, lang, go, toast } = usePanel();
  const navigate = useNavigate();
  const [data, setData] = useState<TeacherProfileResponse | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>({});
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [tolovOchilmoqda, setTolovOchilmoqda] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getTeacherProfile(token);
      setData(r);
      setStep((s) => (s === 1 ? Math.min(12, Math.max(1, r.anketa.current_step)) : s));
      const next: Record<string, FormValue> = {};
      for (const [key, spec] of Object.entries(SPEC)) {
        next[key] = toForm(r.profile[key], spec.kind);
      }
      setForm(next);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [token, t.errorGeneric]);

  useEffect(() => {
    void load();
  }, [load]);

  const stepTitles = useMemo(
    () => [
      t.step1,
      t.step2,
      t.step3,
      t.step4,
      t.step5,
      t.step6,
      t.step7,
      t.step8,
      t.step9,
      t.step10,
      t.step11,
      t.step12,
    ],
    [t]
  );

  if (loading) return <Skeleton rows={5} />;
  if (!data) return <ErrorNote text={err || t.errorGeneric} />;

  const current = data.anketa.steps.find((s) => s.step === step);
  const percent = data.anketa.completion_percent;
  const videoDoc = data.documents.find((d) => d.kind === 'video') ?? null;

  /** Maydon to'ldirilganmi — formadagi JORIY qiymat bo'yicha. */
  const filled = (field: string): boolean => {
    const v = form[field];
    if (Array.isArray(v)) return v.length > 0;
    return String(v ?? '').trim().length > 0;
  };

  /**
   * Qadamdagi to'ldirilmagan maydonlar. 4 va 11-qadamda matn maydoni yo'q —
   * ular fayl yuklanganiga qarab tekshiriladi.
   */
  const missingOf = (stepNo: number, fields: string[]): string[] => {
    if (stepNo === 4) return data.profile.avatar_url ? [] : ['avatar_url'];
    if (stepNo === 11) return videoDoc ? [] : ['video_url'];
    return fields.filter((f) => SPEC[f] && !filled(f));
  };

  const missingSteps = data.anketa.steps
    .map((st) => ({ step: st.step, missing: missingOf(st.step, st.fields) }))
    .filter((x) => x.missing.length > 0);
  const currentMissing = current ? missingOf(current.step, current.fields) : [];

  /** Joriy qadam maydonlarini saqlaydi. */
  const persist = async (extra: Record<string, unknown> = {}, nextStep?: number) => {
    setSaving(true);
    setErr('');
    try {
      const patch: Record<string, unknown> = { ...extra };
      for (const f of current?.fields ?? []) {
        const spec = SPEC[f];
        if (!spec) continue;
        const value = form[f];
        if (spec.kind === 'chips' || spec.kind === 'edu' || spec.kind === 'cert') {
          patch[f] = Array.isArray(value) ? value : [];
        } else {
          patch[f] = String(value ?? '');
        }
      }
      if (nextStep) patch.anketa_step = nextStep;
      // 11-qadamda saqlanadigan matn maydoni yo'q (video alohida yuklanadi).
      if (Object.keys(patch).length === 0) return true;
      await saveTeacherProfile(token, patch);
      if (nextStep) setStep(nextStep);
      await load();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setValue = (key: string, value: FormValue) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleChip = (key: string, value: string) =>
    setForm((f) => {
      const arr = Array.isArray(f[key]) ? [...(f[key] as string[])] : [];
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(value);
      return { ...f, [key]: arr };
    });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#171A3D] lg:text-[27px]">
            {t.anketaTitle}
          </h1>
          <p className="mt-1 text-[13px] text-[#6E7191] lg:text-[14px]">
            {tpl(t.anketaSubtitle, { step, pct: percent })}
          </p>
        </div>
        <GhostButton
          onClick={async () => {
            if (await persist()) go('profile');
          }}
          disabled={saving}
        >
          {t.anketaSaveExit}
        </GhostButton>
      </div>

      <div className="mb-3">
        <ProgressBar percent={percent} />
      </div>

      {missingSteps.length > 0 ? (
        <button
          type="button"
          onClick={() => setStep(missingSteps[0].step)}
          className="mb-4 flex w-full items-center gap-2.5 rounded-[14px] border border-[#FBDCDC] bg-[#FFF6F6] px-4 py-3 text-left"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9474D] text-[12px] font-bold text-white">
            !
          </span>
          <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-[#8A3B3E]">
            {tpl(t.missingCount, { n: missingSteps.length })} ·{' '}
            <span className="font-normal">
              {missingSteps.map((m) => stepTitles[m.step - 1]).join(', ')}
            </span>
          </span>
          <span className="shrink-0 text-[12px] font-semibold text-[#E9474D]">{t.fill} →</span>
        </button>
      ) : (
        <p className="mb-4 rounded-[14px] border border-[#C7E9D5] bg-[#F3FBF6] px-4 py-2.5 text-[12.5px] font-semibold text-[#12703A]">
          ✓ {t.allFilled}
        </p>
      )}

      {err ? <ErrorNote text={err} /> : null}

      <div className="grid gap-4 xl:grid-cols-[264px_minmax(0,1fr)] xl:items-start">
        {/* Qadamlar ro'yxati */}
        <Card className="hidden p-3 xl:block">
          {data.anketa.steps.map((s) => {
            const on = s.step === step;
            const gap = missingOf(s.step, s.fields).length > 0;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setStep(s.step)}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[12.5px] transition ${
                  on
                    ? 'bg-[#F1EFFE] font-semibold text-[#2E2A6B]'
                    : gap
                      ? 'font-semibold text-[#C23A3F] hover:bg-[#FFF6F6]'
                      : 'text-[#5B5E86] hover:bg-[#FAFAFE]'
                }`}
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    gap
                      ? 'bg-[#E9474D] text-white'
                      : s.done
                        ? 'bg-[#17A34A] text-white'
                        : on
                          ? 'bg-[#4B3BE4] text-white'
                          : 'bg-[#F0EFF8] text-[#8A8CAE]'
                  }`}
                >
                  {gap ? '!' : s.done ? '✓' : s.step}
                </span>
                <span className="min-w-0 flex-1 truncate">{stepTitles[s.step - 1]}</span>
              </button>
            );
          })}
        </Card>

        {/* Telefonda — gorizontal qadamlar */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 xl:hidden">
          {data.anketa.steps.map((s) => {
            const gap = missingOf(s.step, s.fields).length > 0;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setStep(s.step)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  s.step === step
                    ? 'bg-[#4B3BE4] text-white'
                    : gap
                      ? 'bg-[#FFF6F6] text-[#C23A3F] ring-1 ring-[#F3C7C7]'
                      : s.done
                        ? 'bg-[#E7F4EC] text-[#17A34A]'
                        : 'bg-white text-[#8A8CAE] ring-1 ring-[#E4E3F2]'
                }`}
              >
                {s.step === step ? s.step : gap ? '!' : s.done ? '✓' : s.step}
              </button>
            );
          })}
        </div>

        <Card className="flex min-h-[440px] flex-col gap-5 p-5 lg:p-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8A8CAE]">
              {tpl(t.stepLabel, { n: step })}
            </p>
            <p className="mt-1 text-[19px] font-semibold tracking-[-0.01em] text-[#171A3D]">
              {stepTitles[step - 1]}
            </p>
          </div>

          {step === 3 ? (
            <Note icon={<Lock className="h-5 w-5 text-[#2E4BA8]" />} tone="blue" text={t.privateHint} />
          ) : null}
          {step === 2 ? (
            <Note
              icon={<ShieldCheck className="h-5 w-5 text-[#4B3BE4]" />}
              tone="violet"
              text={t.contactHint}
            />
          ) : null}
          {step === 4 ? <Note tone="grey" text={t.photoHint} /> : null}
          {step === 10 ? <Note tone="grey" text={t.aboutHint} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {(current?.fields ?? []).map((f) => {
              const spec = SPEC[f];
              if (!spec) return null;
              const label = t[spec.label];
              const value = form[f];
              const gap = currentMissing.includes(f);

              // Surat qurilma xotirasidan yuklanadi — havola qo'lda yozilmaydi.
              if (f === 'avatar_url') {
                return (
                  <div key={f} className="sm:col-span-2">
                    <PhotoStep url={String(value ?? '')} onChanged={load} />
                  </div>
                );
              }

              if (spec.kind === 'edu' || spec.kind === 'cert') {
                const rows = Array.isArray(value) ? (value as Row[]) : [];
                return (
                  <div key={f} className="sm:col-span-2">
                    <RowEditor
                      kind={spec.kind}
                      rows={rows}
                      onChange={(next) => setValue(f, next)}
                    />
                  </div>
                );
              }

              if (spec.kind === 'chips') {
                return (
                  <div key={f} className="sm:col-span-2">
                    <p
                      className={`mb-2 text-[12.5px] font-semibold ${
                        gap ? 'text-[#C23A3F]' : 'text-[#3E4166]'
                      }`}
                    >
                      {label}
                      {gap ? <span className="ml-1 text-[#E9474D]">*</span> : null}
                      <span className="ml-2 font-normal text-[#A0A1BC]">
                        {gap ? t.notFilledField : t.selectHint}
                      </span>
                    </p>
                    <Chips
                      options={spec.options?.(lang) ?? []}
                      selected={Array.isArray(value) ? (value as string[]) : []}
                      onToggle={(v) => toggleChip(f, v)}
                      square={spec.square}
                    />
                  </div>
                );
              }

              if (spec.kind === 'textarea') {
                const text = String(value ?? '');
                return (
                  <Field
                    key={f}
                    label={label}
                    className="sm:col-span-2"
                    error={gap ? t.notFilledField : undefined}
                    hint={f === 'about' ? tpl(t.charsLeft, { n: text.length }) : undefined}
                  >
                    <textarea
                      rows={f === 'about' ? 5 : 3}
                      maxLength={f === 'about' ? 1000 : undefined}
                      value={text}
                      onChange={(e) => setValue(f, e.target.value)}
                      className={`${textareaClass} ${gap ? inputErrorClass : ''}`}
                    />
                  </Field>
                );
              }

              if (spec.kind === 'select') {
                return (
                  <Field key={f} label={label} error={gap ? t.notFilledField : undefined}>
                    <select
                      value={String(value ?? '')}
                      onChange={(e) => setValue(f, e.target.value)}
                      className={`${inputClass} ${gap ? inputErrorClass : ''}`}
                    >
                      <option value="">{t.chooseOption}</option>
                      <option value="male">{t.fMale}</option>
                      <option value="female">{t.fFemale}</option>
                    </select>
                  </Field>
                );
              }

              return (
                <Field
                  key={f}
                  label={label}
                  className={spec.wide ? 'sm:col-span-2' : ''}
                  error={gap ? t.notFilledField : undefined}
                >
                  <input
                    type={spec.kind === 'date' ? 'date' : spec.kind === 'number' ? 'number' : 'text'}
                    value={String(value ?? '')}
                    onChange={(e) => setValue(f, e.target.value)}
                    className={`${inputClass} ${gap ? inputErrorClass : ''}`}
                  />
                </Field>
              );
            })}
          </div>

          {step === 11 ? (
            <VideoStep
              doc={data.documents.find((d) => d.kind === 'video') ?? null}
              onChanged={load}
            />
          ) : null}

          {step === 12 ? (
            <div className="flex flex-col gap-3">
              {missingSteps.length > 0 ? (
                <div className="rounded-[16px] border border-[#FBDCDC] bg-[#FFF6F6] p-4">
                  <p className="text-[13.5px] font-semibold text-[#8A3B3E]">{t.missingTitle}</p>
                  <p className="mt-1 text-[12.5px] text-[#A05356]">{t.missingHint}</p>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {missingSteps.map((m) => (
                      <li key={m.step}>
                        <button
                          type="button"
                          onClick={() => setStep(m.step)}
                          className="flex w-full items-center gap-2.5 rounded-[10px] bg-white px-3 py-2 text-left text-[12.5px] font-semibold text-[#8A3B3E] ring-1 ring-[#F3C7C7]"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9474D] text-[11px] font-bold text-white">
                            {m.step}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{stepTitles[m.step - 1]}</span>
                          <span className="shrink-0 text-[11.5px] text-[#E9474D]">{t.fill} →</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* To'lov qilinmaguncha tekshiruvga yuborish yopiq. */}
              {!data.payment?.paid ? (
                <div className="rounded-[16px] border border-[#F5E3B8] bg-[#FFFBF0] p-4">
                  <p className="text-[13.5px] font-semibold text-[#7A5B10]">{t.payNeededTitle}</p>
                  <p className="mt-1 text-[12.5px] leading-[1.7] text-[#8A7134]">{t.payNeededText}</p>
                  <p className="mt-2 text-[12.5px] font-semibold text-[#7A5B10]">
                    {tpl(t.payPrice, {
                      sum: getTeacherListingPriceUzs(
                        resolveTeacherListingPlanCode(Boolean(data.payment?.first_discount_used))
                      ).toLocaleString('ru-RU'),
                    })}
                  </p>
                  <PrimaryButton
                    className="mt-3"
                    disabled={tolovOchilmoqda}
                    onClick={async () => {
                      setTolovOchilmoqda(true);
                      setErr('');
                      try {
                        const plan = resolveTeacherListingPlanCode(
                          Boolean(data.payment?.first_discount_used)
                        );
                        /*
                         * Bu yerda to'lov yozuvi OCHILMAYDI. Ilgari
                         * createTeacherListingPayment() cheksiz `manual` pending
                         * qator ochar, keyin /payment sahifasidagi submitPayment
                         * o'sha pending'ni ko'rib PENDING_PAYMENT bilan rad etardi —
                         * natijada o'qituvchi umuman to'lay olmasdi (manual pending
                         * hech qachon eskirmaydi, faqat admin bekor qiladi).
                         * To'lov yozuvini yagona egasi — /payment (chek) yoki
                         * Rahmat checkout (onlayn) ochadi.
                         */
                        navigate('/payment', {
                          state: {
                            productCode: 'teacher_listing',
                            listingPlanCode: plan,
                            currency: 'UZS',
                            returnTo: '/teacher-cabinet',
                          },
                        });
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : t.errorGeneric);
                      } finally {
                        setTolovOchilmoqda(false);
                      }
                    }}
                  >
                    {tolovOchilmoqda ? t.payOpening : t.payNow}
                  </PrimaryButton>
                </div>
              ) : null}

              <div className="rounded-[16px] bg-[#F1EFFE] p-4">
                <p className="text-[13.5px] font-semibold text-[#2E2A6B]">{t.previewHint}</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <GhostButton onClick={() => go('public')}>{t.openFullPreview}</GhostButton>
                  <PrimaryButton
                    onClick={async () => {
                      if (await persist({ submit: true })) toast(t.anketaSent);
                    }}
                    disabled={saving || missingSteps.length > 0 || !data.payment?.paid}
                  >
                    {t.anketaSend}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#F1F0FA] pt-4">
            <GhostButton onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || saving}>
              ← {t.back}
            </GhostButton>
            <span className="hidden text-[12px] text-[#8A8CAE] sm:block">{t.anketaAutoSave}</span>
            <PrimaryButton
              onClick={() => void persist({}, step < 12 ? step + 1 : undefined)}
              disabled={saving}
              className="px-6"
            >
              {saving ? t.saving : step < 12 ? `${t.next} →` : t.save}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Note({
  text,
  tone,
  icon,
}: {
  text: string;
  tone: 'blue' | 'violet' | 'grey';
  icon?: React.ReactNode;
}) {
  const tones = {
    blue: 'bg-[#F5F7FF] border-[#DDE3FA] text-[#4A5C93]',
    violet: 'bg-[#F1EFFE] border-transparent text-[#3B357F]',
    grey: 'bg-[#F7F7FC] border-transparent text-[#6E7191]',
  } as const;
  return (
    <div className={`flex gap-3 rounded-[16px] border p-4 ${tones[tone]}`}>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <p className="text-[12.5px] leading-[1.65]">{text}</p>
    </div>
  );
}

/* ---------------------------- 11-qadam: video ---------------------------- */

type DocRow = { id: number; kind: string; file_url: string; original_name: string; status: string; admin_note?: string };

/**
 * Video-taqdimot. Havola emas — faylning o'zi qurilmadan yuklanadi.
 * Yuklangach admin tekshiradi; tasdiqlangach video o'quvchilarga ko'rinadi.
 */
function VideoStep({ doc, onChanged }: { doc: DocRow | null; onChanged: () => Promise<void> | void }) {
  const { token, t, lang, toast } = usePanel();
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [err, setErr] = useState('');

  const status = doc?.status ?? '';

  const pick = async (file: File) => {
    setErr('');
    setBusy(true);
    setPercent(0);
    try {
      await uploadTeacherVideo(token, file, setPercent);
      toast(t.saved);
      await onChanged();
    } catch (e) {
      const matn = e instanceof Error ? e.message : t.errorGeneric;
      setErr(matn);
      toast(matn);
    } finally {
      setBusy(false);
    }
  };

  const drop = async () => {
    setBusy(true);
    try {
      await deleteTeacherVideo(token);
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {doc ? (
        <video
          src={doc.file_url}
          controls
          playsInline
          className="w-full max-h-[380px] rounded-[18px] bg-black"
        />
      ) : (
        <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[18px] border-[1.5px] border-dashed border-[#C9C6EC] bg-[#FAFAFE] text-[#4B3BE4] transition hover:border-[#4B3BE4]">
          <Camera className="h-8 w-8" strokeWidth={1.6} />
          <span className="text-[13px] font-semibold">{t.videoUpload}</span>
          <span className="text-[11.5px] font-normal text-[#8A8CAE]">{t.videoFormats}</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void pick(file);
            }}
          />
        </label>
      )}

      {busy ? (
        <div>
          <ProgressBar percent={percent} />
          <p className="mt-1.5 text-center text-[12px] font-semibold text-[#4B3BE4]">
            {tpl(t.videoUploading, { n: percent })}
          </p>
        </div>
      ) : null}

      {err ? <p className="text-[12.5px] font-medium text-[#C23A3F]">{err}</p> : null}

      {doc ? (
        <div
          className={`rounded-[16px] border p-4 ${
            status === 'approved'
              ? 'border-[#C7E9D5] bg-[#F3FBF6]'
              : status === 'rejected'
                ? 'border-[#FBDCDC] bg-[#FFF6F6]'
                : 'border-[#F5E3B8] bg-[#FFFBF0]'
          }`}
        >
          <p
            className={`text-[13px] font-semibold ${
              status === 'approved'
                ? 'text-[#12703A]'
                : status === 'rejected'
                  ? 'text-[#8A3B3E]'
                  : 'text-[#7A5B10]'
            }`}
          >
            {status === 'approved'
              ? t.videoStatusApproved
              : status === 'rejected'
                ? t.videoStatusRejected
                : t.videoStatusPending}
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.65] text-[#6E7191]">
            {status === 'approved'
              ? t.videoStatusApprovedText
              : status === 'rejected'
                ? doc.admin_note || t.videoModerationNote
                : t.videoStatusPendingText}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <label className="min-h-[44px] cursor-pointer rounded-[12px] bg-[#4B3BE4] px-4 py-3 text-[13px] font-semibold text-white">
          {doc ? t.videoReplace : t.videoUpload}
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void pick(file);
            }}
          />
        </label>
        {doc ? (
          <GhostButton tone="danger" onClick={() => void drop()} disabled={busy}>
            {t.videoDelete}
          </GhostButton>
        ) : null}
      </div>

      <p className="text-[11.5px] leading-[1.6] text-[#8A8CAE]">
        {t.videoFormats} · {t.videoModerationNote}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] bg-[#F1EFFE] p-4">
          <p className="text-[13px] font-semibold text-[#2E2A6B]">{t.videoWhyTitle}</p>
          <p className="mt-1.5 text-[12.5px] leading-[1.7] text-[#5C5A8F]">{t.videoWhyText}</p>
          <p className="mt-3 text-[13px] font-semibold text-[#2E2A6B]">{t.videoTipsTitle}</p>
          <p className="mt-1.5 text-[12.5px] leading-[1.7] text-[#5C5A8F]">{t.videoHint}</p>
        </div>

        <div className="rounded-[16px] border border-[#EFEEF8] bg-[#FAFAFE] p-4">
          <p className="text-[13px] font-semibold text-[#171A3D]">{t.videoQuestionsTitle}</p>
          <ul className="mt-2 space-y-1.5">
            {VIDEO_QUESTIONS[lang].map((q) => (
              <li key={q} className="flex gap-2 text-[12px] leading-[1.55] text-[#5B5E86]">
                <span className="text-[#4B3BE4]">•</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* --------------------- 5 va 9-qadam: bilim dargohi va sertifikat --------------------- */

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Ta'lim va sertifikat ro'yxati.
 *
 * NEGA QATORLI: bazada bu ustunlar JSON massiv (`[{institution, specialty,
 * degree, start_year, end_year}]`) — bitta katta matn maydoni u yerga
 * tushmaydi. Qolaversa, o'qituvchi nima yozishini bilishi kerak: har bir
 * katakda namuna turadi.
 */
function RowEditor({
  kind,
  rows,
  onChange,
}: {
  kind: 'edu' | 'cert';
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  const { t, token, toast } = usePanel();
  const edu = kind === 'edu';

  /** Ayni paytda rasmi yuklanayotgan qator (bir vaqtda bittasi). */
  const [yuklanmoqda, setYuklanmoqda] = useState<number | null>(null);

  const patch = (i: number, key: string, value: string) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  const add = () =>
    onChange([
      ...rows,
      edu
        ? { institution: '', specialty: '', degree: '', start_year: '', end_year: '' }
        : { title: '', issuer: '', year: '', image_url: '' },
    ]);
  const drop = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  /**
   * Sertifikat rasmini yuklaydi va qatorning `image_url` iga yozadi.
   *
   * Tekshiruv MIJOZDA ham qilinadi: server 5 MB dan katta faylni baribir rad
   * etadi, lekin sekin internetda o'qituvchi 20 MB rasmni bekorga yuklab,
   * oxirida xato ko'rardi.
   */
  const rasmYukla = async (i: number, file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast(t.certImageWrongType);
      return;
    }
    // 4 MB — server chegarasi bilan bir xil (`HELP_CHAT_MAX_SIZE`, server.ts).
    if (file.size > 4 * 1024 * 1024) {
      toast(t.certImageTooBig);
      return;
    }
    setYuklanmoqda(i);
    try {
      const url = await uploadCertificateImage(token, file);
      patch(i, 'image_url', url);
      toast(t.certImageSaved);
    } catch (e) {
      toast(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setYuklanmoqda(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[14px] bg-[#F7F7FC] p-3.5">
        <p className="text-[12.5px] leading-[1.65] text-[#6E7191]">{edu ? t.eduHint : t.certHint}</p>
        {edu ? (
          <p className="mt-1.5 text-[12px] font-semibold text-[#4B3BE4]">{t.eduExample}</p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="py-2 text-center text-[12.5px] text-[#8A8CAE]">
          {edu ? t.eduEmpty : t.certEmpty}
        </p>
      ) : null}

      {rows.map((r, i) => (
        <div
          key={i}
          className="rounded-[16px] border border-[#EFEEF8] bg-[#FAFAFE] p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A8CAE]">
              {i + 1}
            </span>
            <button
              type="button"
              onClick={() => drop(i)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C23A3F]"
            >
              <Trash2 className="h-[15px] w-[15px]" />
              {t.rowDelete}
            </button>
          </div>

          {edu ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.eduInstitution} className="sm:col-span-2">
                <input
                  value={r.institution ?? ''}
                  onChange={(e) => patch(i, 'institution', e.target.value)}
                  placeholder={t.eduInstitutionPh}
                  className={inputClass}
                />
              </Field>
              <Field label={t.eduSpecialty} className="sm:col-span-2">
                <input
                  value={r.specialty ?? ''}
                  onChange={(e) => patch(i, 'specialty', e.target.value)}
                  placeholder={t.eduSpecialtyPh}
                  className={inputClass}
                />
              </Field>
              <Field label={t.eduDegree}>
                <select
                  value={r.degree ?? ''}
                  onChange={(e) => patch(i, 'degree', e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t.chooseOption}</option>
                  {[t.eduDegreeBachelor, t.eduDegreeMaster, t.eduDegreeCollege, t.eduDegreeCourse, t.eduDegreeOther].map(
                    (d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    )
                  )}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.eduStartYear}>
                  <input
                    type="number"
                    min={1950}
                    max={CURRENT_YEAR}
                    value={r.start_year ?? ''}
                    onChange={(e) => patch(i, 'start_year', e.target.value)}
                    placeholder="2012"
                    className={inputClass}
                  />
                </Field>
                <Field label={t.eduEndYear}>
                  <input
                    type="number"
                    min={1950}
                    max={CURRENT_YEAR + 10}
                    value={r.end_year ?? ''}
                    onChange={(e) => patch(i, 'end_year', e.target.value)}
                    placeholder="2016"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.certTitleField} className="sm:col-span-2">
                <input
                  value={r.title ?? ''}
                  onChange={(e) => patch(i, 'title', e.target.value)}
                  placeholder={t.certTitlePh}
                  className={inputClass}
                />
              </Field>
              <Field label={t.certIssuer}>
                <input
                  value={r.issuer ?? ''}
                  onChange={(e) => patch(i, 'issuer', e.target.value)}
                  placeholder={t.certIssuerPh}
                  className={inputClass}
                />
              </Field>
              <Field label={t.certYear}>
                <input
                  type="number"
                  min={1950}
                  max={CURRENT_YEAR}
                  value={r.year ?? ''}
                  onChange={(e) => patch(i, 'year', e.target.value)}
                  placeholder="2019"
                  className={inputClass}
                />
              </Field>

              <Field label={t.certImage} className="sm:col-span-2">
                {r.image_url ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveAssetUrl(r.image_url) ?? r.image_url}
                      alt={r.title || t.certImage}
                      className="h-[64px] w-[64px] shrink-0 rounded-[12px] object-cover ring-1 ring-[#EFEEF8]"
                    />
                    <div className="flex min-w-0 flex-wrap gap-2">
                      <label
                        className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[12px] bg-[#EFEDFD] px-3.5 text-[12.5px] font-semibold text-[#4B3BE4] transition hover:bg-[#E4E0FA] ${
                          yuklanmoqda === i ? 'pointer-events-none opacity-60' : ''
                        }`}
                      >
                        <Camera className="h-[15px] w-[15px]" />
                        {yuklanmoqda === i ? t.certImageUploading : t.certImageChange}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) void rasmYukla(i, f);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => patch(i, 'image_url', '')}
                        className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-[12.5px] font-semibold text-[#C23A3F]"
                      >
                        <X className="h-[15px] w-[15px]" />
                        {t.certImageRemove}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#C9C6EC] bg-white text-[12.5px] font-semibold text-[#4B3BE4] transition hover:border-[#4B3BE4] ${
                      yuklanmoqda === i ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    <Camera className="h-[16px] w-[16px]" />
                    {yuklanmoqda === i ? t.certImageUploading : t.certImageAdd}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) void rasmYukla(i, f);
                      }}
                    />
                  </label>
                )}
                <p className="mt-1.5 text-[11.5px] leading-[1.6] text-[#8A8CAE]">{t.certImageHint}</p>
              </Field>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="min-h-[48px] rounded-[16px] border-[1.5px] border-dashed border-[#C9C6EC] bg-white text-[13px] font-semibold text-[#4B3BE4] transition hover:border-[#4B3BE4]"
      >
        {edu ? t.eduAdd : t.certAdd}
      </button>
    </div>
  );
}

/* ------------------------------ 4-qadam: surat ------------------------------ */

/**
 * Suratni qurilma xotirasidan yuklaydi va u qayerda qanday ko'rinishini
 * ko'rsatadi. Fayl `POST /api/user/avatar` ga boradi: server uni 512×512
 * kvadratga keltirib saqlaydi va o'qituvchi profiliga ham yozib qo'yadi.
 */
function PhotoStep({ url, onChanged }: { url: string; onChanged: () => Promise<void> | void }) {
  const { token, t, toast, cabinet, refresh } = usePanel();
  const { user, updateUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);

  const name =
    cabinet?.profile?.display_name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    t.teacherRole;
  const shown = preview || url || user?.avatarUrl || null;

  const pick = async (file: File) => {
    setErr('');
    setBusy(true);
    // Yuklash tugagunча tanlangan fayl ko'rinib turadi.
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const me = await uploadUserAvatar(token, file);
      const fresh = bustAvatarUrl(me.avatarUrl);
      setPreview(fresh);
      updateUser({ avatarUrl: fresh });
      // Kabinet ma'lumoti ham yangilansin: menyudagi va profildagi surat
      // eski holida qolib ketmasin.
      refresh();
      toast(t.photoSaved);
      await onChanged();
    } catch (e) {
      setPreview(null);
      const matn = e instanceof Error ? e.message : t.errorGeneric;
      setErr(matn);
      toast(matn);
    } finally {
      URL.revokeObjectURL(local);
      setBusy(false);
    }
  };

  const drop = async () => {
    setBusy(true);
    setErr('');
    try {
      await removeUserAvatar(token);
      setPreview(null);
      updateUser({ avatarUrl: null });
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
      <div className="flex flex-col gap-2.5">
        <label
          className={`relative flex aspect-square w-full max-w-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-[20px] bg-[#EFEDFD] transition hover:brightness-95 ${
            busy ? 'animate-pulse' : ''
          }`}
        >
          {shown ? (
            <img src={shown} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-[#4B3BE4]">
              <Camera className="h-8 w-8" strokeWidth={1.6} />
              <span className="text-[12.5px] font-semibold">{t.photoUpload}</span>
            </span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void pick(file);
            }}
          />
        </label>

        <div className="flex gap-2">
          <label className="min-h-[44px] flex-1 cursor-pointer rounded-[11px] bg-[#4B3BE4] px-3 py-3 text-center text-[12.5px] font-semibold text-white">
            {shown ? t.photoReplace : t.photoUpload}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void pick(file);
              }}
            />
          </label>
          {shown ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void drop()}
              className="flex min-h-[44px] items-center justify-center rounded-[11px] bg-[#FFF6F6] px-3.5 text-[#C23A3F] disabled:opacity-50"
              aria-label={t.photoDelete}
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>
        <p className="text-[11.5px] leading-[1.5] text-[#8A8CAE]">{t.photoFormats}</p>
        {err ? <p className="text-[12px] font-medium text-[#C23A3F]">{err}</p> : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-[18px] border border-[#EFEEF8] bg-[#FAFAFE] p-4">
          <p className="mb-3 text-[13px] font-semibold text-[#171A3D]">{t.photoPreviewTitle}</p>
          <div className="flex flex-wrap items-end gap-5">
            <PreviewSize url={shown} name={name} size={40} label={t.photoInMenu} />
            <PreviewSize url={shown} name={name} size={56} label={t.photoInList} />
            <PreviewSize url={shown} name={name} size={88} label={t.photoInProfile} />
          </div>
          {!shown ? (
            <p className="mt-3 text-[12px] text-[#8A8CAE]">{t.photoEmpty}</p>
          ) : null}
          </div>

          {/* Namuna — kichik kartochka. Batafsili oynada ochiladi. */}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex w-full max-w-[320px] items-center gap-3 rounded-[14px] border border-[#EFEEF8] bg-white p-2.5 text-left transition hover:border-[#4B3BE4]"
          >
            <img
              src="/teacher-photo-guide.jpg"
              alt={t.photoGuideTitle}
              className="h-[62px] w-[78px] shrink-0 rounded-[10px] object-cover"
              loading="lazy"
            />
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold text-[#171A3D]">{t.photoSample}</span>
              <span className="block text-[11.5px] leading-[1.4] text-[#8A8CAE]">{t.photoGuideCard}</span>
              <span className="mt-0.5 block text-[11.5px] font-semibold text-[#4B3BE4]">
                {t.photoGuideOpen} →
              </span>
            </span>
          </button>
        </div>
      </div>

      {guideOpen ? (
        <Modal title={t.photoGuideTitle} onClose={() => setGuideOpen(false)} width={960}>
          <img
            src="/teacher-photo-guide.jpg"
            alt={t.photoGuideTitle}
            className="w-full rounded-[14px]"
          />
          <a
            href="/teacher-photo-guide.jpg"
            target="_blank"
            rel="noreferrer"
            className="text-center text-[12.5px] font-semibold text-[#4B3BE4]"
          >
            {t.photoGuideFull}
          </a>
        </Modal>
      ) : null}
    </div>
  );
}

function PreviewSize({
  url,
  name,
  size,
  label,
}: {
  url: string | null;
  name: string;
  size: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {url ? (
        <img
          src={url}
          alt={label}
          style={{ width: size, height: size }}
          className="rounded-full object-cover"
        />
      ) : (
        <Avatar name={name} size={size} />
      )}
      <span className="text-[10.5px] text-[#8A8CAE]">{label}</span>
    </div>
  );
}
