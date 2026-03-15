import { useState, useEffect } from 'react';
import { getMyPayments, type MyPaymentRow } from '../api/payment';
import { useAuth } from '../context/AuthContext';

export function usePaymentStatus(): {
  hasPendingPayment: boolean;
  pendingPayment: MyPaymentRow | null;
  payments: MyPaymentRow[];
  loading: boolean;
} {
  const { token } = useAuth();
  const [payments, setPayments] = useState<MyPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyPayments(token)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [token]);

  const pendingPayment = payments.find((p) => p.status === 'pending') ?? null;
  const hasPendingPayment = !!pendingPayment;

  return { hasPendingPayment, pendingPayment, payments, loading };
}
