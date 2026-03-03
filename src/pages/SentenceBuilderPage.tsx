import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type SentenceTask = {
  uz: string;
  words: string[];
  correct: string;
};

const TASKS: SentenceTask[] = [
  { uz: 'Men talabaman.', words: ['Я', 'студент.', 'врач'], correct: 'Я студент.' },
  { uz: 'U muhandis.', words: ['Он', 'инженер.', 'учитель'], correct: 'Он инженер.' },
  { uz: 'Bu mening kitobim.', words: ['Это', 'моя', 'книга.', 'тетрадь'], correct: 'Это моя книга.' },
  { uz: 'Biz uyda yashaymiz.', words: ['Мы', 'живём', 'дома.', 'в', 'школе'], correct: 'Мы живём дома.' },
  { uz: 'Siz qayerdansiz?', words: ['Откуда', 'вы?', 'когда', 'где'], correct: 'Откуда вы?' },
  { uz: 'Men rus tilini o‘rganayapman.', words: ['Я', 'учу', 'русский', 'язык.', 'математику'], correct: 'Я учу русский язык.' },
  { uz: 'U shifokor emas.', words: ['Он', 'не', 'врач.', 'учитель'], correct: 'Он не врач.' },
  { uz: 'Bugun ob-havo yaxshi.', words: ['Сегодня', 'погода', 'хорошая.', 'плохая'], correct: 'Сегодня погода хорошая.' },
  { uz: 'Menga qahva yoqadi.', words: ['Мне', 'нравится', 'кофе.', 'чай'], correct: 'Мне нравится кофе.' },
  { uz: 'Ular parkda yurishyapti.', words: ['Они', 'гуляют', 'в', 'парке.', 'доме'], correct: 'Они гуляют в парке.' },
];

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function SentenceBuilderPage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordPool, setWordPool] = useState<string[]>(() => shuffle(TASKS[0].words));
  const [answerWords, setAnswerWords] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [finished, setFinished] = useState(false);

  const currentTask = TASKS[currentIndex];
  const progress = useMemo(() => ((currentIndex + (isCorrect ? 1 : 0)) / TASKS.length) * 100, [currentIndex, isCorrect]);

  const handleBack = () => navigate('/lesson-1');

  const moveWordToAnswer = (word: string, idx: number) => {
    if (isChecked) return;
    setAnswerWords((prev) => [...prev, word]);
    setWordPool((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveWordBack = (idx: number) => {
    if (isChecked) return;
    const word = answerWords[idx];
    setAnswerWords((prev) => prev.filter((_, i) => i !== idx));
    setWordPool((prev) => [...prev, word]);
  };

  const removeLastWord = () => {
    if (isChecked || answerWords.length === 0) return;
    const lastWord = answerWords[answerWords.length - 1];
    setAnswerWords((prev) => prev.slice(0, -1));
    setWordPool((prev) => [...prev, lastWord]);
  };

  const clearAnswer = () => {
    if (isChecked) return;
    setWordPool((prev) => [...prev, ...answerWords]);
    setAnswerWords([]);
  };

  const handleCheck = () => {
    const userSentence = answerWords.join(' ').trim();
    const correct = userSentence === currentTask.correct;
    setIsCorrect(correct);
    setIsChecked(true);
  };

  const handleNext = () => {
    if (currentIndex < TASKS.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setWordPool(shuffle(TASKS[nextIndex].words));
      setAnswerWords([]);
      setIsChecked(false);
      setIsCorrect(false);
      return;
    }
    setFinished(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Darsga qaytish
        </button>

        {!finished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        <h1 className="mt-5 text-2xl font-bold">Gapni tuzing</h1>
        <p className="mt-2 text-sm text-slate-600">Pastdagi so‘zlardan to‘g‘ri ruscha tarjimani tuzing.</p>

        {!finished && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-base font-semibold text-slate-900">{currentTask.uz}</p>

            <div
              className={`mt-4 min-h-16 rounded-2xl border px-3 py-3 ${
                !isChecked
                  ? 'border-slate-300 bg-slate-50'
                  : isCorrect
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-red-500 bg-red-50'
              }`}
            >
              {answerWords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {answerWords.map((word, idx) => (
                    <button
                      key={`${word}-${idx}`}
                      type="button"
                      onClick={() => moveWordBack(idx)}
                      disabled={isChecked}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-transform active:scale-[0.98]"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Javob shu yerda yig‘iladi...</p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={removeLastWord}
                disabled={isChecked || answerWords.length === 0}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Orqaga
              </button>
              <button
                type="button"
                onClick={clearAnswer}
                disabled={isChecked || answerWords.length === 0}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Tozalash
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {wordPool.map((word, idx) => (
                <button
                  key={`${word}-${idx}`}
                  type="button"
                  onClick={() => moveWordToAnswer(word, idx)}
                  disabled={isChecked}
                  className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50 transition-all active:scale-[0.98]"
                >
                  {word}
                </button>
              ))}
            </div>

            {!isChecked ? (
              <button
                type="button"
                onClick={handleCheck}
                disabled={answerWords.length === 0}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Tekshirish
              </button>
            ) : (
              <div className="mt-5 space-y-3">
                <p className={`text-sm font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isCorrect ? 'To‘g‘ri!' : 'Xato. Yana urinib ko‘ring.'}
                </p>
                {isCorrect ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    {currentIndex < TASKS.length - 1 ? 'Keyingi' : 'Yakunlash'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsChecked(false);
                      setIsCorrect(false);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Yana urinib ko‘rish
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {finished && (
          <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-5">
            <p className="text-lg font-bold text-emerald-700">Mashq tugadi! Barakalla!</p>
            <p className="mt-2 text-emerald-700">Tabriklaymiz! Siz barcha gaplarni to‘g‘ri tuzdingiz.</p>
          </div>
        )}
      </main>
    </div>
  );
}
