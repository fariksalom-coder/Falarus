import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getTopicWordCount } from '../data/vocabularyContent';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import {
  fetchVocabularyTopics,
  getCachedTopicsProgress,
  setCachedTopicsProgress,
  type VocabularyTopic,
} from '../api/vocabulary';
import PaywallModal from '../components/PaywallModal';
import PendingPaymentModal from '../components/PendingPaymentModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { isVocabularyTopicLockedForUser } from '../utils/vocabularyAccess';
import {
  ChevronRight,
  Lock,
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
  const { access, accessLoaded } = useAccess();
  const [topicsProgress, setTopicsProgress] = useState<VocabularyTopic[]>(() =>
    getCachedTopicsProgress() ?? []
  );
  const [showPaywall, setShowPaywall] = useState(false);
  const { hasPendingPayment } = usePaymentStatus();

  useEffect(() => {
    if (!token) {
      setTopicsProgress([]);
      return;
    }
    fetchVocabularyTopics(token)
      .then((topics) => {
        setTopicsProgress(Array.isArray(topics) ? topics : []);
        if (Array.isArray(topics) && topics.length) setCachedTopicsProgress(topics);
      })
      .catch(() => {});
  }, [token]);

  /** One source of truth: /api/user/access (no extra “always unlock first list item” — that doubled with wrong server free_topic_id). */
  const lockedByTopic = (topicId: string) => isVocabularyTopicLockedForUser(access, topicId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-6 text-sm text-slate-500">
          Bo'limlarni tanlang va so'zlarni o'rganing
        </p>

        {token && !accessLoaded && (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden />
          </div>
        )}
        {accessLoaded && (
        <div className="space-y-4">
          {VOCABULARY_TOPICS.map((topic, index) => {
            const Icon = TOPIC_ICONS[topic.id] ?? Sparkles;
            const fromApi = topicsProgress.find((t) => t.id === topic.id);
            const wordCount = getTopicWordCount(topic.id);
            const learnedWords = fromApi?.learned_words ?? 0;
            const progressPercent = wordCount > 0 ? Math.round((learnedWords / wordCount) * 100) : 0;
            const accentBg = ACCENT_BG[index % ACCENT_BG.length];
            const accentIcon = ACCENT_ICON[index % ACCENT_ICON.length];
            const locked = lockedByTopic(topic.id);

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  if (locked) {
                    setShowPaywall(true);
                  } else {
                    navigate(`/vocabulary/${topic.id}`);
                  }
                }}
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
                        {learnedWords} / {wordCount.toLocaleString()} so'z
                      </span>
                    </div>
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
                        {progressPercent}% o&apos;rganildi
                      </p>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                    {locked ? (
                      <Lock className="h-5 w-5 text-amber-500" strokeWidth={2} />
                    ) : (
                      <ChevronRight className="h-5 w-5" strokeWidth={2} />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        )}
      </main>

      {showPaywall && hasPendingPayment && (
        <PendingPaymentModal onClose={() => setShowPaywall(false)} />
      )}
      {showPaywall && !hasPendingPayment && (
        <PaywallModal onClose={() => setShowPaywall(false)} />
      )}
    </div>
  );
}
