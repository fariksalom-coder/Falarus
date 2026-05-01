import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ClickCoursePayProduct } from '../click/ClickCoursePayButton';
import { ClickCoursePayButton } from '../click/ClickCoursePayButton';

export type Currency = 'UZS' | 'RUB' | 'USD';

const OPTIONS: { value: Currency; label: string; sub: string }[] = [
  { value: 'UZS', label: "O'zbek so'mi", sub: 'UZS' },
  { value: 'RUB', label: 'Rossiya rubli', sub: 'RUB' },
  { value: 'USD', label: "AQSh dollari", sub: 'USD' },
];

type CurrencyModalProps = {
  onClose: () => void;
  onSelect: (currency: Currency) => void;
  /** Rus tili: `/payment/click` ga o‘tish yoki boshqa callback */
  onClickPay?: () => void;
  clickLabel?: string;
  /** Patent / VNZH: API orqali darhol Click ga o‘tish (promo sahifa kerak emas) */
  directClickCourse?: {
    token: string | null;
    productCode: ClickCoursePayProduct;
    refreshPayments?: () => Promise<void>;
  };
};

export default function CurrencyModal({
  onClose,
  onSelect,
  onClickPay,
  clickLabel = 'Click orqali to‘lash',
  directClickCourse,
}: CurrencyModalProps) {
  const [directPayError, setDirectPayError] = useState('');

  /** Portal + high z-index: escape MainLayout motion/transform overflow so Click row stays visible above bottom nav. */
  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 py-8 sm:py-10"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative my-auto max-h-[min(560px,90dvh)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-500"
          aria-label="Yopish"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 id="currency-modal-title" className="text-xl font-bold text-slate-900 mb-2">
          To'lov valyutasini tanlang
        </h2>
        <p className="text-slate-600 text-sm mb-6">
          Qaysi valyutada to'lamoqchisiz?
        </p>
        <div className="flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onSelect(opt.value); onClose(); }}
              className="flex items-center gap-4 w-full rounded-xl border-2 border-slate-200 p-4 text-left hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
            >
              <span className="text-2xl">
                {opt.value === 'UZS' ? '🇺🇿' : opt.value === 'RUB' ? '🇷🇺' : '🇺🇸'}
              </span>
              <div>
                <span className="font-semibold text-slate-900 block">{opt.value} — {opt.label}</span>
                <span className="text-sm text-slate-500">{opt.sub}</span>
              </div>
            </button>
          ))}
          {directClickCourse ? (
            <>
              <div className="my-1 h-px bg-slate-200" />
              <div className="flex flex-col gap-3 rounded-xl border-2 border-blue-200 bg-blue-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900 block">Click</span>
                  <span className="text-sm text-slate-500">{clickLabel}</span>
                </div>
                <ClickCoursePayButton
                  token={directClickCourse.token}
                  productCode={directClickCourse.productCode}
                  disabled={!directClickCourse.token}
                  onStarted={() => setDirectPayError('')}
                  onError={(msg) => setDirectPayError(msg)}
                  onSuccess={async () => {
                    setDirectPayError('');
                    await directClickCourse.refreshPayments?.();
                    onClose();
                  }}
                />
              </div>
              {directPayError ? (
                <p className="text-sm font-medium text-red-600">{directPayError}</p>
              ) : null}
            </>
          ) : onClickPay ? (
            <>
              <div className="my-1 h-px bg-slate-200" />
              <button
                type="button"
                onClick={() => {
                  onClickPay();
                  onClose();
                }}
                className="flex items-center justify-between gap-4 w-full rounded-xl border-2 border-blue-200 bg-blue-50/80 p-4 text-left hover:border-blue-400 hover:bg-blue-100/70 transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900 block">Click</span>
                  <span className="text-sm text-slate-500">{clickLabel}</span>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                  Online
                </span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
