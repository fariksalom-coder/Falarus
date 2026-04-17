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
import { isVocabularyTopicLockedForUser } from '../utils/vocabularyAccess';
import PaywallModal from '../components/PaywallModal';
import PendingPaymentModal from '../components/PendingPaymentModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import {
  ArrowLeft,
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

const TOPIC_RU_SUBTITLE: Record<string, string> = {
  'kundalik-hayot': 'Повседневная жизнь',
  'odamlar-va-jamiyat': 'Люди и общество',
  'shahar-va-transport': 'Город и транспорт',
  'oqish-va-ish': 'Учеба и работа',
  'tabiat-va-atrof-muhit': 'Природа и окружающая среда',
  'salomatlik-va-tana': 'Здоровье и тело',
  'xaridlar-va-pul': 'Покупки и деньги',
  'vaqt-va-sonlar': 'Время и числа',
  'hordiq-va-sayohatlar': 'Отдых и путешествия',
  'mavhum-sozlar-va-iboralar': 'Абстрактные слова и выражения',
};

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
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <main className="mx-auto max-w-4xl px-3 py-4 md:px-5 md:py-5">
        <button
          type="button"
          onClick={() => navigate('/vocabulary')}
          className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>
        <p className="mb-3 text-xs text-slate-500 md:text-sm">Mavzuni tanlang</p>

        {token && !accessLoaded && (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden />
          </div>
        )}
        {accessLoaded && (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {VOCABULARY_TOPICS.map((topic, topicIndex) => {
            const Icon = TOPIC_ICONS[topic.id] ?? Sparkles;
            const fromApi = topicsProgress.find((t) => t.id === topic.id);
            const wordCount = fromApi?.total_words ?? getTopicWordCount(topic.id);
            const learnedWords = fromApi?.learned_words ?? 0;
            const locked = isVocabularyTopicLockedForUser(access, topic.id);
            const grayscaleForFreeTier =
              access?.subscription_active === false && topicIndex > 0;
            const subtitle = TOPIC_RU_SUBTITLE[topic.id] ?? topic.title;

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
                className="group relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{
                  filter: grayscaleForFreeTier ? 'grayscale(100%) saturate(0.15)' : undefined,
                }}
              >
                <div className="relative">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
                    style={{
                      background: grayscaleForFreeTier ? '#E2E8F0' : undefined,
                      color: grayscaleForFreeTier ? '#475569' : undefined,
                    }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-slate-900">{topic.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{subtitle}</p>
                  <p className="mt-1.5 text-xs font-semibold text-slate-700">
                    {learnedWords} / {wordCount.toLocaleString()}
                  </p>
                  {locked ? <Lock className="absolute right-0 top-0 h-4 w-4 text-amber-500" strokeWidth={2} /> : null}
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
