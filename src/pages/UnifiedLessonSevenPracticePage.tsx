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
  { type: 'choice', prompt: 'дом —', options: ['домы', 'дома', 'доми'], correct: 'дома' },
  { type: 'choice', prompt: 'книга —', options: ['книги', 'книгаы', 'книгы'], correct: 'книги' },
  { type: 'choice', prompt: 'окно —', options: ['окна', 'окны', 'окни'], correct: 'окна' },
  { type: 'choice', prompt: 'парк —', options: ['паркы', 'парки', 'парка'], correct: 'парки' },
  { type: 'choice', prompt: 'слово —', options: ['слова', 'словы', 'слови'], correct: 'слова' },
  { type: 'choice', prompt: 'семья —', options: ['семьи', 'семьяы', 'семья'], correct: 'семьи' },
  { type: 'choice', prompt: 'стол —', options: ['столы', 'стола', 'столи'], correct: 'столы' },
  { type: 'choice', prompt: 'море —', options: ['моря', 'мореы', 'мореи'], correct: 'моря' },
  { type: 'choice', prompt: 'город —', options: ['городы', 'города', 'городи'], correct: 'города' },
  { type: 'choice', prompt: 'брат —', options: ['браты', 'братья', 'братя'], correct: 'братья' },
  { type: 'choice', prompt: 'музей —', options: ['музеи', 'музея', 'музейы'], correct: 'музеи' },
  { type: 'choice', prompt: 'лист —', options: ['листы', 'листья', 'листя'], correct: 'листья' },
  { type: 'choice', prompt: 'тетрадь —', options: ['тетрады', 'тетради', 'тетрадя'], correct: 'тетради' },
  { type: 'choice', prompt: 'учитель —', options: ['учители', 'учителя', 'учительы'], correct: 'учителя' },
  { type: 'choice', prompt: 'дерево —', options: ['дерева', 'деревья', 'деревы'], correct: 'деревья' },

  { type: 'sentence', prompt: 'Gapni tuzing: katta uylar', words: ['большие', 'большой', 'дома', 'дом'], correct: 'большие дома' },
  { type: 'sentence', prompt: 'Gapni tuzing: yangi kitoblar', words: ['новые', 'новый', 'книги', 'книга'], correct: 'новые книги' },
  { type: 'sentence', prompt: 'Gapni tuzing: yaxshi o‘qituvchilar', words: ['хорошие', 'хороший', 'учителя', 'учитель'], correct: 'хорошие учителя' },
  { type: 'sentence', prompt: 'Gapni tuzing: katta shaharlar', words: ['большие', 'большой', 'города', 'город'], correct: 'большие города' },
  { type: 'sentence', prompt: 'Gapni tuzing: chiroyli qizlar', words: ['красивые', 'красивая', 'девочки', 'девочка'], correct: 'красивые девочки' },
  { type: 'sentence', prompt: 'Gapni tuzing: kichik parklar', words: ['маленькие', 'маленький', 'парки', 'парк'], correct: 'маленькие парки' },
  { type: 'sentence', prompt: 'Gapni tuzing: yangi oynalar', words: ['новые', 'новое', 'окна', 'окно'], correct: 'новые окна' },
  { type: 'sentence', prompt: 'Gapni tuzing: ko‘k dengizlar', words: ['синие', 'синий', 'моря', 'море'], correct: 'синие моря' },
  { type: 'sentence', prompt: 'Gapni tuzing: yaxshi do‘stlar', words: ['хорошие', 'хороший', 'друзья', 'друг'], correct: 'хорошие друзья' },
  { type: 'sentence', prompt: 'Gapni tuzing: baland daraxtlar', words: ['высокие', 'высокий', 'деревья', 'дерево'], correct: 'высокие деревья' },
  { type: 'sentence', prompt: 'Gapni tuzing: eski maktablar', words: ['старые', 'старый', 'школы', 'школа'], correct: 'старые школы' },
  { type: 'sentence', prompt: 'Gapni tuzing: yangi stullar', words: ['новые', 'новый', 'стулья', 'стул'], correct: 'новые стулья' },
  { type: 'sentence', prompt: 'Gapni tuzing: kichik derazalar', words: ['маленькие', 'маленький', 'окна', 'окно'], correct: 'маленькие окна' },
  { type: 'sentence', prompt: 'Gapni tuzing: uzun poezdlar', words: ['длинные', 'длинный', 'поезда', 'поезд'], correct: 'длинные поезда' },
  { type: 'sentence', prompt: 'Gapni tuzing: katta muzeylar', words: ['большие', 'большой', 'музеи', 'музей'], correct: 'большие музеи' },

  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'дом', right: 'дома' },
      { left: 'город', right: 'города' },
      { left: 'поезд', right: 'поезда' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'книга', right: 'книги' },
      { left: 'школа', right: 'школы' },
      { left: 'улица', right: 'улицы' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'окно', right: 'окна' },
      { left: 'море', right: 'моря' },
      { left: 'слово', right: 'слова' },
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
      { left: 'лист', right: 'листья' },
      { left: 'дерево', right: 'деревья' },
      { left: 'стул', right: 'стулья' },
    ],
  },

  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu katta uylar va yangi maktablar.',
    words: ['это', 'большие', 'большой', 'дома', 'школы', 'новые', 'и', 'но'],
    correct: 'это большие дома и новые школы',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu mening kitoblarim yoki sening kitoblaring?',
    words: ['это', 'мои', 'твои', 'книги', 'книги', 'или', 'и'],
    correct: 'это мои книги или твои книги',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu eski shaharlar, lekin yangi parklar.',
    words: ['это', 'старые', 'новые', 'города', 'парки', 'но', 'и'],
    correct: 'это старые города но новые парки',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu bizning o‘qituvchilarimiz va ularning do‘stlari.',
    words: ['это', 'наши', 'их', 'учителя', 'друзья', 'и', 'а'],
    correct: 'это наши учителя и их друзья',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu katta oynalar yoki kichik eshiklar?',
    words: ['это', 'большие', 'маленькие', 'окна', 'двери', 'или', 'но'],
    correct: 'это большие окна или маленькие двери',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu yangi stullar, lekin eski stol emas.',
    words: ['это', 'новые', 'старый', 'стулья', 'стол', 'но', 'не'],
    correct: 'это новые стулья но не старый стол',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu uning do‘stlari va mening aka-ukalarim.',
    words: ['это', 'его', 'мои', 'друзья', 'братья', 'и', 'а'],
    correct: 'это его друзья и мои братья',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu sizning maktablaringiz yoki bizning universitetlarimiz?',
    words: ['это', 'ваши', 'наши', 'школы', 'университеты', 'или', 'но'],
    correct: 'это ваши школы или наши университеты',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu katta daraxtlar va ko‘k dengizlar.',
    words: ['это', 'высокие', 'синие', 'деревья', 'моря', 'и', 'а'],
    correct: 'это высокие деревья и синие моря',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu yangi shaharlar, lekin eski uylar emas.',
    words: ['это', 'новые', 'старые', 'города', 'дома', 'но', 'не'],
    correct: 'это новые города но не старые дома',
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

export default function UnifiedLessonSevenPracticePage() {
  const navigate = useNavigate();
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
          onClick={() => navigate('/lesson-7')}
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
                  setLessonTaskResult('/lesson-7', 1, correctCount, TASKS.length);
                  if (token) addUserPoints(token, correctCount);
                }
                navigate('/lesson-7');
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
