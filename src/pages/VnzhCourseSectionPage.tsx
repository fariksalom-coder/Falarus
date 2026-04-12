import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Headphones,
  Landmark,
  Languages,
  Lock,
  MessageSquareText,
  Mic,
  PenSquare,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVnzhSection, isVnzhFreeTask } from '../data/vnzhCourseData';
import CurrencyModal, { type Currency } from '../components/pricing/CurrencyModal';
import PaywallModal from '../components/PaywallModal';
import { useAccess } from '../context/AccessContext';
import { COURSE_PRODUCT_META } from '../../shared/paymentProducts';

const BG = '#EEF6FF';
const CARD_BG = 'rgba(255,255,255,0.96)';
const BORDER = 'rgba(191,219,254,0.9)';
const TEXT = '#16324F';
const vnzhMeta = COURSE_PRODUCT_META.vnzh;

function getSectionIcon(icon: ReturnType<typeof getVnzhSection> extends infer T ? T extends { icon: infer U } ? U : never : never) {
  switch (icon) {
    case 'speaking':
      return Mic;
    case 'listening':
      return Headphones;
    case 'reading':
      return BookOpen;
    case 'writing':
      return PenSquare;
    case 'lexis':
      return Languages;
    case 'history':
      return Landmark;
    case 'law':
      return Scale;
    default:
      return MessageSquareText;
  }
}

export default function VnzhCourseSectionPage() {
  const navigate = useNavigate();
  const { sectionSlug } = useParams();
  const section = getVnzhSection(sectionSlug);
  const { access } = useAccess();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);

  const hasFullVnzh = access?.vnzh_course_active === true;

  const handlePurchase = (currency: Currency) => {
    navigate('/payment', {
      state: {
        productCode: 'vnzh',
        productLabel: vnzhMeta.label,
        currency,
        returnTo: sectionSlug ? `/kurslar/vnzh/${sectionSlug}` : '/kurslar/vnzh',
      },
    });
  };

  if (!section) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] px-4 py-6">
        <button
          type="button"
          onClick={() => navigate('/kurslar/vnzh')}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.12)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <p className="mt-6 text-lg font-semibold text-slate-800">Раздел не найден</p>
      </div>
    );
  }

  const Icon = getSectionIcon(section.icon);

  return (
    <div className="relative min-h-screen overflow-hidden pb-16" style={{ backgroundColor: BG }}>
      <div className="pointer-events-none absolute -left-16 bottom-[-3rem] h-52 w-52 rounded-full bg-[#DCEBFF]" />
      <div className="pointer-events-none absolute -right-10 top-[-2rem] h-64 w-64 rounded-full bg-[#E6F1FF]" />

      <main className="relative mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <div className="mb-6 flex items-center">
          <button
            type="button"
            onClick={() => navigate('/kurslar/vnzh')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)] backdrop-blur-sm transition hover:-translate-y-0.5"
            aria-label="Назад"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        </div>

        {!hasFullVnzh ? (
          <section className="mb-5 rounded-[28px] border border-[#D9E7F7] bg-white/88 p-5 shadow-[0_18px_44px_rgba(148,163,184,0.12)]">
            <p className="text-sm font-medium text-[#5B85B6]">{vnzhMeta.freeDescription}</p>
            <button
              type="button"
              onClick={() => setCurrencyModalOpen(true)}
              className="mt-4 inline-flex w-full items-center justify-center rounded-[18px] bg-[#2563EB] px-4 py-3 text-base font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 sm:w-auto"
            >
              Sotib olish: {vnzhMeta.prices.RUB} ₽
            </button>
          </section>
        ) : null}

        <section
          className="mb-5 rounded-[28px] border px-5 py-5 shadow-[0_18px_44px_rgba(148,163,184,0.14)]"
          style={{ borderColor: '#D9E7F7', background: section.accent }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#60A5FA_0%,#2563EB_100%)] text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)]">
              <Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-tight sm:text-[28px]" style={{ color: TEXT }}>
                {section.title}
              </h1>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {section.tasks.map((task) => {
            const isFree = isVnzhFreeTask(section.slug, task.slug);
            const isLocked = !hasFullVnzh && !isFree;

            return (
              <button
                key={task.slug}
                type="button"
                onClick={() => {
                  if (isLocked) {
                    setPaywallOpen(true);
                    return;
                  }
                  navigate(`/kurslar/vnzh/${section.slug}/${task.slug}`);
                }}
                className="group relative min-h-[150px] overflow-hidden rounded-[28px] border px-3 py-4 text-center shadow-[0_16px_34px_rgba(120,148,184,0.12)] transition-all duration-200 hover:-translate-y-1"
                style={{
                  borderColor: isLocked ? '#CBD5E1' : BORDER,
                  backgroundColor: isLocked ? 'rgba(241,245,249,0.96)' : CARD_BG,
                  boxShadow: isLocked
                    ? '0 8px 20px rgba(148,163,184,0.1)'
                    : '0 18px 34px rgba(120,148,184,0.14), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                <div
                  className={`pointer-events-none absolute bottom-1 right-3 font-black leading-none ${
                    isLocked ? 'text-slate-200' : 'text-[#F1F7FF]'
                  } ${String(task.shortLabel).length > 2 ? 'text-[42px]' : 'text-[56px]'}`}
                >
                  {task.shortLabel}
                </div>

                <div className="mt-2">
                  <p
                    className="text-[14px] font-bold sm:text-[15px]"
                    style={{ color: isLocked ? '#94A3B8' : TEXT }}
                  >
                    {task.title}
                  </p>
                  <p
                    className="mt-1 text-[12px] font-medium"
                    style={{
                      color: isLocked ? '#94A3B8' : '#5B85B6',
                    }}
                  >
                    {isLocked ? 'Yopiq' : 'Ochiq'}
                  </p>
                </div>

                <div
                  className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    isLocked ? 'bg-slate-100 text-slate-500' : 'bg-[#F4F9FF] text-[#6D88A9]'
                  }`}
                >
                  {isLocked ? <Lock className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Topshiriq
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {paywallOpen ? (
        <PaywallModal
          onClose={() => setPaywallOpen(false)}
          onAction={() => setCurrencyModalOpen(true)}
          title="Курс закрыт"
          description={`${vnzhMeta.paywallDescription}\n${vnzhMeta.freeDescription}`}
          buttonText="Купить"
        />
      ) : null}

      {currencyModalOpen ? (
        <CurrencyModal onClose={() => setCurrencyModalOpen(false)} onSelect={handlePurchase} />
      ) : null}
    </div>
  );
}
