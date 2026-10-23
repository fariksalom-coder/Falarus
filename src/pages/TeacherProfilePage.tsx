/**
 * O'QUVCHI: USTOZ PROFILI (2026-10-24).
 *
 * Tartib: video-taqdimot → asosiy ma'lumot va «Vaqt tanlash» → men haqimda, tillar,
 * yo'nalishlar, ta'lim → baholar (4 mezon) va sharhlar → 7 kunlik jadval (bugundan).
 * Vaqt tanlanganda BookingSheet: tafsilot → Rahmat → band qilindi.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarClock, GraduationCap, Languages, Target, Users } from 'lucide-react';
import { resolveAssetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { fmtSum } from '../api/teacherLessons';
import { getMarketTeacher, type MarketTeacherDetail } from '../api/teacherMarket';
import { DEGREES } from '../../shared/teacherOnboarding';
import { LevelBadge, PathBadge, RatingLine, TeacherPhoto, experienceText, langLabel, slotLabel, specLabel } from '../components/teacher/market/parts';
import WeekSlots from '../components/teacher/market/WeekSlots';
import BookingSheet from '../components/teacher/market/BookingSheet';
import ReviewsSection from '../components/teacher/market/ReviewsSection';
import { TEACHERS_LIST_PATH } from '../constants/teacherPaths';

function Block({ id, title, icon: Icon, children }: { id?: string; title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-[24px] border border-app-border/70 bg-app-surface p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
      <h2 className="mb-3 flex items-center gap-2 text-[17px] font-black text-app-text"><Icon className="h-5 w-5 text-app-primary" />{title}</h2>
      {children}
    </section>
  );
}

export default function TeacherProfilePage() {
  const { teacherId } = useParams();
  const id = Number(teacherId);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [t, setT] = useState<MarketTeacherDetail | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token || !Number.isInteger(id)) return;
    getMarketTeacher(token, id).then(setT).catch((e: Error) => setError(e.message));
  }, [token, id]);
  useEffect(() => { load(); }, [load]);

  // Katalogdagi «Darsga yozilish» → #jadval: ma'lumot yuklangach jadvalga suriladi.
  useEffect(() => {
    if (t && location.hash === '#jadval') requestAnimationFrame(() => document.getElementById('jadval')?.scrollIntoView({ behavior: 'smooth' }));
  }, [t, location.hash]);

  const toSchedule = () => document.getElementById('jadval')?.scrollIntoView({ behavior: 'smooth' });
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(TEACHERS_LIST_PATH));

  if (error) {
    return (
      <div className="min-h-full bg-app-bg-subtle px-4 pt-4">
        <div className="mx-auto max-w-[880px] rounded-[24px] bg-app-surface p-8 text-center shadow-app-soft">
          <p className="font-black text-app-text">{error}</p>
          <button type="button" onClick={() => navigate(TEACHERS_LIST_PATH)} className="mt-4 min-h-11 rounded-2xl bg-app-primary-deep px-5 text-sm font-black text-white">Ustozlar roʻyxati</button>
        </div>
      </div>
    );
  }
  if (!t) {
    return (
      <div className="min-h-full space-y-3 bg-app-bg-subtle px-4 pt-4" aria-busy="true">
        <div className="mx-auto max-w-[880px] space-y-3">
          <div className="aspect-video animate-pulse rounded-[24px] bg-app-surface" />
          <div className="h-48 animate-pulse rounded-[24px] bg-app-surface" />
        </div>
      </div>
    );
  }

  const name = `${t.first_name} ${t.last_name}`.trim();
  const exp = experienceText(t.experience_years);
  const video = resolveAssetUrl(t.video_url);

  return (
    <div className="min-h-full bg-app-bg-subtle px-4 pb-28 pt-2 lg:pb-10">
      <main className="mx-auto w-full max-w-[880px] space-y-4">
        <button type="button" onClick={back} className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-bold text-app-text-muted hover:text-app-text">
          <ArrowLeft className="h-4 w-4" />Ustozlar
        </button>

        {video && (
          <video src={video} controls playsInline preload="metadata" poster={resolveAssetUrl(t.avatar_url) ?? undefined}
            className="aspect-video w-full rounded-[24px] bg-black object-contain shadow-[0_14px_34px_rgba(148,163,184,0.2)]">
            <track kind="captions" />
          </video>
        )}

        <section className="rounded-[24px] border border-app-border/70 bg-app-surface p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
          <div className="flex gap-4">
            <TeacherPhoto url={t.avatar_url} name={name} className="h-[88px] w-[88px] rounded-2xl sm:h-[112px] sm:w-[112px]" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-black leading-tight text-app-text sm:text-[28px]">{name}</h1>
              <div className="mt-1"><RatingLine avg={t.rating_avg} count={t.rating_count} /></div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <LevelBadge level={t.level} />
                <PathBadge certified={t.certified} />
                {exp && <span className="inline-flex items-center rounded-full bg-app-bg-subtle px-2 py-0.5 text-[11px] font-black text-app-text">{exp}</span>}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { v: t.price_uzs ? fmtSum(t.price_uzs).replace(' soʻm', '') : '—', l: `soʻm · ${t.lesson_minutes} daqiqa` },
              { v: String(t.active_students), l: 'faol oʻquvchi' },
              { v: String(t.lessons_done), l: 'dars oʻtgan' },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl bg-app-bg-subtle px-2 py-3">
                <p className="whitespace-nowrap text-[15px] font-black tabular-nums text-app-text sm:text-lg">{x.v}</p>
                <p className="text-[11px] font-semibold text-app-text-muted sm:text-xs">{x.l}</p>
              </div>
            ))}
          </div>

          <button type="button" onClick={toSchedule} disabled={!t.bookable}
            className="mt-4 hidden h-12 w-full items-center justify-center gap-2 rounded-2xl bg-app-primary-deep text-[15px] font-black text-white shadow-app-soft transition hover:brightness-110 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500 lg:flex">
            <CalendarClock className="h-5 w-5" />{t.bookable ? 'Vaqt tanlab darsga yozilish' : 'Hozircha dars qabul qilmaydi'}
          </button>
        </section>

        {t.about && (
          <Block title="Men haqimda" icon={Users}>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-app-text">{t.about}</p>
          </Block>
        )}

        {(t.languages.length > 0 || t.specializations.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {t.languages.length > 0 && (
              <Block title="Qaysi tillarda gaplashadi" icon={Languages}>
                <ul className="flex flex-wrap gap-2">{t.languages.map((l) => <li key={l.code} className="rounded-full bg-app-bg-subtle px-3 py-1.5 text-[13px] font-bold text-app-text">{langLabel(l)}</li>)}</ul>
              </Block>
            )}
            {t.specializations.length > 0 && (
              <Block title="Yoʻnalishlar" icon={Target}>
                <ul className="flex flex-wrap gap-2">{t.specializations.map((s) => <li key={s} className="rounded-full bg-app-icon-bg px-3 py-1.5 text-[13px] font-bold text-app-primary-deep">{specLabel(s)}</li>)}</ul>
              </Block>
            )}
          </div>
        )}

        {(t.education.length > 0 || t.certificates.length > 0) && (
          <Block title="Taʼlim va sertifikatlar" icon={GraduationCap}>
            <ul className="space-y-3">
              {t.education.map((e, i) => (
                <li key={`e${i}`} className="text-sm">
                  <p className="font-bold text-app-text">{e.institution}</p>
                  <p className="text-app-text-muted">{[DEGREES.find((d) => d.code === e.degree)?.uz, e.specialty, [e.year_from, e.year_to].filter(Boolean).join('–')].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
              {t.certificates.map((c, i) => (
                <li key={`c${i}`} className="text-sm">
                  <p className="font-bold text-app-text">{c.title}</p>
                  <p className="text-app-text-muted">{[c.institution, c.year].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ul>
          </Block>
        )}

        <Block title="Baholar va sharhlar" icon={BookOpen}>
          {token && <ReviewsSection teacherId={t.user_id} token={token} ratingAvg={t.rating_avg} total={t.reviews_total} criteria={t.criteria} initial={t.reviews} />}
        </Block>

        <Block id="jadval" title="Boʻsh vaqtlar" icon={CalendarClock}>
          {t.bookable ? <WeekSlots slots={t.free_slots} onPick={setPicked} />
            : <p className="rounded-2xl bg-app-bg-subtle p-4 text-center text-sm font-semibold text-app-text-muted">Ustoz hozircha dars qabul qilmaydi.</p>}
        </Block>
      </main>

      {/* Telefonda pastki panel: narx va jadvalga o'tish. */}
      {t.bookable && !picked && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-surface/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-[880px] items-center gap-3">
            <div className="min-w-0">
              <p className="text-[17px] font-black tabular-nums text-app-text">{t.price_uzs ? fmtSum(t.price_uzs) : '—'}</p>
              <p className="truncate text-xs font-semibold text-app-text-muted">{t.free_slots[0] ? `Eng yaqin: ${slotLabel(t.free_slots[0])}` : `${t.lesson_minutes} daqiqalik dars`}</p>
            </div>
            <button type="button" onClick={toSchedule} className="ml-auto flex h-12 shrink-0 items-center justify-center rounded-2xl bg-app-primary-deep px-5 text-[15px] font-black text-white active:scale-[0.98]">Vaqt tanlash</button>
          </div>
        </div>
      )}

      {picked && token && (
        <BookingSheet teacher={t} startsAt={picked} token={token} onClose={() => setPicked(null)}
          onBooked={() => navigate(`${TEACHERS_LIST_PATH}?tab=mine`)}
          onSlotTaken={load} />
      )}
    </div>
  );
}
