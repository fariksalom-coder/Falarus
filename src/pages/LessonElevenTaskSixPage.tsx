import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setLessonTaskResult } from '../utils/lessonTaskResults';
import { addUserPoints } from '../api/leaderboard';

type SentenceTask = { prompt: string; words: string[]; correct: string };
type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: SentenceTask[] = [
  {
    prompt: 'Savolga javob bering: Когда ты ужинаешь?',
    words: ['вечером', 'я', 'ты', 'ужинаю', 'ужинаешь', 'он'],
    correct: 'я ужинаю вечером',
  },
  {
    prompt: 'Savolga javob bering: Когда вы встаёте?',
    words: ['в', '5', 'часов', 'мы', 'встаём', 'вы', 'встаёте'],
    correct: 'мы встаём в 5 часов',
  },
  {
    prompt: 'Savolga javob bering: Когда вы делаете домашнее задание?',
    words: ['после', 'урока', 'мы', 'делаем', 'вы', 'делаете'],
    correct: 'мы делаем после урока',
  },
  {
    prompt: 'Savolga javob bering: Когда ты гуляешь?',
    words: ['после', 'обеда', 'я', 'гуляю', 'ты', 'гуляешь'],
    correct: 'я гуляю после обеда',
  },
  {
    prompt: 'Savolga javob bering: Когда они смотрят телевизор?',
    words: ['в', '9', 'часов', 'они', 'смотрят', 'смотрит'],
    correct: 'они смотрят в 9 часов',
  },
  {
    prompt: 'Savolga javob bering: Когда ты отдыхаешь?',
    words: ['в', '2', 'часа', 'я', 'отдыхаю', 'ты', 'отдыхаешь'],
    correct: 'я отдыхаю в 2 часа',
  },
  {
    prompt: 'Savolga javob bering: Как студент говорит?',
    words: ['студент', 'говорит', 'говорят', 'правильно', 'они'],
    correct: 'студент говорит правильно',
  },
  {
    prompt: 'Savolga javob bering: Как ты читаешь текст?',
    words: ['я', 'читаю', 'читаешь', 'медленно', 'ты', 'текст'],
    correct: 'я читаю текст медленно',
  },
  {
    prompt: 'Savolga javob bering: Как она отвечает?',
    words: ['она', 'отвечает', 'отвечают', 'громко', 'они'],
    correct: 'она отвечает громко',
  },
  {
    prompt: 'Savolga javob bering: Где они сидят?',
    words: ['они', 'сидят', 'сидит', 'прямо', 'он'],
    correct: 'они сидят прямо',
  },
  {
    prompt: 'Savolga javob bering: Где часы?',
    words: ['часы', 'справа', 'сидят', 'они'],
    correct: 'часы справа',
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

export default function LessonElevenTaskSixPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
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
    else {
      if (TASKS.length > 0) {
        setLessonTaskResult('/lesson-11', 7, TASKS.length, TASKS.length);
        if (token) addUserPoints(token, TASKS.length);
      }
      setFinished(true);
    }
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
              <p className="text-sm font-semibold text-slate-600">Savolga javob bering</p>
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
