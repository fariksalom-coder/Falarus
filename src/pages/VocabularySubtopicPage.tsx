import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getPartLearnedCount, setLastPartId } from '../utils/vocabProgress';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import { useResolvedVocabularySubtopicId } from '../hooks/useResolvedVocabularySubtopicId';
import PaywallModal from '../components/PaywallModal';
import PendingPaymentModal from '../components/PendingPaymentModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { canAccessVocabularySubtopicRoute } from '../utils/vocabularyAccess';
import {
  fetchVocabularyWordGroups,
  getCachedWordGroupsProgress,
  setCachedWordGroupsProgress,
  type VocabularyWordGroup,
} from '../api/vocabulary';
import {
  Package,
  Palette,
  Zap,
  Compass,
  BookOpen,
  Lock,
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
  const { token } = useAuth();
  const { access, accessLoaded } = useAccess();
  const [showPaywall, setShowPaywall] = useState(false);
  const { hasPendingPayment } = usePaymentStatus();
  const topic = VOCABULARY_TOPICS.find((item) => item.id === topicId);
  const { resolvedId, loading: resolvingSubtopic } = useResolvedVocabularySubtopicId(
    topicId,
    subtopicId,
    token
  );
  const subtopic =
    topic && resolvedId ? topic.subtopics.find((item) => item.id === resolvedId) : undefined;
  const [content, setContent] = useState<ReturnType<
    typeof import('../data/vocabularyContent')['getSubtopicContent']
  > | undefined>(undefined);
  const [wordGroupsProgress, setWordGroupsProgress] = useState<VocabularyWordGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedId) {
      setContent(undefined);
      return;
    }
    import('../data/vocabularyContent')
      .then((module) => {
        if (cancelled) return;
        setContent(module.getSubtopicContent(topicId, resolvedId));
      })
      .catch(() => {
        if (!cancelled) setContent(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId, resolvedId]);

  useEffect(() => {
    if (!subtopicId || !resolvedId) {
      setWordGroupsProgress([]);
      return;
    }
    if (!token) {
      setWordGroupsProgress([]);
      return;
    }
    setWordGroupsProgress(getCachedWordGroupsProgress(resolvedId) ?? []);
    // Always use the canonical subtopic id for backend lookups.
    // This avoids 404s when the URL uses a slug that is not yet backfilled in production.
    fetchVocabularyWordGroups(token, resolvedId).then((data) => {
      setWordGroupsProgress(data);
      setCachedWordGroupsProgress(resolvedId, data);
    });
  }, [token, subtopicId, resolvedId]);

  if (!topic) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">Mavzu topilmadi.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary/words')}
            className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  if (resolvingSubtopic) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-6"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!resolvedId || !subtopic) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">Mavzu topilmadi.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary/words')}
            className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  const accessDenied =
    Boolean(token) &&
    accessLoaded &&
    !canAccessVocabularySubtopicRoute(access, topicId, resolvedId);

  if (accessDenied) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <Lock className="h-7 w-7 text-amber-600" />
          </div>
          <p className="font-semibold text-slate-900">Bu mavzu sizning tarifingizda ochilmagan</p>
          <p className="mt-2 text-sm text-slate-600">
            Barcha bo&apos;limlarni ochish uchun tarifni tanlang.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate('/vocabulary/words')}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Lug&apos;atga qaytish
            </button>
            <button
              type="button"
              onClick={() => setShowPaywall(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Tarifni ochish
            </button>
          </div>
        </div>
        {showPaywall && hasPendingPayment && (
          <PendingPaymentModal onClose={() => setShowPaywall(false)} />
        )}
        {showPaywall && !hasPendingPayment && (
          <PaywallModal
            onClose={() => setShowPaywall(false)}
            title="Bu mavzu faqat obuna bo'lganlar uchun"
            description="Barcha so'zlar va mavzularga kirish uchun tarifni sotib oling."
            buttonText="Barcha mavzularni ochish"
          />
        )}
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
      <main className="mx-auto max-w-[720px] px-4 py-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(`/vocabulary/${topic.id}`)}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}
        >
          ← Orqaga
        </button>

        <h1 className="mb-1 text-xl font-bold text-slate-900">
          {subtopic.title.charAt(0).toUpperCase() + subtopic.title.slice(1)}
        </h1>
        {content ? <p className="mb-4 text-sm text-slate-600">{wordGroupsProgress.reduce((sum, g) => sum + (g.learned_words ?? 0), 0)} / {wordGroupsProgress.reduce((sum, g) => sum + (g.total_words ?? 0), 0)}</p> : null}

        {content ? (
          <div className="grid grid-cols-2 gap-2.5">
              {content.parts.map((part, index) => {
                const Icon = PART_ICONS[part.id] ?? BookOpen;
                const contentTotal = part.entries.length;
                const fromApi = wordGroupsProgress.find((g) => g.part_id === part.id);
                const total = fromApi?.total_words ?? contentTotal;
                const learned = fromApi?.learned_words ?? getPartLearnedCount(
                  topic.id,
                  subtopic.id,
                  part.id
                );
                const accent = PART_ACCENT[index % PART_ACCENT.length];

                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => {
                      setLastPartId(topic.id, subtopic.id, part.id);
                      navigate(
                        `/vocabulary/${topic.id}/${subtopicId}/${part.id}`
                      );
                    }}
                    className="group flex w-full flex-col items-start rounded-2xl border bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    style={{ borderColor: '#E2E8F0' }}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent} transition-transform group-hover:scale-105`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">{part.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{learned} / {total.toLocaleString()}</p>
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
