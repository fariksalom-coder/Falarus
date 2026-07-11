import { useState } from 'react';
import { ArrowLeft, BookOpen, Headphones, Landmark, Languages, MessageSquareText, Mic, PenSquare, Scale, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VNZH_COURSE_SECTIONS } from '../data/vnzhCourseData';
import CurrencyModal, { type Currency } from '../components/pricing/CurrencyModal';
import { useAccess } from '../context/AccessContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { openRahmatCheckout } from '../api/rahmat';
import { COURSE_PRODUCT_META } from '../../shared/paymentProducts';

const vnzhMeta = COURSE_PRODUCT_META.vnzh;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function toRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

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
  const { t } = useLocale();
  const { token } = useAuth();
  const { refreshPayments } = usePaymentStatus();
  const { access } = useAccess();
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePurchase = (currency: Currency) => {
    setPaymentError(null);
    if (currency === 'UZS') {
      if (!token) {
        navigate('/login');
        return;
      }
      void (async () => {
        try {
          await openRahmatCheckout({
            token,
            productCode: 'vnzh',
            afterCreate: refreshPayments,
          });
        } catch (e) {
          setPaymentError(e instanceof Error ? e.message : t('vnzh.rahmatStartError'));
        }
      })();
      return;
    }
    navigate('/payment', {
      state: {
        productCode: 'vnzh',
        productLabel: vnzhMeta.label,
        currency,
        returnTo: '/kurslar/vnzh',
      },
    });
  };

  const totalTasks = VNZH_COURSE_SECTIONS.reduce((acc, s) => acc + s.tasks.length, 0);
  const totalSections = VNZH_COURSE_SECTIONS.length;
  const skillsCount = 5;

  return (
    <div className="vnzh-premium min-h-screen pb-16">
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[13px] bg-pmn-card text-[#123A32] shadow-[0_6px_16px_-6px_rgba(18,58,50,0.25)] ring-1 ring-pmn-border transition active:scale-95"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>

        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#9A947F]">
          Kurslar
        </p>

        {/* Forest hero card with gold BHЖ badge, serif title, description, 3 stats */}
        <section className="vnzh-forest-panel relative mb-5 overflow-hidden rounded-[24px] px-5 py-6 text-white shadow-[0_22px_44px_-16px_rgba(11,41,38,0.55)]">
          <div className="flex items-start gap-4">
            {/* Circular BHЖ badge — gold ring on forest */}
            <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)] ring-2 ring-[#CBA35A]/70">
              <span className="vnzh-heading text-[16px] font-bold text-[#E4C88A]">ВНЖ</span>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#CBA35A]">
                Rasmiy imtihon
              </p>
              <h1 className="vnzh-heading mt-1 text-[26px] leading-tight text-white sm:text-[28px]">
                ВНЖ imtihoni
              </h1>
            </div>
          </div>

          <p className="mt-4 text-[13.5px] leading-relaxed text-white/80">
            Yashash uchun ruxsatnoma. {totalTasks} savol bo'yicha to'liq tayyorgarlik — {skillsCount} ko'nikma, tarix va qonunchilik.
          </p>

          {/* Divider */}
          <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-[#CBA35A]/40 to-transparent" />

          {/* 3 stats row */}
          <div className="relative mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="vnzh-heading text-[28px] leading-none text-white">{totalTasks}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#CBA35A]">
                Savol
              </p>
            </div>
            <div className="border-x border-[#CBA35A]/25 px-3">
              <p className="vnzh-heading text-[28px] leading-none text-white">{skillsCount}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#CBA35A]">
                Ko'nikma
              </p>
            </div>
            <div>
              <p className="vnzh-heading text-[28px] leading-none text-white">{totalSections}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#CBA35A]">
                Bo'lim
              </p>
            </div>
          </div>
        </section>

        {paymentError ? (
          <p className="mb-4 rounded-[16px] border border-[#F5B6B6] bg-[#FDE5E5] px-4 py-3 text-sm font-semibold text-[#8A1F1F]">
            {paymentError}
          </p>
        ) : null}

        {access?.vnzh_course_active !== true ? (
          <section className="mb-6 rounded-[22px] bg-pmn-card p-5 shadow-[0_14px_28px_-14px_rgba(18,58,50,0.18)] ring-1 ring-pmn-border">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-pmn-gold-deep">
                Premium
              </p>
              <p className="vnzh-heading text-[22px] font-bold leading-none text-[#123A32]">
                {vnzhMeta.prices.RUB}&nbsp;<span className="text-[13px] font-semibold text-[#8A8577]">₽</span>
              </p>
            </div>
            <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-[#5C5646]">
              4 ta bepul topshiriq — «Говорение» bo'limi. Qolgan {32 - 4}+ topshiriq va barcha bo'limlar to'lovdan so'ng ochiladi.
            </p>
            <button
              type="button"
              onClick={() => setCurrencyModalOpen(true)}
              className="vnzh-gold-cta mt-4 flex h-[52px] w-full items-center justify-center gap-1.5 rounded-[16px] px-4 text-[15px] font-black transition hover:brightness-[1.03] active:scale-[0.99]"
            >
              <span>Kursni sotib olish</span>
              <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
            </button>
          </section>
        ) : null}

        {/* Bo'limlar list with Roman numerals */}
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#9A947F]">
          Bo'limlar
        </p>
        <div className="space-y-2.5">
          {VNZH_COURSE_SECTIONS.map((section, idx) => {
            const Icon = getSectionIcon(section.icon);
            const range = getSectionRangeLabel(section.tasks);
            const isAudio = section.icon === 'listening';

            return (
              <button
                key={section.slug}
                type="button"
                onClick={() => navigate(`/kurslar/vnzh/${section.slug}`)}
                className="group w-full rounded-[20px] bg-pmn-card px-4 py-4 text-left shadow-[0_10px_24px_-14px_rgba(18,58,50,0.18)] ring-1 ring-pmn-border transition hover:-translate-y-0.5 active:scale-[0.995] sm:px-5"
              >
                <div className="flex items-center gap-4">
                  {/* Big serif Roman numeral */}
                  <div className="vnzh-heading flex h-11 w-11 shrink-0 items-center justify-center text-[26px] font-bold leading-none text-[#CBA35A]">
                    {toRoman(idx + 1)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="vnzh-heading text-[17px] font-bold leading-tight text-[#123A32] sm:text-[18px]">
                      {section.title}
                    </h2>
                    <p className="mt-0.5 text-[12.5px] font-semibold text-[#8A8577]">
                      {range} topshiriq{isAudio ? ' · audio' : ''}
                    </p>
                  </div>

                  {/* Muted forest icon in champagne circle */}
                  <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(203,163,90,0.14)] text-[#123A32] sm:flex">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-[#9A947F]" strokeWidth={2.4} />
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
