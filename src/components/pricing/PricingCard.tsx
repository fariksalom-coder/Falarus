import { Check } from 'lucide-react';

export type PricingCardProps = {
  duration: string;
  price: string;
  description?: string;
  features: string[];
  buttonLabel: string;
  highlighted?: boolean;
  badge?: string;
  pricePerMonth?: string;
  pricePerMonthUnit?: string;
  compareAtPrice?: string;
  topCompareAtPrice?: string;
  discountPercent?: number;
  onSelect?: () => void;
  purchaseDisabled?: boolean;
  purchaseDisabledLabel?: string;
};

function CompareAtRow({
  compareAtPrice,
  discountPercent,
}: {
  compareAtPrice?: string;
  discountPercent?: number;
}) {
  if (!compareAtPrice && discountPercent == null) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2.5">
      {compareAtPrice ? (
        <div
          className="inline-flex items-center gap-2 rounded-[14px] px-3.5 py-2 shadow-[0_10px_22px_-8px_rgba(185,28,28,0.45)]"
          style={{
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 55%, #FECACA 100%)',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.55), 0 10px 22px -8px rgba(185,28,28,0.45)',
          }}
        >
          <span className="rounded-md bg-[#DC2626] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-white">
            Eski
          </span>
          <span className="text-[18px] font-black tabular-nums leading-none text-[#7F1D1D] line-through decoration-[3px] decoration-[#DC2626] sm:text-[20px]">
            {compareAtPrice}
          </span>
        </div>
      ) : null}
      {discountPercent != null ? (
        <span className="inline-flex items-center rounded-[14px] bg-[#16A34A] px-3.5 py-2 text-[15px] font-black tracking-wide text-white shadow-[0_10px_22px_-6px_rgba(22,163,74,0.55)] ring-2 ring-white/70 sm:text-[16px]">
          −{discountPercent}%
        </span>
      ) : null}
    </div>
  );
}

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
  discountPercent,
  onSelect,
  purchaseDisabled = false,
  purchaseDisabledLabel = "To'lov tekshirilmoqda",
}: PricingCardProps) {
  const useNewStructure = pricePerMonth != null;

  // Highlighted (year) → navy card with guilloche + gold accents.
  // Regular (month) → cream card with navy accents.
  if (highlighted) {
    return (
      <div className="relative flex flex-col overflow-hidden rounded-[24px] shadow-[0_22px_44px_-16px_rgba(15,27,59,0.5)]">
        <div className="profile-guilloche relative p-6 text-white">
          {badge ? (
            <span className="profile-gold-pill mb-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.16em]">
              <span aria-hidden>✦</span>
              <span>{badge.replace(/[⭐✦]/g, '').trim()}</span>
            </span>
          ) : null}
          <p className="text-[10.5px] font-bold uppercase tracking-[0.28em] text-[#D4AC5C]">
            {duration}
          </p>

          <CompareAtRow
            compareAtPrice={compareAtPrice}
            discountPercent={discountPercent}
          />

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="profile-heading text-[38px] leading-none text-white sm:text-[42px]">
              {pricePerMonth ?? price}
            </span>
            {pricePerMonthUnit ? (
              <span className="text-[15px] font-semibold text-white/80">{pricePerMonthUnit}</span>
            ) : null}
          </div>

          {description ? (
            <p className="mt-2 text-[12.5px] font-bold text-[#D4AC5C]">≈ {description}</p>
          ) : null}

          <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-[#D4AC5C]/40 to-transparent" />

          <ul className="mt-4 space-y-2.5">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13.5px] font-semibold text-white/90">
                <span
                  className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[#0A1638]"
                  style={{ background: 'linear-gradient(150deg, #F5D48F 0%, #D4AC5C 100%)' }}
                >
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={purchaseDisabled ? undefined : onSelect}
            disabled={purchaseDisabled}
            className={`mt-5 flex h-[54px] w-full items-center justify-center gap-1.5 rounded-full text-[15px] font-black transition ${
              purchaseDisabled
                ? 'cursor-not-allowed bg-white/12 text-white/50'
                : 'profile-gold-pill hover:brightness-[1.03] active:scale-[0.99]'
            }`}
          >
            {purchaseDisabled ? (
              purchaseDisabledLabel
            ) : (
              <>
                <span>{buttonLabel}</span>
                <span aria-hidden>›</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Non-highlighted (month) — cream card with navy outline CTA.
  return (
    <div className="relative flex flex-col rounded-[24px] bg-pmn-card p-6 shadow-[0_14px_28px_-14px_rgba(15,27,59,0.18)] ring-1 ring-pmn-border">
      {badge ? (
        <span className="mb-3 inline-flex w-fit rounded-full bg-[#F1E5C0]/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B0894A] ring-1 ring-pmn-border">
          {badge.replace(/[⭐✦]/g, '').trim()}
        </span>
      ) : null}

      <p className="text-[10.5px] font-bold uppercase tracking-[0.28em] text-[#B0894A]">
        {duration}
      </p>

      <CompareAtRow
        compareAtPrice={compareAtPrice}
        discountPercent={discountPercent}
      />

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="profile-heading text-[34px] leading-none text-pmn-text">
          {pricePerMonth ?? price}
        </span>
        {pricePerMonthUnit ? (
          <span className="text-[14px] font-semibold text-pmn-text-muted">{pricePerMonthUnit}</span>
        ) : null}
      </div>

      {description ? (
        <p className="mt-1.5 text-[12px] font-semibold text-pmn-text-muted">≈ {description}</p>
      ) : null}

      <div className="mt-4 h-px w-full bg-[#E4DBBE]" />

      {useNewStructure ? (
        <ul className="mt-4 space-y-2.5">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] font-semibold text-pmn-text">
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#F1E5C0] text-[#B0894A]">
                <Check className="h-3 w-3" strokeWidth={3.5} />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={purchaseDisabled ? undefined : onSelect}
        disabled={purchaseDisabled}
        className={`mt-5 flex h-[52px] w-full items-center justify-center rounded-full text-[14.5px] font-black transition ${
          purchaseDisabled
            ? 'cursor-not-allowed bg-[#F0EEE6] text-pmn-text-soft'
            : 'bg-pmn-card text-pmn-text ring-2 ring-[#131F44] hover:bg-[#F1E5C0]/30 active:scale-[0.99]'
        }`}
      >
        {purchaseDisabled ? purchaseDisabledLabel : buttonLabel}
      </button>
    </div>
  );
}
