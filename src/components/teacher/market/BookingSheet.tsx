/**
 * Vaqt tanlangandan keyin: dars tafsilotlari → Rahmat orqali to'lash → band qilindi.
 * To'lov yangi oynada ochiladi; shu oyna esa darsning holatini kuzatib turadi va
 * to'lov tasdiqlanishi bilan «Dars band qilindi» ni ko'rsatadi.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { CalendarCheck, CheckCircle2, Clock, Loader2, Video, X } from 'lucide-react';
import { bookLesson, fmtSum, getMyLessons } from '../../../api/teacherLessons';
import { openRahmatCheckout } from '../../../api/rahmat';
import type { MarketTeacher } from '../../../api/teacherMarket';
import { TeacherPhoto, fullDate, hm } from './parts';

type Phase = { kind: 'confirm' } | { kind: 'waiting'; lessonId: number } | { kind: 'done' };

export default function BookingSheet({ teacher, startsAt, token, onClose, onBooked, onSlotTaken }: {
  teacher: MarketTeacher;
  startsAt: string;
  token: string;
  onClose: () => void;
  /** To'lov tasdiqlandi — «Mening darslarim» ga o'tish. */
  onBooked: () => void;
  /** Vaqtni boshqa o'quvchi olib qo'ydi — jadvalni yangilash kerak. */
  onSlotTaken: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const name = `${teacher.first_name} ${teacher.last_name}`.trim();
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + teacher.lesson_minutes * 60_000);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // To'lov oynasi ochilgach: dars «to'langan» bo'lguncha har 4 soniyada tekshiramiz.
  useEffect(() => {
    if (phase.kind !== 'waiting') return;
    let stop = false;
    const tick = async () => {
      const rows = await getMyLessons(token).catch(() => []);
      const l = rows.find((x) => x.id === phase.lessonId);
      if (stop) return;
      if (l && (l.status === 'paid' || l.status === 'completed')) setPhase({ kind: 'done' });
      else if (l && l.status === 'cancelled') { setError('Vaqt band boʻlib qoldi — pul qaytariladi. Boshqa vaqtni tanlang.'); setPhase({ kind: 'confirm' }); }
    };
    const id = window.setInterval(() => void tick(), 4000);
    window.addEventListener('focus', tick);
    return () => { stop = true; window.clearInterval(id); window.removeEventListener('focus', tick); };
  }, [phase, token]);

  const pay = async () => {
    setBusy(true); setError('');
    try {
      const lesson = await bookLesson(token, teacher.user_id, startsAt, message.trim());
      await openRahmatCheckout({ token, productCode: 'teacher_lesson', lessonId: lesson.id });
      setPhase({ kind: 'waiting', lessonId: lesson.id });
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Xatolik';
      setError(text);
      if (/band qildi|jadvalida yoʻq/.test(text)) onSlotTaken();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <motion.div role="dialog" aria-modal="true" aria-label="Darsni band qilish" onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-app-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-app-text">{phase.kind === 'done' ? 'Dars band qilindi' : 'Darsga yozilish'}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full text-app-text-muted hover:bg-app-bg-subtle"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-app-bg-subtle p-3">
          <TeacherPhoto url={teacher.avatar_url} name={name} className="h-14 w-14 rounded-2xl" />
          <div className="min-w-0">
            <p className="truncate font-black text-app-text">{name}</p>
            <p className="text-sm font-semibold text-app-text-muted">Rus tili · {teacher.lesson_minutes} daqiqa</p>
          </div>
        </div>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5 text-app-text"><CalendarCheck className="h-4 w-4 text-app-primary" /><dt className="sr-only">Sana</dt><dd className="font-bold">{fullDate(startsAt)}</dd></div>
          <div className="flex items-center gap-2.5 text-app-text"><Clock className="h-4 w-4 text-app-primary" /><dt className="sr-only">Vaqt</dt><dd className="font-bold tabular-nums">{hm(start)} – {hm(end)} <span className="font-medium text-app-text-muted">(sizning vaqtingiz)</span></dd></div>
          <div className="flex items-center gap-2.5 text-app-text"><Video className="h-4 w-4 text-app-primary" /><dt className="sr-only">Joy</dt><dd className="font-medium">FalaRus video xonasida — hech narsa oʻrnatish shart emas</dd></div>
        </dl>

        {phase.kind === 'confirm' && (
          <>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={500}
              placeholder="Ustozga izoh (ixtiyoriy): darajangiz, maqsadingiz"
              className="mt-4 w-full rounded-2xl border border-app-border bg-app-surface px-3.5 py-3 text-sm text-app-text outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/15" />
            <div className="mt-4 flex items-center justify-between border-t border-app-border pt-4">
              <span className="text-sm font-semibold text-app-text-muted">Jami</span>
              <span className="text-xl font-black tabular-nums text-app-text">{teacher.price_uzs ? fmtSum(teacher.price_uzs) : '—'}</span>
            </div>
            {error && <p role="alert" className="mt-3 rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">{error}</p>}
            <button type="button" disabled={busy} onClick={() => void pay()}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-app-primary-deep text-base font-black text-white shadow-app-soft transition active:scale-[0.98] disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Rahmat orqali toʻlash'}
            </button>
            <p className="mt-2 text-center text-xs font-medium text-app-text-secondary">Click, Payme, Uzum va kartalar. Vaqt 30 daqiqa siz uchun band turadi.</p>
          </>
        )}

        {phase.kind === 'waiting' && (
          <div className="mt-5 rounded-2xl border border-app-border p-4 text-center" role="status">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-app-primary" />
            <p className="mt-2 font-bold text-app-text">Toʻlov kutilmoqda</p>
            <p className="mt-1 text-sm text-app-text-muted">Ochilgan oynada toʻlovni tugating va shu yerga qayting — dars avtomatik band boʻladi.</p>
            <button type="button" disabled={busy} onClick={() => void pay()} className="mt-3 min-h-11 text-sm font-bold text-app-primary underline-offset-2 hover:underline">
              Toʻlov oynasini qayta ochish
            </button>
          </div>
        )}

        {phase.kind === 'done' && (
          <div className="mt-5 text-center" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="mt-2 text-base font-black text-app-text">Toʻlov qabul qilindi</p>
            <p className="mt-1 text-sm text-app-text-muted">Dars «Mening darslarim» boʻlimida. Ustozga u yerdan yozishingiz mumkin, xona dars boshlanishidan 10 daqiqa oldin ochiladi.</p>
            <button type="button" onClick={onBooked}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-app-primary-deep text-base font-black text-white transition active:scale-[0.98]">
              Mening darslarim
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
