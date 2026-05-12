import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, CreditCard, Shield, Smartphone, X } from 'lucide-react';
import type { PaymentProductCode, SubscriptionTariffType } from '../../../shared/paymentProducts';
import { ClickCoursePayButton } from '../click/ClickCoursePayButton';
import { RahmatCoursePayButton } from './RahmatCoursePayButton';

type UzsPaymentMethodModalProps = {
  onClose: () => void;
  onManualTransfer: () => void;
  onClickCardSms: () => void;
  clickButtonConfig: {
    token: string | null;
    productCode: PaymentProductCode;
    tariffType?: SubscriptionTariffType;
    refreshPayments?: () => Promise<void>;
  };
};

function MethodButton(props: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  const { title, description, icon, onClick, disabled = false, badge } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-3xl border p-4 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-slate-100 bg-slate-50/80 text-slate-400'
          : 'cursor-pointer border-slate-100 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,235,0.12)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${
              disabled ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-blue-600'
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className={`text-lg font-semibold ${disabled ? 'text-slate-500' : 'text-slate-900'}`}>{title}</p>
            <p className={`mt-1 text-sm leading-relaxed ${disabled ? 'text-slate-400' : 'text-slate-500'}`}>
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge ? (
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                disabled ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {badge}
            </span>
          ) : null}
          {!disabled ? <ChevronRight className="h-5 w-5 text-slate-400" /> : null}
        </div>
      </div>
    </button>
  );
}

export default function UzsPaymentMethodModal({
  onClose,
  onManualTransfer,
  onClickCardSms,
  clickButtonConfig,
}: UzsPaymentMethodModalProps) {
  const [directPayError, setDirectPayError] = useState('');
  const [rahmatError, setRahmatError] = useState('');
  const clickLogoSrc = '/payment-logos/click-logo-new.png';
  const rahmatLogoSrc = '/payment-logos/rahmat-logo.png';

  const overlay = (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/40 p-3 py-6 sm:py-10"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-md rounded-[30px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.2)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="uzs-method-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Yopish"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="uzs-method-modal-title" className="pr-8 text-xl font-bold text-slate-900">
          To'lov usulini tanlang
        </h2>
        <p className="mt-1 text-base text-slate-500">4 ta usuldan birini tanlang</p>

        <div className="mt-5 space-y-3.5">
          <div className="rounded-3xl border border-blue-200 bg-white p-4 shadow-[0_12px_32px_rgba(37,99,235,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <img src={clickLogoSrc} alt="Click" className="h-10 w-10 rounded-lg object-contain" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">Click orqali</p>
                </div>
              </div>
              <div className="shrink-0">
                <ClickCoursePayButton
                  compact
                  token={clickButtonConfig.token}
                  productCode={clickButtonConfig.productCode}
                  tariffType={clickButtonConfig.tariffType}
                  onStarted={() => setDirectPayError('')}
                  onError={(message) => setDirectPayError(message)}
                  onSuccess={async () => {
                    setDirectPayError('');
                    await clickButtonConfig.refreshPayments?.();
                    onClose();
                  }}
                  label="To'lash"
                />
              </div>
            </div>
            {directPayError ? <p className="mt-2 text-sm font-medium text-red-600">{directPayError}</p> : null}
          </div>

          <MethodButton
            title="Karta + SMS"
            description=""
            icon={<Smartphone className="h-5 w-5" />}
            onClick={onClickCardSms}
          />

          <MethodButton
            title="Kartaga o'tkazma"
            description=""
            icon={<CreditCard className="h-5 w-5" />}
            onClick={onManualTransfer}
          />

          <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_12px_32px_rgba(249,115,22,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                  <img src={rahmatLogoSrc} alt="Rahmat" className="h-10 w-10 rounded-md object-contain" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">Rahmat</p>
                  <p className="mt-0.5 text-sm text-slate-500">Payme, Click, Uzum va boshqa ilovalar</p>
                </div>
              </div>
              <div className="shrink-0">
                <RahmatCoursePayButton
                  compact
                  token={clickButtonConfig.token}
                  productCode={clickButtonConfig.productCode}
                  tariffType={clickButtonConfig.tariffType}
                  onStarted={() => setRahmatError('')}
                  onError={(message) => setRahmatError(message)}
                  onSuccess={async () => {
                    setRahmatError('');
                    await clickButtonConfig.refreshPayments?.();
                    onClose();
                  }}
                  label="To'lash"
                />
              </div>
            </div>
            {rahmatError ? <p className="mt-2 text-sm font-medium text-red-600">{rahmatError}</p> : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Shield className="h-4 w-4" />
          <span>Barcha to'lovlar himoyalangan</span>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
