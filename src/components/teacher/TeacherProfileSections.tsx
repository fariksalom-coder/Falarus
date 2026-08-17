import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { resolveAssetUrl } from '../../api';
import type {
  TeacherAvailabilitySlot,
  TeacherCertificate,
  TeacherEducation,
  TeacherProfile,
} from '../../api/teachers';

/** "FalaRus tavsiyasi" — admin belgilaganda ko'rinadigan tilla nishon. */
export function RecommendedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-black text-white shadow-app-soft ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[13px]'
      }`}
      style={{ background: 'linear-gradient(135deg, #F5D97C 0%, #C08A2D 60%, #A9791C 100%)' }}
    >
      <BadgeCheck className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
      FalaRus tavsiyasi
    </span>
  );
}

/** Muvaffaqiyat foizi — SVG halqa (donut) + markazda katta foiz. */
function SuccessDonut({ rate }: { rate: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const arc = (Math.max(0, Math.min(100, rate)) / 100) * circ;
  return (
    <div className="relative h-[120px] w-[120px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--app-border-strong)" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--app-success)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-black leading-none text-app-text">{Math.round(rate)}%</span>
        <span className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-app-text-secondary">
          Muvaffaqiyat
        </span>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  tone = 'default',
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone?: 'default' | 'success' | 'muted';
}) {
  const toneCls =
    tone === 'success'
      ? 'text-app-success'
      : tone === 'muted'
        ? 'text-app-text-secondary'
        : 'text-app-primary-deep';
  return (
    <div className="rounded-2xl bg-app-bg-muted p-3.5 text-center">
      <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-app-surface ${toneCls}`}>
        {icon}
      </span>
      <p className={`mt-2 text-xl font-black ${toneCls}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-app-text-secondary">{label}</p>
    </div>
  );
}

/** Talaba natijalari: donut + KPI plitalar. */
export function TeacherResults({ profile }: { profile: TeacherProfile }) {
  const total = Number(profile.students_total ?? 0);
  const success = Number(profile.students_success ?? 0);
  const failed = Number(profile.students_failed ?? Math.max(0, total - success));
  const rate = total > 0 ? (success / total) * 100 : 0;
  if (total <= 0) return null;

  return (
    <section className="rounded-[20px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-icon-bg text-app-primary-deep">
          <TrendingUp className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-black text-app-text">Natijalar</h2>
      </div>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <SuccessDonut rate={rate} />
        <div className="grid flex-1 grid-cols-3 gap-2.5">
          <StatTile icon={<Users className="h-5 w-5" />} value={total} label="Talaba" />
          <StatTile icon={<TrendingUp className="h-5 w-5" />} value={success} label="Muvaffaqiyatli" tone="success" />
          <StatTile icon={<Users className="h-5 w-5" />} value={failed} label="Tugatmagan" tone="muted" />
        </div>
      </div>
    </section>
  );
}

const WEEK_DAYS: { day: number; short: string; full: string }[] = [
  { day: 1, short: 'Du', full: 'Dushanba' },
  { day: 2, short: 'Se', full: 'Seshanba' },
  { day: 3, short: 'Cho', full: 'Chorshanba' },
  { day: 4, short: 'Pa', full: 'Payshanba' },
  { day: 5, short: 'Ju', full: 'Juma' },
  { day: 6, short: 'Sha', full: 'Shanba' },
  { day: 0, short: 'Yak', full: 'Yakshanba' },
];

function slotHours(slot: TeacherAvailabilitySlot): number {
  const [fh, fm] = slot.from.split(':').map(Number);
  const [th, tm] = slot.to.split(':').map(Number);
  const mins = (th * 60 + (tm || 0)) - (fh * 60 + (fm || 0));
  return mins > 0 ? mins / 60 : 0;
}

/** Haftalik dars jadvali — kun bo'yicha vaqt oynalari + jami soat. */
export function TeacherSchedule({ slots }: { slots: TeacherAvailabilitySlot[] }) {
  if (!slots.length) return null;
  const byDay = new Map<number, TeacherAvailabilitySlot[]>();
  for (const s of slots) {
    if (!byDay.has(s.day)) byDay.set(s.day, []);
    byDay.get(s.day)!.push(s);
  }
  const weeklyHours = slots.reduce((sum, s) => sum + slotHours(s), 0);

  return (
    <section className="rounded-[20px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-icon-bg text-app-primary-deep">
            <CalendarClock className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-black text-app-text">Dars jadvali</h2>
        </div>
        <span className="rounded-full bg-app-icon-bg px-3 py-1 text-xs font-black text-app-primary-deep">
          Haftada ~{Math.round(weeklyHours)} soat
        </span>
      </div>
      <div className="space-y-2">
        {WEEK_DAYS.map(({ day, short, full }) => {
          const daySlots = (byDay.get(day) ?? []).slice().sort((a, b) => a.from.localeCompare(b.from));
          const active = daySlots.length > 0;
          return (
            <div key={day} className="flex items-center gap-3">
              <span
                className={`flex h-9 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                  active ? 'bg-app-primary-deep text-white' : 'bg-app-bg-muted text-app-text-secondary'
                }`}
                title={full}
              >
                {short}
              </span>
              {active ? (
                <div className="flex flex-wrap gap-1.5">
                  {daySlots.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-app-success-bg px-2.5 py-1 text-[13px] font-bold text-app-success"
                    >
                      {s.from}–{s.to}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[13px] font-medium text-app-text-secondary">Dam olish</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Ta'lim (qayerda o'qigan). */
export function TeacherEducationSection({ items }: { items: TeacherEducation[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-[20px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-icon-bg text-app-primary-deep">
          <GraduationCap className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-black text-app-text">Ta'lim</h2>
      </div>
      <div className="space-y-3">
        {items.map((e, i) => (
          <div key={i} className="flex gap-3">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-app-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-bold text-app-text">{e.institution}</p>
              {e.specialty ? <p className="text-sm text-app-text-muted">{e.specialty}</p> : null}
              {e.start_year || e.end_year ? (
                <p className="text-xs font-semibold text-app-text-secondary">
                  {[e.start_year, e.end_year].filter(Boolean).join(' – ')}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Sertifikat rasmini to'liq ekranda ko'rsatuvchi oyna.
 *
 * PORTAL SHART: pastdagi navigatsiya `z-50` bilan `fixed` turadi, oyna esa
 * bo'lim ichida qolsa uning ostiga tushib ketadi va yarmi ko'rinmaydi.
 */
function CertificateLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', esc);
    // Orqa fon oyna ochiqligida siljimasin.
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = oldOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Yopish"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-full rounded-2xl bg-white object-contain shadow-2xl"
      />
    </div>,
    document.body,
  );
}

/** Sertifikatlar / diplomlar. */
export function TeacherCertificatesSection({ items }: { items: TeacherCertificate[] }) {
  const [ochiq, setOchiq] = useState<{ src: string; alt: string } | null>(null);
  if (!items.length) return null;
  return (
    <section className="rounded-[20px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-icon-bg text-app-primary-deep">
          <Award className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-black text-app-text">Sertifikat va diplomlar</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((c, i) => {
          const img = resolveAssetUrl(c.image_url ?? null);
          return (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-app-border bg-app-bg-muted"
            >
              {/*
                Sertifikat — hujjat, ya'ni uni kichik kvadratga `object-cover`
                bilan qirqib bo'lmaydi: matni ham, muhri ham qirqilib ketadi va
                rasm borligi bilinmay qoladi. Shuning uchun keng ko'rinish va
                `object-contain` — hujjat to'liq, nisbati buzilmagan holda
                ko'rinadi. Bosilganda to'liq ekranda ochiladi.
              */}
              {img ? (
                <button
                  type="button"
                  onClick={() => setOchiq({ src: img, alt: c.title })}
                  className="group block w-full cursor-zoom-in bg-app-surface"
                  aria-label={`${c.title} — rasmni kattalashtirish`}
                >
                  <img
                    src={img}
                    alt={c.title}
                    loading="lazy"
                    className="h-[180px] w-full object-contain p-2 transition duration-200 group-hover:scale-[1.02]"
                  />
                </button>
              ) : null}
              <div className="flex gap-3 p-3">
                {!img ? (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-app-surface">
                    <Award className="h-6 w-6 text-app-accent" />
                  </span>
                ) : null}
                <div className="min-w-0">
                  <p className="font-bold leading-tight text-app-text">{c.title}</p>
                  {c.issuer ? <p className="mt-0.5 text-sm text-app-text-muted">{c.issuer}</p> : null}
                  {c.year ? (
                    <p className="text-xs font-semibold text-app-text-secondary">{c.year}</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ochiq ? (
        <CertificateLightbox src={ochiq.src} alt={ochiq.alt} onClose={() => setOchiq(null)} />
      ) : null}
    </section>
  );
}

/** Yutuqlar / natijalar (matn). */
export function TeacherAchievementsSection({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <section className="rounded-[20px] bg-app-surface p-5 shadow-app-soft ring-1 ring-app-border">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-icon-bg text-app-primary-deep">
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-black text-app-text">Yutuqlar</h2>
      </div>
      <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-app-text-muted">{text}</p>
    </section>
  );
}
