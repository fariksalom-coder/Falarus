import { motion } from 'motion/react';
import { CheckCircle, XCircle, SkipForward } from 'lucide-react';
import { isPassingStatus, type CheckResult } from '../../api/speaking';
import { SPEAKING_ATTEMPTS_BEFORE_SKIP } from '../../../shared/dailyCourseDay';

/**
 * «To'g'ri javob» endi FAQAT AI taklifi bo'lishi mumkin (2-xatodan boshlab).
 * Bazadagi etalon javob bu yerga umuman kelmaydi — tekshiruv ham, ko'rsatish
 * ham unga tayanmaydi.
 *
 * 2 marta xato bo'lgach o'quvchi tuzoqda qolmaydi: to'g'ri javob ko'rsatiladi
 * va «O'tkazish» tugmasi chiqadi — bosilganda keyingi topshiriqqa o'tadi.
 */
type Props = {
  result: CheckResult;
  attempts: number;
  onNext: () => void;
  onRetry: () => void;
  /** Oxirgi topshiriqda tugma «Yakunlash» bo'lsin. */
  isLast?: boolean;
};

const STATUS_CONFIG = {
  correct: {
    Icon: CheckCircle,
    label: "To'g'ri!",
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-800',
  },
  partial: {
    Icon: CheckCircle,
    label: "To'g'ri (yaxshilash mumkin)",
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-800',
  },
  wrong: {
    Icon: XCircle,
    label: "Noto'g'ri",
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
  },
};

export default function SpeakingFeedback({ result, attempts, onNext, onRetry, isLast = false }: Props) {
  const config = STATUS_CONFIG[result.status];
  const { Icon } = config;
  const passing = isPassingStatus(result.status);
  const correctAnswer = result.correct_answer.trim();
  // 2 marta xato — javobni ko'rsatib, «O'tkazish» tugmasini beramiz.
  const canSkip = !passing && attempts >= SPEAKING_ATTEMPTS_BEFORE_SKIP;
  const attemptsLeft = Math.max(0, SPEAKING_ATTEMPTS_BEFORE_SKIP - attempts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${config.border} ${config.bg} p-5`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
        <span className={`text-base font-bold ${config.textColor}`}>{config.label}</span>
        {!passing && attemptsLeft > 0 && (
          <span className="ml-auto rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-slate-500">
            Yana {attemptsLeft} urinish
          </span>
        )}
      </div>

      {result.feedback && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{result.feedback}</p>
      )}

      {result.error_explanation && result.status !== 'correct' && (
        <div className="mt-3 rounded-xl bg-white/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Xato</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{result.error_explanation}</p>
        </div>
      )}

      {result.mistakes?.length > 0 && result.status !== 'correct' && (
        <div className="mt-3 space-y-2">
          {result.mistakes.map((m, i) => (
            <div key={i} className="rounded-xl bg-white/60 px-4 py-3">
              <p className="text-sm text-slate-800">
                {m.part ? (
                  <>
                    <span className={`font-semibold ${result.status === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>«{m.part}»</span>
                    {' — '}
                  </>
                ) : null}
                {m.issue}
              </p>
              {m.hint_uz && (
                <p className="mt-1 text-sm text-blue-700">💡 {m.hint_uz}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {result.hint && result.status !== 'correct' && (
        <div className="mt-3 rounded-xl bg-white/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maslahat</p>
          <p className="mt-1 text-sm text-slate-700">{result.hint}</p>
        </div>
      )}

      {!passing && correctAnswer && (
        <div className="mt-3 rounded-xl bg-white/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            To'g'ri javob
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{correctAnswer}</p>
        </div>
      )}

      {canSkip && (
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Bu gapni ovoz chiqarib takrorlang, keyin davom eting.
        </p>
      )}

      <div className="mt-4 flex gap-3">
        {passing ? (
          <>
            <button
              type="button"
              onClick={onNext}
              className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
            >
              {isLast ? 'Yakunlash' : 'Keyingisi'}
            </button>
            {result.status === 'partial' && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
              >
                Qayta urinish
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Qayta urinish
            </button>
            {canSkip && (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0B2A6B] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(11,42,107,0.3)] transition-colors hover:bg-[#071B5E]"
              >
                {isLast ? 'Yakunlash' : "O'tkazish"}
                <SkipForward className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
