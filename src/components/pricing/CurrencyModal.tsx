import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';

export type Currency = 'UZS' | 'RUB' | 'USD';

const OPTIONS: { value: Currency; labelKey: 'payment.currencyUzs' | 'payment.currencyRub' | 'payment.currencyUsd'; sub: string }[] = [
  { value: 'UZS', labelKey: 'payment.currencyUzs', sub: 'UZS' },
  { value: 'RUB', labelKey: 'payment.currencyRub', sub: 'RUB' },
  { value: 'USD', labelKey: 'payment.currencyUsd', sub: 'USD' },
];

type CurrencyModalProps = {
  onClose: () => void;
  onSelect: (currency: Currency) => void;
  currencyPriceMeta?: Partial<Record<Currency, { final: number; base?: number; discount?: number }>>;
  showPromoHint?: boolean;
};

export default function CurrencyModal({
  onClose,
  onSelect,
  currencyPriceMeta,
  showPromoHint = false,
}: CurrencyModalProps) {
  const { t } = useLocale();
  /** Portal + high z-index: escape MainLayout motion/transform overflow so the modal stays visible above bottom nav. */
  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 py-8 sm:py-10"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative my-auto max-h-[min(560px,90dvh)] w-full max-w-md overflow-y-auto rounded-2xl border border-app-border bg-app-surface p-6 shadow-app-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-app-text-muted transition-colors hover:bg-[var(--app-row-hover)]"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="currency-modal-title" className="mb-2 text-xl font-bold text-app-text">
          {t('payment.currencyTitle')}
        </h2>
        <p className="mb-6 text-sm text-app-text-muted">{t('payment.currencySubtitle')}</p>
        <div className="flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                onClose();
              }}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-app-border p-4 text-left transition-colors hover:border-app-primary hover:bg-app-primary/8"
            >
              <span className="text-2xl">
                {opt.value === 'UZS' ? '🇺🇿' : opt.value === 'RUB' ? '🇷🇺' : '🇺🇸'}
              </span>
              <div>
                <span className="block font-semibold text-app-text">
                  {opt.value} — {t(opt.labelKey)}
                </span>
                <span className="text-sm text-app-text-muted">{opt.sub}</span>
                {currencyPriceMeta?.[opt.value] && Number.isFinite(currencyPriceMeta[opt.value]?.final) ? (
                  <span className="mt-1 block text-xs text-app-text-muted">
                    {currencyPriceMeta[opt.value]?.discount ? (
                      <>
                        <span className="mr-1 line-through text-app-text-muted/70">
                          {currencyPriceMeta[opt.value]?.base?.toLocaleString('ru-RU')}
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {currencyPriceMeta[opt.value]?.final?.toLocaleString('ru-RU')}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-app-text">
                        {currencyPriceMeta[opt.value]?.final?.toLocaleString('ru-RU')}
                      </span>
                    )}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
          {showPromoHint ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/12 dark:text-amber-200">
              {t('payment.promoCurrencyHint')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
