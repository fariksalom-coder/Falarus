import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  House,
  BookMarked,
  BarChart3,
  LogOut, 
  User, 
  Mail, 
  Award, 
  TrendingUp,
  Settings
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-slate-50">
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
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            <BarChart3 className="w-5 h-5 text-slate-600" />
          </button>
          <button
            type="button"
            aria-label="Профиль"
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center"
          >
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Profile Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center"
        >
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{user?.firstName} {user?.lastName}</h2>
          <p className="text-slate-500 flex items-center justify-center gap-2 mt-1">
            <Mail className="w-4 h-4" /> {user?.email}
          </p>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Award className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 uppercase font-bold">Daraja</p>
              <p className="text-lg font-bold text-slate-900">{user?.level}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 uppercase font-bold">Progress</p>
              <p className="text-lg font-bold text-slate-900">{Math.round(user?.progress || 0)}%</p>
            </div>
          </div>
        </motion.div>

        {/* Settings List */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <button className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-700 flex-1 text-left">Sozlamalar</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-red-50 transition-colors text-red-600"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold flex-1 text-left">Chiqish</span>
          </button>
        </div>
      </main>
    </div>
  );
}
