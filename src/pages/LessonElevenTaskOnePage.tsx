import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setLessonTaskResult } from '../utils/lessonTaskResults';

type MatchingTask = { prompt: string; pairs: { left: string; right: string }[] };
type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };

const TASKS: MatchingTask[] = [
  {
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Я ______ текст.', right: 'читаю' },
      { left: 'Он ______ правильно.', right: 'читает' },
      { left: 'Ты ______ медленно.', right: 'читаешь' },
      { left: 'Вы ______ правильно.', right: 'читаете' },
      { left: 'Мы ______ письмо.', right: 'читаем' },
      { left: 'Они ______ стихи.', right: 'читают' },
    ],
  },
  {
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Вечером она ______ в парке.', right: 'гуляет' },
      { left: 'Когда ты ______ ?', right: 'гуляешь' },
      { left: 'Я не ______ днём.', right: 'гуляю' },
      { left: 'Мы ______ по городу.', right: 'гуляем' },
      { left: 'Где вы ______ ?', right: 'гуляете' },
      { left: 'Студенты ______ после занятий.', right: 'гуляют' },
    ],
  },
  {
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Мы ______ новые слова.', right: 'учим' },
      { left: 'Я ______ русский язык.', right: 'учу' },
      { left: 'Они ______ диалог.', right: 'учат' },
      { left: 'Ты ______ грамматику.', right: 'учишь' },
      { left: 'Вы ______ текст.', right: 'учите' },
    ],
  },
  {
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Ты ______ в университете.', right: 'учишься' },
      { left: 'Она ______ в школе.', right: 'учится' },
      { left: 'Мы ______ читать, писать и говорить по-русски.', right: 'учимся' },
      { left: 'Я ______ на первом курсе.', right: 'учусь' },
    ],
  },
  {
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Я плохо ______ по-русски.', right: 'понимаю' },
      { left: 'Говорите медленно: он не ______ вас.', right: 'понимает' },
      { left: 'Ты ______, что она говорит?', right: 'понимаешь' },
      { left: 'Вы хорошо ______ меня?', right: 'понимаете' },
      { left: 'Они не ______ по-английски.', right: 'понимают' },
    ],
  },
  {
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Я ______ твой адрес.', right: 'помню' },
      { left: 'Мы ______, как вас зовут.', right: 'помним' },
      { left: 'Она ______ это место.', right: 'помнит' },
      { left: 'Вы ______ моё имя.', right: 'помните' },
      { left: 'Ты ______ номер группы.', right: 'помнишь' },
      { left: 'Они ______ этот фильм.', right: 'помнят' },
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

export default function LessonElevenTaskOnePage() {
  const navigate = useNavigate();
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
      if (TASKS.length > 0) setLessonTaskResult('/lesson-11', 2, TASKS.length, TASKS.length);
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
          onClick={() => navigate('/lesson-11')}
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
