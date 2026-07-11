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
      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#DCE6F3] bg-pmn-card px-[10px] py-[5px] text-[11px] font-extrabold text-[#0B2A6B] transition hover:bg-[#EEF3FF]"
    >
      <Copy className="h-3.5 w-3.5 shrink-0" />
      {copied ? (t('common.copied') || 'Nusxalandi') : 'Nusxa'}
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
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-pmn-card rounded-2xl shadow-xl shadow-slate-200/50 p-8 text-center">
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
            style={{ backgroundColor: '#EEF3FF', borderColor: '#0B2A6B', color: '#0B2A6B' }}
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
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-pmn-card rounded-2xl shadow-xl shadow-slate-200/50 p-8 text-center">
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
            style={{ backgroundColor: '#EEF3FF', borderColor: '#0B2A6B', color: '#0B2A6B' }}
          >
            {isTeacherListing ? t('payment.backCabinet') : isTeacherTrial ? t('payment.backTeacher') : t('payment.backProfile')}
          </button>
        </div>
      </div>
    );
  }

  // ——— Main payment form ———
  return (
    <div className="min-h-screen bg-app-bg pb-24">
      <div className="mx-auto max-w-xl px-[18px] pt-2 sm:pt-4">
        {/* Header: back-tile + "To'lov" */}
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-app-border bg-app-surface text-[#7FA8FF]"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[18px] font-extrabold text-app-text">To'lov</h1>
        </div>

        {/* Payment amount — navy gradient block */}
        <section
          className="mb-4 rounded-[20px] border border-app-border p-[18px] text-white shadow-[0_16px_34px_-14px_rgba(0,0,0,0.5)]"
          style={{ background: 'linear-gradient(150deg, #12296B, #0A1738)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold">{t('payment.amountTitle')}</p>
              <p className="mt-1.5 text-[12px] font-semibold text-[#AEBEE4]">
                {isRussianCourse
                  ? `${t('payment.tariff')}: ${tariffLabel}`
                  : isTeacherListing || isTeacherTrial
                    ? `${t('payment.service')}: ${productLabel}`
                    : `${t('payment.course')}: ${productLabel}`}
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-[#AEBEE4]">{t('payment.payExact')}</p>
            </div>
            <div className="shrink-0 text-right">
              {detailsLoading ? (
                <div className="h-[42px] w-24 rounded-lg animate-pulse bg-white/10" />
              ) : price != null ? (
                <p className="text-[24px] font-extrabold leading-none">
                  {formatAmount(price, currency).split(' ')[0]}
                  <span className="ml-1 block mt-1 text-[13px] font-bold text-[#AEBEE4]">
                    {formatAmount(price, currency).split(' ').slice(1).join(' ')}
                  </span>
                </p>
              ) : (
                <p className="text-[24px] font-extrabold text-white/50">—</p>
              )}
            </div>
          </div>
        </section>

        {isTeacherTrial ? (
          <p className="mb-4 rounded-xl border border-[#EAEFF7] bg-[#F5F7FB] px-4 py-3 text-sm font-semibold text-[#5B678A]">
            {currency === 'RUB'
              ? t('payment.teacherTrialRubHint')
              : t('payment.teacherTrialUzsHint', { amount: getTeacherTrialPriceUzs().toLocaleString('uz-UZ') })}
          </p>
        ) : null}

        {/* 3. Payment details card with icons */}
        <section className="mb-4 rounded-[20px] border border-app-border bg-app-surface p-4">
          <h2 className="mb-3 text-[14px] font-extrabold text-app-text">To'lov rekvizitlari</h2>
          {detailsLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-app-bg-subtle" />
              ))}
            </div>
          ) : (
            paymentMethod && (
              <div className="space-y-2.5">
                <div className="rounded-[14px] border border-[#EAEFF7] bg-[#F5F7FB] p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-app-text-muted">
                    <CreditCard className="h-3.5 w-3.5" /> {t('payment.cardNumber')}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-[16px] font-bold text-app-text">
                      {formatCardDisplay(paymentMethod.card_number)}
                    </span>
                    <CopyButton
                      text={paymentMethod.card_number.replace(/\s/g, '')}
                      label={t('payment.cardCopy')}
                    />
                  </div>
                </div>
                {paymentMethod.phone_number ? (
                  <div className="rounded-[14px] border border-[#EAEFF7] bg-[#F5F7FB] p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-app-text-muted">
                      <Smartphone className="h-3.5 w-3.5" /> {t('payment.phoneNumber')}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-[14px] font-bold text-app-text">
                        {paymentMethod.phone_number}
                      </span>
                      <CopyButton text={paymentMethod.phone_number} label={t('payment.phoneCopy')} />
                    </div>
                  </div>
                ) : null}
                <div className="rounded-[14px] border border-[#EAEFF7] bg-[#F5F7FB] p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-app-text-muted">
                    <User className="h-3.5 w-3.5" /> {t('payment.cardHolder')}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[14px] font-bold text-app-text">
                      {paymentMethod.card_holder_name}
                    </span>
                    <CopyButton text={paymentMethod.card_holder_name} label={t('payment.nameCopy')} />
                  </div>
                </div>
              </div>
            )
          )}
        </section>

        {/* File upload */}
        <section className="mb-4 rounded-[20px] border border-app-border bg-app-surface p-4">
          <div className="mb-1 flex items-center gap-2 text-app-text">
            <Paperclip className="h-4 w-4 text-app-text-muted" />
            <h2 className="text-[14px] font-extrabold">To'lov chekini yuklash</h2>
          </div>
          <p className="mb-3 text-[12px] font-semibold text-app-text-muted">
            {t('payment.uploadFormats')}
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className="rounded-[16px] border-2 border-dashed p-6 text-center transition-all"
            style={{
              background: '#F7F9FE',
              borderColor: dragOver ? '#0B2A6B' : '#C4D6EC',
            }}
          >
            <input
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              className="hidden"
              id="payment-file"
            />
            {file ? (
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <div className="flex items-center gap-3 rounded-[14px] border border-[#ABEBC8] bg-[#E6F7EC] px-4 py-3">
                  <CheckCircle className="h-7 w-7 shrink-0 text-[#12A150]" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#12813F]">
                      ✓ {file.name} {t('payment.uploaded')}
                    </p>
                    <p className="text-xs font-semibold text-[#12813F]/80">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="inline-flex items-center gap-2 rounded-[14px] border border-[#DCE6F3] bg-pmn-card px-4 py-2 text-sm font-bold text-app-text-muted"
                >
                  <X className="h-4 w-4" />
                  {t('payment.chooseAnotherFile')}
                </button>
              </div>
            ) : (
              <label htmlFor="payment-file" className="cursor-pointer block">
                <div className="text-[30px]">⬆️</div>
                <p className="mt-2 text-[13.5px] font-bold text-app-text-muted">
                  {t('payment.selectOrDrop')}
                </p>
              </label>
            )}
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-[rgba(240,101,106,0.12)] px-3 py-2 text-sm font-semibold text-[#F0656A]">{error}</p>
          )}
        </section>

        <section className="mb-4">
          <PaymentLegalConsentCheckbox
            idPrefix="manual-payment"
            checked={legalAccepted}
            onChange={setLegalAccepted}
          />
        </section>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!file || submitting || !legalAccepted}
          className="w-full rounded-[15px] bg-app-primary py-[15px] text-base font-extrabold text-white shadow-app-nav-btn disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
        >
          {submitting ? t('payment.submitting') : t('payment.submit')}
        </button>

        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="mt-4 flex w-full items-center justify-center gap-1 text-sm font-semibold text-app-text-muted"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          {t('payment.back')}
        </button>
      </div>
    </div>
  );
}
