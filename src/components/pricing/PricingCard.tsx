import { Check } from 'lucide-react';

const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const PRIMARY = '#6366F1';

export type PricingCardProps = {
  duration: string;
  price: string;
  description?: string;
  features: string[];
  buttonLabel: string;
  highlighted?: boolean;
  badge?: string;
  /** Asosiy narx (katta raqam + birlik), masalan butun davr uchun */
  pricePerMonth?: string;
  pricePerMonthUnit?: string;
  /** Ilgari narxi — chiziq bilan (masalan «250 000 so'm») */
  compareAtPrice?: string;
  /** Yana eskiroq narx (kichik, compareAtPrice ustida). */
  topCompareAtPrice?: string;
  /** Ilgari narxdan chegirma foizi (masalan 60) */
  discountPercent?: number;
  onSelect?: () => void;
  /** When true, hide purchase button and show "To'lov tekshirilmoqda" (pending) */
  purchaseDisabled?: boolean;
  purchaseDisabledLabel?: string;
};

export default function PricingCard({
  duration,
  price,
  description,
  features,
  buttonLabel,
  highlighted = false,
  badge,
  pricePerMonth,
  pricePerMonthUnit,
  compareAtPrice,
  topCompareAtPrice,
  discountPercent,
  onSelect,
  purchaseDisabled = false,
  purchaseDisabledLabel = "To'lov tekshirilmoqda",
}: PricingCardProps) {
  const useNewStructure = pricePerMonth != null;

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl border p-6
        transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        ${
          highlighted
            ? 'border-emerald-400/90 bg-gradient-to-b from-emerald-50/[0.97] via-white to-white shadow-lg shadow-emerald-200/45 ring-2 ring-emerald-400/30 md:scale-[1.03] md:hover:shadow-emerald-300/50'
            : 'border-slate-200 bg-white shadow-sm hover:shadow-lg'
        }
      `}
      style={{ padding: '28px' }}
    >
      {badge && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-md ${
            highlighted
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-600/35'
              : 'bg-amber-500'
          }`}
        >
          {badge}
        </div>
      )}

      <h3
        className={`text-center text-xl font-bold ${highlighted ? 'text-emerald-950' : ''}`}
        style={highlighted ? undefined : { color: TEXT }}
      >
        {duration}
      </h3>

      <ul className="mb-4 mt-6 flex-1 space-y-3">
        {features.map((f, i) => (
          <li
            key={i}
            className={`flex items-center gap-2.5 text-sm ${highlighted ? 'text-emerald-950' : ''}`}
            style={highlighted ? undefined : { color: TEXT }}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                highlighted ? 'bg-emerald-200/80 text-emerald-800' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {useNewStructure ? (
        <div
          className={`mb-5 mt-1 border-t pt-5 ${highlighted ? 'border-emerald-100/90' : 'border-slate-100'}`}
        >
          {topCompareAtPrice ? (
            <p className="text-center text-lg font-semibold text-slate-400 line-through decoration-slate-400 decoration-2">
              {topCompareAtPrice}
            </p>
          ) : null}
          {compareAtPrice ? (
            <p className="text-center text-lg font-semibold text-slate-400 line-through decoration-slate-400 decoration-2">
              {compareAtPrice}
            </p>
          ) : null}
          {discountPercent != null ? (
            <p className="mt-2 flex justify-center">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
                  highlighted
                    ? 'bg-emerald-200/90 text-emerald-950 ring-1 ring-emerald-400/40'
                    : 'bg-blue-50 text-blue-800 ring-1 ring-blue-200/80'
                }`}
              >
                −{discountPercent}% chegirma
              </span>
            </p>
          ) : null}
          <div
            className={`flex flex-wrap items-baseline justify-center gap-2 ${
              compareAtPrice || discountPercent != null ? 'mt-2' : ''
            }`}
          >
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                highlighted ? 'text-emerald-900' : 'text-slate-900'
              }`}
            >
              {pricePerMonth}
            </span>
            {pricePerMonthUnit && (
              <span
                className={`text-lg font-semibold ${highlighted ? 'text-emerald-700/90' : 'text-slate-600'}`}
              >
                {pricePerMonthUnit}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-5 mt-1 border-t border-slate-100 pt-5">
          <p className="text-center text-3xl font-extrabold tracking-tight" style={{ color: TEXT }}>
            {price}
          </p>
          {description && (
            <p className="mt-1 text-center text-sm" style={{ color: TEXT_SECONDARY }}>
              {description}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={purchaseDisabled ? undefined : onSelect}
        disabled={purchaseDisabled}
        aria-label={useNewStructure ? `${buttonLabel}, ${price}` : undefined}
        className={`w-full rounded-xl py-3.5 text-base font-semibold transition-all duration-200 ${
          purchaseDisabled
            ? 'cursor-not-allowed bg-slate-300 text-slate-600'
            : highlighted
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-600/35 ring-2 ring-white/25 hover:from-emerald-500 hover:to-green-500 hover:shadow-xl hover:shadow-emerald-600/40 hover:scale-[1.02] active:scale-[0.98]'
              : 'text-white hover:opacity-90 active:scale-[0.98]'
        }`}
        style={
          purchaseDisabled
            ? {}
            : highlighted
              ? {}
              : { backgroundColor: PRIMARY }
        }
      >
        {purchaseDisabled ? purchaseDisabledLabel : buttonLabel}
      </button>
    </div>
  );
}
