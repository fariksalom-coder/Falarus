import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setLessonTaskResult } from '../utils/lessonTaskResults';
import { addUserPoints } from '../api/leaderboard';

type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
type SentenceTask = { type: 'sentence'; prompt: string; words: string[]; correct: string };
type Task = ChoiceTask | SentenceTask;

type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: Task[] = [
  { type: 'choice', prompt: 'o‘qimoq', options: ['читать', 'читает', 'читал'], correct: 'читать' },
  { type: 'choice', prompt: 'yozmoq', options: ['писал', 'писать', 'пишет'], correct: 'писать' },
  { type: 'choice', prompt: 'gapirmoq', options: ['говорит', 'говорил', 'говорить'], correct: 'говорить' },
  { type: 'choice', prompt: 'ishlamoq', options: ['работал', 'работает', 'работать'], correct: 'работать' },
  { type: 'choice', prompt: 'yordam bermoq', options: ['поможет', 'помог', 'помочь'], correct: 'помочь' },
  { type: 'choice', prompt: 'dam olmoq', options: ['отдыхает', 'отдыхать', 'отдыхал'], correct: 'отдыхать' },
  { type: 'choice', prompt: 'bilmoq', options: ['знает', 'знал', 'знать'], correct: 'знать' },
  { type: 'choice', prompt: 'tinglamoq', options: ['слушать', 'слушает', 'слушал'], correct: 'слушать' },
  { type: 'choice', prompt: 'shug‘ullanmoq', options: ['занимается', 'заниматься', 'занимался'], correct: 'заниматься' },
  { type: 'choice', prompt: 'kiyinish', options: ['одевался', 'одевается', 'одеваться'], correct: 'одеваться' },

  { type: 'choice', prompt: 'изуча…', options: ['-ть', '-ти', '-чь'], correct: '-ть' },
  { type: 'choice', prompt: 'виде…', options: ['-ть', '-ти', '-чь'], correct: '-ть' },
  { type: 'choice', prompt: 'бере…', options: ['-ть', '-ти', '-чь'], correct: '-чь' },
  { type: 'choice', prompt: 'отдыха…', options: ['-ть', '-ти', '-чь'], correct: '-ть' },
  { type: 'choice', prompt: 'спрашива…', options: ['-ть', '-ти', '-чь'], correct: '-ть' },
  { type: 'choice', prompt: 'гуля…', options: ['-ть', '-ти', '-чь'], correct: '-ть' },
  { type: 'choice', prompt: 'помо…', options: ['-ть', '-ти', '-чь'], correct: '-чь' },
  { type: 'choice', prompt: 'нес…', options: ['-ть', '-ти', '-чь'], correct: '-ти' },
  { type: 'choice', prompt: 'учи…ся', options: ['-ться', '-ти', '-чь'], correct: '-ться' },
  { type: 'choice', prompt: 'занима…ся', options: ['-ться', '-ти', '-чь'], correct: '-ться' },

  {
    type: 'sentence',
    prompt: 'Gapni tuzing: kitob o‘qimoq',
    words: ['читать', 'книга', 'книги', 'писать', 'книгу'],
    correct: 'читать книгу',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: gazeta o‘qimoq',
    words: ['читать', 'газеты', 'газета', 'писать', 'газету'],
    correct: 'читать газету',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: xat yozmoq',
    words: ['писать', 'письмо', 'писал', 'читать', 'письма'],
    correct: 'писать письмо',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: qo‘shiq tinglamoq',
    words: ['слушать', 'песни', 'песня', 'читать', 'песню'],
    correct: 'слушать песню',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: sut ichmoq',
    words: ['пить', 'молоко', 'молока', 'читать', 'пил'],
    correct: 'пить молоко',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: film ko‘rmoq',
    words: ['смотреть', 'фильм', 'фильмы', 'читать', 'смотрит'],
    correct: 'смотреть фильм',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: masala yechmoq',
    words: ['решать', 'задачи', 'задача', 'писать', 'решил'],
    correct: 'решать задачи',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: muammo hal qilmoq',
    words: ['решать', 'проблемы', 'проблема', 'читать', 'решает'],
    correct: 'решать проблемы',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: radio tinglamoq',
    words: ['слушать', 'радио', 'радиа', 'писать', 'слушал'],
    correct: 'слушать радио',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: surat ko‘rmoq',
    words: ['смотреть', 'фотографии', 'фотография', 'читать', 'смотрел'],
    correct: 'смотреть фотографии',
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

export default function UnifiedLessonTenPracticePage() {
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
          onClick={() => navigate('/lesson-10')}
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
                if (TASKS.length > 0) {
                  setLessonTaskResult('/lesson-10', 1, correctCount, TASKS.length);
                  if (token) addUserPoints(token, correctCount);
                }
                navigate('/lesson-10');
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
