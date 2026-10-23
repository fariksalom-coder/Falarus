import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FileText, Loader2, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { Card, ErrorNote, Field, GhostButton, PrimaryButton, inputClass, inputErrorClass, textareaClass } from '../panel/ui';
import {
  ABOUT_MAX, ABOUT_QUESTIONS, COUNTRIES, DEGREES, PROFICIENCY, SUBJECTS,
  type AboutAnswers, type CertificateRow, type EducationRow, type PersonalData,
} from '../../../../shared/teacherOnboarding';
import { deleteDocument, generateAbout, openDocument, uploadDocument, type OnboardingDocument } from '../../../api/teacherOnboarding';
import { ONBOARDING_TEXT } from './text';
import type { StepProps } from './OnboardingWizard';

type FormProps = StepProps & { busy: boolean; onSubmit: (body: unknown) => void; initial: unknown };

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');
const cls = (err?: string) => `${inputClass} ${err ? inputErrorClass : ''}`;

/** Forma qiymati o'zgarganda avtosaqlash (birinchi chizishda emas). */
function useAutosave(value: unknown, onDraft: (v: unknown) => void) {
  const first = useRef(true);
  const json = JSON.stringify(value);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onDraft(JSON.parse(json));
  }, [json]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Footer({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
  return (
    <div className="flex justify-end">
      <PrimaryButton onClick={onClick} disabled={busy} className="w-full sm:w-auto">
        {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : label}
      </PrimaryButton>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-[16px] font-bold text-app-text">{title}</h2>
        {hint && <p className="mt-1 text-[13px] leading-relaxed text-app-text-muted">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

const yearOpts = () => { const y = new Date().getFullYear(); return Array.from({ length: y + 6 - 1950 + 1 }, (_, i) => y + 6 - i); };

function YearSelect({ value, onChange, label, error }: { value: number | null; onChange: (v: number | null) => void; label: string; error?: string }) {
  return (
    <Field label={label} error={error}>
      <select className={cls(error)} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">—</option>
        {yearOpts().map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </Field>
  );
}

/* ───────────────────────── 1. Shaxsiy ma'lumotlar ───────────────────────── */

export function StepPersonal({ state, onDraft, errors, lang, busy, onSubmit, initial, nextLabel }: FormProps) {
  const t = ONBOARDING_TEXT[lang];
  // Telefon bo'sh bo'lsa server ro'yxatdan o'tgan raqamni taklif qiladi (toData).
  const [v, setV] = useState<PersonalData>(() => ({ ...(state.data.personal as PersonalData), ...((initial as Partial<PersonalData>) ?? {}) }));
  useAutosave(v, onDraft);
  const set = (k: keyof PersonalData, value: string) => setV((p) => ({ ...p, [k]: value }));
  const waSame = Boolean(v.contact_phone) && v.contact_whatsapp === v.contact_phone;
  return (
    <>
      <Section title={ONBOARDING_TEXT[lang].title}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.firstName} error={errors.first_name}><input className={cls(errors.first_name)} autoComplete="given-name" maxLength={50} value={v.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} /></Field>
          <Field label={t.lastName} error={errors.last_name}><input className={cls(errors.last_name)} autoComplete="family-name" maxLength={50} value={v.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} /></Field>
          <Field label={t.birthCountry} error={errors.birth_country}>
            <select className={cls(errors.birth_country)} value={v.birth_country ?? ''} onChange={(e) => set('birth_country', e.target.value)}>
              <option value="">{t.choose}</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c[lang]}</option>)}
            </select>
          </Field>
          <Field label={t.subject} error={errors.subject}>
            <select className={cls(errors.subject)} value={v.subject || 'russian'} onChange={(e) => set('subject', e.target.value)}>
              {SUBJECTS.map((c) => <option key={c.code} value={c.code}>{c[lang]}</option>)}
            </select>
          </Field>
          <Field label={t.proficiency} error={errors.proficiency} className="sm:col-span-2">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.proficiency}>
              {PROFICIENCY.map((p) => (
                <button key={p.code} type="button" role="radio" aria-checked={v.proficiency === p.code} onClick={() => set('proficiency', p.code)}
                  className={`min-h-11 min-w-[56px] rounded-[12px] border px-4 text-[13px] font-semibold transition active:scale-[0.97] ${v.proficiency === p.code ? 'border-app-brand bg-app-primary text-white' : 'border-app-border-strong bg-app-surface text-app-text'}`}>
                  {p[lang]}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Section>
      <Section title={t.contactTitle} hint={t.contactHint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.contactPhone} error={errors.contact_phone} className="sm:col-span-2">
            <input className={cls(errors.contact_phone)} type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="+998 90 123 45 67"
              value={v.contact_phone ?? ''} onChange={(e) => setV((p) => ({ ...p, contact_phone: e.target.value, contact_whatsapp: waSame ? e.target.value : p.contact_whatsapp }))} />
          </Field>
          <Field label={t.contactTelegram} error={errors.contact_telegram}>
            <input className={cls(errors.contact_telegram)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={60} placeholder={t.contactTelegramPh}
              value={v.contact_telegram ?? ''} onChange={(e) => set('contact_telegram', e.target.value)} />
          </Field>
          <Field label={t.contactWhatsapp} error={errors.contact_whatsapp}>
            <input className={cls(errors.contact_whatsapp)} type="tel" inputMode="tel" maxLength={24} placeholder="+998 90 123 45 67"
              value={v.contact_whatsapp ?? ''} onChange={(e) => set('contact_whatsapp', e.target.value)} />
            <label className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-app-text">
              <input type="checkbox" checked={waSame} onChange={(e) => set('contact_whatsapp', e.target.checked ? v.contact_phone : '')} className="h-5 w-5 accent-[#2563EB]" />
              {t.contactSamePhone}
            </label>
          </Field>
        </div>
        {!errors.contact_telegram && !errors.contact_whatsapp && <p className="text-[12px] text-app-text-muted">{t.contactOneOf}</p>}
      </Section>
      <Section title={t.pathTitle}>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t.pathTitle}>
          {([['certified', t.pathCertified, t.pathCertifiedHint], ['experienced', t.pathExperienced, t.pathExperiencedHint]] as const).map(([key, title, hint]) => (
            <button key={key} type="button" role="radio" aria-checked={v.path === key} onClick={() => set('path', key)}
              className={`rounded-[18px] border-2 p-4 text-left transition active:scale-[0.99] ${v.path === key ? 'border-app-brand bg-[#F5F8FF] shadow-[0_18px_44px_-24px_rgba(37,99,235,0.6)]' : errors.path ? 'border-[#E9474D] bg-[#FFF8F8]' : 'border-app-border bg-app-surface hover:border-app-border-strong'}`}>
              <p className="text-[14px] font-bold text-app-text">{title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-app-text-muted">{hint}</p>
            </button>
          ))}
        </div>
        {errors.path && <p className="text-[12px] font-semibold text-[#C23A3F]">{errors.path}</p>}
      </Section>
      <Footer busy={busy} onClick={() => onSubmit(v)} label={nextLabel ?? t.next} />
    </>
  );
}

/* ───────────────────────── 3. Sertifikat ───────────────────────── */

const emptyCert = (): CertificateRow => ({ title: '', institution: '', year_from: null, year_to: null, document_ids: [] });

export function StepCertification({ state, setState, onDraft, errors, lang, token, busy, onSubmit, initial, nextLabel }: FormProps) {
  const t = ONBOARDING_TEXT[lang];
  const [rows, setRows] = useState<CertificateRow[]>(() => {
    const init = (initial as { certificates?: CertificateRow[] } | null)?.certificates ?? state.data.certificates;
    return init.length ? init : [emptyCert()];
  });
  const [uploading, setUploading] = useState<number | null>(null);
  const [fileError, setFileError] = useState('');
  useAutosave({ certificates: rows }, onDraft);
  const docs = useMemo(() => new Map(state.documents.map((d) => [d.id, d])), [state.documents]);
  const patch = (i: number, p: Partial<CertificateRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const upload = async (i: number, file: File | undefined) => {
    if (!file) return;
    setFileError('');
    if (file.size > 10 * 1024 * 1024) { setFileError(t.certTypes); return; }
    setUploading(i);
    try {
      const doc = await uploadDocument(token, file);
      setState({ ...state, documents: [...state.documents, doc] });
      patch(i, { document_ids: [...rows[i].document_ids, doc.id] });
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setUploading(null);
    }
  };
  const removeDoc = async (i: number, id: number) => {
    patch(i, { document_ids: rows[i].document_ids.filter((d) => d !== id) });
    await deleteDocument(token, id).catch(() => {});
    setState({ ...state, documents: state.documents.filter((d) => d.id !== id) });
  };

  return (
    <>
      <Section title={t.certTitle} hint={t.certHint}>
        {errors.certificates && <ErrorNote text={errors.certificates} />}
        {rows.map((r, i) => (
          <div key={i} className="space-y-3 rounded-[16px] border border-app-border p-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.certName} error={errors[`certificates.${i}.title`]}><input className={cls(errors[`certificates.${i}.title`])} value={r.title} maxLength={160} onChange={(e) => patch(i, { title: e.target.value })} /></Field>
              <Field label={t.certInstitution} error={errors[`certificates.${i}.institution`]}><input className={cls(errors[`certificates.${i}.institution`])} value={r.institution} maxLength={160} onChange={(e) => patch(i, { institution: e.target.value })} /></Field>
              <YearSelect label={`${t.yearFrom} (${t.optional})`} value={r.year_from} onChange={(y) => patch(i, { year_from: y })} error={errors[`certificates.${i}.years`]} />
              <YearSelect label={`${t.yearTo} (${t.optional})`} value={r.year_to} onChange={(y) => patch(i, { year_to: y })} />
            </div>
            <div>
              <p className={`mb-2 text-[12.5px] font-semibold ${errors[`certificates.${i}.documents`] ? 'text-[#C23A3F]' : 'text-app-text'}`}>{t.certFiles}</p>
              <ul className="space-y-2">
                {r.document_ids.map((id) => <DocRow key={id} doc={docs.get(id)} id={id} lang={lang} onOpen={() => void openDocument(token, id)} onRemove={() => void removeDoc(i, id)} />)}
              </ul>
              <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-dashed border-app-border-strong px-4 text-[13px] font-semibold text-app-text hover:border-app-brand">
                {uploading === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{t.certUpload}
                <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { void upload(i, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <p className="mt-1 text-[11.5px] text-app-text-muted">{t.certTypes}</p>
              {errors[`certificates.${i}.documents`] && <p className="mt-1 text-[12px] font-semibold text-[#C23A3F]">{errors[`certificates.${i}.documents`]}</p>}
            </div>
            {rows.length > 1 && <GhostButton tone="danger" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}><Trash2 className="mr-1 inline h-4 w-4" />{t.remove}</GhostButton>}
          </div>
        ))}
        {fileError && <ErrorNote text={fileError} />}
        {rows.length < 10 && <GhostButton onClick={() => setRows((x) => [...x, emptyCert()])}><Plus className="mr-1 inline h-4 w-4" />{t.addCert}</GhostButton>}
      </Section>
      <Footer busy={busy} onClick={() => onSubmit({ certificates: rows })} label={nextLabel ?? t.next} />
    </>
  );
}

function DocRow({ doc, id, lang, onOpen, onRemove }: { doc?: OnboardingDocument; id: number; lang: 'uz' | 'ru'; onOpen: () => void; onRemove: () => void }) {
  const t = ONBOARDING_TEXT[lang];
  return (
    <li className="flex items-center gap-2 rounded-[12px] bg-app-bg-subtle px-3 py-2">
      <FileText className="h-4 w-4 shrink-0 text-app-text-muted" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-app-text">{doc?.original_name ?? `#${id}`}</span>
      <button type="button" onClick={onOpen} className="min-h-11 px-2 text-[12.5px] font-semibold text-app-primary">{t.open}</button>
      {doc?.status !== 'approved' && <button type="button" onClick={onRemove} aria-label={t.remove} className="flex min-h-11 min-w-11 items-center justify-center text-[#C23A3F]"><Trash2 className="h-4 w-4" /></button>}
    </li>
  );
}

/* ───────────────────────── 4. Ta'lim ───────────────────────── */

const emptyEdu = (): EducationRow => ({ institution: '', specialty: '', degree: '', year_from: null, year_to: null });

export function StepEducation({ state, onDraft, errors, lang, busy, onSubmit, initial, nextLabel }: FormProps) {
  const t = ONBOARDING_TEXT[lang];
  const [rows, setRows] = useState<EducationRow[]>(() => (initial as { education?: EducationRow[] } | null)?.education ?? state.data.education);
  useAutosave({ education: rows }, onDraft);
  const patch = (i: number, p: Partial<EducationRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <>
      <Section title={t.eduTitle} hint={t.eduHint}>
        {rows.map((r, i) => (
          <div key={i} className="space-y-3 rounded-[16px] border border-app-border p-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.institution} error={errors[`education.${i}.institution`]}><input className={cls(errors[`education.${i}.institution`])} value={r.institution} maxLength={160} onChange={(e) => patch(i, { institution: e.target.value })} /></Field>
              <Field label={t.specialty} error={errors[`education.${i}.specialty`]}><input className={cls(errors[`education.${i}.specialty`])} value={r.specialty} maxLength={160} onChange={(e) => patch(i, { specialty: e.target.value })} /></Field>
              <Field label={t.degree} error={errors[`education.${i}.degree`]}>
                <select className={cls(errors[`education.${i}.degree`])} value={r.degree} onChange={(e) => patch(i, { degree: e.target.value })}>
                  <option value="">{t.choose}</option>
                  {DEGREES.map((d) => <option key={d.code} value={d.code}>{d[lang]}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <YearSelect label={t.yearFrom} value={r.year_from} onChange={(y) => patch(i, { year_from: y })} error={errors[`education.${i}.years`]} />
                <YearSelect label={t.yearTo} value={r.year_to} onChange={(y) => patch(i, { year_to: y })} />
              </div>
            </div>
            <GhostButton tone="danger" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}><Trash2 className="mr-1 inline h-4 w-4" />{t.remove}</GhostButton>
          </div>
        ))}
        {rows.length < 10 && <GhostButton onClick={() => setRows((x) => [...x, emptyEdu()])}><Plus className="mr-1 inline h-4 w-4" />{t.addEdu}</GhostButton>}
      </Section>
      <Footer busy={busy} onClick={() => onSubmit({ education: rows })} label={nextLabel ?? t.next} />
    </>
  );
}

/* ───────────────────────── 5. O'zim haqimda ───────────────────────── */

export function StepAbout({ state, onDraft, errors, lang, token, busy, onSubmit, initial, nextLabel }: FormProps) {
  const t = ONBOARDING_TEXT[lang];
  const init = initial as { answers?: AboutAnswers; about?: string } | null;
  const [answers, setAnswers] = useState<AboutAnswers>(init?.answers ?? state.data.about_answers);
  const [about, setAbout] = useState(init?.about ?? state.data.about);
  const [gen, setGen] = useState<'idle' | 'busy' | 'template'>('idle');
  useAutosave({ answers, about }, onDraft);
  const filled = ABOUT_QUESTIONS.every((q) => (answers[q.key] ?? '').trim().length >= 3);

  const build = async () => {
    setGen('busy');
    try {
      const r = await generateAbout(token, answers as Record<string, string>, lang);
      setAbout(r.text);
      setGen(r.source === 'template' ? 'template' : 'idle');
    } catch {
      setGen('idle');
    }
  };

  return (
    <>
      <Section title={t.aboutTitle} hint={t.aboutHint}>
        {ABOUT_QUESTIONS.map((q, i) => (
          <Field key={q.key} label={`${i + 1}. ${q[lang]}`} error={errors[`answers.${q.key}`]}>
            <textarea rows={2} maxLength={600} className={`${textareaClass} ${errors[`answers.${q.key}`] ? inputErrorClass : ''}`} value={answers[q.key] ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))} />
          </Field>
        ))}
        <GhostButton tone="dark" onClick={() => void build()} disabled={!filled || gen === 'busy'} className="w-full sm:w-auto">
          {gen === 'busy' ? <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />{t.aboutGenerating}</> : <><Sparkles className="mr-1 inline h-4 w-4" />{t.aboutGenerate}</>}
        </GhostButton>
        {gen === 'template' && <p className="rounded-[12px] bg-[#FFFBEB] p-3 text-[12.5px] text-[#78350F]">{t.aboutTemplate}</p>}
        <Field label={t.aboutText} error={errors.about} hint={t.aboutCount(about.trim().length)}>
          <textarea rows={9} maxLength={ABOUT_MAX} className={`${textareaClass} ${errors.about ? inputErrorClass : ''}`} value={about} onChange={(e) => setAbout(e.target.value)} />
        </Field>
      </Section>
      <Footer busy={busy} onClick={() => onSubmit({ answers, about })} label={nextLabel ?? t.next} />
    </>
  );
}

/* ───────────────────────── 8. Narx va shartlar ───────────────────────── */

export function StepPricing({ state, onDraft, errors, lang, busy, onSubmit, initial, nextLabel }: FormProps) {
  const t = ONBOARDING_TEXT[lang];
  const s = state.settings;
  const init = initial as { lesson_price_uzs?: number | null; terms_accepted?: boolean } | null;
  const [price, setPrice] = useState<string>(String(init?.lesson_price_uzs ?? state.data.lesson_price_uzs ?? ''));
  const [agree, setAgree] = useState<boolean>(init?.terms_accepted ?? state.data.terms_accepted);
  const p = Number(price.replace(/\D/g, '')) || 0;
  // Draft: rozilik belgisini qoralamaga yozmaymiz — u faqat to'liq saqlashda (sana + versiya bilan) qayd etiladi.
  useAutosave({ lesson_price_uzs: p || null }, onDraft);
  const termsChanged = Boolean(state.data.lesson_price_uzs) && !state.data.terms_accepted && state.status !== 'draft';

  return (
    <>
      <Section title={t.priceTitle} hint={t.priceHint(fmt(s.price_min_uzs), fmt(s.price_max_uzs))}>
        <Field label={`${t.priceTitle} (${t.sum})`} error={errors.lesson_price_uzs}>
          <input inputMode="numeric" className={`${cls(errors.lesson_price_uzs)} text-[18px] font-bold tabular-nums`} value={p ? fmt(p) : ''} placeholder={fmt(80_000)}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 7))} />
        </Field>
      </Section>
      <Section title={t.termsTitle}>
        {termsChanged && <p className="rounded-[12px] bg-[#FFFBEB] p-3 text-[12.5px] font-semibold text-[#78350F]">{t.termsNew}</p>}
        <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-app-text">
          {state.terms[lang].map((line, i) => <li key={i}>{line}</li>)}
        </ol>
        <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[14px] border p-3.5 ${errors.terms ? 'border-[#E9474D] bg-[#FFF8F8]' : 'border-app-border'}`}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#2563EB]" />
          <span className="text-[13.5px] font-semibold text-app-text">{t.termsAgree}</span>
        </label>
        {errors.terms && <p className="text-[12px] font-semibold text-[#C23A3F]">{errors.terms}</p>}
      </Section>
      <Footer busy={busy} onClick={() => onSubmit({ lesson_price_uzs: p || null, terms_accepted: agree })} label={nextLabel ?? t.next} />
    </>
  );
}
