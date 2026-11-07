import { motion } from 'motion/react';
import { Check, Loader2, X } from 'lucide-react';
import { optionLetter } from '../../../shared/teacherTests';

/**
 * Bitta test savoli: katta variant tugmalari (A, B, V, G…). Javob tanlangach — darhol rang:
 * to'g'ri bo'lsa yashil, noto'g'ri bo'lsa qizil va to'g'ri varianti yashil bilan ko'rsatiladi,
 * ostida o'qituvchining izohi. Dars doskasida (to'q fon) ham, uy vazifasida (oq fon) ham ishlatiladi.
 */
export type QuestionAnswer = { choice: number; correct?: boolean; right?: number; explanation?: string };

export default function QuestionCard({
  index, total, text, options, answer, onChoose, disabled = false, tone = 'light', teacherRight = null, busy = false,
}: {
  index: number;
  total: number;
  text: string;
  options: string[];
  /** Berilgan javob (bo'lmasa — hali javob berilmagan). */
  answer: QuestionAnswer | null;
  onChoose?: (choice: number) => void;
  disabled?: boolean;
  tone?: 'light' | 'dark';
  /** O'qituvchiga: to'g'ri variant oldindan belgilanadi (o'quvchi ko'rmaydi). */
  teacherRight?: number | null;
  /** Javob yuborilmoqda. */
  busy?: boolean;
}) {
  const dark = tone === 'dark';
  const checked = answer?.correct !== undefined;
  const locked = disabled || Boolean(answer);
  return (
    <div className={`w-full max-w-[640px] rounded-[24px] p-4 sm:p-6 ${dark ? 'bg-white text-[#0F172A]' : 'border border-app-border bg-app-surface text-app-text shadow-[0_14px_34px_rgba(148,163,184,0.12)]'}`}>
      <p className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-[#2563EB]">Savol {index + 1} / {total}</p>
      <h2 className="mt-1.5 whitespace-pre-wrap text-[19px] font-extrabold leading-snug sm:text-[22px]">{text}</h2>
      <div className="mt-4 grid gap-2.5">
        {options.map((opt, i) => {
          const chosen = answer?.choice === i;
          const isRight = checked ? answer!.right === i : teacherRight === i;
          const wrongPick = checked && chosen && !answer!.correct;
          const state = wrongPick ? 'wrong' : checked && isRight ? 'right' : chosen ? 'chosen' : teacherRight === i ? 'hint' : 'idle';
          const cls = {
            idle: 'border-[#E2E8F0] bg-white hover:border-[#93C5FD] hover:bg-[#F8FAFF]',
            chosen: 'border-[#2563EB] bg-[#EFF6FF]',
            right: 'border-[#16A34A] bg-[#F0FDF4]',
            wrong: 'border-[#EF4444] bg-[#FEF2F2]',
            hint: 'border-dashed border-[#16A34A] bg-white',
          }[state];
          const badge = {
            idle: 'bg-[#F1F5F9] text-[#334155]',
            chosen: 'bg-[#2563EB] text-white',
            right: 'bg-[#16A34A] text-white',
            wrong: 'bg-[#EF4444] text-white',
            hint: 'bg-[#DCFCE7] text-[#166534]',
          }[state];
          return (
            <motion.button
              key={i}
              type="button"
              whileTap={locked ? undefined : { scale: 0.98 }}
              disabled={locked}
              onClick={() => onChoose?.(i)}
              aria-pressed={chosen}
              className={`flex min-h-[56px] w-full items-center gap-3 rounded-[16px] border-2 px-3 py-2.5 text-left transition disabled:cursor-default ${cls}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[15px] font-black ${badge}`}>{optionLetter(i)}</span>
              <span className="min-w-0 flex-1 text-[16px] font-bold leading-snug text-[#0F172A]">{opt}</span>
              {state === 'right' ? <Check className="h-5 w-5 shrink-0 text-[#16A34A]" /> : null}
              {state === 'wrong' ? <X className="h-5 w-5 shrink-0 text-[#EF4444]" /> : null}
              {state === 'chosen' && busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#2563EB]" /> : null}
            </motion.button>
          );
        })}
      </div>
      {checked ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className={`mt-4 rounded-[16px] px-4 py-3 ${answer!.correct ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#FEF2F2] text-[#991B1B]'}`}
        >
          <p className="text-[16px] font-black">{answer!.correct ? 'Toʻgʻri! 🎉' : `Notoʻgʻri — toʻgʻri javob: ${optionLetter(answer!.right ?? 0)}`}</p>
          {answer!.explanation ? <p className="mt-1 whitespace-pre-wrap text-[14px] font-semibold leading-relaxed text-[#334155]">{answer!.explanation}</p> : null}
        </motion.div>
      ) : answer ? (
        <p className="mt-4 flex items-center gap-2 text-[14px] font-bold text-[#64748B]"><Loader2 className="h-4 w-4 animate-spin" /> Tekshirilmoqda…</p>
      ) : null}
    </div>
  );
}
