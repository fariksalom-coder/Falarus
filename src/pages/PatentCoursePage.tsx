import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { PATENT_EXAM_VARIANTS } from '../data/patentExamData';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getPatentVariantResults, type PatentVariantResult } from '../api/patentResults';

export default function PatentCoursePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  const { token } = useAuth();
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
        setResultsError(e instanceof Error ? e.message : t('patent.resultsLoadError'));
      });
    return () => {
      cancelled = true;
    };
  }, [token, location.key, t]);

  const resultMap = useMemo(
    () => new Map(results.map((item) => [item.variant_number, item])),
    [results]
  );

  const total = PATENT_EXAM_VARIANTS.length;
  const doneCount = results.filter((r) => r.passed === true).length;

  return (
    <div className="patent-premium min-h-screen pb-16">
      <main className="mx-auto max-w-4xl px-4 pb-6 pt-3 sm:px-5">
        {/* Back button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-[#E5DDCB] bg-white/80 text-[#0A1E48] shadow-[0_6px_16px_-8px_rgba(10,30,72,0.2)] transition hover:-translate-y-0.5"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Premium navy hero with guilloché + gold seal */}
        <section
          className="patent-guilloche relative mb-5 overflow-hidden rounded-[28px] p-6 text-white shadow-[0_28px_60px_-24px_rgba(10,30,72,0.55)]"
          style={{ background: '#0A1E48' }}
        >
          {/* Guilloché radial rings decor (SVG for crispness) */}
          <svg
            className="pointer-events-none absolute -right-16 -top-16 h-[220px] w-[220px] opacity-[0.28]"
            viewBox="0 0 240 240"
            aria-hidden
          >
            {[110, 92, 74, 56, 38].map((r, i) => (
              <circle
                key={r}
                cx="120"
                cy="120"
                r={r}
                fill="none"
                stroke="#D9B45A"
                strokeWidth={i === 0 ? 1.4 : 0.7}
                opacity={0.55 - i * 0.08}
              />
            ))}
          </svg>

          {/* Gold seal top-right */}
          <div className="pointer-events-none absolute right-5 top-5">
            <div
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle, #0F2A5E 40%, #0A1E48 100%)',
                boxShadow: 'inset 0 0 0 1.5px #D9B45A, 0 0 0 4px rgba(217,180,90,0.14)',
              }}
            >
              <span className="font-serif-display text-[22px] font-bold text-[#E4C270]">П</span>
            </div>
          </div>

          <div className="relative z-[2] max-w-[75%]">
            <p className="text-[10.5px] font-black uppercase tracking-[0.24em] text-[#D9B45A]">
              Rasmiy imtihon
            </p>
            <h1 className="font-serif-display mt-2 text-[32px] font-bold leading-[1.05] text-white">
              {t('patent.title')}
            </h1>
            <p className="mt-3 text-[13px] leading-[1.55] text-[#C5CFE4]">
              Ish patenti uchun to'liq tayyorgarlik. Har variant — 22 savol: audio, rasm va yozma javoblar.
            </p>
          </div>

          {/* Divider gold */}
          <div className="relative z-[2] my-5 h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(217,180,90,0.55), transparent)' }} />

          {/* Stats row */}
          <div className="relative z-[2] grid grid-cols-3 gap-3">
            {[
              { value: String(total), label: 'Variant' },
              { value: String(total * 22), label: 'Savol' },
              { value: '4', label: 'Savol turi' },
            ].map((stat, i) => (
              <div key={stat.label} className={`text-left ${i > 0 ? 'border-l border-white/10 pl-3' : ''}`}>
                <p className="font-serif-display text-[24px] font-bold leading-none text-[#E4C270]">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[9.5px] font-black uppercase tracking-[0.18em] text-[#8E9DC2]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {resultsError ? (
          <p className="mb-4 rounded-2xl border border-[#F0656A]/50 bg-[#F0656A]/10 px-4 py-3 text-sm font-semibold text-[#B4282E]">
            {resultsError}
          </p>
        ) : null}

        {/* "VARIANTLAR" caption + hint */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10.5px] font-black uppercase tracking-[0.24em] text-[#B8892F]">
            Variantlar
          </p>
          <p className="text-[11px] font-bold text-[#8A8172]">
            {doneCount} / {total}
          </p>
        </div>

        {/* 2-col grid of premium variant cards */}
        <div className="grid grid-cols-2 gap-3">
          {PATENT_EXAM_VARIANTS.map((variant) => {
            const variantResult = resultMap.get(variant.variantNumber);
            const isPassed = variantResult?.passed === true;
            const isFailed = variantResult?.passed === false;
            const isCurrent = !isPassed && !isFailed && variant.variantNumber === (doneCount + 1);
            const numStr = String(variant.variantNumber).padStart(2, '0');
            const ordinalName = ORDINAL_UZ[variant.variantNumber - 1] ?? `Variant ${variant.variantNumber}`;
            const percent = variantResult?.score_percent;

            // Current variant keeps the navy hero look in both themes.
            // Non-current variants pick surface + text from theme tokens so
            // dark mode gets a proper navy card instead of a floating white one.
            const cardStyle: CSSProperties = isCurrent
              ? {
                  background: '#0A1E48',
                  boxShadow: '0 18px 34px -12px rgba(10,30,72,0.5)',
                  border: 'none',
                }
              : {
                  background: 'var(--pmn-card-bg)',
                  border: '1px solid var(--pmn-card-border)',
                  boxShadow: '0 10px 22px -12px rgba(10,30,72,0.14)',
                };
            const captionColor = isCurrent ? '#D9B45A' : 'var(--pmn-gold-deep)';
            const nameColor = isCurrent ? '#FFFFFF' : 'var(--pmn-text)';
            const ghostColor = isCurrent
              ? 'rgba(217,180,90,0.28)'
              : 'color-mix(in oklab, var(--pmn-text) 10%, transparent)';
            const footerColor = isCurrent ? '#8E9DC2' : 'var(--pmn-text-muted)';

            return (
              <button
                key={variant.variantNumber}
                type="button"
                onClick={() => navigate(`/kurslar/patent/${variant.variantNumber}`)}
                className="relative flex flex-col items-start overflow-hidden rounded-[18px] p-4 text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                style={cardStyle}
              >
                {/* Big ghost serif number */}
                <span
                  aria-hidden
                  className="font-serif-display pointer-events-none absolute -right-1 top-3 text-[52px] font-bold leading-none"
                  style={{ color: ghostColor, letterSpacing: '-0.04em' }}
                >
                  {numStr}
                </span>

                <span className="text-[9.5px] font-black uppercase tracking-[0.24em]" style={{ color: captionColor }}>
                  Variant
                </span>
                <span className="font-serif-display mt-1 text-[20px] font-bold leading-tight" style={{ color: nameColor }}>
                  {ordinalName}
                </span>

                <div className="mt-3 w-full">
                  {isPassed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF5E5] px-3 py-1 text-[11px] font-black text-[#3F7B41]">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      O'tdi · {percent}%
                    </span>
                  ) : isFailed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBE6E6] px-3 py-1 text-[11px] font-black text-[#B4282E]">
                      <X className="h-3 w-3" strokeWidth={3} aria-hidden />
                      O'tmadi · {percent}%
                    </span>
                  ) : isCurrent ? (
                    <span className="patent-gold-cta inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-black">
                      Boshlash <span aria-hidden>›</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold" style={{ color: footerColor }}>
                      22 savol · ochiq
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

const ORDINAL_UZ = [
  'Birinchi', 'Ikkinchi', 'Uchinchi', "To'rtinchi", 'Beshinchi', 'Oltinchi',
  'Yettinchi', 'Sakkizinchi', "To'qqizinchi", 'Oʻninchi',
  "O'n birinchi", "O'n ikkinchi", "O'n uchinchi", "O'n to'rtinchi",
  "O'n beshinchi", "O'n oltinchi", "O'n yettinchi", "O'n sakkizinchi",
  "O'n to'qqizinchi", 'Yigirmanchi',
];
