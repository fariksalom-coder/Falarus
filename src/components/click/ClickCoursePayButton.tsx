import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClickPayment } from '../../api/click';
import type { PaymentProductCode } from '../../../shared/paymentProducts';
import styles from './ClickOfficialPayForm.module.css';

export type ClickCoursePayProduct = Extract<PaymentProductCode, 'patent' | 'vnzh'>;

type Props = {
  token: string | null;
  productCode: ClickCoursePayProduct;
  disabled?: boolean;
  /** Called after pending payment row is created (before redirect). */
  onSuccess?: () => void | Promise<void>;
  /** Clears inline errors when user retries (first tick of payment flow). */
  onStarted?: () => void;
  onError: (message: string) => void;
  label?: string;
};

/**
 * One user gesture: creates pending payment via API, then opens Click Shop pay URL (new tab when allowed).
 */
export function ClickCoursePayButton({
  token,
  productCode,
  disabled,
  onSuccess,
  onStarted,
  onError,
  label = "CLICK orqali to‘lash",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!token || loading || disabled) {
      if (!token) onError('Avval tizimga kiring.');
      return;
    }
    const popup = window.open('', '_blank');
    setLoading(true);
    onStarted?.();
    try {
      const result = await createClickPayment(token, {
        tariffType: null,
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
        onError(err.message || 'Click to‘lovi yaratilmadi');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`${styles.click_logo} w-full shrink-0 justify-center sm:w-auto`}
      disabled={disabled || loading || !token}
      onClick={() => void handleClick()}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white" aria-hidden />
      ) : (
        <i aria-hidden />
      )}
      <span>{loading ? 'Kutilmoqda…' : label}</span>
    </button>
  );
}
