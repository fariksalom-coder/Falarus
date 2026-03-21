type VocabularyProgressBarProps = {
  learned: number;
  total: number;
  className?: string;
  barClassName?: string;
  trackClassName?: string;
};

export function VocabularyProgressBar({
  learned,
  total,
  className = '',
  barClassName = '',
  trackClassName = 'bg-slate-100',
}: VocabularyProgressBarProps) {
  const safeTotal = Math.max(0, total);
  const safeLearned =
    safeTotal > 0 ? Math.min(Math.max(0, learned), safeTotal) : Math.max(0, learned);
  const pct = safeTotal > 0 ? Math.round((safeLearned / safeTotal) * 100) : 0;
  const widthPct = safeTotal > 0 ? Math.max(pct, learned > 0 ? 2 : 0) : 0;

  return (
    <div className={className}>
      <div className={`h-1.5 w-full overflow-hidden rounded-full ${trackClassName}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
          style={{
            width: `${widthPct}%`,
            backgroundColor: '#6366F1',
          }}
        />
      </div>
    </div>
  );
}
