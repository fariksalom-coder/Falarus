import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getSubtopicWordCount } from '../data/vocabularyContent';
import { getLearnedCount, setLastSubtopicId } from '../utils/vocabProgress';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import {
  fetchVocabularySubtopics,
  getCachedSubtopicsProgress,
  setCachedSubtopicsProgress,
  type VocabularySubtopic,
} from '../api/vocabulary';
import PaywallModal from '../components/PaywallModal';
import PendingPaymentModal from '../components/PendingPaymentModal';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import {
  canAccessVocabularySubtopicRoute, isVocabularyTopicLockedForUser,
} from '../utils/vocabularyAccess';
import {
  ArrowLeft,
  Lock,
  MessageCircle,
  Users,
  Home,
  Utensils,
  Eye,
  Heart,
  Briefcase,
  Building2,
  Car,
  MapPin,
  BookOpen,
  GraduationCap,
  CloudSun,
  Rabbit,
  CloudLightning,
  Activity,
  HeartPulse,
  Pill,
  Wallet,
  Store,
  Shirt,
  Hash,
  Calendar,
  CalendarDays,
  Sun,
  Clock,
  Palette,
  Plane,
  Sparkles,
  Zap,
  Type,
  Link2,
  type LucideIcon,
} from 'lucide-react';

const SUBTOPIC_ICONS: Record<string, LucideIcon> = {
  'salomlashish-xayrlashish-odob': MessageCircle,
  oila: Users,
  'uy-mebel-xonalar': Home,
  'oziq-ovqat-ichimliklar': Utensils,
  'tashqi-korinish': Eye,
  xarakter: Heart,
  kasblar: Briefcase,
  'dostlar-tanishuv-muloqot': MessageCircle,
  'binolar-va-joylar': Building2,
  transport: Car,
  yonalishlar: MapPin,
  'maktab-fanlari': BookOpen,
  'universitet-imtihon-oqish': GraduationCap,
  'ish-ofis': Briefcase,
  'yil-fasli-ob-havo-iqlim': CloudSun,
  hayvonlar: Rabbit,
  'tabiat-hodisalari': CloudLightning,
  'tana-azolari': Activity,
  'kasalliklar-va-alomatlar': HeartPulse,
  'shifokorlar-dorilar-davolanish': Pill,
  'pul-va-narxlar': Wallet,
  dokkonlar: Store,
  'kiyim-kechak-poyabzal': Shirt,
  sonlar: Hash,
  'hafta-kunlari': Calendar,
  oylar: CalendarDays,
  'kun-vaqtlari': Sun,
  'soat-va-taqvim': Clock,
  xobbi: Palette,
  turizm: Plane,
  'kongilochar-mashgulotlar': Sparkles,
  'kop-qollanadigan-fellar': Zap,
  sifatlar: Type,
  ravishlar: Sparkles,
  boglovchilar: Link2,
};

const ACCENT_BG = [
  'bg-indigo-50',
  'bg-violet-50',
  'bg-sky-50',
  'bg-emerald-50',
  'bg-amber-50',
  'bg-rose-50',
  'bg-teal-50',
  'bg-fuchsia-50',
];
const ACCENT_ICON = [
  'text-indigo-600',
  'text-violet-600',
  'text-sky-600',
  'text-emerald-600',
  'text-amber-600',
  'text-rose-600',
  'text-teal-600',
  'text-fuchsia-600',
];

export default function VocabularyTopicPage() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const { token } = useAuth();
  const { access, accessLoaded } = useAccess();
  const topic = VOCABULARY_TOPICS.find((item) => item.id === topicId);
  const cachedSubtopics = topicId ? getCachedSubtopicsProgress(topicId) : null;
  const [subtopicsProgress, setSubtopicsProgress] = useState<VocabularySubtopic[]>(() =>
    cachedSubtopics ?? []
  );
  const [subtopicsLoaded, setSubtopicsLoaded] = useState(!!cachedSubtopics?.length);
  const [showPaywall, setShowPaywall] = useState(false);
  const { hasPendingPayment } = usePaymentStatus();

  const topicIndex = topic != null ? VOCABULARY_TOPICS.findIndex((t) => t.id === topic.id) : -1;
  const isTopicUnlocked = topic != null ? !isVocabularyTopicLockedForUser(access, topic.id) : false;

  useEffect(() => {
    if (!topicId) {
      setSubtopicsProgress([]);
      setSubtopicsLoaded(true);
      return;
    }
    const cached = getCachedSubtopicsProgress(topicId);
    setSubtopicsProgress(cached ?? []);
    setSubtopicsLoaded(!!cached?.length);
  }, [topicId]);

  useEffect(() => {
    if (!topicId || !token || topicIndex < 0) {
      if (!topicId || topicIndex < 0) {
        setSubtopicsLoaded(true);
      } else if (!token) {
        setSubtopicsProgress([]);
        setSubtopicsLoaded(true);
      }
      return;
    }
    if (!isTopicUnlocked) {
      setSubtopicsLoaded(true);
      setSubtopicsProgress([]);
      return;
    }
    fetchVocabularySubtopics(token, topicId)
      .then((data) => {
        setSubtopicsProgress(data ?? []);
        if (topicId && Array.isArray(data)) setCachedSubtopicsProgress(topicId, data);
      })
      // Fallback to static local content if API fails in production.
      .catch(() => {})
      .finally(() => setSubtopicsLoaded(true));
  }, [token, topicId, topicIndex, isTopicUnlocked]);

  if (!topic) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">Bo'lim topilmadi.</p>
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

  if (accessLoaded && access != null && !isTopicUnlocked) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Lock className="mx-auto h-12 w-12 text-amber-500" strokeWidth={2} />
          <p className="mt-4 font-semibold text-slate-900">Bu bo&apos;lim sizning tarifingizda ochilmagan</p>
          <p className="mt-2 text-sm text-slate-600">Barcha bo&apos;limlarni ochish uchun tarifni tanlang.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary/words')}
            className="mt-6 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Lug&apos;atga qaytish
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
      <main className="mx-auto max-w-[720px] px-4 py-6">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/vocabulary/words')}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        {token && !subtopicsLoaded && (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden />
          </div>
        )}
        {(!token || subtopicsLoaded) && (
          <>
            <h1 className="mb-1 text-xl font-bold text-slate-900">{topic.title}</h1>
            <p className="mb-4 text-sm text-slate-500">Bo&apos;limlar</p>
            <div className="grid grid-cols-2 gap-2.5">
          {topic.subtopics.map((subtopic, subtopicIndex) => {
            const Icon = SUBTOPIC_ICONS[subtopic.id] ?? BookOpen;
            const fromApi = subtopicsProgress.find((s) => s.id === subtopic.id);
            const locked = !canAccessVocabularySubtopicRoute(access, topic.id, subtopic.id);
            const wordCount = fromApi?.total_words ?? getSubtopicWordCount(topic.id, subtopic.id);
            const learned = fromApi?.learned_words ?? getLearnedCount(topic.id, subtopic.id);
            const accentBg = ACCENT_BG[subtopicIndex % ACCENT_BG.length];
            const accentIcon = ACCENT_ICON[subtopicIndex % ACCENT_ICON.length];

            return (
              <button
                key={subtopic.id}
                type="button"
                onClick={() => {
                  if (locked) {
                    setShowPaywall(true);
                    return;
                  }
                  setLastSubtopicId(topic.id, subtopic.id);
                  const pathSeg = fromApi?.slug ?? subtopic.id;
                  navigate(`/vocabulary/${topic.id}/${pathSeg}`);
                }}
                className="group relative flex w-full flex-col items-start rounded-2xl border bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentBg} ${accentIcon} transition-transform group-hover:scale-105`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                  {subtopic.title.charAt(0).toUpperCase() + subtopic.title.slice(1)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {learned} / {wordCount.toLocaleString()}
                </p>
                {locked ? <Lock className="absolute right-3 top-3 h-4 w-4 text-amber-500" strokeWidth={2} /> : null}
              </button>
            );
          })}
            </div>
          </>
        )}
      </main>

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
