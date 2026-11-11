/**
 * O'QUVCHI: USTOZ PROFILI (2026-10-24).
 *
 * Tartib: asosiy ma'lumot (surat, ism, narx) va «Vaqt tanlash» → video-taqdimot → men haqimda, tillar,
 * yo'nalishlar, ta'lim → baholar (4 mezon) va sharhlar → 7 kunlik jadval (bugundan).
 * Vaqt tanlanganda BookingSheet: tafsilot → Rahmat → band qilindi.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fmtSum } from '../api/teacherLessons';
import { getMarketTeacher, type MarketTeacherDetail } from '../api/teacherMarket';
import { slotLabel } from '../components/teacher/market/parts';
import BookingSheet from '../components/teacher/market/BookingSheet';
import TeacherProfileView from '../components/teacher/market/TeacherProfileView';
import { TEACHERS_LIST_PATH } from '../constants/teacherPaths';

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
    if (!Number.isInteger(id) || id <= 0) { setError('Oʻqituvchi topilmadi'); return; }
    if (!token) return;
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
          <div className="h-48 animate-pulse rounded-[24px] bg-app-surface" />
          <div className="aspect-video animate-pulse rounded-[24px] bg-app-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-app-bg-subtle px-4 pb-28 pt-2 lg:pb-10">
      <main className="mx-auto w-full max-w-[880px] space-y-4">
        <button type="button" onClick={back} className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-bold text-app-text-muted hover:text-app-text">
          <ArrowLeft className="h-4 w-4" />Ustozlar
        </button>

        <TeacherProfileView t={t} token={token} onPick={setPicked} onToSchedule={toSchedule} />
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
