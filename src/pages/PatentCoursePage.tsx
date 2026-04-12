import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PATENT_EXAM_VARIANTS } from '../data/patentExamData';
import CurrencyModal, { type Currency } from '../components/pricing/CurrencyModal';
import PaywallModal from '../components/PaywallModal';
import { useAccess } from '../context/AccessContext';
import { useAuth } from '../context/AuthContext';
import { getPatentVariantResults, type PatentVariantResult } from '../api/patentResults';
import { COURSE_PRODUCT_META } from '../../shared/paymentProducts';

const BG = '#EEF6FF';
const CARD_BG = '#E8F1FB';
const CARD_BG_LOCKED = 'rgba(203, 213, 225, 0.55)';
const BORDER = 'rgba(71, 85, 105, 0.28)';
const BORDER_LOCKED = 'rgba(100, 116, 139, 0.45)';
const TEXT = '#0F172A';
const patentMeta = COURSE_PRODUCT_META.patent;

export default function PatentCoursePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { access } = useAccess();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [results, setResults] = useState<PatentVariantResult[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setResults([]);
      setResultsError(null);
      return;
    }
    let cancelled = false;
    setResultsError(null);
    getPatentVariantResults(token)
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .catch((e) => {
        if (cancelled) return;
        setResults([]);
        setResultsError(e instanceof Error ? e.message : 'Natijalar yuklanmadi');
      });
    return () => {
      cancelled = true;
    };
  }, [token, access?.patent_course_active, location.key]);

  const resultMap = useMemo(
    () => new Map(results.map((item) => [item.variant_number, item])),
    [results]
  );

  const handlePurchase = (currency: Currency) => {
    navigate('/payment', {
      state: {
        productCode: 'patent',
        productLabel: patentMeta.label,
        currency,
        returnTo: '/kurslar/patent',
      },
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden pb-16" style={{ backgroundColor: BG }}>
      <div className="pointer-events-none absolute -left-16 bottom-[-3rem] h-52 w-52 rounded-full bg-[#DCEBFF]" />
      <div className="pointer-events-none absolute -right-10 top-[-2rem] h-64 w-64 rounded-full bg-[#E6F1FF]" />

      <main className="relative mx-auto max-w-4xl px-4 py-5 sm:px-5">
        <div className="mb-6 flex items-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)] backdrop-blur-sm transition hover:-translate-y-0.5"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        </div>

        {resultsError ? (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {resultsError}
          </p>
        ) : null}

        {access?.patent_course_active !== true ? (
          <section className="mb-5 rounded-[28px] border border-[#D9E7F7] bg-white/88 p-5 shadow-[0_18px_44px_rgba(148,163,184,0.12)]">
            <p className="text-sm font-medium text-[#5B85B6]">{patentMeta.freeDescription}</p>
            <button
              type="button"
              onClick={() => setCurrencyModalOpen(true)}
              className="mt-4 inline-flex w-full items-center justify-center rounded-[18px] bg-[#2563EB] px-4 py-3 text-base font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 sm:w-auto"
            >
              Sotib olish: {patentMeta.prices.RUB} ₽
            </button>
          </section>
        ) : null}

        <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-4">
          {PATENT_EXAM_VARIANTS.map((variant) => {
            const variantResult = resultMap.get(variant.variantNumber);
            const hasFullAccess = access?.patent_course_active === true;
            const isLocked = !hasFullAccess && variant.variantNumber > 1;
            const isPassed = variantResult?.passed === true;
            const isFailed = variantResult?.passed === false;

            return (
              <button
                key={variant.variantNumber}
                type="button"
                onClick={() => {
                  if (isLocked) {
                    setPaywallOpen(true);
                    return;
                  }
                  navigate(`/kurslar/patent/${variant.variantNumber}`);
                }}
                className="group relative min-h-[158px] overflow-hidden rounded-[28px] border px-3 py-4 text-center shadow-[0_18px_40px_rgba(51,65,85,0.14)] transition-all duration-200 hover:-translate-y-1"
                style={{
                  backgroundColor: isPassed
                    ? '#F0FDF4'
                    : isFailed
                      ? '#FEF2F2'
                      : isLocked
                        ? CARD_BG_LOCKED
                        : CARD_BG,
                  borderColor: isPassed
                    ? '#86EFAC'
                    : isFailed
                      ? '#FECACA'
                      : isLocked
                        ? BORDER_LOCKED
                        : BORDER,
                }}
              >
                <div className="mt-1">
                  <p className="text-[13px] font-bold sm:text-[15px]" style={{ color: TEXT }}>
                    Variant {variant.variantNumber}
                  </p>
                  <p
                    className="mt-1 text-[12px] font-medium"
                    style={{
                      color: isPassed
                        ? '#15803D'
                        : isFailed
                          ? '#DC2626'
                          : isLocked
                            ? '#64748B'
                            : '#1E3A5F',
                    }}
                  >
                    {isPassed
                      ? 'Сдан'
                      : isFailed
                        ? 'Не сдан'
                        : isLocked
                          ? 'Yopiq'
                          : 'Ochiq'}
                  </p>
                </div>

                <div
                  className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    isLocked ? 'bg-slate-200/80 text-slate-600' : 'bg-[#DBEAFE] text-[#1E3A5F]'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : isPassed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
                  ) : isFailed ? (
                    <XCircle className="h-3.5 w-3.5 text-[#DC2626]" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {variantResult ? `${variantResult.score_percent}%` : '22 savol'}
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
          description={`${patentMeta.paywallDescription}\n${patentMeta.freeDescription}`}
          buttonText="Купить"
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
