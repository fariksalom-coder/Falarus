import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import PricingCard from '../components/pricing/PricingCard';
import FeatureCard from '../components/pricing/FeatureCard';
import CurrencyModal from '../components/pricing/CurrencyModal';
import { getTariffPricesByCurrency } from '../api/publicPricing';
import type { Currency } from '../components/pricing/CurrencyModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { useAuth } from '../context/AuthContext';

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

const ORIGINAL_PER_MONTH = "250 000 so'm/oy";

type PlanCard = {
  duration: string;
  price: string;
  pricePerMonth: string;
  pricePerMonthUnit: string;
  originalPerMonth: string;
  periodLabel?: string;
  totalOriginal: string;
  features: string[];
  buttonLabel: string;
  highlighted: boolean;
  badge?: string;
};

function formatPrice(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Строит три карточки из tariff_prices (UZS) — один источник правды с админкой Tariff Pricing */
function buildPlansFromTariffPrices(prices: { month: number; three_months: number; year: number }): PlanCard[] {
  const { month, three_months, year } = prices;
  const totalOriginalMonth = 250_000;
  const totalOriginal3 = 750_000;
  const totalOriginalYear = 3_000_000;
  return [
    {
      duration: '1 OY',
      price: `${formatPrice(month)} so'm`,
      pricePerMonth: formatPrice(month),
      pricePerMonthUnit: "so'm/oy",
      originalPerMonth: ORIGINAL_PER_MONTH,
      totalOriginal: `${formatPrice(totalOriginalMonth)} so'm`,
      features: BENEFITS,
      buttonLabel: "1 oyga sotib olish",
      highlighted: false,
    },
    {
      duration: '3 OY',
      price: `${formatPrice(three_months)} so'm`,
      pricePerMonth: formatPrice(three_months / 3),
      pricePerMonthUnit: "so'm/oy",
      originalPerMonth: ORIGINAL_PER_MONTH,
      totalOriginal: `${formatPrice(totalOriginal3)} so'm`,
      features: BENEFITS,
      buttonLabel: "3 oyga sotib olish",
      highlighted: false,
    },
    {
      duration: '1 YIL',
      price: `${formatPrice(year)} so'm`,
      pricePerMonth: formatPrice(year / 12),
      pricePerMonthUnit: "so'm/oy",
      originalPerMonth: ORIGINAL_PER_MONTH,
      totalOriginal: `${formatPrice(totalOriginalYear)} so'm`,
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

function durationToTariffType(duration: string): 'month' | '3months' | 'year' {
  if (duration === '1 YIL') return 'year';
  if (duration === '3 OY') return '3months';
  return 'month';
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { hasPendingPayment } = usePaymentStatus();
  const [plans, setPlans] = useState<PlanCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currencyModal, setCurrencyModal] = useState<{ open: boolean; tariffType: 'month' | '3months' | 'year'; tariffLabel: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    getTariffPricesByCurrency('UZS')
      .then((prices) => setPlans(buildPlansFromTariffPrices(prices)))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = (plan: PlanCard) => {
    setCurrencyModal({
      open: true,
      tariffType: durationToTariffType(plan.duration),
      tariffLabel: plan.duration,
    });
  };

  const handleCurrencySelect = (currency: Currency) => {
    if (!currencyModal) return;
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
        {/* 1. Hero */}
        <section className="mb-16 text-center">
          <h1
            className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-5xl"
            style={{ color: TEXT }}
          >
            Rus tilini 0 dan erkin suhbatgacha o‘rganing
          </h1>
        </section>

        {/* 2. Pricing cards — данные только из tariff_prices (UZS), без мигания */}
        <section id="tariflar" className="mb-20">
          {token && hasPendingPayment && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <Info className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                Sizning to'lovingiz tekshirilmoqda. Administrator tasdiqlashini kuting.
              </p>
            </div>
          )}
          <p className="mb-6 text-center text-sm text-slate-500">
            Oddiy narx: <span className="font-semibold text-slate-600">250 000 so'm</span> / oy — hozir chegirmada
          </p>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {plans.map((plan, index) => (
                <div
                  key={plan.duration}
                  className={
                    index === 0 ? 'order-3 md:order-1' : index === 1 ? 'order-2 md:order-2' : 'order-1 md:order-3'
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
                    originalPerMonth={plan.originalPerMonth}
                    periodLabel={plan.periodLabel}
                    totalOriginal={plan.totalOriginal}
                    onSelect={hasPendingPayment ? undefined : () => handleSelectPlan(plan)}
                    purchaseDisabled={!!token && hasPendingPayment}
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
        />
      )}
    </div>
  );
}
