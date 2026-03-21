import { safePercent } from '../progressModel';

type Props = {
  learned: number;
  total: number;
  /** Напр. «so'z o'rganildi» */
  suffix?: string;
  className?: string;
  barClassName?: string;
};

export function LearnedWordsBar({
  learned,
  total,
  suffix = "so'z o'rganildi",
  className = '',
  barClassName = '',
}: Props) {
  const pct = safePercent(learned, total);
  const width = total > 0 ? Math.max(pct, 2) : 0;

  return (
    <div className={className}>
      <p className="text-sm text-slate-600">
        <span className="font-semibold tabular-nums text-slate-900">
          {learned.toLocaleString()}
        </span>
        {' / '}
        <span className="tabular-nums">{total.toLocaleString()}</span>
        {suffix ? ` ${suffix}` : null}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-indigo-600 transition-all duration-500 ${barClassName}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
