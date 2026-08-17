import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  deleteTeacherDocument,
  getPanelReviews,
  getTeacherProfile,
  uploadTeacherDocument,
  type DocumentKind,
  type ReviewsResponse,
  type TeacherProfileResponse,
} from '../../../../api/teacherPanel';
import { usePanel } from '../panelContext';
import { resolveAssetUrl } from '../../../../api';
import { tpl } from '../lang';
import {
  Avatar,
  Card,
  Empty,
  ErrorNote,
  GhostButton,
  PageHead,
  PrimaryButton,
  ProgressBar,
  Skeleton,
  Tag,
  fmtDate,
  fmtSum,
} from '../ui';

/** Qadam nomini panel tilida beradi (server sarlavhasi faqat o'zbekcha). */
function stepTitle(step: number, t: ReturnType<typeof usePanel>['t']): string {
  const keys = [
    t.step1, t.step2, t.step3, t.step4, t.step5, t.step6,
    t.step7, t.step8, t.step9, t.step10, t.step11, t.step12,
  ];
  return keys[step - 1] ?? '';
}

/** `["A1","A2"]` ko'rinishidagi qiymatni ro'yxatga aylantiradi. */
function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return arr.map(String);
    } catch {
      /* oddiy matn */
    }
  }
  return typeof value === 'string' && value.trim() ? [value] : [];
}

/** JSON massivdagi obyektlarni o'qiydi (ta'lim, sertifikat). */
function asRows(value: unknown): Array<Record<string, string>> {
  const raw =
    Array.isArray(value)
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
  return (Array.isArray(raw) ? raw : []).map((it) => {
    const r = (it ?? {}) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) out[k] = v == null ? '' : String(v);
    return out;
  });
}

type StatusView = {
  title: string;
  text: string;
  cta: string;
  target: 'anketa' | 'public' | 'help';
  bg: string;
  border: string;
  fg: string;
  dot: string;
};

function statusView(
  status: string,
  adminNote: string,
  t: ReturnType<typeof usePanel>['t']
): StatusView {
  switch (status) {
    case 'active':
      return {
        title: t.stActiveTitle,
        text: t.stActiveText,
        cta: t.stActiveCta,
        target: 'public',
        bg: 'bg-[#F3FBF6]',
        border: 'border-[#C7E9D5]',
        fg: 'text-[#12703A]',
        dot: 'bg-[#17A34A]',
      };
    case 'pending_review':
      return {
        title: t.stReviewTitle,
        text: t.stReviewText,
        cta: t.stReviewCta,
        target: 'anketa',
        bg: 'bg-[#FFFBF0]',
        border: 'border-[#F5E3B8]',
        fg: 'text-[#7A5B10]',
        dot: 'bg-[#E6B33E]',
      };
    case 'rejected':
      return {
        title: t.stRejectedTitle,
        text: adminNote || t.stDraftText,
        cta: t.stRejectedCta,
        target: 'anketa',
        bg: 'bg-[#FFF6F6]',
        border: 'border-[#FBDCDC]',
        fg: 'text-[#8A3B3E]',
        dot: 'bg-[#E9474D]',
      };
    case 'paused':
      return {
        title: t.stPausedTitle,
        text: adminNote || t.stPausedText,
        cta: t.stPausedCta,
        target: 'help',
        bg: 'bg-[#F7F7FA]',
        border: 'border-[#DFDFE9]',
        fg: 'text-[#3E4166]',
        dot: 'bg-[#5B5E86]',
      };
    default:
      return {
        title: t.stDraftTitle,
        text: t.stDraftText,
        cta: t.stDraftCta,
        target: 'anketa',
        bg: 'bg-[#F5F5FB]',
        border: 'border-[#E4E3F2]',
        fg: 'text-[#3E4166]',
        dot: 'bg-[#8A8CAE]',
      };
  }
}

/* --------------------------------- Profil --------------------------------- */

export default function Profile() {
  const { token, t, lang, go, cabinet } = usePanel();
  const [data, setData] = useState<TeacherProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    getTeacherProfile(token)
      .then((r) => alive && setData(r))
      .catch((e: Error) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) return <Skeleton rows={4} />;
  if (!data) return <ErrorNote text={err || t.errorGeneric} />;

  const p = cabinet?.profile;
  const name =
    p?.display_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || t.teacherRole;
  const status = statusView(String(p?.profile_status ?? 'draft'), String(p?.admin_note ?? ''), t);
  const subjects = asList(p?.subjects);
  const levels = asList(p?.teaching_levels);
  const languages = asList(p?.languages);
  const rating = Number(p?.rating_avg ?? 0);
  const ratingCount = Number(p?.rating_count ?? 0);
  const contact = data.contact;
  const passportDone = Boolean(data.profile.passport_number);
  const missing = data.anketa.steps.filter((s) => !s.done);
  const videoUrl = String(data.profile.video_url ?? '');

  return (
    <div>
      <PageHead
        title={t.profileTitle}
        subtitle={t.profileSubtitle}
        actions={
          <GhostButton tone="dark" onClick={() => go('public')}>
            {t.viewAsStudent}
          </GhostButton>
        }
      />

      {err ? <ErrorNote text={err} /> : null}

      <div
        className={`mb-4 flex flex-col gap-4 rounded-[20px] border p-5 sm:flex-row sm:items-center ${status.bg} ${status.border}`}
      >
        <span className={`h-3 w-3 shrink-0 rounded-full ${status.dot}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[16px] font-semibold ${status.fg}`}>{status.title}</p>
          <p className={`mt-1 text-[13px] leading-[1.65] opacity-80 ${status.fg}`}>{status.text}</p>
        </div>
        <GhostButton onClick={() => go(status.target)}>{status.cta}</GhostButton>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="space-y-4">
          <Card className="flex flex-col gap-4 p-5 sm:flex-row">
            {/* Suratni shu yerdan ham almashtirish mumkin — anketani ochish shart emas. */}
            <button
              type="button"
              onClick={() => go('anketa')}
              className="group relative self-start rounded-full"
              title={t.photoReplace}
            >
              <Avatar name={name} size={92} url={p?.avatar_url ?? null} />
              <span className="absolute inset-x-0 bottom-0 rounded-b-full bg-[rgba(23,26,61,0.65)] py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                {t.edit}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[20px] font-semibold text-[#171A3D]">{name}</p>
              <p className="mt-1 text-[13px] text-[#6E7191]">
                {p?.experience_years
                  ? `${tpl(t.yearsExp, { n: p.experience_years })} · `
                  : ''}
                {ratingCount > 0
                  ? `★ ${rating} · ${tpl(t.reviewsCount, { n: ratingCount })}`
                  : t.noRatingYet}
              </p>
              {subjects.length ? (
                <p className="mt-1.5 text-[12.5px] font-medium text-[#4B3BE4]">
                  {subjects.join(' · ')}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2.5">
                <PrimaryButton onClick={() => go('anketa')}>{t.editAnketa}</PrimaryButton>
                <GhostButton onClick={() => go('documents')}>{t.myDocuments}</GhostButton>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[16px] font-semibold text-[#171A3D]">{t.publicPart}</p>
              <span className="text-[12px] text-[#8A8CAE]">{t.publicPartHint}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoBox label={t.fieldSpecialization} value={subjects.join(', ') || t.notFilled} />
              <InfoBox
                label={t.fieldLevelsAge}
                value={levels.length ? levels.join(', ') : t.notFilled}
              />
              <InfoBox
                label={t.fieldPrice}
                value={
                  p?.monthly_course_price_amount
                    ? `${fmtSum(Number(p.monthly_course_price_amount))} ${t.sum}`
                    : t.notFilled
                }
              />
              <InfoBox
                label={t.fieldVideo}
                value={videoUrl ? t.videoUploaded : t.videoMissing}
                tone={videoUrl ? 'ok' : 'warn'}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <Lock className="h-[18px] w-[18px] text-[#2E4BA8]" />
              <p className="text-[16px] font-semibold text-[#171A3D]">{t.privatePart}</p>
              <span className="text-[12px] text-[#8A8CAE]">{t.privatePartHint}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-[#DDE3FA] bg-[#F5F7FF] p-3.5">
                <p className="text-[11.5px] text-[#6C7DB0]">{t.fieldPassport}</p>
                <p className="mt-1 text-[12.5px] text-[#22376F]">
                  {passportDone ? String(data.profile.passport_number) : t.notFilled}
                </p>
              </div>
              <div className="rounded-[14px] border border-[#DDE3FA] bg-[#F5F7FF] p-3.5">
                <p className="text-[11.5px] text-[#6C7DB0]">{t.fieldContacts}</p>
                <p className="mt-1 text-[12.5px] break-all text-[#22376F]">
                  {[contact.phone, contact.email].filter(Boolean).join(' · ') || t.notFilled}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-[1.65] text-[#8A8CAE]">{t.privateHint}</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[16px] font-semibold text-[#171A3D]">
                {tpl(t.filledPercent, { pct: data.anketa.completion_percent })}
              </p>
              <span className="text-[12px] text-[#8A8CAE]">
                {tpl(t.ofSteps, { done: data.anketa.done_steps, total: data.anketa.total_steps })}
              </span>
            </div>
            <ProgressBar
              percent={data.anketa.completion_percent}
              tone={data.anketa.done_steps === data.anketa.total_steps ? 'green' : 'violet'}
            />
            {missing.length > 0 ? (
              <p className="mt-3 rounded-[12px] border border-[#FBDCDC] bg-[#FFF6F6] px-3 py-2 text-[12px] font-semibold text-[#8A3B3E]">
                {tpl(t.missingCount, { n: missing.length })}
              </p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {data.anketa.steps.map((s) => (
                <li
                  key={s.step}
                  className={`flex items-center gap-2.5 text-[12.5px] ${
                    s.done ? 'text-[#3E4166]' : 'font-semibold text-[#C23A3F]'
                  }`}
                >
                  <span
                    className={`w-[18px] text-center font-bold ${
                      s.done ? 'text-[#17A34A]' : 'text-[#E9474D]'
                    }`}
                  >
                    {s.done ? '✓' : '!'}
                  </span>
                  <span className="min-w-0 flex-1">{stepTitle(s.step, t) || s.title}</span>
                  {!s.done ? (
                    <button
                      type="button"
                      onClick={() => go('anketa')}
                      className="shrink-0 text-[11.5px] font-semibold text-[#E9474D]"
                    >
                      {t.fill} →
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <PrimaryButton onClick={() => go('anketa')} className="mt-4 w-full">
              {t.continueFilling}
            </PrimaryButton>
          </Card>

          <Card className="p-5">
            <p className="mb-2 text-[16px] font-semibold text-[#171A3D]">{t.ratingTitle}</p>
            {ratingCount > 0 ? (
              <>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[32px] font-semibold text-[#171A3D]">{rating}</span>
                  <span className="text-[14px] text-[#E6B33E]">
                    {'★'.repeat(Math.round(rating))}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-[#8A8CAE]">
                  {tpl(t.reviewsCount, { n: ratingCount })}
                </p>
                <GhostButton onClick={() => go('reviews')} className="mt-3 w-full">
                  {t.reviewsTitle}
                </GhostButton>
              </>
            ) : (
              <p className="py-3 text-[12.5px] text-[#8A8CAE]">{t.noRatingYet}</p>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-2 text-[16px] font-semibold text-[#171A3D]">{t.documentsTitle}</p>
            {data.documents.length === 0 ? (
              <p className="text-[12.5px] text-[#8A8CAE]">{t.documentsEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {data.documents.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-[12.5px] text-[#3E4166]">
                    <span className="min-w-0 flex-1 truncate">{d.original_name || d.kind}</span>
                    <DocStatus status={d.status} />
                  </li>
                ))}
              </ul>
            )}
            <GhostButton onClick={() => go('documents')} className="mt-3 w-full">
              {t.myDocuments}
            </GhostButton>
          </Card>
        </div>
      </div>

      <p className="mt-4 text-center text-[11.5px] text-[#A0A1BC]">
        {data.anketa.submitted_at
          ? `${t.anketaSent} · ${fmtDate(data.anketa.submitted_at, lang)}`
          : ''}
      </p>
    </div>
  );
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
        : 'text-[#3E4166]';
  return (
    <div
      className={`rounded-[14px] border p-3.5 ${
        empty ? 'border-[#FBDCDC] bg-[#FFF6F6]' : 'border-[#F1F0FA] bg-[#FAFAFE]'
      }`}
    >
      <p className="text-[11.5px] text-[#8A8CAE]">{label}</p>
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

const DOC_KINDS: DocumentKind[] = ['passport', 'diploma', 'certificate', 'other'];

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
      <PageHead title={t.documentsTitle} subtitle={t.documentsSubtitle} />
      {err ? <ErrorNote text={err} /> : null}

      {/* Hujjat yuklash ochiq, lekin moderatorga yuborish to'lovdan keyin. */}
      {data && !data.payment?.paid ? (
        <div className="mb-4 rounded-[16px] border border-[#F5E3B8] bg-[#FFFBF0] p-4">
          <p className="text-[13.5px] font-semibold text-[#7A5B10]">{t.payNeededTitle}</p>
          <p className="mt-1 text-[12.5px] leading-[1.7] text-[#8A7134]">{t.payNeededText}</p>
          <GhostButton className="mt-3" onClick={() => go('anketa')}>
            {t.payNow}
          </GhostButton>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2.5">
        {DOC_KINDS.map((k) => (
          <label
            key={k}
            className="min-h-[44px] cursor-pointer rounded-[12px] bg-[#EFEDFD] px-4 py-3 text-[12.5px] font-semibold text-[#4B3BE4] transition hover:bg-[#E4E0FA]"
          >
            {tpl(t.docAdd, { kind: kindLabel(k) })}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setBusy(true);
                setErr('');
                try {
                  await uploadTeacherDocument(token, k, file);
                  await load();
                } catch (x) {
                  setErr(x instanceof Error ? x.message : t.errorGeneric);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        ))}
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
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[#EFEDFD] text-[11px] font-semibold text-[#4B3BE4]">
                  {(d.original_name || 'file').split('.').pop()?.slice(0, 4).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[13px] font-medium text-[#171A3D] hover:text-[#4B3BE4]"
                  >
                    {d.original_name || d.kind}
                  </a>
                  <span className="text-[11.5px] text-[#8A8CAE]">{d.kind}</span>
                </span>
                <DocStatus status={d.status} />
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await deleteTeacherDocument(token, d.id);
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
                </button>
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
  const { token, t, lang, go, cabinet } = usePanel();
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [profile, setProfile] = useState<TeacherProfileResponse | null>(null);

  useEffect(() => {
    let alive = true;
    void getPanelReviews(token)
      .then((r) => alive && setReviews(r))
      .catch(() => undefined);
    void getTeacherProfile(token)
      .then((r) => alive && setProfile(r))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [token]);

  const p = cabinet?.profile;
  const name = p?.display_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || t.teacherRole;
  const subjects = asList(p?.subjects);
  const levels = asList(p?.teaching_levels);
  const languages = asList(p?.languages);
  const about = String(p?.about ?? profile?.profile.about ?? '');
  const education = asRows(profile?.profile.education);
  const certificates = asRows(profile?.profile.certificates);
  const achievements = String(profile?.profile.achievements ?? '');

  return (
    <div className="mx-auto max-w-[1060px]">
      <div className="mb-4 flex flex-col gap-3 rounded-[16px] bg-[#171A3D] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] font-medium">{t.previewBanner}</p>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => go('anketa')}
            className="min-h-[40px] rounded-[11px] bg-white/12 px-4 text-[12.5px] font-semibold text-white"
          >
            {t.edit}
          </button>
          <button
            type="button"
            onClick={() => go('profile')}
            className="min-h-[40px] rounded-[11px] bg-white px-4 text-[12.5px] font-semibold text-[#171A3D]"
          >
            {t.exitPreview}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="space-y-4">
          <Card className="flex flex-col gap-5 p-6 sm:flex-row">
            <Avatar name={name} size={120} url={p?.avatar_url ?? null} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-[24px] font-semibold tracking-[-0.02em] text-[#171A3D]">{name}</p>
                {p?.profile_status === 'active' ? <Tag tone="green">{t.stActiveTitle}</Tag> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px] text-[#3E4166]">
                {Number(p?.rating_count ?? 0) > 0 ? (
                  <span>
                    <span className="text-[#E6B33E]">★</span> {p?.rating_avg}{' '}
                    <span className="text-[#8A8CAE]">
                      · {tpl(t.reviewsCount, { n: Number(p?.rating_count ?? 0) })}
                    </span>
                  </span>
                ) : null}
                {p?.experience_years ? <span>{tpl(t.yearsExp, { n: p.experience_years })}</span> : null}
                {p?.city ? <span className="text-[#8A8CAE]">{p.city}</span> : null}
              </div>
              {subjects.length || levels.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-[#F1EFFE] px-3 py-1.5 text-[12px] font-medium text-[#3B357F]"
                    >
                      {s}
                    </span>
                  ))}
                  {levels.length ? (
                    <span className="rounded-full bg-[#F5F5FB] px-3 py-1.5 text-[12px] font-medium text-[#5B5E86]">
                      {levels.join(' — ')}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {languages.length ? (
                <p className="mt-2.5 text-[12.5px] text-[#6E7191]">
                  {t.speaks}: {languages.join(' · ')}
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="p-6">
            <p className="mb-2 text-[17px] font-semibold text-[#171A3D]">{t.aboutTeacher}</p>
            <p className="whitespace-pre-line text-[13.5px] leading-[1.8] text-[#3E4166]">
              {about || t.emptyAbout}
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <p className="mb-2 text-[17px] font-semibold text-[#171A3D]">{t.educationBlock}</p>
              {education.length === 0 ? (
                <p className="text-[13px] text-[#8A8CAE]">{t.notFilled}</p>
              ) : (
                <ul className="space-y-3">
                  {education.map((e, i) => (
                    <li key={i}>
                      <p className="text-[13px] font-semibold text-[#171A3D]">{e.institution}</p>
                      <p className="text-[12.5px] text-[#6E7191]">
                        {[e.specialty, e.degree].filter(Boolean).join(' · ')}
                      </p>
                      {e.start_year || e.end_year ? (
                        <p className="text-[11.5px] text-[#8A8CAE]">
                          {[e.start_year, e.end_year].filter(Boolean).join(' — ')}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-6">
              <p className="mb-2 text-[17px] font-semibold text-[#171A3D]">{t.certificatesBlock}</p>
              {certificates.length === 0 && !achievements ? (
                <p className="text-[13px] text-[#8A8CAE]">{t.notFilled}</p>
              ) : (
                <>
                  <ul className="space-y-2.5">
                    {certificates.map((c, i) => {
                      const rasm = c.image_url ? resolveAssetUrl(c.image_url) : null;
                      return (
                        <li key={i} className="flex items-center gap-2.5">
                          {rasm ? (
                            <img
                              src={rasm}
                              alt={c.title ?? ''}
                              className="h-10 w-10 shrink-0 rounded-[9px] object-cover ring-1 ring-[#EFEEF8]"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#171A3D]">{c.title}</p>
                            <p className="text-[11.5px] text-[#8A8CAE]">
                              {[c.issuer, c.year].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {achievements ? (
                    <p className="mt-3 whitespace-pre-line text-[12.5px] leading-[1.7] text-[#5B5E86]">
                      {achievements}
                    </p>
                  ) : null}
                </>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[17px] font-semibold text-[#171A3D]">{t.reviewsBlock}</p>
              {reviews && reviews.rating_count > 0 ? (
                <span className="text-[13px] text-[#8A8CAE]">
                  ★ {reviews.rating_avg} · {tpl(t.reviewsCount, { n: reviews.rating_count })}
                </span>
              ) : null}
            </div>
            {!reviews || reviews.reviews.length === 0 ? (
              <p className="text-[13px] text-[#8A8CAE]">{t.reviewsEmpty}</p>
            ) : (
              <ul className="space-y-3">
                {reviews.reviews.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="flex gap-3 rounded-[16px] border border-[#F1F0FA] bg-[#FAFAFE] p-4"
                  >
                    <Avatar name={r.student_name} size={40} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[13px] font-semibold text-[#171A3D]">
                          {r.student_name}
                        </span>
                        <span className="text-[11.5px] text-[#E6B33E]">
                          {'★'.repeat(Math.round(r.rating))}
                        </span>
                        <span className="text-[11.5px] text-[#A0A1BC]">
                          {fmtDate(r.created_at, lang)}
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-[1.7] text-[#5B5E86]">
                        {r.opinion || r.what_liked}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-semibold text-[#171A3D]">
              {p?.monthly_course_price_amount ? fmtSum(Number(p.monthly_course_price_amount)) : '—'}
            </span>
            <span className="text-[13px] text-[#6E7191]">{t.sum}</span>
          </div>
          <p className="mt-3 rounded-[12px] bg-[#E7F4EC] px-3.5 py-3 text-[12.5px] font-semibold text-[#12703A]">
            {t.trialFree}
          </p>
          <button
            type="button"
            disabled
            className="mt-3 min-h-[48px] w-full rounded-[14px] bg-[#4B3BE4] text-[14px] font-semibold text-white opacity-60"
          >
            {t.bookTrial}
          </button>
          <button
            type="button"
            disabled
            className="mt-2 min-h-[44px] w-full rounded-[14px] bg-[#F5F5FB] text-[13px] font-semibold text-[#3E4166] opacity-60"
          >
            {t.writeTeacher}
          </button>
          <p className="mt-2 text-center text-[11px] text-[#A0A1BC]">{t.previewBanner}</p>
        </Card>
      </div>
    </div>
  );
}
