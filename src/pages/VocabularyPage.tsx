import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getTopicWordCount } from '../data/vocabularyContent';
import { useAuth } from '../context/AuthContext';
import { fetchVocabularyProgress } from '../api/vocabularyProgress';
import {
  House,
  BookMarked,
  BarChart3,
  User,
  ChevronRight,
  Sun,
  Users,
  Building2,
  GraduationCap,
  Leaf,
  Heart,
  ShoppingBag,
  Clock,
  Plane,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const TOPIC_ICONS: Record<string, LucideIcon> = {
  'kundalik-hayot': Sun,
  'odamlar-va-jamiyat': Users,
  'shahar-va-transport': Building2,
  'oqish-va-ish': GraduationCap,
  'tabiat-va-atrof-muhit': Leaf,
  'salomatlik-va-tana': Heart,
  'xaridlar-va-pul': ShoppingBag,
  'vaqt-va-sonlar': Clock,
  'hordiq-va-sayohatlar': Plane,
  'mavhum-sozlar-va-iboralar': Sparkles,
};

const ACCENT_BG = [
  'bg-indigo-50',
  'bg-violet-50',
  'bg-sky-50',
  'bg-emerald-50',
  'bg-amber-50',
  'bg-rose-50',
  'bg-fuchsia-50',
  'bg-teal-50',
  'bg-orange-50',
  'bg-slate-100',
];
const ACCENT_ICON = [
  'text-indigo-600',
  'text-violet-600',
  'text-sky-600',
  'text-emerald-600',
  'text-amber-600',
  'text-rose-600',
  'text-fuchsia-600',
  'text-teal-600',
  'text-orange-600',
  'text-slate-600',
];

export default function VocabularyPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetchVocabularyProgress(token);
  }, [token]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Top navigation */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <button
            type="button"
            aria-label="Главная"
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <House className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold tracking-tight text-slate-800">Lug'at</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Словарь"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-opacity"
              style={{ backgroundColor: '#6366F1' }}
            >
              <BookMarked className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Статистика"
              onClick={() => navigate('/course-map')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Профиль"
              onClick={() => navigate('/profile')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-6 text-sm text-slate-500">
          Bo'limlarni tanlang va so'zlarni o'rganing
        </p>

        <div className="space-y-4">
          {VOCABULARY_TOPICS.map((topic, index) => {
            const Icon = TOPIC_ICONS[topic.id] ?? BookMarked;
            const wordCount = getTopicWordCount(topic.id);
            const progressPercent = 0; // placeholder: can be wired to real progress later
            const accentBg = ACCENT_BG[index % ACCENT_BG.length];
            const accentIcon = ACCENT_ICON[index % ACCENT_ICON.length];

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => navigate(`/vocabulary/${topic.id}`)}
                className="group relative w-full rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accentBg} ${accentIcon} transition-colors group-hover:opacity-90`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      {index + 1}-bo'lim
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{topic.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      >
                        {wordCount.toLocaleString()} so'z
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.max(progressPercent, 2)}%`,
                            backgroundColor: '#6366F1',
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {progressPercent}% o'rganildi
                      </p>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                    <ChevronRight className="h-5 w-5" strokeWidth={2} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
