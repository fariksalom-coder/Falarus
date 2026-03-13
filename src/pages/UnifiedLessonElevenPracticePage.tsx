import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setLessonTaskResult } from '../utils/lessonTaskResults';

type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
type SentenceTask = { type: 'sentence'; prompt: string; words: string[]; correct: string };
type Task = ChoiceTask | SentenceTask;

type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Я ___ (работать)', options: ['работаю', 'работает', 'работаешь'], correct: 'работаю' },
  { type: 'choice', prompt: 'Ты ___ (читать)', options: ['читаю', 'читаешь', 'читают'], correct: 'читаешь' },
  { type: 'choice', prompt: 'Он ___ (говорить)', options: ['говорит', 'говорю', 'говорим'], correct: 'говорит' },
  { type: 'choice', prompt: 'Мы ___ (слушать)', options: ['слушаем', 'слушают', 'слушаешь'], correct: 'слушаем' },
  { type: 'choice', prompt: 'Вы ___ (знать)', options: ['знаете', 'знает', 'знаем'], correct: 'знаете' },
  { type: 'choice', prompt: 'Они ___ (играть)', options: ['играют', 'играете', 'играю'], correct: 'играют' },
  { type: 'choice', prompt: 'Я ___ (говорить)', options: ['говорю', 'говорит', 'говорят'], correct: 'говорю' },
  { type: 'choice', prompt: 'Ты ___ (учиться)', options: ['учится', 'учишься', 'учусь'], correct: 'учишься' },
  { type: 'choice', prompt: 'Мы ___ (работать)', options: ['работаем', 'работаю', 'работает'], correct: 'работаем' },
  { type: 'choice', prompt: 'Они ___ (говорить)', options: ['говорят', 'говорим', 'говорите'], correct: 'говорят' },

  { type: 'choice', prompt: 'Я ...', options: ['-у/-ю', '-ешь/-ишь', '-ут/-ют'], correct: '-у/-ю' },
  { type: 'choice', prompt: 'Ты ...', options: ['-ет/-ит', '-ешь/-ишь', '-ем/-им'], correct: '-ешь/-ишь' },
  { type: 'choice', prompt: 'Он/она ...', options: ['-ет/-ит', '-ете/-ите', '-ат/-ят'], correct: '-ет/-ит' },
  { type: 'choice', prompt: 'Мы ...', options: ['-у/-ю', '-ем/-им', '-ут/-ют'], correct: '-ем/-им' },
  { type: 'choice', prompt: 'Вы ...', options: ['-ете/-ите', '-ем/-им', '-ешь/-ишь'], correct: '-ете/-ите' },
  { type: 'choice', prompt: 'Они ...', options: ['-ут/-ют (ат/ят)', '-у/-ю', '-ет/-ит'], correct: '-ут/-ют (ат/ят)' },

  { type: 'sentence', prompt: 'Gapni tuzing: Men ishlayapman.', words: ['я', 'работаю', 'работает'], correct: 'я работаю' },
  { type: 'sentence', prompt: 'Gapni tuzing: Sen o‘qiyapsan.', words: ['ты', 'читаешь', 'читаю'], correct: 'ты читаешь' },
  { type: 'sentence', prompt: 'Gapni tuzing: U gapirayapti.', words: ['он', 'говорит', 'говорю'], correct: 'он говорит' },
  { type: 'sentence', prompt: 'Gapni tuzing: Biz tinglayapmiz.', words: ['мы', 'слушаем', 'слушают'], correct: 'мы слушаем' },
  { type: 'sentence', prompt: 'Gapni tuzing: Siz ishlayapsiz.', words: ['вы', 'работаете', 'работаем'], correct: 'вы работаете' },
  { type: 'sentence', prompt: 'Gapni tuzing: Ular o‘qishyapti.', words: ['они', 'читают', 'читаете'], correct: 'они читают' },
  { type: 'sentence', prompt: 'Gapni tuzing: Men bilaman.', words: ['я', 'знаю', 'знает'], correct: 'я знаю' },
  { type: 'sentence', prompt: 'Gapni tuzing: Sen o‘ynayapsan.', words: ['ты', 'играешь', 'играю'], correct: 'ты играешь' },
  { type: 'sentence', prompt: 'Gapni tuzing: Biz gaplashyapmiz.', words: ['мы', 'говорим', 'говорят'], correct: 'мы говорим' },
  { type: 'sentence', prompt: 'Gapni tuzing: Ular ishlashyapti.', words: ['они', 'работают', 'работаем'], correct: 'они работают' },
];

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function UnifiedLessonElevenPracticePage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [sentencePool, setSentencePool] = useState<SentencePoolItem[]>([]);
  const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);
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
  }, [currentIndex]);

  const handleNext = () => {
    if (status === 'correct') setCorrectCount((c) => c + 1);
    if (currentIndex < TASKS.length - 1) setCurrentIndex((prev) => prev + 1);
    else setFinished(true);
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

            {((currentTask.type === 'choice' && status !== 'idle') || (currentTask.type === 'sentence' && status === 'correct')) && (
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
                if (TASKS.length > 0) setLessonTaskResult('/lesson-11', 1, correctCount, TASKS.length);
                navigate('/lesson-11');
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
