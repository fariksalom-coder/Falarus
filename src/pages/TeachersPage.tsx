/**
 * O'QUVCHI: USTOZLAR KATALOGI (2026-10-24) va «Mening darslarim».
 *
 * Saralash: tavsiya (daraja → reyting), narx, reyting, eng yaqin bo'sh vaqt.
 * Filtr: yo'nalish, hafta kuni va kun qismi (ustozning keyingi 7 kundagi bo'sh
 * vaqtlari bo'yicha, o'quvchi soatida). Sinov darsi yo'q — oddiy dars band qilinadi.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarClock, ChevronDown, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listMarketTeachers, type MarketTeacher } from '../api/teacherMarket';
import { getMyLessons, type TeacherLesson } from '../api/teacherLessons';
import { TEACHER_LEVELS } from '../../shared/teacherLessons';
import { SPECIALIZATIONS } from '../../shared/teacherOnboarding';
import TeacherCard from '../components/teacher/market/TeacherCard';
import { WD_SHORT } from '../components/teacher/market/parts';
import MyLessonsPanel from '../components/teacher/MyLessonsPanel';
import { teacherProfilePath } from '../constants/teacherPaths';

type SortKey = 'recommended' | 'priceLow' | 'priceHigh' | 'rating' | 'soonest';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Tavsiya etilgan' },
  { key: 'priceLow', label: 'Avval arzonlari' },
  { key: 'priceHigh', label: 'Avval qimmatlari' },
  { key: 'rating', label: 'Reyting boʻyicha' },
  { key: 'soonest', label: 'Eng yaqin vaqt' },
];

type Part = 'morning' | 'day' | 'evening';
const PARTS: { key: Part; label: string; from: number; to: number }[] = [
  { key: 'morning', label: 'Ertalab · 06–12', from: 6, to: 12 },
  { key: 'day', label: 'Kunduzi · 12–18', from: 12, to: 18 },
  { key: 'evening', label: 'Kechqurun · 18–24', from: 18, to: 24 },
];
/** Dushanbadan boshlab ko'rsatiladi (getDay: 0 = yakshanba). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const LEVEL_RANK = Object.fromEntries(TEACHER_LEVELS.map((l, i) => [l.key, i]));

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`min-h-10 shrink-0 rounded-full px-3.5 text-[13px] font-bold transition active:scale-95 ${on ? 'bg-app-primary-deep text-white shadow-app-soft' : 'bg-app-surface text-app-text ring-1 ring-app-border hover:ring-app-primary/40'}`}>
      {children}
    </button>
  );
}

const toggle = <T,>(set: Set<T>, v: T) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); return n; };

export default function TeachersPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'mine' ? 'mine' : 'choose';
  const [teachers, setTeachers] = useState<MarketTeacher[] | null>(null);
  const [lessons, setLessons] = useState<TeacherLesson[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [specs, setSpecs] = useState<Set<string>>(new Set());
  const [days, setDays] = useState<Set<number>>(new Set());
  const [parts, setParts] = useState<Set<Part>>(new Set());

  const loadTeachers = useCallback(() => {
    if (!token) return;
    setError('');
    listMarketTeachers(token).then(setTeachers).catch((e: Error) => setError(e.message));
  }, [token]);
  const loadLessons = useCallback(() => {
    if (token) getMyLessons(token).then(setLessons).catch(() => setLessons([]));
  }, [token]);
  useEffect(() => { loadTeachers(); loadLessons(); }, [loadTeachers, loadLessons]);
  // To'lov yangi oynada — qaytib kelganda darslar ro'yxati yangilansin.
  useEffect(() => { window.addEventListener('focus', loadLessons); return () => window.removeEventListener('focus', loadLessons); }, [loadLessons]);

  const setTab = (next: 'choose' | 'mine') => setParams(next === 'mine' ? { tab: 'mine' } : {}, { replace: true });
  const upcomingCount = lessons?.filter((l) => (l.status === 'paid' || l.status === 'disputed') && l.join.closesAt > Date.now()).length ?? 0;
  const filterCount = specs.size + days.size + parts.size;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const slotOk = (iso: string) => {
      const d = new Date(iso);
      if (days.size && !days.has(d.getDay())) return false;
      return !parts.size || PARTS.some((p) => parts.has(p.key) && d.getHours() >= p.from && d.getHours() < p.to);
    };
    const rows = (teachers ?? []).filter((t) => {
      if (q && !`${t.first_name} ${t.last_name} ${t.about}`.toLowerCase().includes(q)) return false;
      if (specs.size && !t.specializations.some((s) => specs.has(s))) return false;
      if ((days.size || parts.size) && !t.free_slots.some(slotOk)) return false;
      return true;
    });
    const first = (t: MarketTeacher) => {
      const s = t.free_slots.find(slotOk);
      return s ? new Date(s).getTime() : Infinity;
    };
    const rating = (t: MarketTeacher) => (t.rating_count ? Number(t.rating_avg ?? 0) : 0);
    return rows.sort((a, b) => {
      // Band qilib bo'lmaydiganlar har doim oxirida.
      if (a.bookable !== b.bookable) return a.bookable ? -1 : 1;
      switch (sort) {
        case 'priceLow': return (a.price_uzs ?? Infinity) - (b.price_uzs ?? Infinity);
        case 'priceHigh': return (b.price_uzs ?? 0) - (a.price_uzs ?? 0);
        case 'rating': return rating(b) - rating(a) || b.rating_count - a.rating_count;
        case 'soonest': return first(a) - first(b);
        default: return LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || rating(b) - rating(a) || b.lessons_done - a.lessons_done;
      }
    });
  }, [teachers, query, specs, days, parts, sort]);

  const clearFilters = () => { setSpecs(new Set()); setDays(new Set()); setParts(new Set()); };

  return (
    <div className="min-h-full bg-app-bg-subtle px-4 pb-8 pt-2">
      <main className="mx-auto w-full max-w-[880px]">
        <header className="mb-3">
          <h1 className="text-[30px] font-black leading-tight tracking-tight text-app-text sm:text-[38px]">Ustozlar</h1>
          <p className="mt-1 text-sm font-medium text-app-text-muted">Rus tili ustozini tanlang va qulay vaqtga darsga yoziling</p>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-app-bg-muted p-1">
          {([['choose', 'Ustoz tanlash', Users], ['mine', 'Darslarim', CalendarClock]] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-bold transition ${tab === key ? 'bg-app-surface text-app-primary-deep shadow-app-soft' : 'text-app-text-muted'}`}>
              <Icon className="h-4 w-4" />{label}
              {key === 'mine' && upcomingCount > 0 && <span className="rounded-full bg-app-primary-deep px-1.5 text-[11px] font-black text-white">{upcomingCount}</span>}
            </button>
          ))}
        </div>

        {tab === 'mine' ? (
          <div className="space-y-4">
            {token && <MyLessonsPanel token={token} rows={lessons} reload={loadLessons} onFindTeacher={() => setTab('choose')} />}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Qidirish</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-secondary" aria-hidden />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ism boʻyicha qidirish"
                  className="h-12 w-full rounded-2xl border border-app-border bg-app-surface pl-10 pr-10 text-sm font-medium text-app-text shadow-app-soft outline-none placeholder:text-app-text-secondary focus:border-app-primary focus:ring-2 focus:ring-app-primary/15" />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Tozalash" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-app-text-secondary hover:bg-app-row-hover"><X className="h-4 w-4" /></button>
                )}
              </label>
              <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
                className={`relative flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-3.5 text-sm font-bold shadow-app-soft transition ${showFilters || filterCount ? 'border-app-primary bg-app-icon-bg text-app-primary-deep' : 'border-app-border bg-app-surface text-app-text'}`}>
                <SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Filtrlar</span>
                {filterCount > 0 && <span className="rounded-full bg-app-primary-deep px-1.5 text-[11px] font-black text-white">{filterCount}</span>}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="mt-3 space-y-4 rounded-[24px] border border-app-border bg-app-surface p-4 shadow-app-soft">
                    <fieldset>
                      <legend className="mb-2 text-xs font-black uppercase tracking-wide text-app-text-secondary">Yoʻnalish</legend>
                      <div className="flex flex-wrap gap-2">
                        {SPECIALIZATIONS.map((s) => <Chip key={s.code} on={specs.has(s.code)} onClick={() => setSpecs((x) => toggle(x, s.code))}>{s.uz}</Chip>)}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-2 text-xs font-black uppercase tracking-wide text-app-text-secondary">Qaysi kunlari</legend>
                      <div className="flex flex-wrap gap-2">
                        {WEEK_ORDER.map((d) => <Chip key={d} on={days.has(d)} onClick={() => setDays((x) => toggle(x, d))}>{WD_SHORT[d]}</Chip>)}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-2 text-xs font-black uppercase tracking-wide text-app-text-secondary">Kunning qaysi vaqti</legend>
                      <div className="flex flex-wrap gap-2">
                        {PARTS.map((p) => <Chip key={p.key} on={parts.has(p.key)} onClick={() => setParts((x) => toggle(x, p.key))}>{p.label}</Chip>)}
                      </div>
                    </fieldset>
                    {filterCount > 0 && (
                      <button type="button" onClick={clearFilters} className="min-h-11 text-sm font-bold text-app-primary-deep underline-offset-2 hover:underline">Filtrlarni tozalash</button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-3 mt-4 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-app-text-secondary">{teachers ? `${visible.length} ta ustoz` : ' '}</p>
              <label className="relative">
                <span className="sr-only">Saralash</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-10 appearance-none rounded-xl border border-app-border bg-app-surface pl-3 pr-9 text-[13px] font-bold text-app-text outline-none focus:border-app-primary">
                  {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-secondary" />
              </label>
            </div>

            {error ? (
              <div className="rounded-2xl border border-app-danger/30 bg-app-danger-bg px-4 py-6 text-center text-sm font-semibold text-app-danger">
                {error}
                <button type="button" onClick={loadTeachers} className="mt-2 block w-full font-black underline">Qayta urinish</button>
              </div>
            ) : !teachers ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-[260px] animate-pulse rounded-[24px] bg-app-surface" />)}</div>
            ) : !visible.length ? (
              <div className="flex flex-col items-center rounded-[24px] border border-dashed border-app-border bg-app-surface px-6 py-12 text-center shadow-app-soft">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-icon-bg text-app-primary-deep"><Users className="h-7 w-7" /></span>
                <p className="mt-3 text-lg font-black text-app-text">{teachers.length ? 'Mos ustoz topilmadi' : 'Ustozlar tez orada'}</p>
                <p className="mt-1 max-w-xs text-sm text-app-text-muted">{teachers.length ? 'Filtr yoki qidiruvni oʻzgartirib koʻring.' : 'Ustozlar tekshiruvdan oʻtib, shu yerda paydo boʻladi.'}</p>
                {(filterCount > 0 || query) && <button type="button" onClick={() => { clearFilters(); setQuery(''); }} className="mt-4 min-h-11 rounded-2xl bg-app-primary-deep px-5 text-sm font-black text-white">Hammasini koʻrsatish</button>}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {visible.map((t) => (
                  <TeacherCard key={t.user_id} teacher={t}
                    onOpen={() => navigate(teacherProfilePath(t.user_id))}
                    onBook={() => navigate(`${teacherProfilePath(t.user_id)}#jadval`)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
