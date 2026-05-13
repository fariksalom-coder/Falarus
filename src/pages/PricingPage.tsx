import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import PricingCard from '../components/pricing/PricingCard';
import FeatureCard from '../components/pricing/FeatureCard';
import CurrencyModal from '../components/pricing/CurrencyModal';
import UzsPaymentMethodModal from '../components/pricing/UzsPaymentMethodModal';
import { getTariffPricesByCurrency, getUserTariffPricesByCurrency, type UserTariffPricesPayload } from '../api/publicPricing';
import type { Currency } from '../components/pricing/CurrencyModal';
import { openRahmatCheckout } from '../api/rahmat';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';

const BG = '#F8FAFC';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const PRIMARY = '#6366F1';

const BENEFITS = [
  'Barcha grammatika darslari',
  "2600+ so'zli lug'at",
  'Interaktiv mashqlar',
  "Testlar va o'yinlar",
  'Shaxsiy statistika',
  'Reyting tizimi',
];

type PlanCard = {
  duration: string;
  price: string;
  pricePerMonth: string;
  pricePerMonthUnit: string;
  compareAtPrice: string;
  topCompareAtPrice?: string;
  /** Ilgari va joriy narxlardan hisoblangan chegirma foizi */
  discountPercent?: number;
  promoActive?: boolean;
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
function buildPlansFromTariffPrices(prices: { month: number; year: number }): PlanCard[] {
  const { month, year } = prices;
  return [
    {
      duration: '1 OY',
      price: `${formatPrice(month)} so'm`,
      pricePerMonth: formatPrice(month),
      pricePerMonthUnit: "so'm",
      compareAtPrice: `${formatPrice(WAS_UZS.month)} so'm`,
      discountPercent: discountPercentFromWas(WAS_UZS.month, month),
      promoActive: false,
      features: BENEFITS,
      buttonLabel: "1 oyga sotib olish",
      highlighted: false,
    },
    {
      duration: '1 YIL',
      price: `${formatPrice(year)} so'm`,
      pricePerMonth: formatPrice(year),
      pricePerMonthUnit: "so'm",
      compareAtPrice: `${formatPrice(WAS_UZS.year)} so'm`,
      discountPercent: discountPercentFromWas(WAS_UZS.year, year),
      promoActive: false,
      features: BENEFITS,
      buttonLabel: "Bir yilga sotib olish",
      highlighted: true,
      badge: 'Eng mashhur ⭐',
    },
  ];
}

function buildPlansFromUserPricing(payload: UserTariffPricesPayload): PlanCard[] {
  const monthFinal = Number(payload.quotes?.month?.final_amount ?? payload.month ?? 0);
  const yearFinal = Number(payload.quotes?.year?.final_amount ?? payload.year ?? 0);
  const promoActive = Boolean(payload.promo?.is_active);
  const monthDiscountPct = discountPercentFromWas(WAS_UZS.month, monthFinal);
  const yearDiscountPct = discountPercentFromWas(WAS_UZS.year, yearFinal);
  return [
    {
      duration: '1 OY',
      price: `${formatPrice(monthFinal)} so'm`,
      pricePerMonth: formatPrice(monthFinal),
      pricePerMonthUnit: "so'm",
      compareAtPrice: `${formatPrice(WAS_UZS.month)} so'm`,
      discountPercent: monthDiscountPct,
      promoActive,
      features: BENEFITS,
      buttonLabel: "1 oyga sotib olish",
      highlighted: false,
    },
    {
      duration: '1 YIL',
      price: `${formatPrice(yearFinal)} so'm`,
      pricePerMonth: formatPrice(yearFinal),
      pricePerMonthUnit: "so'm",
      compareAtPrice: `${formatPrice(WAS_UZS.year)} so'm`,
      discountPercent: yearDiscountPct,
      promoActive,
      features: BENEFITS,
      buttonLabel: "Bir yilga sotib olish",
      highlighted: true,
      badge: 'Eng mashhur ⭐',
    },
  ];
}

const WHY_COURSE = [
  {
    icon: '🧠',
    title: "Aqlli o'rganish tizimi",
    description: "So'zlarni 3 bosqich orqali tez yodlaysiz",
  },
  {
    icon: '🎮',
    title: "O'yin orqali o'rganish",
    description: "Mashqlar o'yin shaklida",
  },
  {
    icon: '📊',
    title: 'Shaxsiy statistika',
    description: "O'z natijalaringizni kuzatib boring",
  },
  {
    icon: '🏆',
    title: 'Reyting tizimi',
    description: "Boshqa o'quvchilar bilan raqobat qiling",
  },
];

const VOCAB_STEPS = [
  { num: '1', title: 'Tanishuv', desc: "So'zlarni ko'rasiz va eslab qolasiz" },
  { num: '2', title: 'Test', desc: "Har bir so'z bo'yicha savollar" },
  { num: '3', title: "Juftini topish", desc: "So'z va tarjimani moslashtirish" },
];

function durationToTariffType(duration: string): 'month' | 'year' {
  if (duration === '1 YIL') return 'year';
  return 'month';
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { access } = useAccess();
  const { hasPendingPayment, refreshPayments } = usePaymentStatus();
  const hasActivePremium = Boolean(access?.subscription_active);
  const [plans, setPlans] = useState<PlanCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoExpiresAt, setPromoExpiresAt] = useState<string | null>(null);
  const [promoRemainingSec, setPromoRemainingSec] = useState(0);
  const [promoSpotlight, setPromoSpotlight] = useState(false);
  const [currencyQuotes, setCurrencyQuotes] = useState<
    Partial<Record<Currency, { month: { final: number; base: number; discount: number }; year: { final: number; base: number; discount: number } }>>
  >({});
  const [currencyModal, setCurrencyModal] = useState<{ open: boolean; tariffType: 'month' | 'year'; tariffLabel: string } | null>(null);
  const [uzsMethodModal, setUzsMethodModal] = useState<{ tariffType: 'month' | 'year'; tariffLabel: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      if (token) {
        const current = await getUserTariffPricesByCurrency(token, 'UZS');
        const shouldStartPromo = !current.promo?.started_at && !current.promo?.expires_at;
        const data = shouldStartPromo
          ? await getUserTariffPricesByCurrency(token, 'UZS', { startPromo: true })
          : current;
        setPlans(buildPlansFromUserPricing(data));
        setPromoExpiresAt(data.promo?.expires_at ?? null);
        setPromoRemainingSec(Number(data.promo?.remaining_sec ?? 0));
        return;
      }
      const prices = await getTariffPricesByCurrency('UZS');
      setPlans(buildPlansFromTariffPrices(prices));
    };
    load()
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!promoExpiresAt) return;
    const tick = () => {
      const sec = Math.max(0, Math.floor((new Date(promoExpiresAt).getTime() - Date.now()) / 1000));
      setPromoRemainingSec(sec);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [promoExpiresAt]);

  useEffect(() => {
    if (promoRemainingSec <= 0) return;
    const key = 'pricing-promo-spotlight-v1';
    const wasSeen = sessionStorage.getItem(key) === '1';
    if (wasSeen) return;
    sessionStorage.setItem(key, '1');
    setPromoSpotlight(true);
    const id = window.setTimeout(() => setPromoSpotlight(false), 7000);
    return () => window.clearTimeout(id);
  }, [promoRemainingSec]);

  const handleSelectPlan = (plan: PlanCard) => {
    setCurrencyModal({
      open: true,
      tariffType: durationToTariffType(plan.duration),
      tariffLabel: plan.duration,
    });
    if (!token) return;
    void Promise.all([
      getUserTariffPricesByCurrency(token, 'UZS'),
      getUserTariffPricesByCurrency(token, 'RUB'),
      getUserTariffPricesByCurrency(token, 'USD'),
    ]).then(([uzs, rub, usd]) => {
      setCurrencyQuotes({
        UZS: {
          month: {
            final: Number(uzs.quotes?.month?.final_amount ?? uzs.month),
            base: Number(uzs.quotes?.month?.base_amount ?? uzs.month),
            discount: Number(uzs.quotes?.month?.discount_amount ?? 0),
          },
          year: {
            final: Number(uzs.quotes?.year?.final_amount ?? uzs.year),
            base: Number(uzs.quotes?.year?.base_amount ?? uzs.year),
            discount: Number(uzs.quotes?.year?.discount_amount ?? 0),
          },
        },
        RUB: {
          month: {
            final: Number(rub.quotes?.month?.final_amount ?? rub.month),
            base: Number(rub.quotes?.month?.base_amount ?? rub.month),
            discount: Number(rub.quotes?.month?.discount_amount ?? 0),
          },
          year: {
            final: Number(rub.quotes?.year?.final_amount ?? rub.year),
            base: Number(rub.quotes?.year?.base_amount ?? rub.year),
            discount: Number(rub.quotes?.year?.discount_amount ?? 0),
          },
        },
        USD: {
          month: {
            final: Number(usd.quotes?.month?.final_amount ?? usd.month),
            base: Number(usd.quotes?.month?.base_amount ?? usd.month),
            discount: Number(usd.quotes?.month?.discount_amount ?? 0),
          },
          year: {
            final: Number(usd.quotes?.year?.final_amount ?? usd.year),
            base: Number(usd.quotes?.year?.base_amount ?? usd.year),
            discount: Number(usd.quotes?.year?.discount_amount ?? 0),
          },
        },
      });
    }).catch(() => {
      setCurrencyQuotes({});
    });
  };

  const promoClock = `${String(Math.floor(promoRemainingSec / 60)).padStart(2, '0')}:${String(
    promoRemainingSec % 60
  ).padStart(2, '0')}`;
  const promoProgressPct = Math.max(0, Math.min(100, (promoRemainingSec / (30 * 60)) * 100));

  const handleCurrencySelect = (currency: Currency) => {
    if (!currencyModal) return;
    if (currency === 'UZS') {
      const { tariffType, tariffLabel } = currencyModal;
      setCurrencyModal(null);
      if (!token) {
        setUzsMethodModal({ tariffType, tariffLabel });
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
        } catch {
          setUzsMethodModal({ tariffType, tariffLabel });
        }
      })();
      return;
    }
    navigate('/payment', {
      state: { tariffType: currencyModal.tariffType, currency, tariffLabel: currencyModal.tariffLabel },
    });
    setCurrencyModal(null);
  };

  const handleManualTransfer = () => {
    if (!uzsMethodModal) return;
    navigate('/payment', {
      state: {
        tariffType: uzsMethodModal.tariffType,
        tariffLabel: uzsMethodModal.tariffLabel,
        currency: 'UZS' as const,
        productCode: 'russian',
        productLabel: 'Курс русского языка',
        returnTo: '/tariflar',
      },
    });
    setUzsMethodModal(null);
  };

  const handleClickCardSms = () => {
    if (!uzsMethodModal) return;
    navigate('/payment/click', {
      state: {
        tariffType: uzsMethodModal.tariffType,
        tariffLabel: uzsMethodModal.tariffLabel,
        productCode: 'russian',
        productLabel: 'Курс русского языка',
        returnTo: '/tariflar',
        clickMode: 'card_sms',
      },
    });
    setUzsMethodModal(null);
  };

  const scrollToTariffs = () => {
    const el = document.getElementById('tariflar');
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: BG }}>
      <div className="mx-auto max-w-6xl px-4 pt-10 md:pt-14">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Orqaga
        </button>
        {/* 1. Pricing cards — данные только из tariff_prices (UZS), без мигания */}
        <section id="tariflar" className="mb-20">
          {promoRemainingSec > 0 && (
            <div
              className={`mb-6 overflow-hidden rounded-[24px] border border-amber-300/70 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-5 shadow-[0_18px_38px_rgba(245,158,11,0.18)] transition-all duration-500 ${
                promoSpotlight ? 'scale-[1.02] ring-4 ring-amber-300/50' : 'scale-100'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-full">
                  <p className="text-center text-sm font-extrabold uppercase tracking-wide text-amber-800">
                    Narx oshishiga oz qoldi
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm ring-1 ring-amber-200">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Qolgan vaqt</p>
                  <p
                    className={`mt-1 text-4xl font-black tabular-nums leading-none text-amber-950 ${
                      promoRemainingSec <= 300 ? 'animate-pulse' : ''
                    }`}
                  >
                    {promoClock}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-amber-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-1000 ${
                    promoRemainingSec <= 300 ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${promoProgressPct}%` }}
                />
              </div>
              <p className="mt-3 text-[13px] font-semibold text-amber-900">
                Hoziroq xarid qiling
              </p>
            </div>
          )}
          {token && hasPendingPayment && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <Info className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                Sizning to'lovingiz tekshirilmoqda. Administrator tasdiqlashini kuting.
              </p>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:max-w-4xl md:mx-auto md:gap-8">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`rounded-2xl border border-slate-200 bg-white p-6 animate-pulse ${
                    i === 2 ? 'order-1 md:order-2' : 'order-2 md:order-1'
                  }`}
                >
                  <div className="h-6 bg-slate-200 rounded w-16 mb-4" />
                  <div className="h-8 bg-slate-200 rounded w-24 mb-2" />
                  <div className="h-6 bg-slate-100 rounded w-32 mb-6" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-slate-100 rounded w-full" />
                    ))}
                  </div>
                  <div className="mt-6 h-12 bg-slate-200 rounded-xl" />
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
                    purchaseDisabledLabel={hasActivePremium ? 'Premium allaqachon faol' : "To'lov tekshirilmoqda"}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">Narxlar yuklanmadi. Sahifani yangilab ko‘ring.</p>
          )}
        </section>

        {/* 3. Why this course */}
        <section className="mb-20">
          <h2
            className="mb-10 text-center text-2xl font-bold md:text-3xl"
            style={{ color: TEXT }}
          >
            Nima uchun bu kurs samarali?
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_COURSE.map((f) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
              />
            ))}
          </div>
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={scrollToTariffs}
              className="rounded-2xl px-8 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: PRIMARY }}
            >
              Kursga yozilish
            </button>
          </div>
        </section>

        {/* 4. Vocabulary 3-step */}
        <section className="mb-20">
          <h2
            className="mb-10 text-center text-2xl font-bold md:text-3xl"
            style={{ color: TEXT }}
          >
            2600+ rus so‘zlarini oson yodlang
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {VOCAB_STEPS.map((step, i) => (
              <div
                key={step.num}
                className="relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-all hover:shadow-md"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-600">
                  {step.num}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
                {i < VOCAB_STEPS.length - 1 && (
                  <span className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-slate-300 md:inline" aria-hidden>
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
              className="rounded-2xl px-8 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: PRIMARY }}
            >
              Kursga yozilish
            </button>
          </div>
        </section>
      </div>

      {currencyModal?.open && (
        <CurrencyModal
          onClose={() => setCurrencyModal(null)}
          onSelect={handleCurrencySelect}
          showPromoHint={promoRemainingSec > 0}
          currencyPriceMeta={currencyModal ? {
            UZS: {
              final: currencyQuotes.UZS?.[currencyModal.tariffType].final ?? NaN,
              base: currencyQuotes.UZS?.[currencyModal.tariffType].base ?? NaN,
              discount: currencyQuotes.UZS?.[currencyModal.tariffType].discount ?? 0,
            },
            RUB: {
              final: currencyQuotes.RUB?.[currencyModal.tariffType].final ?? NaN,
              base: currencyQuotes.RUB?.[currencyModal.tariffType].base ?? NaN,
              discount: currencyQuotes.RUB?.[currencyModal.tariffType].discount ?? 0,
            },
            USD: {
              final: currencyQuotes.USD?.[currencyModal.tariffType].final ?? NaN,
              base: currencyQuotes.USD?.[currencyModal.tariffType].base ?? NaN,
              discount: currencyQuotes.USD?.[currencyModal.tariffType].discount ?? 0,
            },
          } : undefined}
        />
      )}

      {uzsMethodModal ? (
        <UzsPaymentMethodModal
          onClose={() => setUzsMethodModal(null)}
          onManualTransfer={handleManualTransfer}
          onClickCardSms={handleClickCardSms}
          clickButtonConfig={{
            token,
            productCode: 'russian',
            tariffType: uzsMethodModal.tariffType,
          }}
        />
      ) : null}
    </div>
  );
}
