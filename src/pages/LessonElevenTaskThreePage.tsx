import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setLessonTaskResult } from '../utils/lessonTaskResults';

type ChoiceTask = { prompt: string; options: string[]; correct: string };

const TASKS: ChoiceTask[] = [
  { prompt: 'Он работает, и мы ______.', options: ['работает', 'работаем', 'работают'], correct: 'работаем' },
  { prompt: 'Ты разговариваешь, и они ______.', options: ['разговаривают', 'разговариваешь', 'разговаривает'], correct: 'разговаривают' },
  { prompt: 'Я спрашиваю, и ты ______.', options: ['спрашивает', 'спрашиваешь', 'спрашивают'], correct: 'спрашиваешь' },
  { prompt: 'Мы отвечаем, и вы ______.', options: ['отвечаете', 'отвечает', 'отвечаем'], correct: 'отвечаете' },
  { prompt: 'Он рисует, и я ______.', options: ['рисует', 'рисую', 'рисуют'], correct: 'рисую' },
  { prompt: 'Мы понимаем, и она ______.', options: ['понимают', 'понимает', 'понимаем'], correct: 'понимает' },
  { prompt: 'Он говорит, и ты ______.', options: ['говоришь', 'говорит', 'говорят'], correct: 'говоришь' },
  { prompt: 'Мы помним, и они ______.', options: ['помнят', 'помним', 'помнит'], correct: 'помнят' },
  { prompt: 'Он отдыхает, и ты ______.', options: ['отдыхаешь', 'отдыхает', 'отдыхают'], correct: 'отдыхаешь' },
  { prompt: 'Мы переводим, и вы ______.', options: ['переводите', 'переводят', 'переводим'], correct: 'переводите' },
  { prompt: 'Они гуляют, и я ______.', options: ['гуляю', 'гуляет', 'гуляют'], correct: 'гуляю' },
  { prompt: 'Я занимаюсь, и она ______.', options: ['занимаются', 'занимается', 'занимаюсь'], correct: 'занимается' },
  { prompt: 'Брат работает, и родители ______.', options: ['работает', 'работают', 'работаем'], correct: 'работают' },
  { prompt: 'Я учусь, и друг ______.', options: ['учатся', 'учится', 'учусь'], correct: 'учится' },
  { prompt: 'Он слушает радио, и они ______ радио.', options: ['слушают', 'слушает', 'слушаем'], correct: 'слушают' },
  { prompt: 'Мы играем, и дети ______.', options: ['играет', 'играют', 'играем'], correct: 'играют' },
  { prompt: 'Я умею готовить, и сестра ______ готовить.', options: ['умеют', 'умеет', 'умею'], correct: 'умеет' },

  { prompt: 'Преподаватель объясняет, а студенты ______.', options: ['объясняет', 'объясняют', 'объясняем'], correct: 'объясняют' },
  { prompt: 'Мама готовит обед, а дочь ______.', options: ['готовит', 'готовят', 'готовим'], correct: 'готовит' },
  { prompt: 'Мы читаем, а ты ______.', options: ['читаешь', 'читает', 'читаем'], correct: 'читаешь' },
  { prompt: 'Я слушаю её, а она ______.', options: ['слушают', 'слушает', 'слушаю'], correct: 'слушает' },
  { prompt: 'Он смотрит фильм, а я ______.', options: ['смотрит', 'смотрю', 'смотрят'], correct: 'смотрю' },
  { prompt: 'Брат работает, а сестра ______.', options: ['работает', 'работают', 'работаем'], correct: 'работает' },
  { prompt: 'Они занимаются, а вы ______.', options: ['занимаетесь', 'занимаются', 'занимаемся'], correct: 'занимаетесь' },
  { prompt: 'Я учу новые слова, а друг ______ по телефону.', options: ['говорит', 'говорят', 'говорю'], correct: 'говорит' },
  { prompt: 'Дети играют, а мама ______ ужин.', options: ['готовит', 'готовят', 'готовим'], correct: 'готовит' },
  { prompt: 'Бабушка читает сказки, а внук ______.', options: ['слушает', 'слушают', 'слушаю'], correct: 'слушает' },
  { prompt: 'Я учусь в университете, а родители ______ на заводе.', options: ['работает', 'работают', 'работаем'], correct: 'работают' },
];

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function LessonElevenTaskThreePage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');

  const currentTask = TASKS[currentIndex];
  const progress = useMemo(() => ((currentIndex + (finished ? 1 : 0)) / TASKS.length) * 100, [currentIndex, finished]);

  useEffect(() => {
    setStatus('idle');
    setMessage('');
    setSelectedOption('');
    setChoiceOptions(shuffle(TASKS[currentIndex].options));
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < TASKS.length - 1) setCurrentIndex((p) => p + 1);
    else {
      if (TASKS.length > 0) setLessonTaskResult('/lesson-11', 4, TASKS.length, TASKS.length);
      setFinished(true);
    }
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
            <p className="text-base font-semibold text-slate-900">{currentTask.prompt}</p>

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

            {message && <p className={`mt-4 text-sm font-bold ${status === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>}

            {status !== 'idle' && (
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
