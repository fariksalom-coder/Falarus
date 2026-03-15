import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PricingCard from '../components/pricing/PricingCard';
import FeatureCard from '../components/pricing/FeatureCard';
import CurrencyModal from '../components/pricing/CurrencyModal';
import { getPublicPricing, type PublicPricingPlan } from '../api/pricing';
import type { Currency } from '../components/pricing/CurrencyModal';

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

const DEFAULT_PLANS: PlanCard[] = [
  {
    duration: '1 OY',
    price: '99 000 so\'m',
    pricePerMonth: "99 000",
    pricePerMonthUnit: "so'm/oy",
    originalPerMonth: ORIGINAL_PER_MONTH,
    periodLabel: undefined,
    totalOriginal: "250 000 so'm",
    features: BENEFITS,
    buttonLabel: "1 oyga sotib olish",
    highlighted: false,
    badge: undefined,
  },
  {
    duration: '3 OY',
    price: '199 000 so\'m',
    pricePerMonth: "66 000",
    pricePerMonthUnit: "so'm/oy",
    originalPerMonth: ORIGINAL_PER_MONTH,
    periodLabel: undefined,
    totalOriginal: "750 000 so'm",
    features: BENEFITS,
    buttonLabel: "3 oyga sotib olish",
    highlighted: false,
    badge: undefined,
  },
  {
    duration: '1 YIL',
    price: '299 000 so\'m',
    pricePerMonth: "25 000",
    pricePerMonthUnit: "so'm/oy",
    originalPerMonth: ORIGINAL_PER_MONTH,
    periodLabel: undefined,
    totalOriginal: "3 000 000 so'm",
    features: BENEFITS,
    buttonLabel: "Bir yilga sotib olish",
    highlighted: true,
    badge: 'Eng mashhur ⭐',
  },
];

function formatPrice(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function mapApiPlanToCard(p: PublicPricingPlan): PlanCard {
  const days = p.duration_days;
  const priceNum = Number(p.price);
  const pricePerMonthNum = Math.round((priceNum / days) * 30);
  const duration =
    days <= 31 ? '1 OY' : days <= 95 ? '3 OY' : '1 YIL';
  const totalOriginalNum = 250_000 * (days / 30);
  const buttonLabel =
    days <= 31
      ? "1 oyga sotib olish"
      : days <= 95
        ? "3 oyga sotib olish"
        : "Bir yilga sotib olish";
  const highlighted = days > 95;
  return {
    duration,
    price: `${formatPrice(priceNum)} so'm`,
    pricePerMonth: formatPrice(pricePerMonthNum),
    pricePerMonthUnit: "so'm/oy",
    originalPerMonth: ORIGINAL_PER_MONTH,
    periodLabel: undefined,
    totalOriginal: `${formatPrice(Math.round(totalOriginalNum))} so'm`,
    features: BENEFITS,
    buttonLabel,
    highlighted,
    badge: highlighted ? 'Eng mashhur ⭐' : undefined,
  };
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
  const [plans, setPlans] = useState<PlanCard[]>(DEFAULT_PLANS);
  const [currencyModal, setCurrencyModal] = useState<{ open: boolean; tariffType: 'month' | '3months' | 'year'; tariffLabel: string } | null>(null);

  useEffect(() => {
    getPublicPricing()
      .then((rows) => setPlans(rows.map(mapApiPlanToCard)))
      .catch(() => setPlans(DEFAULT_PLANS));
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
        {/* 1. Hero */}
        <section className="mb-16 text-center">
          <h1
            className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-5xl"
            style={{ color: TEXT }}
          >
            Rus tilini 0 dan erkin suhbatgacha o‘rganing
          </h1>
        </section>

        {/* 2. Pricing cards */}
        <section id="tariflar" className="mb-20">
          <p className="mb-6 text-center text-sm text-slate-500">
            Oddiy narx: <span className="font-semibold text-slate-600">250 000 so'm</span> / oy — hozir chegirmada
          </p>
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
                  onSelect={() => handleSelectPlan(plan)}
                />
              </div>
            ))}
          </div>
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
