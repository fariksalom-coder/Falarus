import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useLocale } from '../../context/LocaleContext';

export type Currency = 'UZS' | 'RUB' | 'USD';

const OPTIONS: Array<{
  value: Currency;
  symbol: string;
  name: string;
  sub: string;
}> = [
  { value: 'UZS', symbol: "so'm", name: "O'zbek so'mi", sub: 'Rahmat / Click orqali' },
  { value: 'RUB', symbol: '₽', name: 'Rossiya rubli', sub: 'Karta orqali' },
  { value: 'USD', symbol: '$', name: 'AQSh dollari', sub: 'Karta orqali' },
];

type CurrencyModalProps = {
  onClose: () => void;
  onSelect: (currency: Currency) => void;
  tariffType?: 'three_month' | 'year';
  currencyPrices?: Partial<Record<Currency, { three_month: number; year: number }>>;
};

function formatAmount(amount: number, currency: Currency): string {
  const value = Math.round(amount).toLocaleString('ru-RU').replace(/,/g, ' ');
  if (currency === 'UZS') return `${value} so'm`;
  if (currency === 'RUB') return `${value} ₽`;
  return `$${value}`;
}

export default function CurrencyModal({
  onClose,
  onSelect,
  tariffType,
  currencyPrices,
}: CurrencyModalProps) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<Currency>('UZS');

  const handleContinue = () => {
    onSelect(selected);
    onClose();
  };

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/45"
      role="presentation"
      onClick={onClose}
    >
      {/* Bottom sheet */}
      <div
        className="relative w-full max-w-md rounded-t-[28px] bg-pmn-card px-5 pt-[22px] pb-[30px] shadow-[0_-20px_50px_rgba(15,23,42,0.3)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber */}
        <div className="mx-auto mb-[18px] h-[5px] w-[44px] rounded-full bg-[#E1E7F1]" aria-hidden />

        <h2 id="currency-modal-title" className="text-[20px] font-extrabold text-app-text">
          {t('payment.currencyTitle') || "To'lov valyutasini tanlang"}
        </h2>
        <p className="mt-1.5 mb-[18px] text-[13.5px] font-semibold text-app-text-muted">
          {t('payment.currencySubtitle') || "Qaysi valyutada to'lamoqchisiz?"}
        </p>

        <div className="flex flex-col gap-[11px]">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            const amount = tariffType ? currencyPrices?.[opt.value]?.[tariffType] : undefined;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className="flex w-full items-center gap-[13px] rounded-[16px] p-[15px] text-left transition-all"
                style={{
                  border: isSelected ? '2px solid #0B2A6B' : '1.5px solid #DCE6F3',
                  background: isSelected ? '#EEF4FF' : '#FFFFFF',
                }}
              >
                <span
                  className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-black leading-none"
                  style={{
                    background: isSelected ? '#0B2A6B' : '#EEF3FF',
                    color: isSelected ? '#FFFFFF' : '#0B2A6B',
                  }}
                >
                  {opt.symbol}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-app-text">{opt.name}</p>
                  <p className="mt-[1px] text-[12px] font-semibold text-app-text-muted">
                    {opt.sub}
                  </p>
                  {amount != null && Number.isFinite(amount) && amount > 0 ? (
                    <p className="mt-1 text-[12px] font-extrabold text-app-text">
                      {formatAmount(amount, opt.value)}
                    </p>
                  ) : null}
                </div>
                {isSelected ? (
                  <span
                    className="h-[22px] w-[22px] shrink-0 rounded-full"
                    style={{ border: '6px solid #0B2A6B' }}
                    aria-hidden
                  />
                ) : (
                  <span
                    className="h-[22px] w-[22px] shrink-0 rounded-full"
                    style={{ border: '2px solid #C4D2E6' }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-[18px] flex h-[52px] w-full items-center justify-center rounded-[15px] bg-[#0B2A6B] text-[15px] font-extrabold text-white shadow-[0_14px_28px_-10px_rgba(11,42,107,0.5)] active:scale-[0.99]"
        >
          Davom etish
        </button>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
