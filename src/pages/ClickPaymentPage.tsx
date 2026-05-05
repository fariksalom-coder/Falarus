import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { requestClickCardToken, verifyClickCardToken } from '../api/click';
import { getTariffPricesByCurrency, getUserTariffPricesByCurrency } from '../api/publicPricing';
import {
  getCourseProductPrice,
  getPaymentProductLabel,
  normalizePaymentProductCode,
  type PaymentProductCode,
  type SubscriptionTariffType,
} from '../../shared/paymentProducts';
import type { ClickCoursePayProduct } from '../components/click/ClickCoursePayButton';
import { ClickCoursePayButton } from '../components/click/ClickCoursePayButton';
import {
  CARD_PAN_DIGITS_UZ,
  formatCardPanGroups,
  isValidPanLuhn,
  normalizeCardPanDigits,
} from '../../shared/cardPan';
import { PaymentLegalConsentCheckbox } from '../components/legal/PaymentLegalConsent';

function formatAmount(price: number): string {
  return `${price.toLocaleString('uz-UZ')} so'm`;
}

function normalizeExpireInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4);
}

/** Ko‘rinish: `12/26`; state faqat 4 ta raqam. */
function formatExpireSlash(digitsOnly: string): string {
  const d = digitsOnly.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export default function ClickPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, updateUser } = useAuth();
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
  const isCourseOneOffClick = productCode === 'patent' || productCode === 'vnzh';
  const tariffType = state?.tariffType ?? (isRussianCourse ? 'month' : undefined);
  const productLabel = state?.productLabel ?? getPaymentProductLabel(productCode);
  const russianTariffDisplay =
    state?.tariffLabel ??
    (tariffType === 'year' ? '1 yil' : '1 oy');
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

  const [cardNumber, setCardNumber] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [pendingCardToken, setPendingCardToken] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [autoStep, setAutoStep] = useState<'idle' | 'sms_sent' | 'done'>('idle');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [promoActive, setPromoActive] = useState(false);

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
      const loader = token
        ? getUserTariffPricesByCurrency(token, 'UZS')
        : getTariffPricesByCurrency('UZS');
      loader
        .then((prices) => {
          const next = tariffType === 'year' ? prices.year : prices.month;
          setAmount(Number(next));
          const promo = (prices as { promo?: { is_active?: boolean } }).promo;
          setPromoActive(Boolean(promo?.is_active));
        })
        .catch(() => {
          setAmount(null);
          setPromoActive(false);
        })
        .finally(() => setLoadingPrice(false));
      return;
    }
    if (!isRussianCourse) {
      setAmount(getCourseProductPrice(productCode, 'UZS'));
    } else {
      setAmount(null);
    }
    setPromoActive(false);
    setLoadingPrice(false);
  }, [hasValidState, isRussianCourse, productCode, tariffType, token]);

  useEffect(() => {
    if (!hasValidState && !paymentsLoading) {
      navigate(backPath, { replace: true });
    }
  }, [backPath, hasValidState, navigate, paymentsLoading]);

  const panDigits = normalizeCardPanDigits(cardNumber);
  const panFilled = panDigits.length === CARD_PAN_DIGITS_UZ;
  const panLuhnOk = panFilled && isValidPanLuhn(panDigits);
  const expireOk = normalizeExpireInput(expireDate).length === 4;

  const handleRequestSms = async () => {
    if (!token || !tariffType) return;
    setSubmitting(true);
    setError('');
    try {
      const exp = normalizeExpireInput(expireDate);
      if (exp.length !== 4) {
        setError('Karta muddatini kiriting (masalan 12/26)');
        return;
      }
      if (panDigits.length !== CARD_PAN_DIGITS_UZ) {
        setError(`Karta raqami ${CARD_PAN_DIGITS_UZ} ta raqam bo‘lishi kerak`);
        return;
      }
      if (!isValidPanLuhn(panDigits)) {
        setError('Karta raqami noto‘g‘ri. Raqamni tekshirib qayta kiriting.');
        return;
      }
      const res = await requestClickCardToken(token, {
        card_number: panDigits,
        expire_date: exp,
        plan_type: tariffType,
      });
      setPendingCardToken(res.card_token);
      setMaskedPhone(res.phone_number || '');
      setAutoStep('sms_sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMS yuborilmadi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndPay = async () => {
    if (!token || !tariffType || !pendingCardToken) return;
    setSubmitting(true);
    setError('');
    try {
      await verifyClickCardToken(token, {
        card_token: pendingCardToken,
        sms_code: smsCode.trim(),
        plan_type: tariffType,
      });
      setAutoStep('done');
      await refreshPayments();
      updateUser({
        billingNoticeUz: 'Avtomatik to‘lov yoqildi. Keyingi yechilish obuna tugash sanasiga mos keladi.',
      });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'CARD_DECLINED') {
        setError('Karta rad etildi. Boshqa kartadan foydalaning.');
      } else {
        setError(err.message || 'Tasdiqlash yoki to‘lov amalga oshmadi');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cardShell =
    'rounded-[24px] border border-slate-200/90 bg-white shadow-[0_14px_34px_rgba(148,163,184,0.12)]';

  const inputClass =
    'mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15';

  const primaryBtn =
    'mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50';

  if (!hasValidState && paymentsLoading) {
    return null;
  }

  if (hasPendingPayment && !paymentsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className={`w-full max-w-[400px] p-8 text-center ${cardShell}`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <CheckCircle className="h-8 w-8 text-amber-600" strokeWidth={2} />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">To‘lov kutilmoqda</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Bu kurs bo‘yicha tekshirilayotgan to‘lov mavjud.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className={`${primaryBtn} mt-6`}
          >
            Profilga o‘tish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10 pb-16">
      <main className="mx-auto max-w-[440px]">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">To‘lov</p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {isRussianCourse ? russianTariffDisplay : productLabel}
            </p>
          </div>
        </div>

        {user?.billingNoticeUz && isRussianCourse ? (
          <div className="mb-4 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="leading-snug">{user.billingNoticeUz}</p>
          </div>
        ) : null}

        <section className={`${cardShell} p-6 sm:p-8`}>
          {promoActive ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
              Aktsiya narxi faol. Click to‘lovini hozir yakunlang.
            </div>
          ) : null}
          {isRussianCourse ? (
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{russianTariffDisplay}</h2>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                {loadingPrice || amount == null ? '—' : formatAmount(amount)}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">{productLabel}</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-500">Bir martalik to‘lov — CLICK orqali.</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ja‘mi · UZS</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                  {loadingPrice || amount == null ? '—' : formatAmount(amount)}
                </p>
              </div>
            </div>
          )}

          {error ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {isCourseOneOffClick ? (
            <div className="mt-6 space-y-4">
              <PaymentLegalConsentCheckbox
                idPrefix="click-course"
                checked={legalAccepted}
                onChange={setLegalAccepted}
              />
              <ClickCoursePayButton
                token={token}
                productCode={productCode as ClickCoursePayProduct}
                disabled={loadingPrice || amount == null || !legalAccepted}
                onStarted={() => setError('')}
                onError={(msg) => setError(msg)}
                onSuccess={() => refreshPayments()}
              />
            </div>
          ) : null}

          {isRussianCourse ? (
            <div className="mt-6">
              {autoStep === 'idle' ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-row items-start gap-3 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <label htmlFor="cc-num" className="text-sm font-medium text-slate-700">
                          Karta raqami
                        </label>
                        <input
                          id="cc-num"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          spellCheck={false}
                          placeholder="8600 1234 5678 9012"
                          value={formatCardPanGroups(cardNumber)}
                          onChange={(e) => setCardNumber(normalizeCardPanDigits(e.target.value))}
                          className={`${inputClass} font-mono tabular-nums tracking-[0.02em]`}
                        />
                      </div>
                      <div className="w-[6.75rem] shrink-0 sm:w-[7.5rem]">
                        <label htmlFor="cc-exp" className="text-sm font-medium text-slate-700">
                          Karta muddati
                        </label>
                        <input
                          id="cc-exp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="12/26"
                          maxLength={5}
                          value={formatExpireSlash(expireDate)}
                          onChange={(e) => setExpireDate(normalizeExpireInput(e.target.value))}
                          className={`${inputClass} font-mono tabular-nums`}
                        />
                      </div>
                    </div>
                    {panFilled && !panLuhnOk ? (
                      <p className="mt-2 text-sm text-red-600">
                        Bu raqam bank kartasi formatiga mos kelmaydi. Tekshirib, qayta kiriting.
                      </p>
                    ) : null}
                  </div>
                  <PaymentLegalConsentCheckbox
                    idPrefix="click-russian"
                    checked={legalAccepted}
                    onChange={setLegalAccepted}
                  />
                  <button
                    type="button"
                    onClick={handleRequestSms}
                    disabled={
                      submitting ||
                      loadingPrice ||
                      amount == null ||
                      !panLuhnOk ||
                      !expireOk ||
                      !legalAccepted
                    }
                    className={primaryBtn}
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    SMS kodini olish
                  </button>
                </div>
              ) : null}

              {autoStep === 'sms_sent' ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Kod:{' '}
                    <span className="font-medium text-slate-900">{maskedPhone || 'telefon raqamingiz'}</span>
                  </p>
                  <div>
                    <label htmlFor="sms" className="text-sm font-medium text-slate-700">
                      SMS kod
                    </label>
                    <input
                      id="sms"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyAndPay}
                    disabled={submitting || smsCode.length < 4}
                    className={primaryBtn}
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    Tasdiqlash va to‘lash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoStep('idle');
                      setSmsCode('');
                      setPendingCardToken('');
                    }}
                    className="w-full py-2 text-center text-sm font-medium text-slate-500 hover:text-slate-800"
                  >
                    Orqaga
                  </button>
                </div>
              ) : null}

              {autoStep === 'done' ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-5 py-6 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" strokeWidth={1.75} />
                  <p className="mt-4 text-lg font-semibold text-emerald-950">Avtotolov yoqildi</p>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
                    Obuna tugaganda navbatdagi yechilish avtomatik uriniladi.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className={`${primaryBtn} mt-6 bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700`}
                  >
                    Tayyor
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="mt-8 border-t border-slate-100 pt-6 text-center text-[11px] leading-relaxed text-slate-400">
            To‘lov Click orqali. Karta raqamingiz serverda saqlanmaydi.
          </p>
        </section>
      </main>
    </div>
  );
}
