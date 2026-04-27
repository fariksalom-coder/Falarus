import type { MyPaymentRow } from '../api/payment';
import { usePaymentStatusContext } from '../context/PaymentStatusContext';

export function usePaymentStatus(): {
  hasPendingPayment: boolean;
  pendingPayment: MyPaymentRow | null;
  payments: MyPaymentRow[];
  loading: boolean;
  refreshPayments: () => Promise<void>;
} {
  const { hasPendingPayment, pendingPayment, payments, loading, refreshPayments } = usePaymentStatusContext();
  return { hasPendingPayment, pendingPayment, payments, loading, refreshPayments };
}
