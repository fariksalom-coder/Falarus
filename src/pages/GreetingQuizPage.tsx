import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TESTS = [
  {
    id: 1,
    question: 'Soat 08:30 da ...',
    options: ['Добрый день!', 'Доброе утро!', 'Добрый вечер!'],
    correct: 'Доброе утро!',
  },
  {
    id: 2,
    question: 'Soat 19:00 da ...',
    options: ['Добрый вечер!', 'Доброй ночи!', 'Доброе утро!'],
    correct: 'Добрый вечер!',
  },
  {
    id: 3,
    question: 'Har qanday vaqtda ...',
    options: ['Здравствуйте!', 'Доброе утро!', 'Доброй ночи!'],
    correct: 'Здравствуйте!',
  },
];

export default function GreetingQuizPage() {
  const navigate = useNavigate();
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentTest = TESTS[currentTestIndex];
  const progressPercent = ((currentTestIndex + 1) / TESTS.length) * 100;

  const handleBack = () => {
    navigate('/lesson-1/salomlashish-test');
  };

  const handleNext = () => {
    if (currentTestIndex < TESTS.length - 1) {
      setCurrentTestIndex((prev) => prev + 1);
      setSelectedOption('');
      setIsChecked(false);
      setIsCorrect(false);
      return;
    }
    setIsFinished(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 space-y-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Orqaga
          </button>

          {!isFinished && (
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {!isFinished && currentTest && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="font-medium text-slate-900 mb-2">{currentTest.question}</p>
              <div className="space-y-2">
                {currentTest.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={isChecked}
                    onClick={() => {
                      if (isChecked) return;
                      setSelectedOption(option);
                      const correct = option === currentTest.correct;
                      setIsCorrect(correct);
                      setIsChecked(true);
                      if (correct) {
                        setScore((prev) => prev + 1);
                      }
                    }}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                      selectedOption === option
                        ? isCorrect
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/40'
                    } ${isChecked ? 'cursor-not-allowed' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {isChecked && (
                <p className={`mt-2 text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect ? 'To‘g‘ri' : `Xato. To‘g‘ri javob: ${currentTest.correct}`}
                </p>
              )}

              {isChecked && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-3 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  {currentTestIndex < TESTS.length - 1 ? 'Keyingi' : 'Yakunlash'}
                </button>
              )}
            </div>
          )}

          {isFinished && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
              Natija: {score} / {TESTS.length}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
