import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setLessonTaskResult } from '../utils/lessonTaskResults';
import { addUserPoints } from '../api/leaderboard';

type SentenceTask = { prompt: string; words: string[]; correct: string };
type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: SentenceTask[] = [
  { prompt: 'Gapni tuzing: Ular universitetda o‘qiydilar.', words: ['они', 'учатся', 'учится', 'в', 'университете', 'он'], correct: 'они учатся в университете' },
  { prompt: 'Gapni tuzing: Sen bozorda ishlaysanmi?', words: ['ты', 'работаешь', 'работает', 'на', 'рынке', 'мы'], correct: 'ты работаешь на рынке' },
  { prompt: 'Gapni tuzing: U to‘g‘ri gapiradi.', words: ['он', 'говорит', 'говорят', 'правильно', 'они'], correct: 'он говорит правильно' },
  { prompt: 'Gapni tuzing: Men parkda sayr qilaman.', words: ['я', 'гуляю', 'гуляет', 'в', 'парке', 'мы'], correct: 'я гуляю в парке' },
  { prompt: 'Gapni tuzing: Biz darsdan keyin dam olamiz.', words: ['мы', 'отдыхаем', 'отдыхает', 'после', 'занятий', 'он'], correct: 'мы отдыхаем после занятий' },
  { prompt: 'Gapni tuzing: Sen uning ismini eslaysanmi?', words: ['ты', 'помнишь', 'помнит', 'как', 'её', 'зовут', 'мы'], correct: 'ты помнишь как её зовут' },
  { prompt: 'Gapni tuzing: Siz uyda tushlik qilasizmi?', words: ['вы', 'обедаете', 'обедает', 'дома', 'он'], correct: 'вы обедаете дома' },
  { prompt: 'Gapni tuzing: Sen yangi jurnalni o‘qiysanmi?', words: ['ты', 'читаешь', 'читает', 'новый', 'журнал', 'мы'], correct: 'ты читаешь новый журнал' },
  { prompt: 'Gapni tuzing: Men seni tushunmayman.', words: ['я', 'не', 'понимаю', 'понимает', 'тебя', 'они'], correct: 'я не понимаю тебя' },
  { prompt: 'Gapni tuzing: Biz matnni tarjima qilamiz.', words: ['мы', 'переводим', 'переводит', 'текст', 'он'], correct: 'мы переводим текст' },
  { prompt: 'Gapni tuzing: U bu so‘zni biladi.', words: ['он', 'знает', 'знают', 'это', 'слово', 'они'], correct: 'он знает это слово' },
  { prompt: 'Gapni tuzing: Biz ruscha yozishni bilamiz.', words: ['мы', 'умеем', 'умеет', 'писать', 'по-русски', 'он'], correct: 'мы умеем писать по-русски' },
  { prompt: 'Gapni tuzing: Men shaharni chizaman.', words: ['я', 'рисую', 'рисует', 'город', 'мы'], correct: 'я рисую город' },
  { prompt: 'Gapni tuzing: Siz bu joyni taniysizmi?', words: ['вы', 'узнаёте', 'узнаёт', 'это', 'место', 'он'], correct: 'вы узнаёте это место' },
  { prompt: 'Gapni tuzing: Ular o‘z uylarini eslaydilar.', words: ['они', 'помнят', 'помнит', 'свой', 'дом', 'он'], correct: 'они помнят свой дом' },
  { prompt: 'Gapni tuzing: Sen qachon turasan?', words: ['когда', 'ты', 'встаёшь', 'встаёт', 'они'], correct: 'когда ты встаёшь' },
  { prompt: 'Gapni tuzing: Ular qayerda sayr qiladilar?', words: ['где', 'они', 'гуляют', 'гуляет', 'он'], correct: 'где они гуляют' },
  { prompt: 'Gapni tuzing: Siz meni eslaysizmi?', words: ['вы', 'меня', 'помните', 'помнит', 'он'], correct: 'вы меня помните' },
  { prompt: 'Gapni tuzing: Sen kimga qo‘ng‘iroq qilasan?', words: ['кому', 'ты', 'звонишь', 'звонит', 'они'], correct: 'кому ты звонишь' },
  { prompt: 'Gapni tuzing: U har doim maslahat beradi.', words: ['он', 'всегда', 'даёт', 'дают', 'они', 'советы'], correct: 'он всегда даёт советы' },
  { prompt: 'Gapni tuzing: Ular masalalarni yechadilar.', words: ['они', 'решают', 'решает', 'задачи', 'он'], correct: 'они решают задачи' },
  { prompt: 'Gapni tuzing: U yaxshi raqsga tushadi.', words: ['она', 'хорошо', 'танцует', 'танцуют', 'они'], correct: 'она хорошо танцует' },
  { prompt: 'Gapni tuzing: U so‘raydi, biz javob beramiz.', words: ['он', 'спрашивает', 'спрашивают', 'мы', 'отвечаем', 'они'], correct: 'он спрашивает мы отвечаем' },
  { prompt: 'Gapni tuzing: Siz ko‘p ishlaysiz.', words: ['вы', 'много', 'работаете', 'работает', 'он'], correct: 'вы много работаете' },
];

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function LessonElevenTaskTwoPage() {
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
        setLessonTaskResult('/lesson-11', 3, TASKS.length, TASKS.length);
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
              <p className="text-sm font-semibold text-slate-600">Gapni tuzing</p>
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
