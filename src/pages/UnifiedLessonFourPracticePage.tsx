import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setLessonTaskResult } from '../utils/lessonTaskResults';
import { addUserPoints } from '../api/leaderboard';

type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
type MatchingTask = { type: 'matching'; prompt: string; pairs: { left: string; right: string }[] };
type Task = ChoiceTask | MatchingTask;

type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };

const TASKS: Task[] = [
  { type: 'choice', prompt: '"дом" — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: '"машина" — bu', options: ['Мужской', 'Средний', 'Женский'], correct: 'Женский' },
  { type: 'choice', prompt: '"окно" — bu', options: ['Средний', 'Мужской', 'Женский'], correct: 'Средний' },
  { type: 'choice', prompt: '"город" — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: '"школа" — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Женский' },
  { type: 'choice', prompt: '"море" — bu', options: ['Мужской', 'Средний', 'Женский'], correct: 'Средний' },
  { type: 'choice', prompt: '"телефон" — bu', options: ['Мужской', 'Средний', 'Женский'], correct: 'Мужской' },
  { type: 'choice', prompt: '"книга" — bu', options: ['Средний', 'Женский', 'Мужской'], correct: 'Женский' },
  { type: 'choice', prompt: '"письмо" — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Средний' },
  { type: 'choice', prompt: '"врач" — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: '"здание" — bu', options: ['Средний', 'Мужской', 'Женский'], correct: 'Средний' },
  { type: 'choice', prompt: '"работа" — bu', options: ['Мужской', 'Средний', 'Женский'], correct: 'Женский' },
  { type: 'choice', prompt: '"поле" — bu', options: ['Женский', 'Средний', 'Мужской'], correct: 'Средний' },
  { type: 'choice', prompt: '"студент" — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: '"дверь" — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Женский' },
  { type: 'choice', prompt: '"дедушка" — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: '"папа" — bu', options: ['Мужской', 'Средний', 'Женский'], correct: 'Мужской' },
  { type: 'choice', prompt: '"юноша" — bu', options: ['Женский', 'Средний', 'Мужской'], correct: 'Мужской' },
  { type: 'choice', prompt: '"кофе" — bu', options: ['Средний', 'Мужской', 'Женский'], correct: 'Мужской' },
  { type: 'choice', prompt: '"время" — bu', options: ['Женский', 'Мужской', 'Средний'], correct: 'Средний' },
  { type: 'choice', prompt: '"имя" — bu', options: ['Средний', 'Мужской', 'Женский'], correct: 'Средний' },
  { type: 'choice', prompt: '"мужчина" — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: '"пламя" — bu', options: ['Средний', 'Мужской', 'Женский'], correct: 'Средний' },
  { type: 'choice', prompt: '"дедушка" — ___ хороший', options: ['он', 'она', 'оно'], correct: 'он' },
  { type: 'choice', prompt: '"время" — ___ быстрое', options: ['он', 'она', 'оно'], correct: 'оно' },

  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'дом' }, { left: 'Женский', right: 'мама' }, { left: 'Средний', right: 'окно' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'город' }, { left: 'Женский', right: 'машина' }, { left: 'Средний', right: 'море' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'телефон' }, { left: 'Женский', right: 'школа' }, { left: 'Средний', right: 'письмо' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'студент' }, { left: 'Женский', right: 'книга' }, { left: 'Средний', right: 'здание' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'врач' }, { left: 'Женский', right: 'работа' }, { left: 'Средний', right: 'поле' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'директор' }, { left: 'Женский', right: 'комната' }, { left: 'Средний', right: 'озеро' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'банк' }, { left: 'Женский', right: 'дверь' }, { left: 'Средний', right: 'село' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'учитель' }, { left: 'Женский', right: 'неделя' }, { left: 'Средний', right: 'место' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'магазин' }, { left: 'Женский', right: 'страна' }, { left: 'Средний', right: 'время' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'Мужской', right: 'парень' }, { left: 'Женский', right: 'семья' }, { left: 'Средний', right: 'окно' }] },
  { type: 'matching', prompt: 'Juftini toping (istisnolar)', pairs: [{ left: 'Мужской', right: 'папа' }, { left: 'Женский', right: 'мама' }, { left: 'Средний', right: 'время' }] },
  { type: 'matching', prompt: 'Juftini toping (istisnolar)', pairs: [{ left: 'Мужской', right: 'дедушка' }, { left: 'Женский', right: 'семья' }, { left: 'Средний', right: 'имя' }] },
  { type: 'matching', prompt: 'Juftini toping (istisnolar)', pairs: [{ left: 'Мужской', right: 'юноша' }, { left: 'Женский', right: 'ночь' }, { left: 'Средний', right: 'пламя' }] },
  { type: 'matching', prompt: 'Juftini toping (istisnolar)', pairs: [{ left: 'Мужской', right: 'мужчина' }, { left: 'Женский', right: 'дверь' }, { left: 'Средний', right: 'знамя' }] },
  { type: 'matching', prompt: 'Juftini toping (istisnolar)', pairs: [{ left: 'Мужской', right: 'кофе' }, { left: 'Женский', right: 'работа' }, { left: 'Средний', right: 'семя' }] },
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

export default function UnifiedLessonFourPracticePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
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
  const [correctCount, setCorrectCount] = useState(0);

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
    if (status === 'correct') setCorrectCount((c) => c + 1);
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
          onClick={() => navigate('/lesson-4')}
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
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-6 shadow-sm">
            <p className="text-lg font-bold text-slate-900">Natija</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">
              To‘g‘ri javoblar: {correctCount} / {TASKS.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {TASKS.length > 0 ? Math.round((correctCount / TASKS.length) * 100) : 0}%
            </p>
            <button
              type="button"
              onClick={() => {
                if (TASKS.length > 0) {
                  setLessonTaskResult('/lesson-4', 1, correctCount, TASKS.length);
                  if (token) addUserPoints(token, correctCount);
                }
                navigate('/lesson-4');
              }}
              className={`mt-6 w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white transition-colors ${
                TASKS.length > 0 && correctCount / TASKS.length >= 0.8
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              Tugatish
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
