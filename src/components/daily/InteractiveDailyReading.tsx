import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, X } from 'lucide-react';
import type { DailyReadingLexeme } from '../../../shared/dailyCourseDay';
import { normalizeRuWord } from '../../../shared/russianLexemeNormalize';

type WordSheetState = {
  wordKey: string;
  surface: string;
  lexeme: DailyReadingLexeme | null;
};

type TextToken =
  | { type: 'word'; value: string }
  | { type: 'space'; value: string }
  | { type: 'punct'; value: string };

function tokenizeText(text: string): TextToken[] {
  const chunks = text.match(/([А-Яа-яЁё-]+|\s+|[^\sА-Яа-яЁё-]+)/g) ?? [];
  const result: TextToken[] = [];
  chunks.forEach((chunk) => {
    if (/^[А-Яа-яЁё-]+$/.test(chunk)) {
      result.push({ type: 'word', value: chunk });
      return;
    }
    if (/^\s+$/.test(chunk)) {
      result.push({ type: 'space', value: chunk });
      return;
    }
    result.push({ type: 'punct', value: chunk });
  });
  return result;
}

function buildLexemeLookup(lexemes: DailyReadingLexeme[]): Map<string, DailyReadingLexeme> {
  const map = new Map<string, DailyReadingLexeme>();
  for (const L of lexemes) {
    const normFromDb = normalizeRuWord(L.wordRuNormalized || L.wordRu);
    if (normFromDb) map.set(normFromDb, L);
    const normSurface = normalizeRuWord(L.wordRu);
    if (normSurface && normSurface !== normFromDb) map.set(normSurface, L);
  }
  return map;
}

function speakRussian(audioRu: string | null | undefined, wordRu: string) {
  const trimmed = (audioRu ?? '').trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const el = new Audio(trimmed);
      void el.play().catch(() => speakTTS(wordRu));
    } catch {
      speakTTS(wordRu);
    }
    return;
  }
  speakTTS(wordRu);
}

function speakTTS(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

export type InteractiveDailyReadingProps = {
  title: string | null;
  bodyRu: string;
  lexemes: DailyReadingLexeme[];
  /** Masalan «A1» — bo‘sh bo‘lsa ko‘rinmaydi */
  levelBadge?: string | null;
  /** Yuqori label (masalan dialog bo‘limi) */
  sectionLabel?: string | null;
};

export function InteractiveDailyReading({
  title,
  bodyRu,
  lexemes,
  levelBadge,
  sectionLabel,
}: InteractiveDailyReadingProps) {
  const [sheet, setSheet] = useState<WordSheetState | null>(null);

  const tokens = useMemo(() => tokenizeText(bodyRu), [bodyRu]);
  const lookup = useMemo(() => buildLexemeLookup(lexemes), [lexemes]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const handleSpeak = (lexeme: DailyReadingLexeme | null, surfaceWord: string) => {
    if (lexeme?.audioRu?.trim()) speakRussian(lexeme.audioRu, surfaceWord);
    else speakTTS(surfaceWord);
  };

  const showMeta = Boolean(title || levelBadge || sectionLabel);

  return (
    <div className="relative">
      <div className="rounded-[24px] bg-[color:var(--rd-white)] p-5 shadow-[0_18px_36px_-20px_rgba(11,113,103,0.28)] ring-1 ring-[color:var(--rd-border)] md:p-6">
        {/* Book badge + optional title/label header */}
        <div className="mb-4 flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px]"
            style={{ background: 'linear-gradient(140deg, #E1F5F1 0%, #BFF0E8 100%)' }}
          >
            📖
          </span>
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 className="text-[17px] font-bold uppercase tracking-[0.08em] text-[#0B2926] md:text-[18px]">
                {title}
              </h2>
            ) : null}
            {sectionLabel ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--rd-text-muted)]">
                {sectionLabel}
              </p>
            ) : null}
            {!title && !sectionLabel ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--rd-text-muted)]">
                Matn
              </p>
            ) : null}
          </div>
          {levelBadge ? (
            <span className="inline-flex shrink-0 rounded-full bg-[#E1F5F1] px-2.5 py-1 text-[11px] font-bold text-[#0B7167] ring-1 ring-[#BFF0E8]">
              {levelBadge}
            </span>
          ) : null}
        </div>

        <div className={`whitespace-pre-wrap text-[17px] leading-[2.1] text-[#0B2926] ${showMeta ? 'mt-3' : ''}`}>
          {tokens.map((token, index) => {
            if (token.type !== 'word') {
              return <span key={`t-${index}-${token.type}`}>{token.value}</span>;
            }

            const wordKey = `w-${index}-${token.value}`;
            const normalized = normalizeRuWord(token.value);
            const lexeme = lookup.get(normalized) ?? null;
            const isActive = sheet?.wordKey === wordKey;

            return (
              <button
                key={wordKey}
                type="button"
                onClick={() => setSheet({ wordKey, surface: token.value, lexeme })}
                className={`reading-word-btn ${isActive ? 'reading-word-btn-active' : ''}`}
              >
                {token.value}
              </button>
            );
          })}
        </div>

        {/* Tip footer inside card */}
        <div className="mt-5 flex items-start gap-2 border-t border-dashed border-[#DCEBE7] pt-3.5 text-[12.5px] leading-snug text-[color:var(--rd-text-muted)]">
          <span aria-hidden className="text-[15px] leading-none">👆</span>
          <span className="font-medium">Har qanday so'zga bosing — tarjimasi pastda chiqadi</span>
        </div>
      </div>

      {/* Bottom sheet: word + translation + audio */}
      <AnimatePresence>
        {sheet ? (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setSheet(null)}
              className="fixed inset-0 z-40 bg-[#0B2926]/25 backdrop-blur-[2px]"
            />
            <motion.div
              key="sheet"
              initial={{ y: 320, opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-[color:var(--rd-white)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_60px_-20px_rgba(11,113,103,0.35)]"
              role="dialog"
              aria-label="So'z tarjimasi"
            >
              {/* Drag handle */}
              <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#DCEBE7]" />

              {/* Close button */}
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="Yopish"
                className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--rd-card)] text-[color:var(--rd-text-muted)] ring-1 ring-[color:var(--rd-border)] transition hover:bg-[#E1F5F1] active:scale-95"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>

              <p className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[color:var(--rd-text-muted)]">
                So'z tarjimasi
              </p>

              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[24px] font-bold leading-tight text-[#0B2926]">
                    {sheet.surface}
                  </p>
                  <p className="mt-2 text-[16px] font-semibold leading-snug text-[#0B7167]">
                    {sheet.lexeme?.translationUz?.trim() || 'Tarjima topilmadi'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSpeak(sheet.lexeme, sheet.surface)}
                  className="mt-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_12px_24px_-8px_rgba(15,165,152,0.55)] transition hover:brightness-[1.05] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #25D19A 0%, #0FA598 60%, #0E8A80 100%)' }}
                  aria-label="Eshitish"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>

              {sheet.lexeme?.wordRu && sheet.lexeme.wordRu.trim().toLowerCase() !== sheet.surface.trim().toLowerCase() ? (
                <div className="mt-3 rounded-2xl bg-[color:var(--rd-card)] px-3.5 py-2.5 ring-1 ring-[color:var(--rd-mint-panel)]">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[color:var(--rd-text-muted)]">
                    So'z shakli
                  </p>
                  <p className="mt-0.5 text-[15px] font-semibold text-[#123B36]">
                    {sheet.lexeme.wordRu}
                  </p>
                </div>
              ) : null}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
