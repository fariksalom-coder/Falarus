/** O'quvchi darsdan keyin ustozni 4 mezon bo'yicha baholaydi va izoh yozadi. */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Loader2, Star, X } from 'lucide-react';
import { REVIEW_CRITERIA, REVIEW_TEXT_MAX, type ReviewCriterion } from '../../../../shared/teacherLessons';
import { reviewLesson } from '../../../api/teacherMarket';

const STAR_WORD = ['', 'Juda yomon', 'Yomon', 'Oʻrtacha', 'Yaxshi', 'Aʼlo'];

export default function ReviewDialog({ token, lessonId, teacherName, onClose, onDone }: {
  token: string; lessonId: number; teacherName: string; onClose: () => void; onDone: () => void;
}) {
  const [scores, setScores] = useState<Partial<Record<ReviewCriterion, number>>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const complete = REVIEW_CRITERIA.every((c) => scores[c.key]);

  const send = async () => {
    if (!complete) { setError('Har bir mezonga baho qoʻying'); return; }
    setBusy(true); setError('');
    try {
      await reviewLesson(token, lessonId, scores as Record<ReviewCriterion, number>, comment.trim());
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <motion.div role="dialog" aria-modal="true" aria-label="Darsni baholash" onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-app-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-black text-app-text">Darsni baholang</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full text-app-text-muted hover:bg-app-bg-subtle"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-app-text-muted">{teacherName} · bahoingiz boshqa oʻquvchilarga ustoz tanlashda yordam beradi</p>

        <ul className="mt-4 space-y-3">
          {REVIEW_CRITERIA.map((c) => (
            <li key={c.key} className="rounded-2xl border border-app-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-black text-app-text">{c.uz}</p>
                <span className="text-xs font-semibold text-app-text-muted">{STAR_WORD[scores[c.key] ?? 0]}</span>
              </div>
              <p className="text-xs text-app-text-secondary">{c.hint}</p>
              <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label={c.uz}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={scores[c.key] === n} aria-label={`${n} — ${STAR_WORD[n]}`}
                    onClick={() => setScores((s) => ({ ...s, [c.key]: n }))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-90">
                    <Star className={`h-7 w-7 ${n <= (scores[c.key] ?? 0) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={REVIEW_TEXT_MAX}
          placeholder="Dars haqida bir-ikki gap (ixtiyoriy): nima yoqdi, nima foydali boʻldi"
          className="mt-4 w-full rounded-2xl border border-app-border bg-app-surface px-3.5 py-3 text-sm text-app-text outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/15" />
        {error && <p role="alert" className="mt-3 rounded-2xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">{error}</p>}
        <button type="button" disabled={busy || !complete} onClick={() => void send()}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-app-primary-deep text-base font-black text-white transition active:scale-[0.98] disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Bahoni yuborish'}
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}
