import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type WordPair = {
  left: string;
  right: string;
};

type CardItem = {
  id: string;
  text: string;
  pairId: number;
  side: 'left' | 'right';
};

const WORD_PAIRS: WordPair[] = [
  { left: 'Доброе', right: 'утро' },
  { left: 'Добрый', right: 'день' },
  { left: 'Добрый', right: 'вечер' },
  { left: 'Доброй', right: 'ночи' },
  { left: 'До', right: 'свидания' },
];

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildLeftCards = (pairs: WordPair[]): CardItem[] =>
  pairs.map((pair, idx) => ({ id: `${idx}-left`, text: pair.left, pairId: idx, side: 'left' }));

const buildRightCards = (pairs: WordPair[]): CardItem[] =>
  pairs.map((pair, idx) => ({ id: `${idx}-right`, text: pair.right, pairId: idx, side: 'right' }));

const shuffleRightWithoutSameRow = (leftCards: CardItem[], rightCards: CardItem[]): CardItem[] => {
  let attempts = 0;
  while (attempts < 100) {
    const candidate = shuffle(rightCards);
    const hasSameRowPair = candidate.some((card, idx) => card.pairId === leftCards[idx].pairId);
    if (!hasSameRowPair) return candidate;
    attempts += 1;
  }
  // Fallback: rotate by one to guarantee different rows for unique pair ids.
  return [...rightCards.slice(1), rightCards[0]];
};

export default function MatchingPairsPage() {
  const navigate = useNavigate();
  const [leftCards] = useState<CardItem[]>(() => shuffle(buildLeftCards(WORD_PAIRS)));
  const [rightCards] = useState<CardItem[]>(() => shuffleRightWithoutSameRow(leftCards, buildRightCards(WORD_PAIRS)));
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const totalPairs = WORD_PAIRS.length;
  const progress = (matchedPairIds.length / totalPairs) * 100;
  const isFinished = matchedPairIds.length === totalPairs;

  const handleCardClick = (card: CardItem) => {
    if (isLocked) return;
    if (matchedPairIds.includes(card.pairId)) return;
    if (selectedCard?.id === card.id) return;

    if (!selectedCard) {
      setSelectedCard(card);
      return;
    }

    // Only allow matching across columns.
    if (selectedCard.side === card.side) {
      setSelectedCard(card);
      return;
    }

    if (selectedCard.pairId === card.pairId) {
      setFeedback('To‘g‘ri!');
      setMatchedPairIds((prev) => [...prev, card.pairId]);
      setSelectedCard(null);
      return;
    }

    setFeedback('Noto‘g‘ri juftlik.');
    setWrongIds([selectedCard.id, card.id]);
    setIsLocked(true);
    setTimeout(() => {
      setWrongIds([]);
      setSelectedCard(null);
      setIsLocked(false);
    }, 1000);
  };

  const handleBack = () => navigate('/lesson-1');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Orqaga
          </button>
        </div>

        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Juftini toping</h1>
        <p className="mt-2 text-sm text-slate-600">Mos keladigan ikkita kartani tanlang.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-3 sm:space-y-4">
            {leftCards.map((card) => {
              const isSelected = selectedCard?.id === card.id;
              const isWrong = wrongIds.includes(card.id);
              const isMatched = matchedPairIds.includes(card.pairId);
              const stateClass = isMatched
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : isWrong
                ? 'border-red-500 bg-red-50 text-red-700'
                : isSelected
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 bg-white hover:border-indigo-300 text-slate-900';

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={isMatched || isLocked}
                  className={`min-h-20 w-full rounded-2xl border px-3 py-4 text-center text-base font-semibold transition-all duration-200 active:scale-[0.98] ${stateClass} ${
                    isMatched ? 'cursor-default' : ''
                  }`}
                >
                  {card.text}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {rightCards.map((card) => {
              const isSelected = selectedCard?.id === card.id;
              const isWrong = wrongIds.includes(card.id);
              const isMatched = matchedPairIds.includes(card.pairId);
              const stateClass = isMatched
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : isWrong
                ? 'border-red-500 bg-red-50 text-red-700'
                : isSelected
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 bg-white hover:border-indigo-300 text-slate-900';

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={isMatched || isLocked}
                  className={`min-h-20 w-full rounded-2xl border px-3 py-4 text-center text-base font-semibold transition-all duration-200 active:scale-[0.98] ${stateClass} ${
                    isMatched ? 'cursor-default' : ''
                  }`}
                >
                  {card.text}
                </button>
              );
            })}
          </div>
        </div>

        {!isFinished && feedback && (
          <p
            className={`mt-5 text-sm font-semibold ${
              feedback === 'To‘g‘ri!' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {feedback}
          </p>
        )}

        {isFinished && (
          <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-4">
            <p className="font-bold text-emerald-700">Mashq tugadi!</p>
            <p className="mt-1 text-emerald-700">Tabriklaymiz! Siz barcha juftlarni to‘g‘ri topdingiz!</p>
          </div>
        )}
      </main>
    </div>
  );
}
