import { useNavigate } from 'react-router-dom';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { 
  House,
  BookMarked,
  BarChart3,
  User,
  ChevronRight
} from 'lucide-react';

export default function VocabularyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
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
            className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center"
          >
            <BookMarked className="w-5 h-5 text-white" />
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
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
            aria-label="Профиль"
          >
            <User className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="space-y-3">
          {VOCABULARY_TOPICS.map((topic, index) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => navigate(`/vocabulary/${topic.id}`)}
              className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400">{index + 1}-bo'lim</p>
                  <p className="mt-1 font-semibold text-slate-900">{topic.title}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
