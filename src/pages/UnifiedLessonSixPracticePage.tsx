import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setLessonTaskResult } from '../utils/lessonTaskResults';

type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
type SentenceTask = { type: 'sentence'; prompt: string; words: string[]; correct: string };
type MatchingTask = { type: 'matching'; prompt: string; pairs: { left: string; right: string }[] };
type Task = ChoiceTask | SentenceTask | MatchingTask;

type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };
type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Чей дом? — ___ дом.', options: ['моя', 'мой', 'моё'], correct: 'мой' },
  { type: 'choice', prompt: 'Чья книга? — ___ книга.', options: ['мой', 'моя', 'моё'], correct: 'моя' },
  { type: 'choice', prompt: 'Чьё окно? — ___ окно.', options: ['моё', 'моя', 'мой'], correct: 'моё' },
  { type: 'choice', prompt: 'Это ___ машина (mening).', options: ['мой', 'моя', 'моё'], correct: 'моя' },
  { type: 'choice', prompt: 'Это ___ письмо (mening).', options: ['моя', 'моё', 'мой'], correct: 'моё' },
  { type: 'choice', prompt: 'Это ___ телефон (sening).', options: ['твой', 'твоя', 'твоё'], correct: 'твой' },
  { type: 'choice', prompt: 'Это ___ школа (bizning).', options: ['наш', 'наша', 'наше'], correct: 'наша' },
  { type: 'choice', prompt: 'Это ___ дом (sizning).', options: ['ваша', 'ваш', 'ваше'], correct: 'ваш' },
  { type: 'choice', prompt: 'Это ___ книга (uning — erkak).', options: ['его', 'её', 'мой'], correct: 'его' },
  { type: 'choice', prompt: 'Это ___ машина (uning — ayol).', options: ['его', 'её', 'твоя'], correct: 'её' },
  { type: 'choice', prompt: 'Это ___ друзья (bizning).', options: ['наши', 'наша', 'наше'], correct: 'наши' },
  { type: 'choice', prompt: 'Чья школа? — ___ школа.', options: ['наша', 'наш', 'наше'], correct: 'наша' },
  { type: 'choice', prompt: 'Чей учитель? — ___ учитель.', options: ['мой', 'моя', 'моё'], correct: 'мой' },
  { type: 'choice', prompt: 'Чьё письмо? — ___ письмо.', options: ['твоё', 'твоя', 'твой'], correct: 'твоё' },
  { type: 'choice', prompt: 'Это ___ дом (ularning).', options: ['их', 'наши', 'ваша'], correct: 'их' },

  { type: 'sentence', prompt: 'Gapni tuzing: mening uyim', words: ['мой', 'моя', 'дом', 'дома'], correct: 'мой дом' },
  { type: 'sentence', prompt: 'Gapni tuzing: mening kitobim', words: ['мой', 'моя', 'книга', 'книги'], correct: 'моя книга' },
  { type: 'sentence', prompt: 'Gapni tuzing: mening oynaim', words: ['моё', 'мой', 'окно', 'окна'], correct: 'моё окно' },
  { type: 'sentence', prompt: 'Gapni tuzing: sening telefoning', words: ['твой', 'твоя', 'телефон', 'телефоны'], correct: 'твой телефон' },
  { type: 'sentence', prompt: 'Gapni tuzing: bizning maktabimiz', words: ['наша', 'наш', 'школа', 'школы'], correct: 'наша школа' },
  { type: 'sentence', prompt: 'Gapni tuzing: sizning mashinangiz', words: ['ваша', 'ваш', 'машина', 'машины'], correct: 'ваша машина' },
  { type: 'sentence', prompt: 'Gapni tuzing: uning (erkak) uyi', words: ['его', 'её', 'дом', 'дома'], correct: 'его дом' },
  { type: 'sentence', prompt: 'Gapni tuzing: uning (ayol) kitobi', words: ['его', 'её', 'книга', 'книги'], correct: 'её книга' },
  { type: 'sentence', prompt: 'Gapni tuzing: bizning do‘stlarimiz', words: ['наши', 'наша', 'друзья', 'друг'], correct: 'наши друзья' },
  { type: 'sentence', prompt: 'Gapni tuzing: ularning uyi', words: ['их', 'наш', 'дом', 'дома'], correct: 'их дом' },

  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Чей дом?', right: 'Это мой дом.' },
      { left: 'Чья машина?', right: 'Это моя машина.' },
      { left: 'Чьё окно?', right: 'Это моё окно.' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Чей телефон?', right: 'Это твой телефон.' },
      { left: 'Чья школа?', right: 'Это твоя школа.' },
      { left: 'Чьё письмо?', right: 'Это твоё письмо.' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Чей город?', right: 'Это наш город.' },
      { left: 'Чья квартира?', right: 'Это наша квартира.' },
      { left: 'Чьё здание?', right: 'Это наше здание.' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Чей учитель?', right: 'Это ваш учитель.' },
      { left: 'Чья семья?', right: 'Это ваша семья.' },
      { left: 'Чьё место?', right: 'Это ваше место.' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Чей дом? (uning — erkak)', right: 'Это его дом.' },
      { left: 'Чья машина? (uning — ayol)', right: 'Это её машина.' },
      { left: 'Чьё окно? (ularning)', right: 'Это их окно.' },
    ],
  },

  {
    type: 'sentence',
    prompt: 'Gapni tuzing: mening onam va otam',
    words: ['моя', 'мой', 'мама', 'папа', 'и'],
    correct: 'моя мама и мой папа',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: bu mening uyim va maktabim',
    words: ['это', 'мой', 'моя', 'дом', 'школа', 'и'],
    correct: 'это мой дом и моя школа',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: bu sening kitobing yoki mening kitobim',
    words: ['это', 'твоя', 'моя', 'книга', 'книга', 'или'],
    correct: 'это твоя книга или моя книга',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: bu mening telefonim, lekin seniki emas',
    words: ['это', 'мой', 'твой', 'телефон', 'но', 'не'],
    correct: 'это мой телефон но не твой',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: bu sening mashinangmi? — ha',
    words: ['это', 'твоя', 'машина', 'да'],
    correct: 'это твоя машина да',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: bu uning uyi? — yo‘q',
    words: ['это', 'его', 'дом', 'нет'],
    correct: 'это его дом нет',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: bu mening uyim yoki uning uyi',
    words: ['это', 'мой', 'его', 'дом', 'дом', 'или'],
    correct: 'это мой дом или его дом',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: bu bizning maktabimiz va sizning maktabingiz',
    words: ['это', 'наша', 'ваша', 'школа', 'школа', 'и'],
    correct: 'это наша школа и ваша школа',
  },

  { type: 'choice', prompt: 'Это мой брат ___ моя сестра.', options: ['или', 'и', 'но'], correct: 'и' },
  { type: 'choice', prompt: 'Это твой дом ___ его дом?', options: ['и', 'или', 'но'], correct: 'или' },
  { type: 'choice', prompt: 'Это мой телефон, ___ не твой.', options: ['и', 'но', 'или'], correct: 'но' },
  { type: 'choice', prompt: 'Это ваша школа? — ___.', options: ['Нет', 'И', 'Но'], correct: 'Нет' },
  { type: 'choice', prompt: 'Это её книга ___ его книга?', options: ['или', 'и', 'но'], correct: 'или' },
  { type: 'choice', prompt: 'Это наш дом ___ наша квартира.', options: ['или', 'и', 'нет'], correct: 'и' },
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

export default function UnifiedLessonSixPracticePage() {
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
          onClick={() => navigate('/lesson-6')}
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
                if (TASKS.length > 0) setLessonTaskResult('/lesson-6', 1, correctCount, TASKS.length);
                navigate('/lesson-6');
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
