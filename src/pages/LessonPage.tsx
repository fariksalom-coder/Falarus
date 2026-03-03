import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Volume2,
  Lightbulb
} from 'lucide-react';

export default function LessonPage() {
  const { id } = useParams();
  const { token, updateUser } = useAuth();
  const [lesson, setLesson] = useState<any>(null);
  const [currentExercise, setCurrentExercise] = useState(-1); // -1 for content, 0+ for exercises
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(apiUrl(`/api/lessons/${id}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setLesson(data));
  }, [id, token]);

  const handleCheck = () => {
    const exercise = lesson?.exercises?.[currentExercise];
    if (!exercise) return;
    const correct = selectedOption === exercise.correct_answer;
    setIsCorrect(correct);
  };

  const handleNext = async () => {
    if (currentExercise < lesson.exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      // Complete lesson
      const res = await fetch(apiUrl(`/api/lessons/${id}/complete`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        updateUser({ progress: data.progress });
        setFinished(true);
      }
    }
  };

  if (!lesson) return <div className="flex items-center justify-center h-screen">Yuklanmoqda...</div>;

  if (finished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center"
        >
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Tabriklaymiz!</h2>
          <p className="text-slate-600 mb-8">Siz ushbu darsni muvaffaqiyatli yakunladingiz.</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
          >
            Dashboardga qaytish
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-900 truncate">{lesson.title}</h1>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500"
              style={{ width: `${((currentExercise + 1) / (lesson.exercises.length + 1)) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {currentExercise === -1 ? (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 text-indigo-600 mb-4">
                  <Lightbulb className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">Tushuntirish</span>
                </div>
                <p className="text-lg text-slate-800 leading-relaxed mb-8">{lesson.content_uz}</p>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 mb-3">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Misol</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 italic">"{lesson.content_ru}"</p>
                </div>
              </div>
              
              {lesson.exercises && lesson.exercises.length > 0 ? (
                <button 
                  onClick={() => setCurrentExercise(0)}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  Mashqlarni boshlash <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={handleNext}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  Darsni yakunlash <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          ) : lesson.exercises && lesson.exercises[currentExercise] ? (
            <motion.div 
              key={`exercise-${currentExercise}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-8">
                  {lesson.exercises[currentExercise].question_uz}
                </h3>
                
                <div className="space-y-3">
                  {lesson.exercises[currentExercise].type === 'choice' || lesson.exercises[currentExercise].type === 'fill' ? (
                    lesson.exercises[currentExercise].options.map((opt: string) => (
                      <button
                        key={opt}
                        disabled={isCorrect !== null}
                        onClick={() => setSelectedOption(opt)}
                        className={`w-full text-left px-6 py-4 border-2 rounded-2xl transition-all font-medium flex justify-between items-center ${
                          selectedOption === opt 
                            ? isCorrect === true ? 'border-green-500 bg-green-50 text-green-700' 
                            : isCorrect === false ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-100 text-slate-700 hover:border-slate-200'
                        }`}
                      >
                        {opt}
                        {selectedOption === opt && isCorrect === true && <CheckCircle2 className="w-5 h-5" />}
                        {selectedOption === opt && isCorrect === false && <XCircle className="w-5 h-5" />}
                      </button>
                    ))
                  ) : lesson.exercises[currentExercise].type === 'reorder' ? (
                    <div className="flex flex-wrap gap-2">
                      {lesson.exercises[currentExercise].options.map((opt: string) => (
                        <button
                          key={opt}
                          disabled={isCorrect !== null}
                          onClick={() => setSelectedOption(prev => prev ? `${prev}, ${opt}` : opt)}
                          className={`px-4 py-2 border-2 rounded-xl transition-all font-medium ${
                            selectedOption?.includes(opt) 
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-slate-100 text-slate-700 hover:border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                      <div className="w-full mt-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 min-h-[50px]">
                        {selectedOption}
                      </div>
                      <button 
                        onClick={() => setSelectedOption(null)}
                        className="text-xs text-slate-400 hover:text-indigo-600 underline mt-2"
                      >
                        Tozalash
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {isCorrect === null ? (
                <button 
                  disabled={!selectedOption}
                  onClick={handleCheck}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Tekshirish
                </button>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl flex items-center gap-3 ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    <span className="font-bold">{isCorrect ? 'To‘g‘ri!' : 'Xato, qayta urinib ko‘ring.'}</span>
                  </div>
                  <button 
                    onClick={handleNext}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    Keyingisi
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-500">Mashqlar yuklanmadi.</p>
              <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 font-bold">Orqaga qaytish</button>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
