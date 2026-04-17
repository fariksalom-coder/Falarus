import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { VOCABULARY_TEXTS, type VocabularyTextWord } from '../data/vocabularyTexts';
import { useAuth } from '../context/AuthContext';
import { fetchVocabularyTextDictionary, type VocabularyTextDictionaryWord } from '../api/vocabulary';

type WordTooltipState = {
  token: string;
  entry: VocabularyTextWord | null;
  x: number;
  y: number;
  width: number;
};

const TOOLTIP_SIDE_PADDING = 12;
const TOOLTIP_VERTICAL_GAP = 10;
const TOOLTIP_APPROX_HEIGHT = 56;
const TOOLTIP_MIN_WIDTH = 180;

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

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/ё/g, 'е');
}

function buildDictionaryLookup(dictionary: VocabularyTextWord[]): Map<string, VocabularyTextWord> {
  const map = new Map<string, VocabularyTextWord>();
  dictionary.forEach((entry) => map.set(normalizeWord(entry.key), entry));
  return map;
}

function estimateTooltipWidth(token: string, translation: string) {
  const viewportWidth = window.innerWidth;
  const maxWidth = viewportWidth - TOOLTIP_SIDE_PADDING * 2;
  const chars = token.length + translation.length;
  const estimated = 120 + chars * 10;
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

export default function VocabularyTextReaderPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { textId } = useParams();
  const text = VOCABULARY_TEXTS.find((item) => item.id === textId);
  const [tooltip, setTooltip] = useState<WordTooltipState | null>(null);
  const [dictionaryFromDb, setDictionaryFromDb] = useState<VocabularyTextDictionaryWord[]>([]);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const tokens = useMemo(() => tokenizeText(text?.contentRu ?? ''), [text?.contentRu]);
  const dictLookup = useMemo(() => {
    if (dictionaryFromDb.length > 0) {
      return buildDictionaryLookup(
        dictionaryFromDb.map((item) => ({
          key: item.key,
          translationUz: item.translationUz,
          audioRu: item.audioRu,
        }))
      );
    }
    return buildDictionaryLookup(text?.dictionary ?? []);
  }, [dictionaryFromDb, text?.dictionary]);

  useEffect(() => {
    if (!text?.id) return;
    let cancelled = false;
    fetchVocabularyTextDictionary(token, text.id)
      .then((rows) => {
        if (!cancelled) setDictionaryFromDb(rows);
      })
      .catch(() => {
        if (!cancelled) setDictionaryFromDb([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, text?.id]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!tooltipRef.current) return;
      if (tooltipRef.current.contains(event.target as Node)) return;
      setTooltip(null);
    };
    if (tooltip) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [tooltip]);

  if (!text) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-900">Matn topilmadi.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary/matnlar')}
            className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Matnlarga qaytish
          </button>
        </div>
      </div>
    );
  }

  const speakWord = (word: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-4xl px-4 py-6 md:px-5 md:py-8">
        <button
          type="button"
          onClick={() => navigate('/vocabulary/matnlar')}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-2xl font-bold text-slate-900">{text.title}</h1>
          <div className="mt-2 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
            {text.level}
          </div>

          <div className="mt-5 whitespace-pre-wrap text-[17px] leading-8 text-slate-800">
            {tokens.map((token, index) => {
              if (token.type !== 'word') return <span key={`${index}-${token.type}`}>{token.value}</span>;

              return (
                <button
                  key={`${index}-${token.value}`}
                  type="button"
                  onClick={(event) => {
                    const normalized = normalizeWord(token.value);
                    const entry = dictLookup.get(normalized) ?? null;
                    const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    const translation = entry?.translationUz ?? 'Tarjima topilmadi';
                    const width = estimateTooltipWidth(token.value, translation);
                    const position = getTooltipPosition(rect, width);
                    setTooltip({
                      token: token.value,
                      entry,
                      x: position.x,
                      y: position.y,
                      width: position.width,
                    });
                  }}
                  className="rounded px-0.5 text-left font-medium text-slate-900 underline decoration-dotted underline-offset-4 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  {token.value}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-50 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_20px_45px_rgba(15,23,42,0.18)]"
          style={{ left: tooltip.x, top: tooltip.y, width: tooltip.width }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="min-w-0 overflow-x-auto overflow-y-hidden">
              <span className="mr-2 text-[20px] font-extrabold leading-tight text-slate-900 sm:text-[22px]">
                {tooltip.token}
              </span>
              <span className="text-[18px] font-semibold leading-tight text-slate-500 sm:text-[20px]">
              {tooltip.entry ? tooltip.entry.translationUz : 'Tarjima topilmadi'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => speakWord(tooltip.entry?.audioRu ?? tooltip.token)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              aria-label="Eshitish"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
