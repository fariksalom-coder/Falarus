import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
type SentenceTask = { type: 'sentence'; prompt: string; words: string[]; correct: string };
type MatchingTask = { type: 'matching'; prompt: string; pairs: { left: string; right: string }[] };
type Task = ChoiceTask | SentenceTask | MatchingTask;

type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };
type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: Task[] = [
  { type: 'choice', prompt: '"врач" bu —', options: ['Sifat', 'Ot', 'Fe’l'], correct: 'Ot' },
  { type: 'choice', prompt: '"красивый" bu —', options: ['Sifat', 'Ot', 'Son'], correct: 'Sifat' },
  { type: 'choice', prompt: '"читать" bu —', options: ['Ot', 'Ravish', 'Fe’l'], correct: 'Fe’l' },
  { type: 'choice', prompt: '"три" bu —', options: ['Son', 'Sifat', 'Fe’l'], correct: 'Son' },
  { type: 'choice', prompt: '"быстро" bu —', options: ['Ot', 'Ravish', 'Son'], correct: 'Ravish' },
  { type: 'choice', prompt: 'Qaysi so‘z OT?', options: ['дом', 'большой', 'читать'], correct: 'дом' },
  { type: 'choice', prompt: 'Qaysi so‘z SIFAT?', options: ['машина', 'новый', 'писать'], correct: 'новый' },
  { type: 'choice', prompt: 'Qaysi so‘z FE’L?', options: ['работать', 'студент', 'книга'], correct: 'работать' },
  { type: 'choice', prompt: 'Qaysi so‘z SON?', options: ['пять', 'тихо', 'хороший'], correct: 'пять' },
  { type: 'choice', prompt: 'Qaysi so‘z RAVISH?', options: ['быстро', 'дом', 'три'], correct: 'быстро' },
  { type: 'choice', prompt: '"учитель" — bu', options: ['Fe’l', 'Ot', 'Son'], correct: 'Ot' },
  { type: 'choice', prompt: '"медленно" — bu', options: ['Ravish', 'Ot', 'Sifat'], correct: 'Ravish' },
  { type: 'choice', prompt: '"новый дом"dagi "новый" — bu', options: ['Son', 'Sifat', 'Fe’l'], correct: 'Sifat' },
  { type: 'choice', prompt: '"писать" — bu', options: ['Fe’l', 'Ot', 'Ravish'], correct: 'Fe’l' },
  { type: 'choice', prompt: '"десять" — bu', options: ['Son', 'Ot', 'Sifat'], correct: 'Son' },

  { type: 'sentence', prompt: 'Gapni tuzing: katta uy', words: ['большой', 'дом', 'больше', 'маленький'], correct: 'большой дом' },
  { type: 'sentence', prompt: 'Gapni tuzing: chiroyli mashina', words: ['красивая', 'красиво', 'машина', 'машины'], correct: 'красивая машина' },
  { type: 'sentence', prompt: 'Gapni tuzing: tez o‘qimoq', words: ['быстро', 'быстрый', 'читать', 'писать'], correct: 'быстро читать' },
  { type: 'sentence', prompt: 'Gapni tuzing: yaxshi talaba', words: ['хороший', 'хорошо', 'студент', 'студенты'], correct: 'хороший студент' },
  { type: 'sentence', prompt: 'Gapni tuzing: uchta kitob', words: ['три', 'книга', 'книги', 'читать'], correct: 'три книги' },
  { type: 'sentence', prompt: 'Gapni tuzing: sekin gapirmoq', words: ['медленно', 'медленный', 'говорить', 'говорит'], correct: 'медленно говорить' },
  { type: 'sentence', prompt: 'Gapni tuzing: yangi telefon', words: ['новый', 'новое', 'телефон', 'телефоны'], correct: 'новый телефон' },
  { type: 'sentence', prompt: 'Gapni tuzing: baland ovozda gapirmoq', words: ['громко', 'громкий', 'говорить', 'говорит'], correct: 'громко говорить' },
  { type: 'sentence', prompt: 'Gapni tuzing: katta maktab', words: ['большая', 'большой', 'школа', 'школы'], correct: 'большая школа' },
  { type: 'sentence', prompt: 'Gapni tuzing: beshta talaba', words: ['пять', 'студентов', 'студенты', 'учиться'], correct: 'пять студентов' },
  { type: 'sentence', prompt: 'Gapni tuzing: chiroyli qiz', words: ['красивая', 'красивый', 'девочка', 'красиво'], correct: 'красивая девочка' },
  { type: 'sentence', prompt: 'Gapni tuzing: tez yozmoq', words: ['быстро', 'быстрый', 'писать', 'письмо'], correct: 'быстро писать' },

  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'красивый', right: 'красиво' },
      { left: 'быстрый', right: 'быстро' },
      { left: 'громкий', right: 'громко' },
      { left: 'медленный', right: 'медленно' },
      { left: 'хороший', right: 'хорошо' },
      { left: 'тихий', right: 'тихо' },
    ],
  },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'большой', right: 'дом' }, { left: 'быстро', right: 'читать' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'красивый', right: 'машина' }, { left: 'медленно', right: 'говорить' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'новый', right: 'студент' }, { left: 'громко', right: 'читать' }] },
  { type: 'matching', prompt: 'Juftini toping', pairs: [{ left: 'хороший', right: 'телефон' }, { left: 'тихо', right: 'работать' }] },
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

export default function UnifiedLessonThreePracticePage() {
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
      setSentencePool(shuffle(task.words).map((word, idx) => ({ id: `${idx}-${word}`, word, used: false })));
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
    setSentencePool((prev) => prev.map((p, i) => (i === idx ? { ...p, used: true } : p)));
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
          onClick={() => navigate('/lesson-3')}
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
              <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Mos juftliklarni toping</p>
                  <span className="text-xs text-slate-500">Tanlang: chap + o‘ng</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  {matchLeft.map((card) => {
                    const isSelected = matchSelected?.id === card.id;
                    const isWrong = matchWrongIds.includes(card.id);
                    const isMatched = matchedPairIds.includes(card.pairId);
                    const stateClass = isMatched
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100'
                      : isWrong
                      ? 'border-red-400 bg-red-50 text-red-700 shadow-sm shadow-red-100'
                      : isSelected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                      : 'border-slate-300 bg-white text-slate-900 hover:border-indigo-300 hover:bg-indigo-50/40';
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleMatchingClick(card)}
                        className={`w-full rounded-2xl border px-3 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${stateClass}`}
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
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100'
                      : isWrong
                      ? 'border-red-400 bg-red-50 text-red-700 shadow-sm shadow-red-100'
                      : isSelected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                      : 'border-slate-300 bg-white text-slate-900 hover:border-indigo-300 hover:bg-indigo-50/40';
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleMatchingClick(card)}
                        className={`w-full rounded-2xl border px-3 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${stateClass}`}
                      >
                        {card.text}
                      </button>
                    );
                  })}
                </div>
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

            {((currentTask.type === 'choice' || currentTask.type === 'sentence') && status !== 'idle') ||
            (currentTask.type === 'matching' && status === 'correct') ? (
              <button
                type="button"
                onClick={handleNext}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {currentIndex < TASKS.length - 1 ? 'Keyingi' : 'Yakunlash'}
              </button>
            ) : null}
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
              onClick={() => navigate('/lesson-3')}
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
