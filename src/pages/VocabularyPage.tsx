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
import { VocabularyProgressBar } from '../components/vocabulary/VocabularyProgressBar';
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

const TOPIC_THEMES: Array<{
  cardBackground: string;
  cardBorder: string;
  iconBackground: string;
  iconColor: string;
  progressColor: string;
  progressTextColor: string;
  watermarkColor: string;
  arrowBackground: string;
  arrowColor: string;
}> = [
  {
    cardBackground: 'linear-gradient(135deg, #FCF3D8 0%, #F6EFD9 52%, #F9F1E3 100%)',
    cardBorder: 'rgba(232, 216, 174, 0.7)',
    iconBackground: 'linear-gradient(135deg, #FFB11A 0%, #FF7B00 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#FF7A00',
    progressTextColor: '#0E9F6E',
    watermarkColor: 'rgba(126, 108, 70, 0.11)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #F6ECFB 0%, #F2EAF5 55%, #F8EFF8 100%)',
    cardBorder: 'rgba(221, 205, 235, 0.9)',
    iconBackground: 'linear-gradient(135deg, #AF5BFF 0%, #FF3E9D 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#C66BFF',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(122, 102, 150, 0.1)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #EAF4FC 0%, #E8F2FA 58%, #E1F7F7 100%)',
    cardBorder: 'rgba(198, 220, 236, 0.9)',
    iconBackground: 'linear-gradient(135deg, #4C96FF 0%, #08B7E5 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#9BD3FF',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(122, 152, 177, 0.13)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #E7FAF2 0%, #E8F7F1 56%, #E7F8F6 100%)',
    cardBorder: 'rgba(191, 229, 215, 0.95)',
    iconBackground: 'linear-gradient(135deg, #0FD6A5 0%, #0BBE93 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#64D6B1',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(90, 149, 126, 0.12)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #EFF9E9 0%, #F3F8E7 55%, #F6FAEC 100%)',
    cardBorder: 'rgba(210, 229, 190, 0.9)',
    iconBackground: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#A3D94E',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(111, 141, 79, 0.11)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #FFF0F1 0%, #FDECEE 55%, #FFF4F4 100%)',
    cardBorder: 'rgba(242, 212, 218, 0.95)',
    iconBackground: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#FB8FA0',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(160, 101, 111, 0.1)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #FFF6EA 0%, #FEF0DF 55%, #FFF6EC 100%)',
    cardBorder: 'rgba(245, 220, 188, 0.92)',
    iconBackground: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#F7B458',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(160, 122, 84, 0.11)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #EEF6FF 0%, #EDF6FF 55%, #F0FBFF 100%)',
    cardBorder: 'rgba(202, 221, 244, 0.92)',
    iconBackground: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#7CCEF6',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(112, 137, 161, 0.11)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #F7F0FF 0%, #F4EDFD 55%, #FBF3FF 100%)',
    cardBorder: 'rgba(222, 209, 242, 0.92)',
    iconBackground: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#B48CFF',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(125, 110, 163, 0.11)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
  {
    cardBackground: 'linear-gradient(135deg, #F2F5FF 0%, #F1F3FF 55%, #F8FAFF 100%)',
    cardBorder: 'rgba(216, 221, 240, 0.92)',
    iconBackground: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    iconColor: '#FFFFFF',
    progressColor: '#98A2B3',
    progressTextColor: '#677188',
    watermarkColor: 'rgba(121, 133, 153, 0.11)',
    arrowBackground: 'rgba(255,255,255,0.68)',
    arrowColor: '#8E96A6',
  },
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
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <p className="mb-6 text-sm text-slate-500 md:text-base">
          Bo'limlarni tanlang va so'zlarni o'rganing
        </p>

        {token && !accessLoaded && (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden />
          </div>
        )}
        {accessLoaded && (
        <div className="space-y-5">
          {VOCABULARY_TOPICS.map((topic, topicIndex) => {
            const Icon = TOPIC_ICONS[topic.id] ?? Sparkles;
            const fromApi = topicsProgress.find((t) => t.id === topic.id);
            const wordCount = fromApi?.total_words ?? getTopicWordCount(topic.id);
            const learnedWords = fromApi?.learned_words ?? 0;
            const progressPercent = wordCount > 0 ? Math.round((learnedWords / wordCount) * 100) : 0;
            const theme = TOPIC_THEMES[topicIndex % TOPIC_THEMES.length];
            const locked = isVocabularyTopicLockedForUser(access, topic.id);
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
                className="group relative w-full overflow-hidden rounded-[28px] border px-4 py-5 text-left shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 md:rounded-[32px] md:px-6 md:py-6"
                style={{
                  background: theme.cardBackground,
                  borderColor: theme.cardBorder,
                }}
              >
                <div
                  className="pointer-events-none absolute -right-3 top-0 opacity-100 md:-right-4"
                  style={{ color: theme.watermarkColor }}
                  aria-hidden
                >
                  <Icon className="h-24 w-24 md:h-32 md:w-32 lg:h-36 lg:w-36" strokeWidth={1.2} />
                </div>

                <div className="relative flex items-start gap-3 md:gap-5">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] shadow-[0_10px_24px_rgba(0,0,0,0.08)] transition-transform duration-300 group-hover:scale-[1.03] md:h-[72px] md:w-[72px] md:rounded-[24px]"
                    style={{
                      background: theme.iconBackground,
                      color: theme.iconColor,
                    }}
                  >
                    <Icon className="h-7 w-7 md:h-9 md:w-9" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="pr-10 md:pr-16">
                      <p className="text-[28px] font-black leading-none tracking-tight text-slate-900 md:text-[34px] lg:text-[36px]">
                        {topic.title}
                      </p>
                      <p className="mt-1.5 text-base font-medium leading-snug text-slate-500 md:mt-2 md:text-[21px]">
                        {subtitle}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-2.5 md:mt-6 md:flex-row md:items-end md:justify-between md:gap-4">
                      <p className="text-lg font-semibold tracking-tight text-slate-700 md:text-[22px]">
                        {learnedWords} / {wordCount.toLocaleString()} so&apos;z
                      </p>
                      <p
                        className="text-base font-bold md:text-[20px]"
                        style={{
                          color: locked ? '#9CA3AF' : theme.progressTextColor,
                        }}
                      >
                        {progressPercent}% o&apos;rganildi
                      </p>
                    </div>

                    <div className="mt-3.5 pr-0.5 md:mt-4 md:pr-1">
                      <VocabularyProgressBar
                        learned={learnedWords}
                        total={wordCount}
                        trackClassName="bg-white/80"
                        barColor={locked ? '#CBD5E1' : theme.progressColor}
                        className="drop-shadow-[0_2px_4px_rgba(255,255,255,0.65)]"
                      />
                    </div>
                  </div>

                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-1 md:h-16 md:w-16"
                    style={{
                      backgroundColor: theme.arrowBackground,
                      color: theme.arrowColor,
                    }}
                  >
                    {locked ? (
                      <Lock className="h-5 w-5 text-amber-500 md:h-7 md:w-7" strokeWidth={2} />
                    ) : (
                      <ChevronRight className="h-6 w-6 md:h-8 md:w-8" strokeWidth={2} />
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
