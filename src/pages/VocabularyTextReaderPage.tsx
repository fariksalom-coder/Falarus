import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Volume2, X } from 'lucide-react';
import { VOCABULARY_TEXTS, type VocabularyTextWord } from '../data/vocabularyTexts';
import { useAuth } from '../context/AuthContext';
import { fetchVocabularyTextDictionary, type VocabularyTextDictionaryWord } from '../api/vocabulary';

type WordTooltipState = {
  token: string;
  entry: VocabularyTextWord | null;
  x: number;
  y: number;
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

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/ё/g, 'е');
}

function buildDictionaryLookup(dictionary: VocabularyTextWord[]): Map<string, VocabularyTextWord> {
  const map = new Map<string, VocabularyTextWord>();
  dictionary.forEach((entry) => map.set(normalizeWord(entry.key), entry));
  return map;
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
                    setTooltip({
                      token: token.value,
                      entry,
                      x: rect.left + rect.width / 2,
                      y: rect.bottom + 10,
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
          className="fixed z-50 w-[min(320px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_45px_rgba(15,23,42,0.18)]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-900">{tooltip.token}</p>
              <p className="mt-1 text-sm text-slate-600">
                {tooltip.entry ? `${tooltip.entry.key} — ${tooltip.entry.translationUz}` : 'Tarjima topilmadi'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTooltip(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => speakWord(tooltip.entry?.audioRu ?? tooltip.token)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            <Volume2 className="h-4 w-4" />
            Eshitish
          </button>
        </div>
      )}
    </div>
  );
}
