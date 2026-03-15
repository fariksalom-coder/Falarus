import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setLessonTaskResult } from '../utils/lessonTaskResults';
import { addUserPoints } from '../api/leaderboard';

type MatchingTask = { prompt: string; pairs: { left: string; right: string }[] };
type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };

const pronouns = ['Я', 'Ты', 'Он/она', 'Мы', 'Вы', 'Они'];

const TASKS: MatchingTask[] = [
  {
    prompt: 'Juftini toping: Ругаться',
    pairs: [
      { left: pronouns[0], right: 'ругаюсь' },
      { left: pronouns[1], right: 'ругаешься' },
      { left: pronouns[2], right: 'ругается' },
      { left: pronouns[3], right: 'ругаемся' },
      { left: pronouns[4], right: 'ругаетесь' },
      { left: pronouns[5], right: 'ругаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Купаться',
    pairs: [
      { left: pronouns[0], right: 'купаюсь' },
      { left: pronouns[1], right: 'купаешься' },
      { left: pronouns[2], right: 'купается' },
      { left: pronouns[3], right: 'купаемся' },
      { left: pronouns[4], right: 'купаетесь' },
      { left: pronouns[5], right: 'купаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Пугаться',
    pairs: [
      { left: pronouns[0], right: 'пугаюсь' },
      { left: pronouns[1], right: 'пугаешься' },
      { left: pronouns[2], right: 'пугается' },
      { left: pronouns[3], right: 'пугаемся' },
      { left: pronouns[4], right: 'пугаетесь' },
      { left: pronouns[5], right: 'пугаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Встречаться',
    pairs: [
      { left: pronouns[0], right: 'встречаюсь' },
      { left: pronouns[1], right: 'встречаешься' },
      { left: pronouns[2], right: 'встречается' },
      { left: pronouns[3], right: 'встречаемся' },
      { left: pronouns[4], right: 'встречаетесь' },
      { left: pronouns[5], right: 'встречаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Играться',
    pairs: [
      { left: pronouns[0], right: 'играюсь' },
      { left: pronouns[1], right: 'играешься' },
      { left: pronouns[2], right: 'играется' },
      { left: pronouns[3], right: 'играемся' },
      { left: pronouns[4], right: 'играетесь' },
      { left: pronouns[5], right: 'играются' },
    ],
  },
  {
    prompt: 'Juftini toping: Путаться',
    pairs: [
      { left: pronouns[0], right: 'путаюсь' },
      { left: pronouns[1], right: 'путаешься' },
      { left: pronouns[2], right: 'путается' },
      { left: pronouns[3], right: 'путаемся' },
      { left: pronouns[4], right: 'путаетесь' },
      { left: pronouns[5], right: 'путаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Греться',
    pairs: [
      { left: pronouns[0], right: 'греюсь' },
      { left: pronouns[1], right: 'греешься' },
      { left: pronouns[2], right: 'греется' },
      { left: pronouns[3], right: 'греемся' },
      { left: pronouns[4], right: 'греетесь' },
      { left: pronouns[5], right: 'греются' },
    ],
  },
  {
    prompt: 'Juftini toping: Развлекаться',
    pairs: [
      { left: pronouns[0], right: 'развлекаюсь' },
      { left: pronouns[1], right: 'развлекаешься' },
      { left: pronouns[2], right: 'развлекается' },
      { left: pronouns[3], right: 'развлекаемся' },
      { left: pronouns[4], right: 'развлекаетесь' },
      { left: pronouns[5], right: 'развлекаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Дуться',
    pairs: [
      { left: pronouns[0], right: 'дуюсь' },
      { left: pronouns[1], right: 'дуешься' },
      { left: pronouns[2], right: 'дуется' },
      { left: pronouns[3], right: 'дуемся' },
      { left: pronouns[4], right: 'дуетесь' },
      { left: pronouns[5], right: 'дуются' },
    ],
  },
  {
    prompt: 'Juftini toping: Стараться',
    pairs: [
      { left: pronouns[0], right: 'стараюсь' },
      { left: pronouns[1], right: 'стараешься' },
      { left: pronouns[2], right: 'старается' },
      { left: pronouns[3], right: 'стараемся' },
      { left: pronouns[4], right: 'стараетесь' },
      { left: pronouns[5], right: 'стараются' },
    ],
  },
  {
    prompt: 'Juftini toping: Ошибаться',
    pairs: [
      { left: pronouns[0], right: 'ошибаюсь' },
      { left: pronouns[1], right: 'ошибаешься' },
      { left: pronouns[2], right: 'ошибается' },
      { left: pronouns[3], right: 'ошибаемся' },
      { left: pronouns[4], right: 'ошибаетесь' },
      { left: pronouns[5], right: 'ошибаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Просыпаться',
    pairs: [
      { left: pronouns[0], right: 'просыпаюсь' },
      { left: pronouns[1], right: 'просыпаешься' },
      { left: pronouns[2], right: 'просыпается' },
      { left: pronouns[3], right: 'просыпаемся' },
      { left: pronouns[4], right: 'просыпаетесь' },
      { left: pronouns[5], right: 'просыпаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Потеряться',
    pairs: [
      { left: pronouns[0], right: 'потеряюсь' },
      { left: pronouns[1], right: 'потеряешься' },
      { left: pronouns[2], right: 'потеряется' },
      { left: pronouns[3], right: 'потеряемся' },
      { left: pronouns[4], right: 'потеряетесь' },
      { left: pronouns[5], right: 'потеряются' },
    ],
  },
  {
    prompt: 'Juftini toping: Знакомиться',
    pairs: [
      { left: pronouns[0], right: 'знакомлюсь' },
      { left: pronouns[1], right: 'знакомишься' },
      { left: pronouns[2], right: 'знакомится' },
      { left: pronouns[3], right: 'знакомимся' },
      { left: pronouns[4], right: 'знакомитесь' },
      { left: pronouns[5], right: 'знакомятся' },
    ],
  },
  {
    prompt: 'Juftini toping: Извиниться',
    pairs: [
      { left: pronouns[0], right: 'извинюсь' },
      { left: pronouns[1], right: 'извинишься' },
      { left: pronouns[2], right: 'извинится' },
      { left: pronouns[3], right: 'извинимся' },
      { left: pronouns[4], right: 'извинитесь' },
      { left: pronouns[5], right: 'извинятся' },
    ],
  },
  {
    prompt: 'Juftini toping: Переполняться',
    pairs: [
      { left: pronouns[0], right: 'переполняюсь' },
      { left: pronouns[1], right: 'переполняешься' },
      { left: pronouns[2], right: 'переполняется' },
      { left: pronouns[3], right: 'переполняемся' },
      { left: pronouns[4], right: 'переполняетесь' },
      { left: pronouns[5], right: 'переполняются' },
    ],
  },
  {
    prompt: 'Juftini toping: Сопротивляться',
    pairs: [
      { left: pronouns[0], right: 'сопротивляюсь' },
      { left: pronouns[1], right: 'сопротивляешься' },
      { left: pronouns[2], right: 'сопротивляется' },
      { left: pronouns[3], right: 'сопротивляемся' },
      { left: pronouns[4], right: 'сопротивляетесь' },
      { left: pronouns[5], right: 'сопротивляются' },
    ],
  },
  {
    prompt: 'Juftini toping: Кататься',
    pairs: [
      { left: pronouns[0], right: 'катаюсь' },
      { left: pronouns[1], right: 'катаешься' },
      { left: pronouns[2], right: 'катается' },
      { left: pronouns[3], right: 'катаемся' },
      { left: pronouns[4], right: 'катаетесь' },
      { left: pronouns[5], right: 'катаются' },
    ],
  },
  {
    prompt: 'Juftini toping: Успокоиться',
    pairs: [
      { left: pronouns[0], right: 'успокоюсь' },
      { left: pronouns[1], right: 'успокоишься' },
      { left: pronouns[2], right: 'успокоится' },
      { left: pronouns[3], right: 'успокоимся' },
      { left: pronouns[4], right: 'успокоитесь' },
      { left: pronouns[5], right: 'успокоятся' },
    ],
  },
];

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildMatchCards = (pairs: MatchingTask['pairs']) => {
  const left = pairs.map((pair, idx) => ({ id: `${idx}-l`, text: pair.left, pairId: idx, side: 'left' as const }));
  const right = shuffle(pairs.map((pair, idx) => ({ id: `${idx}-r`, text: pair.right, pairId: idx, side: 'right' as const })));
  return { left: shuffle(left), right };
};

export default function LessonThirteenTaskOnePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [matchLeft, setMatchLeft] = useState<MatchCard[]>([]);
  const [matchRight, setMatchRight] = useState<MatchCard[]>([]);
  const [matchSelected, setMatchSelected] = useState<MatchCard | null>(null);
  const [matchWrongIds, setMatchWrongIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [matchLocked, setMatchLocked] = useState(false);

  const currentTask = TASKS[currentIndex];
  const progress = useMemo(() => ((currentIndex + (finished ? 1 : 0)) / TASKS.length) * 100, [currentIndex, finished]);

  useEffect(() => {
    const cards = buildMatchCards(TASKS[currentIndex].pairs);
    setMatchLeft(cards.left);
    setMatchRight(cards.right);
    setMatchSelected(null);
    setMatchWrongIds([]);
    setMatchedPairIds([]);
    setMatchLocked(false);
    setStatus('idle');
    setMessage('');
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < TASKS.length - 1) setCurrentIndex((prev) => prev + 1);
    else {
      if (TASKS.length > 0) {
        setLessonTaskResult('/lesson-13', 1, TASKS.length, TASKS.length);
        if (token) addUserPoints(token, TASKS.length);
      }
      setFinished(true);
    }
  };

  const handleMatchingClick = (card: MatchCard) => {
    if (matchLocked || status === 'correct') return;
    if (matchedPairIds.includes(card.pairId)) return;
    if (matchSelected?.id === card.id) return;

    if (!matchSelected) {
      setMatchSelected(card);
      return;
    }

    if (matchSelected.side === card.side) {
      setMatchSelected(card);
      return;
    }

    if (matchSelected.pairId === card.pairId) {
      const nextMatched = [...matchedPairIds, card.pairId];
      setMatchedPairIds(nextMatched);
      setMatchSelected(null);
      setMessage('To‘g‘ri!');
      if (nextMatched.length === matchLeft.length) setStatus('correct');
      return;
    }

    setMessage('Xato. Yana urinib ko‘ring.');
    setMatchWrongIds([matchSelected.id, card.id]);
    setMatchLocked(true);
    setTimeout(() => {
      setMatchWrongIds([]);
      setMatchSelected(null);
      setMatchLocked(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/lesson-13')}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Orqaga
        </button>

        {!finished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {!finished && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-base font-semibold text-slate-900">{currentTask.prompt}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="space-y-3">
                {matchLeft.map((card) => {
                  const isSelected = matchSelected?.id === card.id;
                  const isWrong = matchWrongIds.includes(card.id);
                  const isMatched = matchedPairIds.includes(card.pairId);
                  const stateClass = isMatched
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : isWrong
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleMatchingClick(card)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98] ${stateClass}`}
                    >
                      {card.text}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {matchRight.map((card) => {
                  const isSelected = matchSelected?.id === card.id;
                  const isWrong = matchWrongIds.includes(card.id);
                  const isMatched = matchedPairIds.includes(card.pairId);
                  const stateClass = isMatched
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : isWrong
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleMatchingClick(card)}
                      className={`w-full rounded-2xl border px-3 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${stateClass}`}
                    >
                      {card.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {message && (
              <p className={`mt-4 text-sm font-bold ${status === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>
            )}

            {status === 'correct' && (
              <button
                type="button"
                onClick={handleNext}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {currentIndex < TASKS.length - 1 ? 'Keyingi' : 'Yakunlash'}
              </button>
            )}
          </div>
        )}

        {finished && (
          <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-5">
            <p className="text-lg font-bold text-emerald-700">Mashq tugadi! Barakalla!</p>
          </div>
        )}
      </main>
    </div>
  );
}
