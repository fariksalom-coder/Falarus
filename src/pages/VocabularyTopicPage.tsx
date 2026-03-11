import { useNavigate, useParams } from 'react-router-dom';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getSubtopicWordCount } from '../data/vocabularyContent';
import { getLearnedCount, setLastSubtopicId } from '../utils/vocabProgress';
import {
  House,
  BookMarked,
  BarChart3,
  User,
  ChevronRight,
  ArrowLeft,
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
  const topic = VOCABULARY_TOPICS.find((item) => item.id === topicId);

  if (!topic) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">Bo'lim topilmadi.</p>
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
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm" style={{ borderColor: '#E2E8F0' }}>
        <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between px-4">
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
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
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

      <main className="mx-auto max-w-[720px] px-4 py-8">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/vocabulary')}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        <div className="space-y-4">
          {topic.subtopics.map((subtopic, index) => {
            const Icon = SUBTOPIC_ICONS[subtopic.id] ?? BookOpen;
            const wordCount = getSubtopicWordCount(topic.id, subtopic.id);
            const learned = getLearnedCount(topic.id, subtopic.id);
            const percent = wordCount > 0 ? Math.round((learned / wordCount) * 100) : 0;
            const accentBg = ACCENT_BG[index % ACCENT_BG.length];
            const accentIcon = ACCENT_ICON[index % ACCENT_ICON.length];

            return (
              <button
                key={subtopic.id}
                type="button"
                onClick={() => {
                  setLastSubtopicId(topic.id, subtopic.id);
                  navigate(`/vocabulary/${topic.id}/${subtopic.id}`);
                }}
                className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accentBg} ${accentIcon} transition-transform group-hover:scale-105`}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug" style={{ color: '#0F172A' }}>
                    {subtopic.title.charAt(0).toUpperCase() + subtopic.title.slice(1)}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: '#64748B' }}>
                    {learned} / {wordCount.toLocaleString()} so'z o'rganildi
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percent, 2)}%`,
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
      </main>
    </div>
  );
}
