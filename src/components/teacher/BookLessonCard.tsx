/**
 * O'quvchi: o'qituvchi bilan pullik darsni band qilish va Rahmat orqali to'lash.
 * Vaqtlar o'qituvchi jadvalidan (uning vaqt zonasida), o'quvchiga o'z soatida ko'rsatiladi;
 * band vaqtlar chiqarib tashlanadi. Dars FalaRus video xonasida o'tadi.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, Loader2, Video } from 'lucide-react';
import { upcomingSlotStarts } from '../../../shared/teacherOnboarding';
import { bookLesson, fmtSum, getLessonSlots, type LessonSlots } from '../../api/teacherLessons';
import { openRahmatCheckout } from '../../api/rahmat';

const WEEKDAY = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTH = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const dayLabel = (d: Date) => `${WEEKDAY[d.getDay()]}, ${d.getDate()}-${MONTH[d.getMonth()]}`;
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function BookLessonCard({ teacherId, token }: { teacherId: number; token: string | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [slots, setSlots] = useState<LessonSlots | null>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getLessonSlots(teacherId).then(setSlots).catch(() => setSlots(null)); }, [teacherId]);

  // Kelgusi 2 hafta: bo'sh, kamida 1 soatdan keyin boshlanadigan vaqtlar, kunlar bo'yicha.
  const days = useMemo(() => {
    if (!slots?.schedule) return [];
    const taken = new Set(slots.busy.map((b) => new Date(b).getTime()));
    const from = Date.now() + slots.min_lead_minutes * 60_000;
    const out: { label: string; times: number[] }[] = [];
    for (const t of upcomingSlotStarts(slots.schedule, from, 14)) {
      if (taken.has(t)) continue;
      const label = dayLabel(new Date(t));
      const day = out.find((d) => d.label === label);
      if (day) day.times.push(t);
      else if (out.length < 7) out.push({ label, times: [t] });
    }
    return out;
  }, [slots]);

  if (!slots?.bookable || !slots.price_uzs) return null;

  const pay = async () => {
    if (!token) { navigate('/login', { state: { from: location.pathname } }); return; }
    if (!picked) return;
    setBusy(true); setError('');
    try {
      const lesson = await bookLesson(token, teacherId, new Date(picked).toISOString(), message.trim());
      await openRahmatCheckout({ token, productCode: 'teacher_lesson', lessonId: lesson.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      // Vaqtni boshqa o'quvchi olgan bo'lishi mumkin — ro'yxatni yangilaymiz.
      getLessonSlots(teacherId).then(setSlots).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-[24px] border border-app-border bg-app-surface p-5 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2563EB]"><CalendarCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-app-text">Dars band qilish</h2>
          <p className="mt-0.5 text-sm font-semibold text-app-text-muted">1 soat · {fmtSum(slots.price_uzs)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-app-text-secondary"><Video className="h-3.5 w-3.5" />Dars FalaRus video xonasida — hech narsa oʻrnatish shart emas</p>
        </div>
      </div>

      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[#2563EB] text-base font-extrabold text-white transition active:scale-[0.98]">
          Vaqt tanlash
        </button>
      ) : !days.length ? (
        <p className="mt-4 rounded-2xl bg-app-bg-subtle p-4 text-center text-sm font-semibold text-app-text-muted">Yaqin 2 haftada boʻsh vaqt yoʻq. Keyinroq qarang yoki ustozga yozing.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-app-text-muted">Vaqtlar sizning soatingiz boʻyicha.</p>
          {days.map((d) => (
            <div key={d.label}>
              <p className="text-xs font-extrabold uppercase tracking-wide text-app-text-secondary">{d.label}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {d.times.map((t) => (
                  <button key={t} type="button" aria-pressed={picked === t} onClick={() => setPicked(picked === t ? null : t)}
                    className={`flex min-h-11 min-w-[64px] items-center justify-center rounded-xl border-2 px-3 text-sm font-bold transition active:scale-[0.97] ${picked === t ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-app-border bg-app-surface text-app-text hover:border-[#2563EB]'}`}>
                    {hm(new Date(t))}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={500} placeholder="Ustozga izoh (ixtiyoriy): darajangiz, maqsadingiz"
            className="w-full rounded-2xl border border-app-border bg-app-surface px-3.5 py-3 text-sm text-app-text outline-none focus:border-[#2563EB]" />
          {error && <p role="alert" className="rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">{error}</p>}
          <button type="button" disabled={!picked || busy} onClick={() => void pay()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2563EB] text-base font-extrabold text-white transition active:scale-[0.98] disabled:opacity-50">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : `Toʻlash — ${fmtSum(slots.price_uzs)}`}
          </button>
          <p className="text-center text-xs font-medium text-app-text-secondary">Rahmat orqali (Click, Payme, Uzum va boshqalar). Toʻlanmagan bron 30 daqiqada bekor boʻladi.</p>
        </div>
      )}
    </section>
  );
}
