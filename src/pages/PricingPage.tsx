import { useNavigate } from 'react-router-dom';
import PricingCard from '../components/pricing/PricingCard';
import FeatureCard from '../components/pricing/FeatureCard';

const BG = '#F8FAFC';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const PRIMARY = '#6366F1';

const PLANS = [
  {
    duration: '1 OY',
    price: '100 000 so‘m',
    description: 'Kursga 1 oy to‘liq kirish',
    features: [
      'Barcha darslar',
      'Barcha mashqlar',
      'Statistika',
      'Reyting',
    ],
    buttonLabel: 'Boshlash',
    highlighted: false,
    badge: undefined,
  },
  {
    duration: '3 OY',
    price: '200 000 so‘m',
    description: '3 oy davomida to‘liq kirish',
    features: [
      'Barcha darslar',
      'Barcha mashqlar',
      'Statistika',
      'Reyting',
      "So'zlarni chuqur o'rganish",
    ],
    buttonLabel: 'Tanlash',
    highlighted: false,
    badge: undefined,
  },
  {
    duration: '1 YIL',
    price: '300 000 so‘m',
    description: '12 oy davomida to‘liq kirish',
    features: [
      'Barcha darslar',
      'Barcha mashqlar',
      'Statistika',
      'Reyting',
      'Barcha yangi darslar',
    ],
    buttonLabel: 'Tanlash',
    highlighted: true,
    badge: 'Eng mashhur ⭐',
  },
];

const FEATURES = [
  {
    icon: '📚',
    title: '1000+ so‘z',
    description: 'Eng kerakli so‘zlar',
  },
  {
    icon: '🎯',
    title: 'Amaliy mashqlar',
    description: "So'zlashishni mashq qiling",
  },
  {
    icon: '📊',
    title: 'Shaxsiy statistika',
    description: "O'z natijangizni kuzating",
  },
  {
    icon: '🏆',
    title: 'Reyting tizimi',
    description: "Top o'quvchilar bilan bellashing",
  },
];

export default function PricingPage() {
  const navigate = useNavigate();

  const handleSelectPlan = () => {
    navigate('/');
  };

  const handleStartCourse = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: BG }}>
      <div className="mx-auto max-w-[1100px] px-4 pt-8">
        {/* 1. Header */}
        <header className="mb-12 text-center">
          <h1
            className="text-3xl font-bold tracking-tight md:text-4xl"
            style={{ color: TEXT }}
          >
            Rus tilini o‘rganishni boshlang
          </h1>
          <p
            className="mx-auto mt-3 max-w-xl text-base md:text-lg"
            style={{ color: TEXT_SECONDARY }}
          >
            O‘zingizga mos tarifni tanlang va kursni to‘liq o‘rganing.
          </p>
        </header>

        {/* 2. Pricing block */}
        <section className="mb-16">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PricingCard
                key={plan.duration}
                duration={plan.duration}
                price={plan.price}
                description={plan.description}
                features={plan.features}
                buttonLabel={plan.buttonLabel}
                highlighted={plan.highlighted}
                badge={plan.badge}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        </section>

        {/* 3. Benefits block */}
        <section className="mb-16">
          <h2
            className="mb-8 text-center text-2xl font-bold"
            style={{ color: TEXT }}
          >
            Nima uchun bizning kurs?
          </h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {FEATURES.map((f) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
              />
            ))}
          </div>
        </section>

        {/* 4. Bottom CTA */}
        <section className="text-center">
          <p
            className="mb-6 text-xl font-bold"
            style={{ color: TEXT }}
          >
            Hoziroq boshlang va rus tilini tez o‘rganing.
          </p>
          <button
            type="button"
            onClick={handleStartCourse}
            className="rounded-xl px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
          >
            Kursni boshlash
          </button>
        </section>
      </div>
    </div>
  );
}
