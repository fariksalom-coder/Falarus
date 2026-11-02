import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import PricingCard from '../components/pricing/PricingCard';
import FeatureCard from '../components/pricing/FeatureCard';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useLocale } from '../context/LocaleContext';
import { openRahmatCheckout } from '../api/rahmat';
import {
  formatRubAmount,
  formatRussianTariffUzsMing,
  RUSSIAN_TARIFF_PLANS_RUB,
  type RussianTariffCode,
} from '../../shared/russianTariffs';

const BENEFIT_KEYS = [
  'pricing.benefitGrammar',
  'pricing.benefitVocab',
  'pricing.benefitInteractive',
  'pricing.benefitGames',
  'pricing.benefitStats',
  'pricing.benefitLeaderboard',
] as const;

type PlanCard = {
  tariffType: RussianTariffCode;
  duration: string;
  price: string;
  pricePerMonth: string;
  pricePerMonthUnit: string;
  priceSecondary?: string;
  compareAtPrice?: string;
  discountPercent?: number;
  savingsAmount?: string;
  description?: string;
  features: string[];
  buttonLabel: string;
  highlighted: boolean;
  badge?: string;
};

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

function buildRubPlans(
  features: string[],
  popularLabel: string,
): PlanCard[] {
  return RUSSIAN_TARIFF_PLANS_RUB.map((plan) => {
    const perMonth = Math.round(plan.priceRub / plan.months);
    const highlighted = plan.code === 'three_month';
    const hasSavings = plan.savingsRub > 0;
    return {
      tariffType: plan.code,
      duration: plan.labelUz,
      price: `${formatRubAmount(plan.priceRub)} ₽`,
      pricePerMonth: formatRubAmount(plan.priceRub),
      pricePerMonthUnit: '₽',
      priceSecondary: formatRussianTariffUzsMing(plan.priceUzs),
      compareAtPrice: hasSavings ? `${formatRubAmount(plan.wasRub)} ₽` : undefined,
      discountPercent: hasSavings ? plan.discountPercent : undefined,
      savingsAmount: hasSavings ? `${formatRubAmount(plan.savingsRub)} ₽` : undefined,
      description: plan.months > 1 ? `≈ ${formatRubAmount(perMonth)} ₽ / oy` : undefined,
      features,
      buttonLabel: 'Rahmat orqali to‘lash',
      highlighted,
      badge: highlighted ? `${popularLabel} ⭐` : undefined,
    };
  });
}

export default function PricingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const ortga = () => {
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  };
  const { t } = useLocale();
  const { token } = useAuth();
  const { access } = useAccess();
  const { hasPendingPayment, refreshPayments } = usePaymentStatus();
  const hasActivePremium = Boolean(access?.subscription_active);
  const [paymentError, setPaymentError] = useState('');
  const [buyingTariff, setBuyingTariff] = useState<RussianTariffCode | null>(null);

  const benefits = useMemo(() => BENEFIT_KEYS.map((key) => t(key)), [t]);
  const plans = useMemo(
    () => buildRubPlans(benefits, t('payment.popular')),
    [benefits, t],
  );

  const handleSelectPlan = (plan: PlanCard) => {
    if (!token) {
      navigate('/login');
      return;
    }
    setPaymentError('');
    setBuyingTariff(plan.tariffType);
    void (async () => {
      try {
        await openRahmatCheckout({
          token,
          productCode: 'russian',
          tariffType: plan.tariffType,
          afterCreate: refreshPayments,
        });
      } catch (e) {
        setPaymentError(
          e instanceof Error ? e.message : 'Rahmat to‘lovini ochib bo‘lmadi. Qayta urinib ko‘ring.',
        );
      } finally {
        setBuyingTariff(null);
      }
    })();
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
            onClick={ortga}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-pmn-card text-pmn-text shadow-[0_6px_16px_-6px_rgba(15,27,59,0.28)] ring-1 ring-pmn-border transition active:scale-95"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <h1 className="profile-heading text-[26px] leading-tight text-pmn-text">Tariflar</h1>
        </div>

        <section id="tariflar" className="mb-20">
          {token && hasPendingPayment && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <Info className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{t('pricing.pendingNotice')}</p>
            </div>
          )}
          {paymentError ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {paymentError}
            </div>
          ) : null}

          <p className="mb-5 text-center text-[12.5px] font-semibold text-pmn-text-muted">
            Narxlar rublda ko‘rsatiladi. To‘lov Rahmat orqali so‘mda — ekrandagi so‘m summasi bo‘yicha.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:max-w-5xl md:mx-auto md:gap-5">
            {plans.map((plan) => (
              <div
                key={plan.tariffType}
                className={plan.highlighted ? 'md:-mt-2 md:mb-2' : undefined}
              >
                <PricingCard
                  duration={plan.duration}
                  price={plan.price}
                  description={plan.description}
                  features={plan.features}
                  buttonLabel={
                    buyingTariff === plan.tariffType ? 'Ochilmoqda…' : plan.buttonLabel
                  }
                  highlighted={plan.highlighted}
                  badge={plan.badge}
                  pricePerMonth={plan.pricePerMonth}
                  pricePerMonthUnit={plan.pricePerMonthUnit}
                  priceSecondary={plan.priceSecondary}
                  compareAtPrice={plan.compareAtPrice}
                  discountPercent={plan.discountPercent}
                  savingsAmount={plan.savingsAmount}
                  onSelect={
                    hasPendingPayment || hasActivePremium || buyingTariff
                      ? undefined
                      : () => handleSelectPlan(plan)
                  }
                  purchaseDisabled={
                    (!!token && hasPendingPayment) || hasActivePremium || buyingTariff !== null
                  }
                  purchaseDisabledLabel={
                    buyingTariff !== null
                      ? buyingTariff === plan.tariffType
                        ? 'Ochilmoqda…'
                        : 'Kuting…'
                      : hasActivePremium
                        ? t('pricing.alreadyActive')
                        : t('payment.statusPending')
                  }
                />
              </div>
            ))}
          </div>
        </section>

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
                  <span
                    className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-app-text-muted md:inline"
                    aria-hidden
                  >
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
    </div>
  );
}
