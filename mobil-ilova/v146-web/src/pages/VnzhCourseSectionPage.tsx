import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Headphones,
  Landmark,
  Languages,
  Lock,
  MessageSquareText,
  Mic,
  PenSquare,
  Scale,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVnzhSection, isVnzhFreeTask, VNZH_COURSE_SECTIONS } from '../data/vnzhCourseData';
import CurrencyModal, { type Currency } from '../components/pricing/CurrencyModal';
import PaywallModal from '../components/PaywallModal';
import { useAccess } from '../context/AccessContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { COURSE_PRODUCT_META } from '../../shared/paymentProducts';
import { openRahmatCheckout } from '../api/rahmat';

const vnzhMeta = COURSE_PRODUCT_META.vnzh;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

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
  const { t } = useLocale();
  const { token } = useAuth();
  const { refreshPayments } = usePaymentStatus();
  const { sectionSlug } = useParams();
  const section = getVnzhSection(sectionSlug);
  const { access } = useAccess();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const hasFullVnzh = access?.vnzh_course_active === true;

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
        returnTo: sectionSlug ? `/kurslar/vnzh/${sectionSlug}` : '/kurslar/vnzh',
      },
    });
  };

  if (!section) {
    return (
      <div className="vnzh-premium min-h-screen px-4 py-6">
        <button
          type="button"
          onClick={() => navigate('/kurslar/vnzh')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[13px] bg-pmn-card text-[#123A32] shadow-[0_6px_16px_-6px_rgba(18,58,50,0.25)] ring-1 ring-pmn-border"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <p className="mt-6 text-lg font-semibold text-[#123A32]">{t('vnzh.sectionNotFound')}</p>
      </div>
    );
  }

  const Icon = getSectionIcon(section.icon);
  const sectionIndex = VNZH_COURSE_SECTIONS.findIndex((s) => s.slug === section.slug);
  const romanNumeral = ROMAN[sectionIndex] ?? String(sectionIndex + 1);
  const freeCount = section.tasks.filter((t) => isVnzhFreeTask(section.slug, t.slug)).length;
  const total = section.tasks.length;
  const doneCount = 0; // no persistent per-task completion yet — placeholder for future.

  return (
    <div className={`vnzh-premium relative min-h-screen overflow-hidden ${!hasFullVnzh ? 'pb-[104px]' : 'pb-16'}`}>
      <main className="relative mx-auto max-w-2xl px-4 py-5 sm:px-5">
        {/* Header: back tile + BO'LIM caption + serif title */}
        <div className="mb-4 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/kurslar/vnzh')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-pmn-card text-[#123A32] shadow-[0_6px_16px_-6px_rgba(18,58,50,0.25)] ring-1 ring-pmn-border transition active:scale-95"
            aria-label={t('vnzh.backAria')}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.28em] text-[#9A947F]">
              Bo'lim {romanNumeral}
            </p>
            <h1 className="vnzh-heading mt-1 text-[22px] leading-tight text-[#123A32] sm:text-[24px]">
              {section.title}
            </h1>
          </div>
        </div>

        {/* Forest hero: big icon + section title + progress + count */}
        <section className="vnzh-forest-panel relative mb-5 overflow-hidden rounded-[24px] px-5 py-5 text-white shadow-[0_22px_44px_-16px_rgba(11,41,38,0.55)]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[16px] bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <Icon className="h-6 w-6 text-[#E4C88A]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="vnzh-heading text-[24px] leading-tight text-white sm:text-[26px]">
                {section.title}
              </h2>
              <p className="mt-0.5 text-[12.5px] font-semibold text-white/75">
                {total} topshiriq{freeCount > 0 ? ` · ${freeCount} tasi bepul` : ''}
              </p>
            </div>
          </div>

          {/* Progress bar (gold) */}
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(doneCount / Math.max(1, total)) * 100}%`,
                  background: 'linear-gradient(90deg, #EBD199 0%, #CBA35A 100%)',
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] font-bold text-[#CBA35A]">
              {doneCount} / {total} topshiriq bajarildi
            </p>
          </div>
        </section>

        {paymentError ? (
          <p className="mb-4 rounded-[16px] border border-[#F5B6B6] bg-[#FDE5E5] px-4 py-3 text-sm font-medium text-[#8A1F1F]">
            {paymentError}
          </p>
        ) : null}

        {!hasFullVnzh && section.slug !== 'govorenie' ? (
          <section className="mb-5 rounded-[22px] bg-pmn-card p-5 shadow-[0_14px_28px_-14px_rgba(18,58,50,0.18)] ring-1 ring-pmn-border">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0B2926]"
                style={{ background: 'linear-gradient(150deg, #EBD199 0%, #CBA35A 100%)' }}
              >
                <Lock className="h-4 w-4" strokeWidth={2.6} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-pmn-gold-deep">
                  Premium bo'lim
                </p>
                <p className="mt-0.5 text-[12.5px] font-semibold text-[#5C5646]">
                  Ochilishi uchun kursni sotib oling
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Timeline of tasks */}
        <div className="relative">
          {/* Vertical connector line behind nodes */}
          <div
            aria-hidden
            className="absolute left-[19px] top-4 bottom-4 w-px"
            style={{ background: 'linear-gradient(to bottom, transparent, #E2D9C4 12px, #E2D9C4 calc(100% - 12px), transparent)' }}
          />

          <div className="space-y-2.5">
            {section.tasks.map((task, idx) => {
              const isFree = isVnzhFreeTask(section.slug, task.slug);
              const isLocked = !hasFullVnzh && !isFree;
              const isDone = idx < doneCount;
              const isCurrent = idx === doneCount && !isLocked;

              return (
                <div key={task.slug} className="relative flex items-center gap-3">
                  {/* Timeline node */}
                  <div className="relative z-[2] flex h-10 w-10 shrink-0 items-center justify-center">
                    {isDone ? (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_6px_14px_-4px_rgba(46,125,87,0.55)]"
                        style={{ background: 'linear-gradient(150deg, #4CC490 0%, #2E7D57 100%)' }}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </div>
                    ) : isLocked ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0EADB] text-[#9A947F] ring-1 ring-pmn-border">
                        <Lock className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </div>
                    ) : (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#0B2926] shadow-[0_6px_14px_-4px_rgba(203,163,90,0.55)]"
                        style={{ background: 'linear-gradient(150deg, #EBD199 0%, #CBA35A 100%)' }}
                      >
                        <span className="text-[13px] font-black">{idx + 1}</span>
                      </div>
                    )}
                  </div>

                  {/* Task card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        setPaywallOpen(true);
                        return;
                      }
                      navigate(`/kurslar/vnzh/${section.slug}/${task.slug}`);
                    }}
                    className={`flex min-h-[62px] flex-1 items-center justify-between rounded-[18px] px-4 py-3 text-left transition active:scale-[0.995] ${
                      isCurrent
                        ? 'vnzh-forest-panel text-white shadow-[0_14px_28px_-14px_rgba(11,41,38,0.5)]'
                        : isLocked
                          ? 'bg-transparent text-[#9A947F] ring-1 ring-dashed ring-pmn-border'
                          : 'bg-pmn-card shadow-[0_10px_24px_-14px_rgba(18,58,50,0.18)] ring-1 ring-pmn-border'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`vnzh-heading text-[15px] font-bold leading-tight sm:text-[16px] ${
                          isCurrent ? 'text-white' : isLocked ? 'text-[#8A8577]' : 'text-[#123A32]'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p
                        className={`mt-0.5 text-[11.5px] font-semibold ${
                          isCurrent ? 'text-[#E4C88A]' : isLocked ? 'text-[#9A947F]' : 'text-[#8A8577]'
                        }`}
                      >
                        {isDone
                          ? 'Bajarildi · 100%'
                          : isCurrent
                            ? 'Davom eting'
                            : isLocked
                              ? "Sotib olgandan so'ng ochiladi"
                              : t('patent.statusOpen')}
                      </p>
                    </div>

                    {/* Right status pill */}
                    {isDone ? (
                      <span className="ml-3 shrink-0 rounded-full bg-[#E6F2EA] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#2E7D57] ring-1 ring-[#B7DCC4]">
                        Bepul
                      </span>
                    ) : isCurrent ? (
                      <span
                        className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black text-[#0B2926]"
                        style={{ background: 'linear-gradient(150deg, #EBD199 0%, #CBA35A 100%)' }}
                      >
                        Boshlash
                        <ChevronRight className="h-3 w-3" strokeWidth={2.6} />
                      </span>
                    ) : isLocked ? null : isFree ? (
                      <span className="ml-3 shrink-0 rounded-full bg-[#E6F2EA] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#2E7D57] ring-1 ring-[#B7DCC4]">
                        Bepul
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Sticky premium purchase bar — cream + gold CTA */}
      {!hasFullVnzh ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E2D9C4] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-14px_28px_-14px_rgba(18,58,50,0.18)]">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pmn-gold-deep">
                Premium
              </p>
              <p className="vnzh-heading truncate text-[16px] font-bold text-[#123A32]">
                {vnzhMeta.prices.RUB}&nbsp;<span className="text-[12px] font-semibold text-[#8A8577]">₽</span>
                <span className="ml-1.5 text-[11px] font-semibold text-[#8A8577]">· to'liq kurs</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrencyModalOpen(true)}
              className="vnzh-gold-cta flex h-[46px] shrink-0 items-center justify-center gap-1 rounded-full px-5 text-[14px] font-black transition hover:brightness-[1.03] active:scale-[0.99]"
            >
              <span>Sotib olish</span>
              <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      ) : null}

      {paywallOpen ? (
        <PaywallModal
          onClose={() => setPaywallOpen(false)}
          onAction={() => setCurrencyModalOpen(true)}
          title={t('patent.paywallTitle')}
          description={`${vnzhMeta.paywallDescription}\n${vnzhMeta.freeDescription}`}
          buttonText={t('patent.paywallBuy')}
        />
      ) : null}

      {currencyModalOpen ? (
        <CurrencyModal
          onClose={() => setCurrencyModalOpen(false)}
          onSelect={handlePurchase}
        />
      ) : null}
    </div>
  );
}
