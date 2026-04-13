import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, AlertTriangle, XCircle, Eye } from 'lucide-react';
import type { CheckResult } from '../../api/speaking';

type Props = {
  result: CheckResult;
  attempts: number;
  onNext: () => void;
  onRetry: () => void;
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
    Icon: AlertTriangle,
    label: "Qisman to'g'ri",
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
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

export default function SpeakingFeedback({ result, attempts, onNext, onRetry }: Props) {
  const [showAnswer, setShowAnswer] = useState(false);
  const config = STATUS_CONFIG[result.status];
  const { Icon } = config;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${config.border} ${config.bg} p-5`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
        <span className={`text-base font-bold ${config.textColor}`}>{config.label}</span>
      </div>

      {result.feedback && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{result.feedback}</p>
      )}

      {result.mistakes?.length > 0 && result.status !== 'correct' && (
        <div className="mt-3 space-y-2">
          {result.mistakes.map((m, i) => (
            <div key={i} className="rounded-xl bg-white/60 px-4 py-3">
              <p className="text-sm text-slate-800">
                <span className="font-semibold text-red-600">«{m.part}»</span>
                {' — '}{m.issue}
              </p>
              {m.hint_uz && (
                <p className="mt-1 text-sm text-blue-700">💡 {m.hint_uz}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {result.hint && result.status !== 'correct' && !result.mistakes?.length && (
        <div className="mt-3 rounded-xl bg-white/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maslahat</p>
          <p className="mt-1 text-sm text-slate-700">{result.hint}</p>
        </div>
      )}

      {result.status !== 'correct' && attempts >= 2 && (
        <div className="mt-3">
          {!showAnswer ? (
            <button
              type="button"
              onClick={() => setShowAnswer(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
            >
              <Eye className="h-4 w-4" />
              Javobni ko'rish
            </button>
          ) : (
            <div className="rounded-xl bg-white/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                To'g'ri javob
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{result.correct_answer}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        {result.status === 'correct' ? (
          <button
            type="button"
            onClick={onNext}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
          >
            Keyingisi
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Qayta urinish
            </button>
            {(attempts >= 2 || showAnswer) && (
              <button
                type="button"
                onClick={onNext}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
              >
                O'tkazish
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
