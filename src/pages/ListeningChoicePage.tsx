import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ListeningTask = {
  word: string;
  options: string[];
  correct: string;
};

const TASKS: ListeningTask[] = [
  {
    word: 'она',
    options: ['актёр', 'инженер', 'Марк', 'она'],
    correct: 'она',
  },
  {
    word: 'привет',
    options: ['до свидания', 'привет', 'вечер', 'ночь'],
    correct: 'привет',
  },
  {
    word: 'учитель',
    options: ['мама', 'доктор', 'учитель', 'студент'],
    correct: 'учитель',
  },
];

export default function ListeningChoicePage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const currentTask = TASKS[currentIndex];
  const progress = useMemo(() => ((currentIndex + 1) / TASKS.length) * 100, [currentIndex]);

  useEffect(() => {
    setAudioError(false);
    setSelectedOption('');
    setIsChecked(false);
    setIsCorrect(false);
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playAudio = async () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAudioError(true);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentTask.word);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const ruVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ru'));
      if (ruVoice) {
        utterance.voice = ruVoice;
      }

      utterance.onend = () => setAudioError(false);
      utterance.onerror = () => setAudioError(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setAudioError(true);
    }
  };

  const handleCheck = () => {
    if (!selectedOption) return;
    const correct = selectedOption === currentTask.correct;
    setIsCorrect(correct);
    setIsChecked(true);
    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < TASKS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    setIsFinished(true);
  };

  const handleBack = () => navigate('/lesson-1');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
        >
          Orqaga
        </button>

        {!isFinished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <h1 className="mt-5 text-2xl font-bold tracking-tight">Eshitganingizni tanlang</h1>
        <p className="mt-2 text-sm text-slate-300">Ovozni tinglang va to‘g‘ri javobni tanlang.</p>

        {!isFinished && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={playAudio}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors active:scale-[0.98]"
              >
                Yana tinglash
              </button>
            </div>

            {audioError && (
              <p className="mt-3 text-sm text-amber-300">
                Brauzerda ovoz chiqarish funksiyasi ishlamadi.
              </p>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentTask.options.map((option) => {
                const isSelected = selectedOption === option;
                const showCorrect = isChecked && option === currentTask.correct;
                const showWrong = isChecked && isSelected && option !== currentTask.correct;
                const stateClass = showCorrect
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-100'
                  : showWrong
                  ? 'border-red-500 bg-red-500/20 text-red-100'
                  : isSelected
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                  : 'border-slate-700 bg-slate-950 text-slate-100 hover:border-slate-500';

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => !isChecked && setSelectedOption(option)}
                    disabled={isChecked}
                    className={`rounded-2xl border px-4 py-4 text-left text-base font-semibold transition-all duration-200 active:scale-[0.98] ${stateClass}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {!isChecked ? (
              <button
                type="button"
                onClick={handleCheck}
                disabled={!selectedOption}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Tekshirish
              </button>
            ) : (
              <div className="mt-5 space-y-3">
                <p className={`text-sm font-bold ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                  {isCorrect ? 'To‘g‘ri!' : 'Noto‘g‘ri javob'}
                </p>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  {currentIndex < TASKS.length - 1 ? 'Keyingi' : 'Yakunlash'}
                </button>
              </div>
            )}
          </div>
        )}

        {isFinished && (
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-5">
            <p className="text-lg font-bold text-emerald-300">Mashq tugadi! Barakalla!</p>
            <p className="mt-2 text-emerald-200">Tabriklaymiz! Siz mashqni tugatdingiz.</p>
            <p className="mt-2 text-sm text-emerald-200/90">
              To‘g‘ri javoblar soni: {correctCount} / {TASKS.length}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
