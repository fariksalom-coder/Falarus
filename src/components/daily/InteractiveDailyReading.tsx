import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { DailyReadingLexeme } from '../../../shared/dailyCourseDay';
import { normalizeRuWord } from '../../../shared/russianLexemeNormalize';

type WordTooltipState = {
  token: string;
  lexeme: DailyReadingLexeme | null;
  x: number;
  y: number;
  width: number;
};

type TextToken =
  | { type: 'word'; value: string }
  | { type: 'space'; value: string }
  | { type: 'punct'; value: string };

const TOOLTIP_SIDE_PADDING = 12;
const TOOLTIP_VERTICAL_GAP = 10;
const TOOLTIP_APPROX_HEIGHT = 56;
const TOOLTIP_MIN_WIDTH = 180;

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

function estimateTooltipWidth(uzbekLine: string) {
  const viewportWidth = window.innerWidth;
  const maxWidth = viewportWidth - TOOLTIP_SIDE_PADDING * 2;
  const chars = uzbekLine.length;
  const estimated = 88 + chars * 11;
  return Math.max(TOOLTIP_MIN_WIDTH, Math.min(maxWidth, estimated));
}

function getTooltipPosition(rect: DOMRect, bubbleWidth: number) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const safeWidth = Math.min(bubbleWidth, viewportWidth - TOOLTIP_SIDE_PADDING * 2);
  const minCenterX = TOOLTIP_SIDE_PADDING + bubbleWidth / 2;
  const maxCenterX = viewportWidth - TOOLTIP_SIDE_PADDING - bubbleWidth / 2;
  const centerX = rect.left + rect.width / 2;
  const x = Math.min(Math.max(centerX, minCenterX), maxCenterX);

  const canShowBelow = rect.bottom + TOOLTIP_VERTICAL_GAP + TOOLTIP_APPROX_HEIGHT <= viewportHeight - TOOLTIP_SIDE_PADDING;
  const y = canShowBelow
    ? rect.bottom + TOOLTIP_VERTICAL_GAP
    : Math.max(TOOLTIP_SIDE_PADDING, rect.top - TOOLTIP_VERTICAL_GAP - TOOLTIP_APPROX_HEIGHT);

  return { x, y, width: safeWidth };
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
  const [tooltip, setTooltip] = useState<WordTooltipState | null>(null);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const tokens = useMemo(() => tokenizeText(bodyRu), [bodyRu]);
  const lookup = useMemo(() => buildLexemeLookup(lexemes), [lexemes]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!tooltipRef.current) return;
      if (tooltipRef.current.contains(event.target as Node)) return;
      setTooltip(null);
      setActiveWordKey(null);
    };
    if (tooltip) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [tooltip]);

  const handleSpeak = (lexeme: DailyReadingLexeme | null, surfaceWord: string) => {
    if (lexeme?.audioRu?.trim()) speakRussian(lexeme.audioRu, surfaceWord);
    else speakTTS(surfaceWord);
  };

  const showMeta = Boolean(title || levelBadge || sectionLabel);

  return (
    <div className="relative">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        {title ? <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{title}</h2> : null}

        {levelBadge || sectionLabel ? (
          <div className={`flex flex-wrap items-center gap-2 ${title ? 'mt-3' : ''}`}>
            {levelBadge ? (
              <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                {levelBadge}
              </span>
            ) : null}
            {sectionLabel ? (
              <span className="border-b border-dotted border-slate-400 pb-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {sectionLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className={`whitespace-pre-wrap text-[17px] leading-8 text-slate-800 ${showMeta ? 'mt-6' : ''}`}>
          {tokens.map((token, index) => {
            if (token.type !== 'word') {
              return <span key={`t-${index}-${token.type}`}>{token.value}</span>;
            }

            const wordKey = `w-${index}-${token.value}`;
            const normalized = normalizeRuWord(token.value);
            const lexeme = lookup.get(normalized) ?? null;
            const isActive = activeWordKey === wordKey && tooltip?.token === token.value;

            return (
              <button
                key={wordKey}
                type="button"
                onClick={(event) => {
                  const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  const translation = lexeme?.translationUz?.trim() || 'Tarjima topilmadi';
                  const width = estimateTooltipWidth(translation);
                  const position = getTooltipPosition(rect, width);
                  setActiveWordKey(wordKey);
                  setTooltip({
                    token: token.value,
                    lexeme,
                    x: position.x,
                    y: position.y,
                    width: position.width,
                  });
                }}
                className={`rounded px-0.5 text-left font-medium text-slate-900 underline decoration-dotted decoration-slate-400 underline-offset-[5px] transition hover:bg-blue-50 hover:text-blue-800 ${
                  isActive ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                }`}
              >
                {token.value}
              </button>
            );
          })}
        </div>
      </div>

      {tooltip ? (
        <div
          ref={tooltipRef}
          className="fixed z-50 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_20px_45px_rgba(15,23,42,0.18)]"
          style={{ left: tooltip.x, top: tooltip.y, width: tooltip.width }}
        >
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-base font-semibold leading-snug text-slate-900 sm:text-lg">
              {tooltip.lexeme?.translationUz?.trim() ? tooltip.lexeme.translationUz : 'Tarjima topilmadi'}
            </p>
            <button
              type="button"
              onClick={() => handleSpeak(tooltip.lexeme, tooltip.token)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
              aria-label="Eshitish"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
