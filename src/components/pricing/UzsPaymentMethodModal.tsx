import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Landmark, Smartphone, Wallet, X } from 'lucide-react';
import type { PaymentProductCode, SubscriptionTariffType } from '../../../shared/paymentProducts';
import { ClickCoursePayButton } from '../click/ClickCoursePayButton';

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
      className={`w-full rounded-2xl border p-4 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
          : 'cursor-pointer border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_12px_30px_rgba(37,99,235,0.12)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              disabled ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${disabled ? 'text-slate-500' : 'text-slate-900'}`}>{title}</p>
            <p className={`mt-1 text-xs leading-relaxed ${disabled ? 'text-slate-400' : 'text-slate-600'}`}>
              {description}
            </p>
          </div>
        </div>
        {badge ? (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              disabled ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {badge}
          </span>
        ) : null}
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

  const overlay = (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/55 p-4 py-8 sm:py-10"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
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
          UZS uchun to'lov usulini tanlang
        </h2>
        <p className="mt-1 text-sm text-slate-600">4 ta usuldan birini tanlang. Xavfsiz to'lov sahifasiga yo'naltiramiz.</p>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Click (tez to'lov)</p>
                <p className="mt-1 text-xs text-slate-600">Click sahifasida bir martalik online to'lov.</p>
              </div>
            </div>
            <ClickCoursePayButton
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
              label="Click orqali to'lash"
            />
            {directPayError ? <p className="mt-2 text-sm font-medium text-red-600">{directPayError}</p> : null}
          </div>

          <MethodButton
            title="Click karta + SMS (avtotolov)"
            description="Karta raqami va SMS tasdiqlash orqali to'lovni yakunlash."
            icon={<Smartphone className="h-5 w-5" />}
            onClick={onClickCardSms}
            badge="Online"
          />

          <MethodButton
            title="Kartaga o'tkazma (chek yuborish)"
            description="Kartaga pul o'tkazing va chek/screenshot yuklang."
            icon={<CreditCard className="h-5 w-5" />}
            onClick={onManualTransfer}
          />

          <MethodButton
            title="Rahmat — tez kunda"
            description="Rahmat Merchant ulanishi yakunlangach ushbu usul faollashadi."
            icon={<Wallet className="h-5 w-5" />}
            disabled
            badge="Tez kunda"
          />
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
