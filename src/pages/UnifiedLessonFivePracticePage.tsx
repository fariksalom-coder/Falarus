import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
type MatchingTask = { type: 'matching'; prompt: string; pairs: { left: string; right: string }[] };
type Task = ChoiceTask | MatchingTask;

type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };

const TASKS: Task[] = [
  { type: 'choice', prompt: 'словарь — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: 'дверь — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Женский' },
  { type: 'choice', prompt: 'учитель — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: 'ночь — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Женский' },
  { type: 'choice', prompt: 'январь — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: 'любовь — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Женский' },
  { type: 'choice', prompt: 'день — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: 'тетрадь — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Женский' },
  { type: 'choice', prompt: 'водитель — ___ хороший', options: ['он', 'она', 'оно'], correct: 'он' },
  { type: 'choice', prompt: 'площадь — ___ большая', options: ['он', 'она', 'оно'], correct: 'она' },
  { type: 'choice', prompt: 'июль — ___ жаркий', options: ['он', 'она', 'оно'], correct: 'он' },
  { type: 'choice', prompt: 'жизнь — ___ трудная', options: ['он', 'она', 'оно'], correct: 'она' },
  { type: 'choice', prompt: 'покупатель — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: 'кровать — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Женский' },
  { type: 'choice', prompt: 'сентябрь — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Мужской' },

  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [{ left: 'Мужской', right: 'словарь' }, { left: 'Женский', right: 'дверь' }],
  },
  { type: 'matching', prompt: '2) Juftini toping', pairs: [{ left: 'Мужской', right: 'учитель' }, { left: 'Женский', right: 'ночь' }] },
  { type: 'matching', prompt: '3) Juftini toping', pairs: [{ left: 'Мужской', right: 'январь' }, { left: 'Женский', right: 'тетрадь' }] },
  { type: 'matching', prompt: '4) Juftini toping', pairs: [{ left: 'Мужской', right: 'день' }, { left: 'Женский', right: 'площадь' }] },
  { type: 'matching', prompt: '5) Juftini toping', pairs: [{ left: 'Мужской', right: 'сентябрь' }, { left: 'Женский', right: 'кровать' }] },
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

export default function UnifiedLessonFivePracticePage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [matchLeft, setMatchLeft] = useState<MatchCard[]>([]);
  const [matchRight, setMatchRight] = useState<MatchCard[]>([]);
  const [matchSelected, setMatchSelected] = useState<MatchCard | null>(null);
  const [matchWrongIds, setMatchWrongIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [matchLocked, setMatchLocked] = useState(false);

  const currentTask = TASKS[currentIndex];
  const progress = useMemo(() => ((currentIndex + (finished ? 1 : 0)) / TASKS.length) * 100, [currentIndex, finished]);

  useEffect(() => {
    const task = TASKS[currentIndex];
    setStatus('idle');
    setMessage('');
    if (task.type === 'choice') {
      setChoiceOptions(shuffle(task.options));
      setSelectedOption('');
    }
    if (task.type === 'matching') {
      const cards = buildMatchCards(task.pairs);
      setMatchLeft(cards.left);
      setMatchRight(cards.right);
      setMatchSelected(null);
      setMatchWrongIds([]);
      setMatchedPairIds([]);
      setMatchLocked(false);
    }
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < TASKS.length - 1) setCurrentIndex((prev) => prev + 1);
    else setFinished(true);
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
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/lesson-5')}
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
            <p className="whitespace-pre-line text-base font-semibold text-slate-900">{currentTask.prompt}</p>

            {currentTask.type === 'choice' && (
              <div className="mt-4 space-y-2">
                {choiceOptions.map((option) => {
                  const isSelected = selectedOption === option;
                  const showCorrect = status === 'correct' && isSelected;
                  const showWrong = status === 'wrong' && isSelected;
                  const className = showCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : showWrong
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (status === 'correct') return;
                        setSelectedOption(option);
                        const ok = option === currentTask.correct;
                        setStatus(ok ? 'correct' : 'wrong');
                        setMessage(ok ? 'To‘g‘ri!' : `Noto‘g‘ri. To‘g‘ri javob: ${currentTask.correct}`);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98] ${className}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {currentTask.type === 'matching' && (
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
                        className={`w-full rounded-2xl border px-3 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${stateClass}`}
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
            )}

            {message && (
              <p className={`mt-4 text-sm font-bold ${status === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>
            )}

            {((currentTask.type === 'choice' && status !== 'idle') || (currentTask.type === 'matching' && status === 'correct')) && (
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
            <p className="mt-2 text-emerald-700">Tabriklaymiz! Siz barcha topshiriqlarni bajardingiz.</p>
          </div>
        )}
      </main>
    </div>
  );
}
