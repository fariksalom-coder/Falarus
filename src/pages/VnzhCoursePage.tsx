import { useState } from 'react';
import { ArrowLeft, BookOpen, Headphones, Landmark, Languages, MessageSquareText, Mic, PenSquare, Scale, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VNZH_COURSE_SECTIONS } from '../data/vnzhCourseData';
import CurrencyModal, { type Currency } from '../components/pricing/CurrencyModal';
import { useAccess } from '../context/AccessContext';
import { COURSE_PRODUCT_META } from '../../shared/paymentProducts';
import { courseAssetUrl } from '../utils/courseAssetUrl';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const vnzhMeta = COURSE_PRODUCT_META.vnzh;

function getSectionIcon(icon: (typeof VNZH_COURSE_SECTIONS)[number]['icon']) {
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

function getSectionRangeLabel(tasks: (typeof VNZH_COURSE_SECTIONS)[number]['tasks']) {
  if (!tasks.length) return '';
  const first = tasks[0].slug.split('-')[0];
  const lastSlug = tasks[tasks.length - 1].slug;
  const last = lastSlug.includes('-') ? lastSlug.split('-')[1] : lastSlug;
  return `${first}-${last}`;
}

export default function VnzhCoursePage() {
  const navigate = useNavigate();
  const { access } = useAccess();
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);

  const handlePurchase = (currency: Currency) => {
    navigate('/payment', {
      state: {
        productCode: 'vnzh',
        productLabel: vnzhMeta.label,
        currency,
        returnTo: '/kurslar/vnzh',
      },
    });
  };

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <button
          type="button"
          onClick={() => navigate('/kurslar')}
          className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5"
          style={{ borderColor: BORDER }}
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        <section
          className="rounded-[28px] border px-5 py-6 shadow-[0_18px_44px_rgba(148,163,184,0.14)]"
          style={{
            borderColor: BORDER,
            background: 'linear-gradient(135deg, #EEF7FF 0%, #E0F2FE 100%)',
          }}
        >
          <div className="flex items-start gap-4">
            <img
              src={courseAssetUrl('/courses/course-vnzh-badge.svg')}
              alt="Экзамен на ВНЖ"
              className="h-16 w-16 shrink-0 rounded-full object-cover shadow-[0_14px_28px_rgba(37,99,235,0.18)]"
            />
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold sm:text-[28px]" style={{ color: TEXT }}>
                Экзамен на ВНЖ
              </h1>
            </div>
          </div>
        </section>

        {access?.vnzh_course_active !== true ? (
          <section className="mb-5 rounded-[28px] border border-[#D9E7F7] bg-white/88 p-5 shadow-[0_18px_44px_rgba(148,163,184,0.12)]">
            <p className="text-sm font-medium text-[#5B85B6]">{vnzhMeta.freeDescription}</p>
            <button
              type="button"
              onClick={() => setCurrencyModalOpen(true)}
              className="mt-4 inline-flex w-full items-center justify-center rounded-[18px] bg-[#2563EB] px-4 py-3 text-base font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 sm:w-auto"
            >
              Купить за {vnzhMeta.prices.RUB} ₽
            </button>
          </section>
        ) : null}

        <div className="space-y-3">
          {VNZH_COURSE_SECTIONS.map((section) => {
            const Icon = getSectionIcon(section.icon);

            return (
              <button
                key={section.slug}
                type="button"
                onClick={() => navigate(`/kurslar/vnzh/${section.slug}`)}
                className="w-full rounded-[24px] border px-4 py-4 text-left shadow-[0_14px_34px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 sm:px-5 sm:py-5"
                style={{
                  borderColor: BORDER,
                  background: section.accent,
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#60A5FA_0%,#2563EB_100%)] text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)]">
                    <Icon className="h-7 w-7" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-[20px] font-bold leading-tight sm:text-[22px]" style={{ color: TEXT }}>
                      {section.title}
                    </h2>
                    <p className="mt-1 text-sm sm:text-[15px]" style={{ color: TEXT_SECONDARY }}>
                      {getSectionRangeLabel(section.tasks)}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/85 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {currencyModalOpen ? (
        <CurrencyModal
          onClose={() => setCurrencyModalOpen(false)}
          onSelect={handlePurchase}
        />
      ) : null}
    </div>
  );
}
