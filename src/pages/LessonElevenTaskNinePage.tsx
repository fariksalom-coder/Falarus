import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type SentenceTask = { prompt: string; words: string[]; correct: string; accepted?: string[] };
type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: SentenceTask[] = [
  {
    prompt: 'Savolga javob tuzing: Что говорят они?',
    words: ['они', 'говорят', 'что', 'они', 'учат', 'русский', 'язык', 'учит'],
    correct: 'они говорят что они учат русский язык',
    accepted: ['они говорят что они учат язык русский'],
  },
  {
    prompt: 'Savolga javob tuzing: Что говорит друг?',
    words: ['друг', 'говорит', 'что', 'он', 'знает', 'слова', 'знают'],
    correct: 'друг говорит что он знает слова',
  },
  {
    prompt: 'Savolga javob tuzing: Что отвечает она?',
    words: ['она', 'отвечает', 'что', 'мы', 'гуляем', 'каждый', 'день', 'гуляет'],
    correct: 'она отвечает что мы гуляем каждый день',
  },
  {
    prompt: 'Savolga javob tuzing: Что знают они?',
    words: ['они', 'знают', 'что', 'я', 'сейчас', 'не', 'гуляю', 'гуляет'],
    correct: 'они знают что я сейчас не гуляю',
  },
  {
    prompt: 'Savolga javob tuzing: Что говорит он?',
    words: ['он', 'говорит', 'что', 'ты', 'смотришь', 'телевизор', 'каждый', 'день', 'смотрит'],
    correct: 'он говорит что ты смотришь телевизор каждый день',
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

export default function LessonElevenTaskNinePage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [sentencePool, setSentencePool] = useState<SentencePoolItem[]>([]);
  const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);

  const currentTask = TASKS[currentIndex];
  const progress = useMemo(() => ((currentIndex + (finished ? 1 : 0)) / TASKS.length) * 100, [currentIndex, finished]);

  useEffect(() => {
    const task = TASKS[currentIndex];
    setStatus('idle');
    setMessage('');
    setSentencePool(shuffle(task.words).map((word, idx) => ({ id: `${idx}-${word}`, word, used: false })));
    setSentenceAnswer([]);
  }, [currentIndex]);

  const handleNext = () => {
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
            <div className="space-y-1 text-center">
              <p className="text-sm font-semibold text-slate-600">Savolga javob tuzing («что» bilan)</p>
              <p className="text-2xl font-bold text-slate-900">{currentTask.prompt.split(':').slice(1).join(':').trim()}</p>
            </div>

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

            {message && <p className={`mt-4 text-sm font-bold ${status === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>}

            {status !== 'correct' && (
              <button
                type="button"
                onClick={() => {
                  const built = sentenceAnswer.join(' ').trim();
                  const validAnswers = [currentTask.correct, ...(currentTask.accepted ?? [])];
                  const ok = validAnswers.includes(built);
                  setStatus(ok ? 'correct' : 'wrong');
                  setMessage(ok ? 'To‘g‘ri!' : `Noto‘g‘ri. To‘g‘ri javob: ${currentTask.correct}`);
                }}
                disabled={sentenceAnswer.length === 0}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tekshirish
              </button>
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
