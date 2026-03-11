import { useNavigate, useParams } from 'react-router-dom';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getSubtopicContent } from '../data/vocabularyContent';
import { getPartLearnedCount, setLastPartId } from '../utils/vocabProgress';
import {
  ChevronRight,
  Package,
  Palette,
  Zap,
  Compass,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

const PART_ICONS: Record<string, LucideIcon> = {
  ot: Package,
  sifat: Palette,
  fel: Zap,
  ravish: Compass,
};

const PART_ACCENT = [
  'bg-indigo-50 text-indigo-600',
  'bg-violet-50 text-violet-600',
  'bg-amber-50 text-amber-600',
  'bg-teal-50 text-teal-600',
];

export default function VocabularySubtopicPage() {
  const navigate = useNavigate();
  const { topicId, subtopicId } = useParams();
  const topic = VOCABULARY_TOPICS.find((item) => item.id === topicId);
  const subtopic = topic?.subtopics.find((item) => item.id === subtopicId);
  const content = getSubtopicContent(topicId, subtopicId);

  if (!topic || !subtopic) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">Mavzu topilmadi.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary')}
            className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main className="mx-auto max-w-[720px] px-4 py-8">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(`/vocabulary/${topic.id}`)}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}
        >
          ← Orqaga
        </button>

        {content ? (
          <div className="space-y-4">
              {content.parts.map((part, index) => {
                const Icon = PART_ICONS[part.id] ?? BookOpen;
                const total = part.entries.length;
                const learned = getPartLearnedCount(
                  topic.id,
                  subtopic.id,
                  part.id
                );
                const partPercent = total > 0 ? Math.round((learned / total) * 100) : 0;
                const accent = PART_ACCENT[index % PART_ACCENT.length];

                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => {
                      setLastPartId(topic.id, subtopic.id, part.id);
                      navigate(
                        `/vocabulary/${topic.id}/${subtopic.id}/${part.id}`
                      );
                    }}
                    className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    style={{ borderColor: '#E2E8F0' }}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent} transition-transform group-hover:scale-105`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-semibold leading-snug"
                        style={{ color: '#0F172A' }}
                      >
                        {part.title}
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: '#64748B' }}
                      >
                        {learned} / {total.toLocaleString()} so'z o'rganildi
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(partPercent, 2)}%`,
                            backgroundColor: '#6366F1',
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                      <ChevronRight className="h-5 w-5" strokeWidth={2} />
                    </div>
                  </button>
                );
              })}
            </div>
        ) : (
          <div
            className="rounded-2xl border bg-white p-8 text-center shadow-sm"
            style={{ borderColor: '#E2E8F0' }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <BookOpen className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-slate-500" style={{ color: '#64748B' }}>
              Bu bo'lim hozircha bo'sh. Keyinroq lug'at qo'shamiz.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
