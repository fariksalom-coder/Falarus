import { Check } from 'lucide-react';

const BORDER = '#E2E8F0';
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
  /** Цена за месяц — число (напр. "99 000" или "~25 000") */
  pricePerMonth?: string;
  /** Единица к цене за месяц, мельче (напр. "so'm/oy") */
  pricePerMonthUnit?: string;
  /** Обычная цена за месяц, зачёркнутая (напр. "250 000 so'm/oy") */
  originalPerMonth?: string;
  /** Подпись под ценой (напр. "yillik to'lovda") */
  periodLabel?: string;
  /** Итоговая старая сумма за период, зачёркнутая (напр. "3 000 000 so'm") */
  totalOriginal?: string;
  onSelect?: () => void;
  /** When true, hide purchase button and show "To'lov tekshirilmoqda" (pending) */
  purchaseDisabled?: boolean;
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
  originalPerMonth,
  periodLabel,
  totalOriginal,
  onSelect,
  purchaseDisabled = false,
}: PricingCardProps) {
  const useNewStructure = pricePerMonth != null;

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl border bg-white p-6
        transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        ${highlighted ? 'shadow-lg ring-2 md:scale-[1.03]' : 'shadow-sm'}
      `}
      style={{
        borderColor: highlighted ? PRIMARY : BORDER,
        padding: '28px',
        ...(highlighted && { boxShadow: '0 20px 40px -12px rgba(99, 102, 241, 0.25)' }),
      }}
    >
      {badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-md"
          style={{ backgroundColor: '#f59e0b' }}
        >
          {badge}
        </div>
      )}

      <h3 className="text-center text-xl font-bold" style={{ color: TEXT }}>
        {duration}
      </h3>

      {useNewStructure ? (
        <>
          {/* Сверху: старая цена зачёркнутая, снизу: новая цена */}
          {originalPerMonth && (
            <p className="mt-3 text-center text-base text-slate-400 line-through">
              {originalPerMonth}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-baseline justify-center gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {pricePerMonth}
            </span>
            {pricePerMonthUnit && (
              <span className="text-lg font-semibold text-slate-500">
                {pricePerMonthUnit}
              </span>
            )}
          </div>
          {periodLabel && (
            <p className="mt-1 text-center text-sm text-slate-600">
              {periodLabel}
            </p>
          )}
        </>
      ) : (
        <div className="mb-2 mt-2">
          <p className="text-3xl font-extrabold tracking-tight" style={{ color: TEXT }}>
            {price}
          </p>
          {description && (
            <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
              {description}
            </p>
          )}
        </div>
      )}

      <ul className="mb-6 mt-5 flex-1 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm" style={{ color: TEXT }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* Итоги сверху кнопки: ~~старая сумма~~ новая сумма */}
      {useNewStructure && (totalOriginal != null || price) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-center gap-2">
          {totalOriginal != null && (
            <span className="text-sm text-slate-400 line-through">
              {totalOriginal}
            </span>
          )}
          <span className="text-lg font-bold text-slate-900">
            {price}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={purchaseDisabled ? undefined : onSelect}
        disabled={purchaseDisabled}
        className={`w-full rounded-xl py-3.5 text-base font-semibold transition-all duration-200 ${
          purchaseDisabled
            ? 'cursor-not-allowed bg-slate-300 text-slate-600'
            : highlighted
              ? 'text-white py-4 text-lg font-bold shadow-lg ring-2 ring-white/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
              : 'text-white hover:opacity-90 active:scale-[0.98]'
        }`}
        style={
          purchaseDisabled
            ? {}
            : {
                backgroundColor: highlighted ? '#f59e0b' : PRIMARY,
                ...(highlighted && { boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)' }),
              }
        }
      >
        {purchaseDisabled ? "To'lov tekshirilmoqda" : buttonLabel}
      </button>
    </div>
  );
}
