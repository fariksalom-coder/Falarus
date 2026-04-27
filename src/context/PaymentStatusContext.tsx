import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMyPayments, type MyPaymentRow } from '../api/payment';
import { useAuth } from './AuthContext';

type PaymentStatusContextType = {
  hasPendingPayment: boolean;
  pendingPayment: MyPaymentRow | null;
  payments: MyPaymentRow[];
  loading: boolean;
  refreshPayments: () => Promise<void>;
};

const PaymentStatusContext = createContext<PaymentStatusContextType | undefined>(undefined);

export function PaymentStatusProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [payments, setPayments] = useState<MyPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPayments = useCallback(async () => {
    if (!token) {
      setPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getMyPayments(token);
      setPayments(list);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshPayments();
  }, [refreshPayments]);

  const pendingPayment = useMemo(
    () => payments.find((payment) => payment.status === 'pending') ?? null,
    [payments]
  );
  const hasPendingPayment = !!pendingPayment;

  const value = useMemo<PaymentStatusContextType>(
    () => ({ hasPendingPayment, pendingPayment, payments, loading, refreshPayments }),
    [hasPendingPayment, pendingPayment, payments, loading, refreshPayments]
  );

  return <PaymentStatusContext.Provider value={value}>{children}</PaymentStatusContext.Provider>;
}

export function usePaymentStatusContext() {
  const context = useContext(PaymentStatusContext);
  if (!context) {
    throw new Error('usePaymentStatusContext must be used within PaymentStatusProvider');
  }
  return context;
}
