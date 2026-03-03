import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { GraduationCap, Rocket, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [testActive, setTestActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const { token, updateUser } = useAuth();
  const navigate = useNavigate();

  const testQuestions = [
    { q: 'Привет! ... дела?', options: ['Как', 'Что', 'Кто'], correct: 'Как', level: 'A1' },
    { q: 'Я ... в Ташкенте.', options: ['живу', 'живешь', 'живет'], correct: 'живу', level: 'A1' },
    { q: 'У меня ... машина.', options: ['новый', 'новая', 'новое'], correct: 'новая', level: 'A2' },
    { q: 'Вчера я ... в кино.', options: ['иду', 'шел', 'ходил'], correct: 'ходил', level: 'B1' },
  ];

  const handleStartFromZero = async () => {
    const res = await fetch('/api/user/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ level: 'A0' }),
    });
    if (res.ok) {
      updateUser({ onboarded: 1, level: 'A0' });
      navigate('/');
    }
  };

  const handleTestFinish = async (finalScore: number) => {
    let level = 'A0';
    if (finalScore >= 4) level = 'B1';
    else if (finalScore >= 3) level = 'A2';
    else if (finalScore >= 1) level = 'A1';

    const res = await fetch('/api/user/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ level }),
    });
    if (res.ok) {
      updateUser({ onboarded: 1, level });
      navigate('/');
    }
  };

  const handleAnswer = (option: string) => {
    const newScore = option === testQuestions[currentQuestion].correct ? score + 1 : score;
    setScore(newScore);
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleTestFinish(newScore);
    }
  };

  if (testActive) {
    const q = testQuestions[currentQuestion];
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Savol {currentQuestion + 1} / {testQuestions.length}</span>
              <span>Progress: {Math.round(((currentQuestion + 1) / testQuestions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300" 
                style={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-6">{q.q}</h3>
          
          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="w-full text-left px-6 py-4 border-2 border-slate-100 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all font-medium text-slate-700"
              >
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-10 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-4 rounded-full">
            <GraduationCap className="w-12 h-12 text-indigo-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Xush kelibsiz!</h1>
        <p className="text-slate-600 mb-10 text-lg">
          Keling, rus tili darajangizni aniqlaymiz. Bu sizga mos darslarni tanlashimizga yordam beradi.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => setTestActive(true)}
            className="flex items-center justify-between p-6 border-2 border-indigo-600 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-colors group"
          >
            <div className="text-left">
              <h3 className="font-bold text-indigo-900 text-lg">Test topshirish</h3>
              <p className="text-indigo-700 text-sm">Bilimingizni tekshirib ko‘ring</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-indigo-600 group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={handleStartFromZero}
            className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl hover:border-slate-200 transition-colors group"
          >
            <div className="text-left">
              <h3 className="font-bold text-slate-900 text-lg">Noldan boshlash</h3>
              <p className="text-slate-500 text-sm">Men endi o‘rganishni boshlayapman</p>
            </div>
            <Rocket className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
