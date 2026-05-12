import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createRahmatPayment } from '../../api/rahmat';
import type { PaymentProductCode, SubscriptionTariffType } from '../../../shared/paymentProducts';

type Props = {
  token: string | null;
  productCode: PaymentProductCode;
  tariffType?: SubscriptionTariffType;
  disabled?: boolean;
  compact?: boolean;
  onSuccess?: () => void | Promise<void>;
  onStarted?: () => void;
  onError: (message: string) => void;
  label?: string;
};

export function RahmatCoursePayButton({
  token,
  productCode,
  tariffType,
  disabled,
  compact = false,
  onSuccess,
  onStarted,
  onError,
  label = "Rahmat orqali to‘lash",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (!token || loading || disabled) {
      if (!token) onError('Avval tizimga kiring.');
      return;
    }
    const popup = window.open('', '_blank');
    setLoading(true);
    onStarted?.();
    try {
      if (productCode === 'russian' && !tariffType) {
        onError('Tarif turi topilmadi. Sahifani yangilang.');
        return;
      }
      const result = await createRahmatPayment(token, {
        tariffType: productCode === 'russian' ? tariffType : null,
        productCode,
      });
      await onSuccess?.();
      const url = result.payment_url;
      if (popup && !popup.closed) {
        popup.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e) {
      popup?.close();
      const err = e as Error & { code?: string };
      if (err.code === 'PENDING_PAYMENT') {
        await onSuccess?.();
        onError("To‘lov allaqachon kutilmoqda. Profildan tekshiring.");
      } else {
        onError(err.message || 'Rahmat to‘lovi yaratilmadi');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || loading || !token}
      onClick={() => void handlePay()}
      className={
        compact
          ? 'inline-flex min-w-[132px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60'
          : 'inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'
      }
    >
      {loading ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white" aria-hidden />
      ) : null}
      <span>{loading ? 'Kutilmoqda…' : label}</span>
    </button>
  );
}
