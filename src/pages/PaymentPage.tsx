import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitPayment, type TariffType, type Currency } from '../api/payment';
import { getPaymentMethodByCurrency, getTariffPricesByCurrency, getUserTariffPricesByCurrency } from '../api/publicPricing';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import {
  getCourseProductPrice,
  getPaymentProductLabel,
  getTeacherListingPriceUzs,
  getTeacherTrialPrice,
  getTeacherTrialPriceUzs,
  isCourseProductCode,
  isTeacherListingPlanCode,
  normalizePaymentProductCode,
  TEACHER_LISTING_PRODUCT_CODE,
  TEACHER_TRIAL_PRODUCT_CODE,
  type PaymentProductCode,
  type TeacherListingPlanCode,
} from '../../shared/paymentProducts';
import {
  Copy,
  Upload,
  X,
  ArrowLeft,
  CreditCard,
  Smartphone,
  User,
  Paperclip,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { PaymentLegalConsentCheckbox } from '../components/legal/PaymentLegalConsent';
import { useLocale } from '../context/LocaleContext';

const FALLBACK_CARD = 'XXXX XXXX XXXX XXXX';
const FALLBACK_PHONE = '+7 XXX XXX XX XX';
const FALLBACK_HOLDER = 'Ibragimova Aziza Azamatovna';

function formatCardDisplay(card: string): string {
  const digits = card.replace(/\D/g, '');
  if (!digits.length) return card;
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
    >
      <Copy className="h-4 w-4 shrink-0" />
      {copied ? t('common.copied') : t('common.copy')}
    </button>
  );
}

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,application/pdf';
const MAX_SIZE = 10 * 1024 * 1024;

function formatAmount(price: number, currency: Currency): string {
  if (currency === 'UZS') return `${Number(price).toLocaleString('uz-UZ')} so'm`;
  if (currency === 'RUB') return `${price} ₽`;
  return `$${price}`;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  const { token } = useAuth();
  const { payments, loading: paymentsLoading, refreshPayments } = usePaymentStatus();
  const state = location.state as {
    tariffType?: TariffType;
    currency?: Currency;
    tariffLabel?: string;
    productCode?: PaymentProductCode;
    productLabel?: string;
    listingPlanCode?: TeacherListingPlanCode;
    trialId?: number;
    returnTo?: string;
  } | null;

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<{
    card_number: string;
    phone_number: string | null;
    card_holder_name: string;
  } | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const productCode = normalizePaymentProductCode(state?.productCode);
  const isRussianCourse = productCode === 'russian';
  const isTeacherListing = productCode === TEACHER_LISTING_PRODUCT_CODE;
  const isTeacherTrial = productCode === TEACHER_TRIAL_PRODUCT_CODE;
  const listingPlanCode = isTeacherListingPlanCode(state?.listingPlanCode) ? state.listingPlanCode : null;
  const trialId = isTeacherTrial && typeof state?.trialId === 'number' ? state.trialId : null;
  const tariffType = state?.tariffType ?? (isRussianCourse ? 'month' : undefined);
  const currency = state?.currency ?? 'UZS';
  const tariffLabel = state?.tariffLabel ?? t('payment.buyMonth');
  const productLabel = state?.productLabel ?? getPaymentProductLabel(productCode);
  const afterPayPath =
    state?.returnTo ?? (isTeacherListing ? '/teacher-cabinet' : isTeacherTrial ? '/teachers' : '/profile');
  const backPath =
    state?.returnTo ??
    (productCode === 'patent'
      ? '/kurslar/patent'
      : productCode === 'vnzh'
        ? '/kurslar/vnzh'
        : isTeacherListing
          ? '/teacher-cabinet'
          : isTeacherTrial
            ? '/teachers'
            : '/tariflar');

  useEffect(() => {
    setHasPendingPayment(
      payments.some((payment) => payment.status === 'pending' && payment.product_code === productCode)
    );
  }, [payments, productCode]);

  useEffect(() => {
    setDetailsLoading(true);
    Promise.all([
      getPaymentMethodByCurrency(currency),
      isRussianCourse
        ? token
          ? getUserTariffPricesByCurrency(token, currency)
          : getTariffPricesByCurrency(currency)
        : Promise.resolve(null),
    ])
      .then(([m, prices]) => {
        setPaymentMethod(
          m
            ? m
            : {
                card_number: FALLBACK_CARD,
                phone_number: FALLBACK_PHONE,
                card_holder_name: FALLBACK_HOLDER,
              }
        );
        if (isRussianCourse && tariffType) {
          const key = tariffType === 'year' ? 'year' : 'month';
          const payload = prices as { month: number; year: number } | null;
          setPrice(payload?.[key] ?? null);
          return;
        }
        if (isTeacherListing && listingPlanCode) {
          setPrice(getTeacherListingPriceUzs(listingPlanCode));
        } else if (isTeacherTrial) {
          setPrice(getTeacherTrialPrice(currency));
        } else {
          setPrice(isCourseProductCode(productCode) ? getCourseProductPrice(productCode, currency) : null);
        }
      })
      .catch(() => {
        setPaymentMethod({
          card_number: FALLBACK_CARD,
          phone_number: FALLBACK_PHONE,
          card_holder_name: FALLBACK_HOLDER,
        });
        setPrice(null);
      })
      .finally(() => setDetailsLoading(false));
  }, [currency, isRussianCourse, isTeacherListing, isTeacherTrial, listingPlanCode, productCode, tariffType, token]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (
      f &&
      (ACCEPT.split(',').some((m) => f.type === m.trim()) ||
        f.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) &&
      f.size <= MAX_SIZE
    ) {
      setFile(f);
      setError('');
    } else {
      setError(t('payment.fileTypes'));
    }
  }, [t]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > MAX_SIZE) {
        setError(t('payment.fileSizeMax'));
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
  };

  const handleSubmit = async () => {
    if (!file || !token) {
      setError(file ? t('payment.needLogin') : t('payment.uploadReceipt'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitPayment(token, {
        tariffType: isRussianCourse ? tariffType : null,
        productCode,
        currency,
        file,
        listingPlanCode: isTeacherListing ? listingPlanCode ?? undefined : undefined,
        trialId: isTeacherTrial ? trialId ?? undefined : undefined,
      });
      await refreshPayments();
      setSuccess(true);
    } catch (e: unknown) {
      const err = e as Error & { code?: string };
      if (err.code === 'PENDING_PAYMENT') setHasPendingPayment(true);
      else setError(err.message || t('common.loadError'));
    } finally {
      setSubmitting(false);
    }
  };

  const hasValidState = isRussianCourse
    ? Boolean(state?.tariffType)
    : isTeacherListing
      ? Boolean(listingPlanCode)
      : isTeacherTrial
        ? trialId != null
        : Boolean(state?.productCode);

  if (!hasValidState && !hasPendingPayment && !paymentsLoading) {
    navigate(backPath, { replace: true });
    return null;
  }
  if (!hasValidState && !hasPendingPayment && paymentsLoading) {
    return null;
  }

  // ——— Pending payment: block duplicate ———
  if (!paymentsLoading && hasPendingPayment && !success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('payment.pendingTitle')}</h1>
          <p className="text-slate-600 mb-8">
            {isTeacherTrial
              ? t('payment.pendingTeacherTrial')
              : isTeacherListing
                ? t('payment.pendingTeacherListing')
                : t('payment.pendingDefault')}
          </p>
          <button
            type="button"
            onClick={() => navigate(afterPayPath)}
            className="w-full rounded-xl py-4 text-lg font-semibold text-white border-2 transition-colors hover:opacity-90"
            style={{ backgroundColor: '#EEF4FF', borderColor: '#4C6FFF', color: '#4C6FFF' }}
          >
            {isTeacherListing ? t('payment.backCabinet') : isTeacherTrial ? t('payment.backTeacher') : t('payment.backProfile')}
          </button>
        </div>
      </div>
    );
  }

  // ——— Success screen after submit ———
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('payment.acceptedTitle')}</h1>
          <p className="text-slate-600 mb-8">
            {t('payment.acceptedBody')}
            <br />
            {isTeacherTrial
              ? t('payment.acceptedTeacherTrial')
              : t('payment.acceptedDefault')}
          </p>
          <button
            type="button"
            onClick={() => navigate(afterPayPath)}
            className="w-full rounded-xl py-4 text-lg font-semibold text-white border-2 transition-colors hover:opacity-90"
            style={{ backgroundColor: '#EEF4FF', borderColor: '#4C6FFF', color: '#4C6FFF' }}
          >
            {isTeacherListing ? t('payment.backCabinet') : isTeacherTrial ? t('payment.backTeacher') : t('payment.backProfile')}
          </button>
        </div>
      </div>
    );
  }

  // ——— Main payment form ———
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="mx-auto max-w-xl px-4 pt-6 sm:pt-8">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          {t('common.back')}
        </button>

        {/* Payment amount — light blue block */}
        <section
          className="rounded-2xl border-2 shadow-sm p-6 mb-6"
          style={{ backgroundColor: '#EEF4FF', borderColor: '#4C6FFF' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">{t('payment.amountTitle')}</h2>
              <p className="text-slate-600 text-sm mb-1">
                {isRussianCourse
                  ? `${t('payment.tariff')}: ${tariffLabel}`
                  : isTeacherListing || isTeacherTrial
                    ? `${t('payment.service')}: ${productLabel}`
                    : `${t('payment.course')}: ${productLabel}`}
              </p>
              <p className="text-slate-600 text-sm">{t('payment.payExact')}</p>
            </div>
            <div className="sm:text-right">
              {detailsLoading ? (
                <div
                  className="h-12 w-28 rounded-lg animate-pulse"
                  style={{ backgroundColor: 'rgba(76, 111, 255, 0.2)' }}
                />
              ) : price != null ? (
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {formatAmount(price, currency)}
                </p>
              ) : (
                <p className="text-2xl font-bold text-slate-400">—</p>
              )}
            </div>
          </div>
        </section>

        {isTeacherTrial ? (
          <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
            {currency === 'RUB'
              ? t('payment.teacherTrialRubHint')
              : t('payment.teacherTrialUzsHint', { amount: getTeacherTrialPriceUzs().toLocaleString('uz-UZ') })}
          </p>
        ) : null}

        {/* 3. Payment details card with icons */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">{t('payment.detailsTitle')}</h2>
          {detailsLoading ? (
            <div className="space-y-5 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-slate-200 rounded w-28 mb-2" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            paymentMethod && (
              <div className="space-y-5">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('payment.cardNumber')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-900 text-lg">
                      {formatCardDisplay(paymentMethod.card_number)}
                    </span>
                    <CopyButton
                      text={paymentMethod.card_number.replace(/\s/g, '')}
                      label={t('payment.cardCopy')}
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('payment.phoneNumber')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-900">
                      {paymentMethod.phone_number || '—'}
                    </span>
                    {paymentMethod.phone_number && (
                      <CopyButton text={paymentMethod.phone_number} label={t('payment.phoneCopy')} />
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('payment.cardHolder')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-900">{paymentMethod.card_holder_name}</span>
                    <CopyButton text={paymentMethod.card_holder_name} label={t('payment.nameCopy')} />
                  </div>
                </div>
              </div>
            )
          )}
        </section>

        {/* File upload */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 text-slate-800 mb-1">
            <Paperclip className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">{t('payment.uploadTitle')}</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {t('payment.uploadFormats')}
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragOver ? 'bg-[#EEF4FF]/50' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
            style={dragOver ? { borderColor: '#4C6FFF' } : undefined}
          >
            <input
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              className="hidden"
              id="payment-file"
            />
            {file ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-emerald-800">
                      ✓ {file.name} {t('payment.uploaded')}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  {t('payment.chooseAnotherFile')}
                </button>
              </div>
            ) : (
              <label htmlFor="payment-file" className="cursor-pointer block">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">
                  {t('payment.selectOrDrop')}
                </p>
              </label>
            )}
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </section>

        <section className="mb-6">
          <PaymentLegalConsentCheckbox
            idPrefix="manual-payment"
            checked={legalAccepted}
            onChange={setLegalAccepted}
          />
        </section>

        {/* Submit button — light blue bg, blue border */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!file || submitting || !legalAccepted}
          className="w-full rounded-xl py-4 text-lg font-semibold border-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] hover:opacity-90"
          style={{ backgroundColor: '#EEF4FF', borderColor: '#4C6FFF', color: '#4C6FFF' }}
        >
          {submitting ? t('payment.submitting') : t('payment.submit')}
        </button>

        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="w-full mt-4 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center justify-center gap-1"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          {t('payment.back')}
        </button>
      </div>
    </div>
  );
}
