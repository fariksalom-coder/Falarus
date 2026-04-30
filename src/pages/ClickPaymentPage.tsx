import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { createClickPayment } from '../api/click';
import { getTariffPricesByCurrency } from '../api/publicPricing';
import {
  getCourseProductPrice,
  getPaymentProductLabel,
  normalizePaymentProductCode,
  type PaymentProductCode,
  type SubscriptionTariffType,
} from '../../shared/paymentProducts';

function formatAmount(price: number): string {
  return `${price.toLocaleString('uz-UZ')} so'm`;
}

export default function ClickPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { payments, loading: paymentsLoading, refreshPayments } = usePaymentStatus();

  const state = location.state as
    | {
        tariffType?: SubscriptionTariffType;
        tariffLabel?: string;
        productCode?: PaymentProductCode;
        productLabel?: string;
        returnTo?: string;
      }
    | null;

  const productCode = normalizePaymentProductCode(state?.productCode);
  const isRussianCourse = productCode === 'russian';
  const tariffType = state?.tariffType ?? (isRussianCourse ? 'month' : undefined);
  const productLabel = state?.productLabel ?? getPaymentProductLabel(productCode);
  const backPath =
    state?.returnTo ??
    (productCode === 'patent'
      ? '/kurslar/patent'
      : productCode === 'vnzh'
        ? '/kurslar/vnzh'
        : '/tariflar');

  const [amount, setAmount] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hasValidState = isRussianCourse ? Boolean(tariffType) : Boolean(state?.productCode);
  const hasPendingPayment = useMemo(
    () =>
      payments.some((payment) => payment.status === 'pending' && payment.product_code === productCode),
    [payments, productCode]
  );

  useEffect(() => {
    if (!hasValidState) return;
    setLoadingPrice(true);
    if (isRussianCourse && tariffType) {
      getTariffPricesByCurrency('UZS')
        .then((prices) => {
          const next =
            tariffType === 'year'
              ? prices.year
              : tariffType === '3months'
                ? prices.three_months
                : prices.month;
          setAmount(Number(next));
        })
        .catch(() => setAmount(null))
        .finally(() => setLoadingPrice(false));
      return;
    }
    if (productCode !== 'russian') {
      setAmount(getCourseProductPrice(productCode, 'UZS'));
    } else {
      setAmount(null);
    }
    setLoadingPrice(false);
  }, [hasValidState, isRussianCourse, productCode, tariffType]);

  useEffect(() => {
    if (!hasValidState && !paymentsLoading) {
      navigate(backPath, { replace: true });
    }
  }, [backPath, hasValidState, navigate, paymentsLoading]);

  const handleCreateClickPayment = async () => {
    if (!token) {
      setError('Tizimga kirish kerak');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await createClickPayment(token, {
        tariffType: isRussianCourse ? tariffType : null,
        productCode,
      });
      await refreshPayments();
      window.location.href = result.payment_url;
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'PENDING_PAYMENT') {
        await refreshPayments();
      } else {
        setError(err.message || 'Click to‘lovi yaratilmadi');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasValidState && paymentsLoading) {
    return null;
  }

  if (hasPendingPayment && !paymentsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">To'lov yaratilgan</h1>
          <p className="text-slate-600 mb-8">
            Bu kurs uchun hali tekshirilayotgan yoki tugallanmagan to'lov mavjud.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white shadow-[0_18px_30px_rgba(37,99,235,0.2)]"
          >
            Profilga o'tish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF6FF] px-4 py-5 pb-16">
      <main className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        <section className="rounded-[28px] border border-[#D9E7F7] bg-white/90 p-6 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#60A5FA_0%,#2563EB_100%)] text-white shadow-[0_14px_28px_rgba(37,99,235,0.2)]">
              <CreditCard className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5B85B6]">Click</p>
              <h1 className="mt-2 text-[28px] font-bold text-slate-900">{productLabel}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Online to‘lov Click orqali amalga oshiriladi. Hozircha Click uchun hisob-kitob
                o‘zbek so‘mida ochiladi.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-[#F8FBFF] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Valyuta
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">UZS</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-[#F8FBFF] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Narx
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {loadingPrice || amount == null ? '...' : formatAmount(amount)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                To‘lov muvaffaqiyatli tugagandan keyin kursga kirish avtomatik ochiladi. Manual chek
                yuborish shart emas.
              </p>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleCreateClickPayment}
            disabled={submitting || loadingPrice || amount == null}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#2563EB] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Click orqali to‘lash
          </button>
        </section>
      </main>
    </div>
  );
}
