import { useEffect, useMemo, useState } from 'react';
import { Clock, Lock, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyMeetLessons, type StudentMeetLesson } from '../../api/meet';
import { useAuth } from '../../context/AuthContext';

const WEEKDAY_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTH_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

function formatLessonTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return `Bugun ${hm}`;
  return `${WEEKDAY_UZ[d.getDay()]}, ${d.getDate()}-${MONTH_UZ[d.getMonth()]} ${hm}`;
}

/** "2 kun 3 soat", "45 daqiqa" ko'rinishidagi qolgan vaqt. */
function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} kun ${hours} soat`;
  if (hours > 0) return `${hours} soat ${minutes} daqiqa`;
  return `${minutes} daqiqa`;
}

/**
 * O'quvchi ko'radigan video darslar. Faqat o'zi yozilgan o'qituvchining
 * darslari ko'rinadi va "Kirish" tugmasi faqat belgilangan vaqtda faollashadi.
 */
export default function StudentMeetLessons() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<StudentMeetLesson[]>([]);
  const [loading, setLoading] = useState(true);
  // Sanoq har daqiqada yangilanadi, tugma o'z vaqtida o'zi faollashadi.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let mounted = true;
    getMyMeetLessons(token)
      .then((data) => mounted && setLessons(data.lessons ?? []))
      .catch(() => mounted && setLessons([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const visible = useMemo(
    () =>
      lessons
        .filter((l) => new Date(l.closes_at).getTime() > now)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [lessons, now],
  );

  if (loading || visible.length === 0) return null;

  return (
    <section className="mb-4 rounded-[22px] border border-app-border bg-app-surface p-4 shadow-app-soft">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-app-text">
        <Video className="h-5 w-5 text-app-primary-deep" /> Video darslar
      </h2>
      <div className="space-y-2.5">
        {visible.map((lesson) => {
          const opensAt = new Date(lesson.opens_at).getTime();
          const open = now >= opensAt;
          return (
            <div key={lesson.id} className="rounded-2xl bg-app-bg-muted p-3.5">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    open ? 'bg-app-success-bg text-app-success' : 'bg-app-surface text-app-text-secondary'
                  }`}
                >
                  <Clock className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-black text-app-text">
                    {formatLessonTime(lesson.starts_at)}
                  </p>
                  <p className="truncate text-[12px] font-medium text-app-text-muted">
                    {lesson.teacher_name}
                    {lesson.title ? ` · ${lesson.title}` : ''}
                  </p>
                  <p className="text-[11px] font-medium text-app-text-secondary">
                    {lesson.duration_minutes} daqiqa
                  </p>
                </div>
              </div>

              {open ? (
                <Link
                  to={`/dars/s/${lesson.id}`}
                  className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-app-success px-4 py-3 text-sm font-black text-white transition active:scale-95"
                >
                  <Video className="h-4 w-4" /> Darsga kirish
                </Link>
              ) : (
                <div
                  className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-app-surface px-4 py-3 text-sm font-black text-app-text-secondary ring-1 ring-app-border"
                  aria-disabled="true"
                >
                  <Lock className="h-4 w-4" />
                  {formatRemaining(opensAt - now)} qoldi
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
