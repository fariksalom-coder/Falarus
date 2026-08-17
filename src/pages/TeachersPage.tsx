import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Clock, Search, Star, Users, X } from 'lucide-react';
import { motion } from 'motion/react';
import { getMyMeetings, listTeachers, type StudentMeeting, type TeacherProfile } from '../api/teachers';
import { RecommendedBadge } from '../components/teacher/TeacherProfileSections';
import StudentMeetLessons from '../components/meet/StudentMeetLessons';
import MyTrialLessonsPanel from '../components/teacher/MyTrialLessonsPanel';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import {
  formatTeacherExperience,
  formatTeacherPrice,
  teacherDisplayName,
  teacherInitials,
} from '../utils/teacherDisplay';

type SortKey = 'relevance' | 'priceLow' | 'priceHigh' | 'experience' | 'rating';
type T = (key: string, values?: Record<string, string | number>) => string;

function experienceMonths(teacher: TeacherProfile): number {
  return Number(teacher.experience_years ?? 0) * 12 + Number(teacher.experience_months ?? 0);
}

function TeacherAvatar({ teacher }: { teacher: TeacherProfile }) {
  if (teacher.avatar_url) {
    return (
      <img
        src={teacher.avatar_url}
        alt={teacherDisplayName(teacher)}
        className="h-full w-full object-cover object-[center_35%]"
        decoding="async"
      />
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center text-2xl font-black text-white"
      style={{ background: 'var(--app-brand-gradient)' }}
    >
      {teacherInitials(teacher)}
    </div>
  );
}

/** Kompakt reyting: to'ldirilgan yulduzlar + fikrlar soni yoki "Yangi". */
function TeacherRating({ teacher, t }: { teacher: TeacherProfile; t: T }) {
  const count = Number(teacher.rating_count ?? 0);
  const avg = Number(teacher.rating_avg ?? 0);
  if (count <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-app-accent-bg px-2 py-0.5 text-[10px] font-black text-app-accent-text">
        {t('teachers.ratingNew')}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-black text-app-text"
      aria-label={`${avg.toFixed(1)} / 5`}
    >
      <Star className="h-3.5 w-3.5 fill-app-accent text-app-accent" aria-hidden />
      {avg.toFixed(1)}
      <span className="font-semibold text-app-text-secondary">
        ({t('teachers.reviewsCount', { count })})
      </span>
    </span>
  );
}

function TeacherCard({ teacher, t }: { teacher: TeacherProfile; t: T }) {
  const navigate = useNavigate();
  const name = teacherDisplayName(teacher);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="flex flex-col rounded-[18px] bg-app-surface p-2 shadow-app-soft ring-1 ring-app-border/60"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[13px] bg-app-bg-subtle">
        <TeacherAvatar teacher={teacher} />
        <div className="absolute left-1.5 top-1.5 rounded-full bg-app-surface/90 px-2 py-0.5 backdrop-blur">
          <TeacherRating teacher={teacher} t={t} />
        </div>
        {teacher.is_recommended ? (
          <div className="absolute inset-x-1.5 bottom-1.5">
            <RecommendedBadge compact />
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-1.5 pt-2.5">
        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-tight text-app-text">{name}</h3>
        {teacher.headline ? (
          <p className="mt-1 line-clamp-2 text-[11px] font-medium text-app-text-muted">{teacher.headline}</p>
        ) : [teacher.region, teacher.city].filter(Boolean).length ? (
          <p className="mt-1 line-clamp-1 text-[11px] font-medium text-app-text-muted">
            {[teacher.region, teacher.city].filter(Boolean).join(', ')}
          </p>
        ) : null}
        <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-app-text">
          <Users className="h-3.5 w-3.5 shrink-0 text-app-primary-deep" aria-hidden />
          <span className="truncate">
            {formatTeacherExperience(teacher.experience_years, teacher.experience_months, t)}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-app-text">
          <Clock className="h-3.5 w-3.5 shrink-0 text-app-primary-deep" aria-hidden />
          <span className="truncate">
            {formatTeacherPrice(teacher.monthly_course_price_amount, teacher.monthly_course_price_currency, t)}
          </span>
        </p>
        <button
          type="button"
          onClick={() => navigate(`/teachers/${teacher.user_id}`)}
          className="mt-3 flex h-9 w-full items-center justify-center rounded-full bg-app-primary-deep text-[14px] font-extrabold text-white transition active:scale-[0.98]"
        >
          {t('teachers.details')}
        </button>
      </div>
    </motion.article>
  );
}

const SORTS: { key: SortKey; labelKey: string }[] = [
  { key: 'relevance', labelKey: 'teachers.sortRelevance' },
  { key: 'rating', labelKey: 'teachers.sortRating' },
  { key: 'experience', labelKey: 'teachers.sortExperience' },
  { key: 'priceLow', labelKey: 'teachers.sortPriceLow' },
  { key: 'priceHigh', labelKey: 'teachers.sortPriceHigh' },
];

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-[24px] border border-dashed border-app-border bg-app-surface px-6 py-14 text-center shadow-app-soft">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-icon-bg text-app-primary-deep">
        <Users className="h-8 w-8" aria-hidden />
      </div>
      <h2 className="text-lg font-extrabold text-app-text">{title}</h2>
      <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-app-text-muted">{desc}</p>
    </div>
  );
}

export default function TeachersPage() {
  const { t } = useLocale();
  const { token } = useAuth();
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [meetings, setMeetings] = useState<StudentMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('relevance');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listTeachers()
      .then((rows) => mounted && setTeachers(rows))
      .catch((e: Error) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setMeetings([]);
      return;
    }
    let mounted = true;
    void getMyMeetings(token)
      .then((rows) => mounted && setMeetings(rows.filter((m) => !String(m.status).includes('cancel'))))
      .catch(() => mounted && setMeetings([]));
    return () => {
      mounted = false;
    };
  }, [token]);

  const [view, setView] = useState<'choose' | 'mine'>('choose');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = teachers;
    if (q) {
      rows = rows.filter((teacher) => {
        const hay = [
          teacherDisplayName(teacher),
          teacher.headline,
          teacher.region,
          teacher.city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...rows];
    if (sort === 'priceLow') {
      sorted.sort(
        (a, b) => (a.monthly_course_price_amount || Infinity) - (b.monthly_course_price_amount || Infinity),
      );
    } else if (sort === 'priceHigh') {
      sorted.sort((a, b) => (b.monthly_course_price_amount || 0) - (a.monthly_course_price_amount || 0));
    } else if (sort === 'experience') {
      sorted.sort((a, b) => experienceMonths(b) - experienceMonths(a));
    } else if (sort === 'rating') {
      sorted.sort(
        (a, b) =>
          Number(!!b.is_recommended) - Number(!!a.is_recommended) ||
          Number(b.rating_avg ?? 0) - Number(a.rating_avg ?? 0) ||
          Number(b.rating_count ?? 0) - Number(a.rating_count ?? 0),
      );
    } else {
      // relevance (default) — FalaRus tavsiya etganlar birinchi.
      sorted.sort((a, b) => Number(!!b.is_recommended) - Number(!!a.is_recommended));
    }
    return sorted;
  }, [teachers, query, sort]);

  return (
    <div className="min-h-full bg-app-bg-subtle px-4 pb-6 pt-2">
      <main className="mx-auto w-full max-w-[820px]">
        <header className="mb-4">
          <h1 className="text-[30px] font-black leading-tight tracking-tight text-app-text sm:text-[38px]">
            {t('teachers.title')}
          </h1>
          <p className="mt-1 text-sm font-medium text-app-text-muted">{t('teachers.subtitle')}</p>
        </header>

        {/* Ikki panel: o'qituvchi tanlash / mening darslarim */}
        <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl bg-app-bg-muted p-1">
          <button
            type="button"
            onClick={() => setView('choose')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition ${
              view === 'choose' ? 'bg-app-surface text-app-primary-deep shadow-app-soft' : 'text-app-text-muted'
            }`}
          >
            <Users className="h-4 w-4" /> O‘qituvchi tanlash
          </button>
          <button
            type="button"
            onClick={() => setView('mine')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition ${
              view === 'mine' ? 'bg-app-surface text-app-primary-deep shadow-app-soft' : 'text-app-text-muted'
            }`}
          >
            <CalendarClock className="h-4 w-4" /> Mening darslarim{meetings.length > 0 ? ` (${meetings.length})` : ''}
          </button>
        </div>

        {view === 'choose' ? (
          <>
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-secondary" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('teachers.searchPlaceholder')}
            className="w-full rounded-2xl border border-app-border bg-app-surface py-3 pl-11 pr-10 text-sm font-medium text-app-text shadow-app-soft outline-none transition placeholder:text-app-text-secondary focus:border-app-primary focus:ring-2 focus:ring-app-primary/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Tozalash"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-app-text-secondary hover:bg-app-row-hover"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Sort chips */}
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition active:scale-95 ${
                sort === s.key
                  ? 'bg-app-primary-deep text-white shadow-app-soft'
                  : 'bg-app-surface text-app-text-muted ring-1 ring-app-border'
              }`}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>

        {!loading && !error ? (
          <p className="mb-3 mt-3 text-xs font-bold uppercase tracking-wide text-app-text-secondary">
            {t('teachers.resultsCount', { count: visible.length })}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-[18px] bg-app-surface" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-app-danger/30 bg-app-danger-bg px-4 py-6 text-center text-sm font-semibold text-app-danger">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {visible.length === 0 ? (
              query ? (
                <EmptyState title={t('teachers.noResults')} desc={t('teachers.emptyDesc')} />
              ) : (
                <EmptyState title={t('teachers.emptyTitle')} desc={t('teachers.emptyDesc')} />
              )
            ) : (
              visible.map((teacher) => <TeacherCard key={teacher.user_id} teacher={teacher} t={t} />)
            )}
          </div>
        )}
          </>
        ) : (
          <>
          {/* Sinov darslari — bitta panel: kim, qachon, holati va amallar.
              Ilgari bu yerda alohida «Dars jadvalim» bo'limi ham bor edi va
              ayni darslarni ikkinchi marta ko'rsatardi; endi u panel ichida. */}
          <MyTrialLessonsPanel token={token} />
          {/* Video darslar (Jitsi xonalari) — alohida funksiya, takrorlanmaydi. */}
          <StudentMeetLessons />
          {meetings.length === 0 ? (
            <section className="rounded-[22px] border border-app-border bg-app-surface p-8 text-center shadow-app-soft">
              <CalendarClock className="mx-auto h-8 w-8 text-app-text-secondary" />
              <p className="mt-2 text-sm font-medium text-app-text-muted">
                Hozircha dars yo‘q. «O‘qituvchi tanlash» orqali darsga yoziling.
              </p>
            </section>
          ) : null}
          </>
        )}
      </main>

    </div>
  );
}
