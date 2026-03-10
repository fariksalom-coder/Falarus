import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseData } from '../data/courseData';
import { motion } from 'motion/react';
import { 
  House,
  BookMarked,
  BarChart3,
  User,
  Lock, 
  CheckCircle2, 
  BookOpen,
  Star
} from 'lucide-react';

export default function CourseMapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const levels = ['A0', 'A1', 'A2', 'B1', 'B2'];
  
  const getLevelStatus = (level: string) => {
    const levelOrder = levels.indexOf(level);
    const userLevelOrder = levels.indexOf(user?.level || 'A0');
    
    if (levelOrder < userLevelOrder) return 'completed';
    if (levelOrder === userLevelOrder) return 'current';
    return 'locked';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="w-full flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Главная"
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            <House className="w-5 h-5 text-slate-600" />
          </button>
          <button
            type="button"
            aria-label="Словарь"
            onClick={() => navigate('/vocabulary')}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            <BookMarked className="w-5 h-5 text-slate-600" />
          </button>
          <button
            type="button"
            aria-label="Статистика"
            onClick={() => navigate('/course-map')}
            className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center"
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </button>
          <button
            type="button"
            aria-label="Профиль"
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            <User className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">O‘quv rejasi</h2>
          <p className="text-slate-500 text-lg">A0 dan B2 gacha bo‘lgan barcha darajalar</p>
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-200 rounded-full hidden sm:block" />

          <div className="space-y-12">
            {levels.map((levelCode, idx) => {
              const status = getLevelStatus(levelCode);
              const levelInfo = courseData.find(l => l.level === levelCode);
              
              return (
                <motion.div 
                  key={levelCode}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative flex flex-col sm:flex-row gap-6 sm:gap-12"
                >
                  {/* Level Indicator Dot */}
                  <div className={`
                    hidden sm:flex absolute left-8 -translate-x-1/2 w-10 h-10 rounded-full items-center justify-center z-10 border-4 border-slate-50
                    ${status === 'completed' ? 'bg-green-500' : status === 'current' ? 'bg-indigo-600' : 'bg-slate-300'}
                  `}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : status === 'current' ? (
                      <Star className="w-5 h-5 text-white animate-pulse" />
                    ) : (
                      <Lock className="w-4 h-4 text-white" />
                    )}
                  </div>

                  <div className={`
                    flex-1 bg-white rounded-3xl p-6 sm:p-8 border-2 transition-all
                    ${status === 'current' ? 'border-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-100'}
                    ${status === 'locked' ? 'opacity-75' : 'opacity-100'}
                  `}>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className={`
                          px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block
                          ${status === 'completed' ? 'bg-green-100 text-green-700' : status === 'current' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}
                        `}>
                          {levelCode} Daraja
                        </span>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {levelCode === 'A0' ? 'Noldan boshlash' : 
                           levelCode === 'A1' ? 'Boshlang‘ich' : 
                           levelCode === 'A2' ? 'O‘rta-quyi' : 
                           levelCode === 'B1' ? 'O‘rta' : 'O‘rta-yuqori'}
                        </h3>
                      </div>
                      {status === 'locked' && <Lock className="w-6 h-6 text-slate-300" />}
                    </div>

                    {levelInfo ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {levelInfo.modules.map((module, mIdx) => (
                          <div key={mIdx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="bg-white p-2 rounded-lg shadow-sm">
                              <BookOpen className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">{module.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm italic">Tez kunda qo‘shiladi...</p>
                    )}

                    {status === 'current' && (
                      <button 
                        onClick={() => navigate('/')}
                        className="mt-8 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                      >
                        O‘rganishni davom ettirish
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
