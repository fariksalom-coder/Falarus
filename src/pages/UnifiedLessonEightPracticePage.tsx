import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setLessonTaskResult } from '../utils/lessonTaskResults';
import { addUserPoints } from '../api/leaderboard';

type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
type SentenceTask = { type: 'sentence'; prompt: string; words: string[]; correct: string };
type MatchingTask = { type: 'matching'; prompt: string; pairs: { left: string; right: string }[] };
type Task = ChoiceTask | SentenceTask | MatchingTask;

type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };
type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: Task[] = [
  { type: 'choice', prompt: '"книга" — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Женский' },
  { type: 'choice', prompt: 'Кто она? — ___ врач.', options: ['Он', 'Она', 'Они'], correct: 'Она' },
  { type: 'choice', prompt: '"быстро" — bu', options: ['Ot', 'Ravish', 'Sifat'], correct: 'Ravish' },
  { type: 'choice', prompt: 'дом —', options: ['дома', 'домы', 'доми'], correct: 'дома' },
  { type: 'choice', prompt: 'Это ___ машина (mening).', options: ['мой', 'моя', 'моё'], correct: 'моя' },
  { type: 'choice', prompt: 'словарь — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Мужской' },
  { type: 'choice', prompt: '"три" — bu', options: ['Son', 'Sifat', 'Fe’l'], correct: 'Son' },
  { type: 'choice', prompt: 'брат —', options: ['браты', 'братья', 'братя'], correct: 'братья' },
  { type: 'choice', prompt: 'Это мой дом, ___ не твой.', options: ['и', 'или', 'но'], correct: 'но' },
  { type: 'choice', prompt: 'время — bu', options: ['Мужской', 'Женский', 'Средний'], correct: 'Средний' },

  { type: 'sentence', prompt: 'Gapni tuzing: Men talabaman.', words: ['я', 'студент'], correct: 'я студент' },
  { type: 'sentence', prompt: 'Gapni tuzing: U yaxshi shifokor.', words: ['она', 'врач', 'хороший'], correct: 'она хороший врач' },
  { type: 'sentence', prompt: 'Gapni tuzing: Bu mening telefonim.', words: ['это', 'мой', 'телефон'], correct: 'это мой телефон' },
  { type: 'sentence', prompt: 'Gapni tuzing: Biz Samarqanddanmiz.', words: ['мы', 'из', 'Самарканд'], correct: 'мы из Самарканд' },
  { type: 'sentence', prompt: 'Gapni tuzing: Ular ruscha gaplashadi.', words: ['они', 'говорят', 'по-русски'], correct: 'они говорят по-русски' },
  { type: 'sentence', prompt: 'Gapni tuzing: Bular katta shaharlar.', words: ['большие', 'города', 'это'], correct: 'это большие города' },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Mening kitobim va sening kitobing.',
    words: ['моя', 'книга', 'и', 'твоя', 'книга'],
    correct: 'моя книга и твоя книга',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Eski uylar, lekin yangi park.',
    words: ['старые', 'дома', 'но', 'новый', 'парк'],
    correct: 'старые дома но новый парк',
  },
  { type: 'sentence', prompt: 'Gapni tuzing: Bizning o‘qituvchilarimiz yaxshi.', words: ['наши', 'учителя', 'хорошие'], correct: 'наши учителя хорошие' },
  { type: 'sentence', prompt: 'Gapni tuzing: Uning do‘stlari uyda.', words: ['его', 'друзья', 'дома'], correct: 'его друзья дома' },

  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'дом', right: 'мой' },
      { left: 'книга', right: 'моя' },
      { left: 'окно', right: 'моё' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'брат', right: 'братья' },
      { left: 'друг', right: 'друзья' },
      { left: 'сын', right: 'сыновья' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'учитель', right: 'он' },
      { left: 'ночь', right: 'она' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Чей дом?', right: 'Это мой дом.' },
      { left: 'Чья школа?', right: 'Это моя школа.' },
      { left: 'Чьё письмо?', right: 'Это моё письмо.' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'город', right: 'города' },
      { left: 'дерево', right: 'деревья' },
      { left: 'лист', right: 'листья' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'быстро', right: 'читать' },
      { left: 'красивый', right: 'машина' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'мама', right: 'Женский' },
      { left: 'папа', right: 'Мужской' },
      { left: 'время', right: 'Средний' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Мы', right: 'biz' },
      { left: 'Ты', right: 'sen' },
      { left: 'Они', right: 'ular' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Это его дом.', right: 'Мужской' },
      { left: 'Это моя книга.', right: 'Женский' },
      { left: 'Это моё окно.', right: 'Средний' },
    ],
  },

  { type: 'choice', prompt: 'Это новая школа ___ старый дом.', options: ['и', 'но', 'или'], correct: 'и' },
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

export default function UnifiedLessonEightPracticePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [sentencePool, setSentencePool] = useState<SentencePoolItem[]>([]);
  const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);
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

    if (task.type === 'sentence') {
      setSentencePool(
        shuffle(task.words).map((word, idx) => ({
          id: `${idx}-${word}`,
          word,
          used: false,
        }))
      );
      setSentenceAnswer([]);
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

  const moveWordToAnswer = (item: SentencePoolItem, idx: number) => {
    if (status === 'correct' || item.used) return;
    if (status === 'wrong') {
      setStatus('idle');
      setMessage('');
    }
    setSentenceAnswer((prev) => [...prev, item.word]);
    setSentencePool((prev) => prev.map((poolItem, i) => (i === idx ? { ...poolItem, used: true } : poolItem)));
  };

  const clearSentence = () => {
    if (status === 'correct') return;
    if (status === 'wrong') {
      setStatus('idle');
      setMessage('');
    }
    setSentencePool((prev) => prev.map((item) => ({ ...item, used: false })));
    setSentenceAnswer([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/lesson-8')}
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
            {currentTask.type === 'sentence' ? (
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold text-slate-600">Gapni tuzing</p>
                <p className="text-2xl font-bold text-slate-900">
                  {currentTask.prompt.split(':').slice(1).join(':').trim() || currentTask.prompt}
                </p>
              </div>
            ) : (
              <p className="text-base font-semibold text-slate-900">{currentTask.prompt}</p>
            )}

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

            {currentTask.type === 'sentence' && (
              <div className="mt-4">
                <div
                  className={`min-h-16 rounded-2xl border px-3 py-3 ${
                    status === 'idle'
                      ? 'border-slate-300 bg-slate-50'
                      : status === 'correct'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  {sentenceAnswer.length > 0 ? (
                    <p className="text-sm font-semibold text-slate-900">{sentenceAnswer.join(' ')}</p>
                  ) : (
                    <p className="text-sm text-slate-400">Javob shu yerda yig‘iladi...</p>
                  )}
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={clearSentence}
                    disabled={status === 'correct' || sentenceAnswer.length === 0}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tozalash
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sentencePool.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => moveWordToAnswer(item, idx)}
                      disabled={item.used || status === 'correct'}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-all ${
                        item.used
                          ? 'border-slate-200 bg-white text-transparent cursor-default'
                          : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]'
                      }`}
                    >
                      {item.used ? '\u00A0' : item.word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {message && (
              <p className={`mt-4 text-sm font-bold ${status === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>
            )}

            {currentTask.type === 'sentence' && status !== 'correct' && (
              <button
                type="button"
                onClick={() => {
                  const built = sentenceAnswer.join(' ').trim();
                  const ok = built === currentTask.correct;
                  setStatus(ok ? 'correct' : 'wrong');
                  setMessage(ok ? 'To‘g‘ri!' : `Noto‘g‘ri. To‘g‘ri javob: ${currentTask.correct}`);
                }}
                disabled={sentenceAnswer.length === 0}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tekshirish
              </button>
            )}

            {((currentTask.type === 'choice' && status !== 'idle') || (currentTask.type === 'sentence' && status === 'correct') ||
              (currentTask.type === 'matching' && status === 'correct')) && (
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
                  setLessonTaskResult('/lesson-8', 1, correctCount, TASKS.length);
                  if (token) addUserPoints(token, correctCount);
                }
                navigate('/lesson-8');
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
