import { useCallback, useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import {
  deleteTeacherDocument,
  getTeacherProfile,
  type DocumentKind,
  type TeacherProfileResponse,
} from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import { getMyMarketPreview, type MarketTeacherDetail } from '../../../../api/teacherMarket';
import TeacherProfileView from '../../market/TeacherProfileView';
import { deleteDocument, getOnboarding, openDocument, uploadDocument, type OnboardingState } from '../../../../api/teacherOnboarding';
import {
  LANGUAGES, LANGUAGE_LEVELS, ONBOARDING_STEPS, SPECIALIZATIONS, stepsForPath, validateStep, type OnboardingPath,
} from '../../../../../shared/teacherOnboarding';
import { resolveAssetUrl } from '../../../../api';
import { tpl } from '../lang';
import {
  Avatar,
  Card,
  Empty,
  ErrorNote,
  GhostButton,
  PrimaryButton,
  Skeleton,
  Tag,
  fmtSum,
} from '../ui';

/** Qaysi ustun anketaning qaysi qadamiga tegishli (moderatsiyadagi o'zgarishni belgilash uchun). */
const FIELD_STEP: Record<string, number> = {
  first_name: 1, last_name: 1, birth_country: 1, subject: 1, proficiency: 1, onboarding_path: 1,
  contact_phone: 1, contact_telegram: 1, contact_whatsapp: 1, avatar_url: 2, certificates: 3, education: 4,
  about_answers: 5, about: 5, headline: 5, experience_years: 5, experience_months: 5, specializations: 5, languages: 5,
  video_url: 6, video_duration_sec: 6, lesson_price_uzs: 8,
};

/* --------------------------------- Profil --------------------------------- */

/**
 * Profil = anketa (onboarding v2) ma'lumotlari. To'ldirilganlik faqat joriy 8 qadam bo'yicha
 * (eski 12 bandli anketa — pasport, manzil, oylik narx — hisoblanmaydi); ixtiyoriy qadam
 * (masalan, ta'lim) bo'sh bo'lsa ham bajarilgan sanaladi.
 */
export default function Profile() {
  const { token, t, lang, go, cabinet } = usePanel();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [contact, setContact] = useState<TeacherProfileResponse['contact'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([getOnboarding(token), getTeacherProfile(token).catch(() => null)])
      .then(([s, prof]) => {
        if (!alive) return;
        setState(s);
        setContact(prof?.contact ?? null);
      })
      .catch((e: Error) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) return <Skeleton rows={4} />;
  if (!state) return <ErrorNote text={err || t.errorGeneric} />;

  const d = state.data;
  const p = cabinet?.profile;
  const name = `${d.personal.first_name} ${d.personal.last_name}`.trim() || t.teacherRole;
  const inCatalog = p?.profile_status === 'active' && p?.catalog_visible !== false;
  const rating = Number(p?.rating_avg ?? 0);
  const ratingCount = Number(p?.rating_count ?? 0);
  const specs = d.profile.specializations.map((c) => SPECIALIZATIONS.find((x) => x.code === c)?.[lang] ?? c);
  const langs = d.profile.languages.map((l) => {
    const name = LANGUAGES.find((x) => x.code === l.code)?.[lang] ?? l.code;
    const level = LANGUAGE_LEVELS.find((x) => x.code === l.level)?.[lang];
    return level ? `${name} (${level})` : name;
  });
  const steps = stepsForPath((d.personal.path || null) as OnboardingPath | null);
  const isDone = (n: number) => Object.keys(validateStep(n, d, state.settings)).length === 0;
  const doneCount = steps.filter(isDone).length;
  const moderated = new Set((state.revision?.fields ?? []).map((f) => FIELD_STEP[f]).filter(Boolean));

  return (
    <div className="space-y-4">
      {err ? <ErrorNote text={err} /> : null}
      {state.revision ? (
        <p role="status" className="rounded-[14px] bg-[#FFFBEB] px-4 py-3 text-[13.5px] font-semibold text-[#92400E]">{t.revisionNote}</p>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <Card as="section" className="min-w-0 flex-[1.5_1_400px] p-5">
          <div className="mb-3.5 flex items-center gap-3.5">
            <Avatar name={name} size={72} url={d.avatar_url ?? p?.avatar_url ?? null} tone="teal" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[18px] font-extrabold text-app-text">{name}</p>
              <span className={`mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold ${inCatalog ? 'text-[#166534]' : 'text-app-text-muted'}`}>
                <span className={`h-[7px] w-[7px] rounded-full ${inCatalog ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'}`} />
                {inCatalog ? t.catalogOn : t.catalogOff}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <InfoBox label={t.fieldSpecialization} value={specs.join(', ') || t.notFilled} />
            <InfoBox label={t.fieldLanguages} value={langs.join(', ') || t.notFilled} />
            <InfoBox label={t.fieldPrice} value={d.lesson_price_uzs ? `${fmtSum(d.lesson_price_uzs)} ${t.sum}` : t.notFilled} />
            <InfoBox label={t.fieldExperience} value={d.profile.experience_years != null ? tpl(t.yearsExp, { n: d.profile.experience_years }) : t.notFilled} />
            <InfoBox label={t.fieldVideo} value={d.video_url ? t.videoUploaded : t.videoMissing} tone={d.video_url ? 'ok' : 'warn'} />
            <InfoBox label={t.educationBlock} value={d.education.map((e) => e.institution).filter(Boolean).join(', ') || '—'} />
          </div>
          {d.about ? <p className="mt-3.5 line-clamp-4 whitespace-pre-line text-[14px] leading-[1.6] text-app-text-secondary">{d.about}</p> : null}
          <div className="mt-3.5 flex flex-wrap gap-2">
            <PrimaryButton onClick={() => go('anketa')}>{t.editAnketa}</PrimaryButton>
            <GhostButton onClick={() => go('public')}>{t.tabPreview}</GhostButton>
          </div>
        </Card>

        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <Card as="section" className="p-5">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-extrabold text-app-text">{t.anketaParts}</h2>
              <span className="text-[12.5px] font-bold tabular-nums text-app-text-muted">{Math.round((doneCount / steps.length) * 100)}%</span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-app-bg-subtle">
              <div className="h-full rounded-full bg-app-primary transition-[width]" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
            <p className="mb-1 text-[12.5px] text-app-text-muted">{tpl(t.filledOf, { done: doneCount, total: steps.length })}</p>
            <ul className="divide-y divide-app-bg-subtle">
              {steps.map((n) => {
                const info = ONBOARDING_STEPS.find((x) => x.step === n)!;
                const ok = isDone(n);
                return (
                  <li key={n} className="flex items-center gap-2.5 py-1.5">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                      {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className="text-[11px] font-black">!</span>}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-app-text">
                      {info[lang]}
                      {moderated.has(n) ? <span className="ml-1.5 text-[11.5px] font-bold text-[#B45309]">· {t.onModeration}</span> : null}
                    </span>
                    <button type="button" onClick={() => go('anketa', n)} className="min-h-[40px] shrink-0 rounded-[10px] px-2 text-[12.5px] font-bold text-app-primary hover:bg-[var(--app-row-hover)]">
                      {t.changeStep}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card as="section" className="p-5">
            <h2 className="mb-2 text-[17px] font-extrabold text-app-text">{t.ratingTitle}</h2>
            {ratingCount > 0 ? (
              <>
                <p className="text-[32px] font-extrabold text-app-text">
                  {rating.toLocaleString('ru-RU')}{' '}
                  <span className="text-[16px] text-[#B45309]">{'★'.repeat(Math.round(rating))}</span>
                </p>
                <button type="button" onClick={() => go('reviews')} className="min-h-[44px] text-[14px] font-bold text-app-primary">
                  {tpl(t.reviewsCount, { n: ratingCount })} →
                </button>
              </>
            ) : (
              <p className="text-[13.5px] text-app-text-muted">{t.noRatingYet}</p>
            )}
          </Card>

          <Card as="section" className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-app-text">
                <Lock className="h-4 w-4 text-app-text-muted" />
                {t.privatePart}
              </h2>
              <span className="text-[12px] font-bold text-app-text-muted">{t.privatePartHint}</span>
            </div>
            <dl className="mt-1.5 text-[14px]">
              <div className="flex justify-between gap-3 border-b border-app-bg-subtle py-2.5">
                <dt className="text-app-text-muted">{t.fieldPhone}</dt>
                <dd className="font-bold text-app-text">{maskPhone(contact?.phone ?? null) || t.notFilled}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-app-text-muted">Email</dt>
                <dd className="min-w-0 truncate font-bold text-app-text">{maskEmail(contact?.email ?? null) || t.notFilled}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** «+998 90 123 45 67» → «+998 •• ••• 45 67»: ekranda to'liq raqam ko'rinmasin. */
function maskPhone(phone: string | null): string {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length < 7) return phone ?? '';
  return `+${d.slice(0, 3)} •• ••• ${d.slice(-4, -2)} ${d.slice(-2)}`;
}

function maskEmail(email: string | null): string {
  const e = String(email ?? '');
  const at = e.indexOf('@');
  return at > 1 ? `${e.slice(0, 2)}…${e.slice(at)}` : e;
}

function InfoBox({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: string;
  tone?: 'plain' | 'ok' | 'warn';
}) {
  const { t } = usePanel();
  // To'ldirilmagan qiymat ko'zga tashlanib tursin.
  const empty = value === t.notFilled || value === t.videoMissing;
  const color = empty
    ? 'text-[#C23A3F] font-semibold'
    : tone === 'ok'
      ? 'text-[#17A34A]'
      : tone === 'warn'
        ? 'text-[#C57A1F]'
        : 'text-app-text';
  return (
    <div
      className={`rounded-[14px] border p-3.5 ${
        empty ? 'border-[#FBDCDC] bg-[#FFF6F6]' : 'border-app-border bg-app-bg-muted'
      }`}
    >
      <p className="text-[11.5px] text-app-text-muted">{label}</p>
      <p className={`mt-1 text-[12.5px] leading-[1.6] ${color}`}>{value}</p>
    </div>
  );
}

function DocStatus({ status }: { status: string }) {
  const { t } = usePanel();
  if (status === 'approved') return <Tag tone="green">{t.docApproved}</Tag>;
  if (status === 'rejected') return <Tag tone="red">{t.docRejected}</Tag>;
  return <Tag tone="amber">{t.docPending}</Tag>;
}

/* -------------------------------- Hujjatlar -------------------------------- */


export function Documents() {
  const { token, t, go } = usePanel();
  const [data, setData] = useState<TeacherProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await getTeacherProfile(token));
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

  const kindLabel = (k: DocumentKind) =>
    k === 'passport' ? t.docPassport : k === 'diploma' ? t.docDiploma : k === 'certificate' ? t.docCertificate : t.docOther;

  return (
    <div>
      {err ? <ErrorNote text={err} /> : null}

      <div className="mb-4 flex flex-wrap gap-2.5">
        {/* Files go to the private store (same as the questionnaire step); the moderator checks them. */}
        <label
          className={`min-h-[44px] cursor-pointer rounded-[12px] bg-app-icon-bg px-4 py-3 text-[12.5px] font-semibold text-app-brand transition hover:bg-[#E4E0FA] ${busy ? 'pointer-events-none opacity-50' : ''}`}
        >
          {busy ? '…' : tpl(t.docAdd, { kind: kindLabel('certificate') })}
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setBusy(true);
              setErr('');
              try {
                await uploadDocument(token, file);
                await load();
              } catch (x) {
                setErr(x instanceof Error ? x.message : t.errorGeneric);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>

      {loading ? (
        <Skeleton rows={2} />
      ) : (data?.documents.length ?? 0) === 0 ? (
        <Empty text={t.documentsEmpty} hint={t.documentsSubtitle} />
      ) : (
        <Card className="p-2">
          <ul className="divide-y divide-[#F6F5FC]">
            {data!.documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-3.5">
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-app-icon-bg text-[11px] font-semibold text-app-brand">
                  {(d.original_name || 'file').split('.').pop()?.slice(0, 4).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  {d.file_url ? (
                    <a
                      href={resolveAssetUrl(d.file_url) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[13px] font-medium text-app-text hover:text-app-brand"
                    >
                      {d.original_name || d.kind}
                    </a>
                  ) : (
                    // Private file: fetched with the login token, a plain link cannot open it.
                    <button
                      type="button"
                      onClick={() => void openDocument(token, d.id).catch((x) => setErr(x instanceof Error ? x.message : t.errorGeneric))}
                      className="block max-w-full truncate text-left text-[13px] font-medium text-app-text hover:text-app-brand"
                    >
                      {d.original_name || d.kind}
                    </button>
                  )}
                  <span className="text-[11.5px] text-app-text-muted">{d.kind}</span>
                </span>
                <DocStatus status={d.status} />
                {/* An approved document stays: the profile was approved with it. */}
                {d.status !== 'approved' && <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await (d.file_url ? deleteTeacherDocument(token, d.id) : deleteDocument(token, d.id));
                      await load();
                    } catch (x) {
                      setErr(x instanceof Error ? x.message : t.errorGeneric);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="shrink-0 text-[12px] font-semibold text-[#C23A3F] disabled:opacity-50"
                >
                  {t.delete}
                </button>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ----------------------------- Ommaviy ko'rinish ----------------------------- */

export function PublicPreview() {
  const { token, t, go } = usePanel();
  const [view, setView] = useState<MarketTeacherDetail | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setErr('');
    getMyMarketPreview(token).then(setView).catch((e) => setErr(e instanceof Error ? e.message : t.errorGeneric));
  }, [token, t.errorGeneric]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-app-text-muted">{t.previewBanner}</p>
        <GhostButton onClick={() => go('anketa')}>{t.edit}</GhostButton>
      </div>
      {err ? (
        <div className="space-y-3">
          <ErrorNote text={err} />
          <GhostButton onClick={load}>{t.retry}</GhostButton>
        </div>
      ) : !view ? (
        <Skeleton rows={4} />
      ) : (
        // The same component students see, so the preview cannot drift from the real page.
        <div className="space-y-4"><TeacherProfileView t={view} token={token} preview /></div>
      )}
    </div>
  );
}
