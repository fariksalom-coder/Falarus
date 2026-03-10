import { useNavigate, useParams } from 'react-router-dom';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { House, BookMarked, BarChart3, User, ChevronRight } from 'lucide-react';

export default function VocabularyTopicPage() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const topic = VOCABULARY_TOPICS.find((item) => item.id === topicId);

  if (!topic) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold text-slate-900">Bo'lim topilmadi.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary')}
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="w-full flex items-center justify-center gap-2">
          <button type="button" aria-label="Главная" onClick={() => navigate('/')} className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center">
            <House className="w-5 h-5 text-slate-600" />
          </button>
          <button type="button" aria-label="Словарь" onClick={() => navigate('/vocabulary')} className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-white" />
          </button>
          <button type="button" aria-label="Статистика" onClick={() => navigate('/course-map')} className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-slate-600" />
          </button>
          <button type="button" aria-label="Профиль" onClick={() => navigate('/profile')} className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <button
          type="button"
          onClick={() => navigate('/vocabulary')}
          className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Orqaga
        </button>
        <h2 className="mb-4 text-lg font-bold text-slate-900">{topic.title}</h2>
        <div className="space-y-3">
          {topic.subtopics.map((subtopic, index) => (
            <button
              key={subtopic.id}
              type="button"
              onClick={() => navigate(`/vocabulary/${topic.id}/${subtopic.id}`)}
              className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Mavzu {index + 1}</p>
                  <p className="mt-1 font-semibold text-slate-900">{subtopic.title}</p>
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
