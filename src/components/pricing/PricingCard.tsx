import { Check } from 'lucide-react';

const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const PRIMARY = '#6366F1';

export type PricingCardProps = {
  duration: string;
  price: string;
  description: string;
  features: string[];
  buttonLabel: string;
  highlighted?: boolean;
  badge?: string;
  onSelect?: () => void;
};

export default function PricingCard({
  duration,
  price,
  description,
  features,
  buttonLabel,
  highlighted = false,
  badge,
  onSelect,
}: PricingCardProps) {
  return (
    <div
      className={`
        relative flex flex-col rounded-[20px] border bg-white p-6
        transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        ${highlighted ? 'shadow-lg md:scale-[1.02]' : 'shadow-sm'}
      `}
      style={{
        borderColor: highlighted ? PRIMARY : BORDER,
        borderWidth: highlighted ? 2 : 1,
        padding: '24px',
      }}
    >
      {badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: '#f59e0b' }}
        >
          {badge}
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ color: TEXT }}>
          {duration}
        </h3>
        <p className="mt-2 text-3xl font-bold" style={{ color: TEXT }}>
          {price}
        </p>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          {description}
        </p>
      </div>
      <ul className="mb-6 flex-1 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm" style={{ color: TEXT }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSelect}
        className="w-full rounded-xl py-3 font-semibold text-white transition-all duration-200 hover:opacity-90"
        style={{ backgroundColor: PRIMARY }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
