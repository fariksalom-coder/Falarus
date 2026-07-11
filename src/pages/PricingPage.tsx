import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import PricingCard from '../components/pricing/PricingCard';
import FeatureCard from '../components/pricing/FeatureCard';
import CurrencyModal from '../components/pricing/CurrencyModal';
import { getTariffPricesByCurrency, getUserTariffPricesByCurrency } from '../api/publicPricing';
import type { Currency } from '../components/pricing/CurrencyModal';
import { openRahmatCheckout } from '../api/rahmat';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useLocale } from '../context/LocaleContext';

const BENEFIT_KEYS = [
  'pricing.benefitGrammar',
  'pricing.benefitVocab',
  'pricing.benefitInteractive',
  'pricing.benefitGames',
  'pricing.benefitStats',
  'pricing.benefitLeaderboard',
] as const;

type PlanCard = {
  tariffType: 'month' | 'year';
  duration: string;
  price: string;
  pricePerMonth: string;
  pricePerMonthUnit: string;
  compareAtPrice: string;
  topCompareAtPrice?: string;
  /** Ilgari va joriy narxlardan hisoblangan chegirma foizi */
  discountPercent?: number;
  features: string[];
  buttonLabel: string;
  highlighted: boolean;
  badge?: string;
};

/** Marketing: ilgari narxlari (chiziq bilan kartochkada) */
const WAS_UZS = {
  month: 250_000,
  year: 3_000_000,
} as const;

function formatPrice(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Ilgari narxdan chegirma foizi (yaxlitlangan). */
function discountPercentFromWas(was: number, sale: number): number | undefined {
  if (!Number.isFinite(was) || !Number.isFinite(sale) || was <= 0 || sale <= 0 || sale >= was) return undefined;
  const pct = Math.round(((was - sale) / was) * 100);
  return pct > 0 ? pct : undefined;
}

/** Kartochkalar: joriy `tariff_prices` UZS. Ilgari narxlari dizayn konstantalari. */
function buildPlansFromTariffPrices(
  prices: { month: number; year: number },
  copy: {
    monthLabel: string;
    yearLabel: string;
    monthBuy: string;
    yearBuy: string;
    popular: string;
    currency: string;
  },
  features: string[],
): PlanCard[] {
  const { month, year } = prices;
  return [
    {
      tariffType: 'month',
      duration: copy.monthLabel,
      price: `${formatPrice(month)} ${copy.currency}`,
      pricePerMonth: formatPrice(month),
      pricePerMonthUnit: copy.currency,
      compareAtPrice: `${formatPrice(WAS_UZS.month)} ${copy.currency}`,
      discountPercent: discountPercentFromWas(WAS_UZS.month, month),
      features,
      buttonLabel: copy.monthBuy,
      highlighted: false,
    },
    {
      tariffType: 'year',
      duration: copy.yearLabel,
      price: `${formatPrice(year)} ${copy.currency}`,
      pricePerMonth: formatPrice(year),
      pricePerMonthUnit: copy.currency,
      compareAtPrice: `${formatPrice(WAS_UZS.year)} ${copy.currency}`,
      discountPercent: discountPercentFromWas(WAS_UZS.year, year),
      features,
      buttonLabel: copy.yearBuy,
      highlighted: true,
      badge: `${copy.popular} ⭐`,
    },
  ];
}

const WHY_COURSE = [
  {
    icon: '🧠',
    titleKey: 'pricing.whySmartTitle',
    descriptionKey: 'pricing.whySmartDesc',
  },
  {
    icon: '🎮',
    titleKey: 'pricing.whyGameTitle',
    descriptionKey: 'pricing.whyGameDesc',
  },
  {
    icon: '📊',
    titleKey: 'pricing.whyStatsTitle',
    descriptionKey: 'pricing.whyStatsDesc',
  },
  {
    icon: '🏆',
    titleKey: 'pricing.whyLeaderboardTitle',
    descriptionKey: 'pricing.whyLeaderboardDesc',
  },
  ] as const;

const VOCAB_STEPS = [
  { num: '1', titleKey: 'kunlik.stepLearn', descKey: 'pricing.vocabStepLearnDesc' },
  { num: '2', titleKey: 'kunlik.stepTest', descKey: 'pricing.vocabStepTestDesc' },
  { num: '3', titleKey: 'kunlik.stepPairs', descKey: 'pricing.vocabStepPairsDesc' },
] as const;

export default function PricingPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { token } = useAuth();
  const { access } = useAccess();
  const { hasPendingPayment, refreshPayments } = usePaymentStatus();
  const hasActivePremium = Boolean(access?.subscription_active);
  const [plans, setPlans] = useState<PlanCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currencyQuotes, setCurrencyQuotes] = useState<
    Partial<Record<Currency, { month: number; year: number }>>
  >({});
  const [currencyModal, setCurrencyModal] = useState<{ open: boolean; tariffType: 'month' | 'year'; tariffLabel: string } | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const planCopy = useMemo(
    () => ({
      monthLabel: t('payment.buyMonth'),
      yearLabel: t('payment.buyYear'),
      monthBuy: t('payment.buyMonthAction'),
      yearBuy: t('payment.buyYearAction'),
      popular: t('payment.popular'),
      currency: t('payment.currency'),
    }),
    [t],
  );
  const benefits = useMemo(() => BENEFIT_KEYS.map((key) => t(key)), [t]);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      const prices = token
        ? await getUserTariffPricesByCurrency(token, 'UZS')
        : await getTariffPricesByCurrency('UZS');
      setPlans(buildPlansFromTariffPrices(prices, planCopy, benefits));
    };
    load()
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [token, planCopy, benefits]);

  const handleSelectPlan = (plan: PlanCard) => {
    setCurrencyModal({
      open: true,
      tariffType: plan.tariffType,
      tariffLabel: plan.duration,
    });
    if (!token) return;
    void Promise.all([
      getUserTariffPricesByCurrency(token, 'UZS'),
      getUserTariffPricesByCurrency(token, 'RUB'),
      getUserTariffPricesByCurrency(token, 'USD'),
    ]).then(([uzs, rub, usd]) => {
      setCurrencyQuotes({ UZS: uzs, RUB: rub, USD: usd });
    }).catch(() => {
      setCurrencyQuotes({});
    });
  };

  const handleCurrencySelect = (currency: Currency) => {
    if (!currencyModal) return;
    setPaymentError('');
    if (currency === 'UZS') {
      const { tariffType } = currencyModal;
      setCurrencyModal(null);
      if (!token) {
        navigate('/login');
        return;
      }
      void (async () => {
        try {
          await openRahmatCheckout({
            token,
            productCode: 'russian',
            tariffType,
            afterCreate: refreshPayments,
          });
        } catch (e) {
          setPaymentError(e instanceof Error ? e.message : t('payment.rahmatStartError'));
        }
      })();
      return;
    }
    navigate('/payment', {
      state: { tariffType: currencyModal.tariffType, currency, tariffLabel: currencyModal.tariffLabel },
    });
    setCurrencyModal(null);
  };

  const scrollToTariffs = () => {
    const el = document.getElementById('tariflar');
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="profile-premium min-h-screen pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-6 md:pt-8">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-pmn-card text-pmn-text shadow-[0_6px_16px_-6px_rgba(15,27,59,0.28)] ring-1 ring-pmn-border transition active:scale-95"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <h1 className="profile-heading text-[26px] leading-tight text-pmn-text">
            Tariflar
          </h1>
        </div>
        {/* 1. Pricing cards — данные только из tariff_prices (UZS), без мигания */}
        <section id="tariflar" className="mb-20">
          {token && hasPendingPayment && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/12 dark:text-amber-200">
              <Info className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                {t('pricing.pendingNotice')}
              </p>
            </div>
          )}
          {paymentError ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/12 dark:text-red-300">
              {paymentError}
            </div>
          ) : null}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:max-w-4xl md:mx-auto md:gap-8">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`animate-pulse rounded-2xl border border-app-border bg-app-surface p-6 ${
                    i === 2 ? 'order-1 md:order-2' : 'order-2 md:order-1'
                  }`}
                >
                  <div className="mb-4 h-6 w-16 rounded bg-app-bg-subtle" />
                  <div className="mb-2 h-8 w-24 rounded bg-app-bg-subtle" />
                  <div className="mb-6 h-6 w-32 rounded bg-app-bg-subtle" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 w-full rounded bg-app-bg-subtle" />
                    ))}
                  </div>
                  <div className="mt-6 h-12 rounded-xl bg-app-bg-subtle" />
                </div>
              ))}
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:max-w-4xl md:mx-auto md:gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.duration}
                  className={
                    plan.highlighted ? 'order-1 md:order-2' : 'order-2 md:order-1'
                  }
                >
                  <PricingCard
                    duration={plan.duration}
                    price={plan.price}
                    features={plan.features}
                    buttonLabel={plan.buttonLabel}
                    highlighted={plan.highlighted}
                    badge={plan.badge}
                    pricePerMonth={plan.pricePerMonth}
                    pricePerMonthUnit={plan.pricePerMonthUnit}
                    compareAtPrice={plan.compareAtPrice}
                    topCompareAtPrice={plan.topCompareAtPrice}
                    discountPercent={plan.discountPercent}
                    onSelect={hasPendingPayment || hasActivePremium ? undefined : () => handleSelectPlan(plan)}
                    purchaseDisabled={(!!token && hasPendingPayment) || hasActivePremium}
                    purchaseDisabledLabel={hasActivePremium ? t('pricing.alreadyActive') : t('payment.statusPending')}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-app-text-muted">{t('pricing.loadError')}</p>
          )}
        </section>

        {/* 3. Why this course */}
        <section className="mb-20">
          <h2 className="mb-10 text-center text-2xl font-bold text-app-text md:text-3xl">
            {t('pricing.whyTitle')}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_COURSE.map((f) => (
              <FeatureCard
                key={f.titleKey}
                icon={f.icon}
                title={t(f.titleKey)}
                description={t(f.descriptionKey)}
              />
            ))}
          </div>
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={scrollToTariffs}
              className="rounded-2xl bg-app-primary px-8 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.98]"
            >
              {t('pricing.ctaEnroll')}
            </button>
          </div>
        </section>

        {/* 4. Vocabulary 3-step */}
        <section className="mb-20">
          <h2 className="mb-10 text-center text-2xl font-bold text-app-text md:text-3xl">
            {t('pricing.vocabTitle')}
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {VOCAB_STEPS.map((step, i) => (
              <div
                key={step.num}
                className="relative flex flex-col items-center rounded-2xl border border-app-border bg-app-surface p-8 text-center shadow-app-soft transition-all hover:shadow-app-card"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-app-primary/12 text-2xl font-bold text-app-primary">
                  {step.num}
                </span>
                <h3 className="text-lg font-bold text-app-text">{t(step.titleKey)}</h3>
                <p className="mt-2 text-sm text-app-text-muted">{t(step.descKey)}</p>
                {i < VOCAB_STEPS.length - 1 && (
                  <span className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-app-text-muted md:inline" aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={scrollToTariffs}
              className="rounded-2xl bg-app-primary px-8 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.98]"
            >
              {t('pricing.ctaEnroll')}
            </button>
          </div>
        </section>
      </div>

      {currencyModal?.open && (
        <CurrencyModal
          onClose={() => setCurrencyModal(null)}
          onSelect={handleCurrencySelect}
          tariffType={currencyModal.tariffType}
          currencyPrices={currencyQuotes}
        />
      )}

    </div>
  );
}
