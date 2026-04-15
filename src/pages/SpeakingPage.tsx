import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  ArrowLeft,
  MessageSquare,
  Mic,
  BookOpen,
  Home,
  Building2,
  ShoppingCart,
  UtensilsCrossed,
  Briefcase,
  TrendingUp,
  GraduationCap,
  Brain,
  Users,
  Wrench,
  FileText,
  Wallet,
  Tv,
  Handshake,
  Scale,
  BarChart3,
  Megaphone,
  ShieldAlert,
  Target,
  Globe2,
  Cpu,
  CalendarClock,
  Footprints,
  Phone,
  Train,
  HeartPulse,
  Plane,
  Hotel,
  Landmark,
  Sparkles,
  MessagesSquare,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import {
  getSpeakingTopics,
  getSpeakingTasks,
  type SpeakingTopic,
  type SpeakingTask,
} from '../api/speaking';
import SpeakingExercise from '../components/speaking/SpeakingExercise';

type View = 'loading' | 'paywall' | 'topics' | 'exercise';

type TopicMeta = {
  label: string;
  subtitle: string;
  icon: typeof BookOpen;
  gradient: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  order: number;
};

const TOPIC_META: Record<string, TopicMeta> = {
  tanishuv: {
    label: 'Tanishuv',
    subtitle: 'Знакомство',
    icon: MessageSquare,
    gradient: 'from-blue-500 to-blue-600',
    level: 'A1',
    order: 1,
  },
  oila: {
    label: 'Oila',
    subtitle: 'Семья',
    icon: BookOpen,
    gradient: 'from-violet-500 to-purple-600',
    level: 'A1',
    order: 2,
  },
  uy_joy: {
    label: "Uy va yashash joyi",
    subtitle: 'Дом и жильё',
    icon: Home,
    gradient: 'from-cyan-500 to-sky-600',
    level: 'A1',
    order: 3,
  },
  shahar: {
    label: 'Shahar',
    subtitle: 'Город',
    icon: Building2,
    gradient: 'from-indigo-500 to-blue-600',
    level: 'A1',
    order: 4,
  },
  xarid: {
    label: 'Do‘kon',
    subtitle: 'Магазин',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-teal-600',
    level: 'A1',
    order: 5,
  },
  ovqat_ichimlik: {
    label: 'Ovqat va ichimlik',
    subtitle: 'Еда и напитки',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-amber-600',
    level: 'A1',
    order: 6,
  },
  ish_sodda: {
    label: 'Ish (sodda)',
    subtitle: 'Работа (простая)',
    icon: Briefcase,
    gradient: 'from-slate-500 to-slate-700',
    level: 'A1',
    order: 7,
  },
  kun_vaqt: {
    label: 'Kun va vaqt',
    subtitle: 'День и время',
    icon: CalendarClock,
    gradient: 'from-fuchsia-500 to-pink-600',
    level: 'A1',
    order: 8,
  },
  kundalik_harakatlar: {
    label: 'Kundalik harakatlar',
    subtitle: 'Повседневные действия',
    icon: Footprints,
    gradient: 'from-lime-500 to-green-600',
    level: 'A1',
    order: 9,
  },
  qongiroqlar: {
    label: "Qo‘ng‘iroqlar",
    subtitle: 'Простое общение (звонки)',
    icon: Phone,
    gradient: 'from-sky-500 to-blue-600',
    level: 'A1',
    order: 10,
  },

  ish_batafsil: {
    label: 'Ish (batafsil)',
    subtitle: 'Работа (подробнее)',
    icon: Briefcase,
    gradient: 'from-stone-500 to-zinc-700',
    level: 'A2',
    order: 101,
  },
  ofis: {
    label: 'Ofis',
    subtitle: 'Офис',
    icon: Building2,
    gradient: 'from-blue-500 to-indigo-600',
    level: 'A2',
    order: 102,
  },
  transport: {
    label: 'Transport',
    subtitle: 'Транспорт',
    icon: Train,
    gradient: 'from-cyan-500 to-blue-600',
    level: 'A2',
    order: 103,
  },
  sogliq: {
    label: 'Sog‘liq',
    subtitle: 'Здоровье',
    icon: HeartPulse,
    gradient: 'from-rose-500 to-red-600',
    level: 'A2',
    order: 104,
  },
  xarid_batafsil: {
    label: 'Xarid (batafsil)',
    subtitle: 'Покупки (детально)',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-green-600',
    level: 'A2',
    order: 105,
  },
  restoran: {
    label: 'Restoran / Kafe',
    subtitle: 'Ресторан / кафе',
    icon: UtensilsCrossed,
    gradient: 'from-amber-500 to-orange-600',
    level: 'A2',
    order: 106,
  },
  sayohat: {
    label: 'Sayohat',
    subtitle: 'Путешествия',
    icon: Plane,
    gradient: 'from-sky-500 to-cyan-600',
    level: 'A2',
    order: 107,
  },
  mehmonxona: {
    label: 'Mehmonxona',
    subtitle: 'Гостиница',
    icon: Hotel,
    gradient: 'from-violet-500 to-fuchsia-600',
    level: 'A2',
    order: 108,
  },
  xizmatlar: {
    label: 'Xizmatlar',
    subtitle: 'Услуги',
    icon: Landmark,
    gradient: 'from-teal-500 to-emerald-600',
    level: 'A2',
    order: 109,
  },
  bosh_vaqt: {
    label: 'Bo‘sh vaqt',
    subtitle: 'Свободное время',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-600',
    level: 'A2',
    order: 110,
  },
  muloqot: {
    label: 'Muloqot',
    subtitle: 'Общение (соцсети)',
    icon: MessagesSquare,
    gradient: 'from-indigo-500 to-blue-600',
    level: 'A2',
    order: 111,
  },
  muammolar: {
    label: 'Oddiy muammolar',
    subtitle: 'Простые проблемы',
    icon: AlertTriangle,
    gradient: 'from-orange-500 to-red-500',
    level: 'A2',
    order: 112,
  },

  ish_tajriba_b1: {
    label: 'Ish (tajriba)',
    subtitle: 'Работа (обязанности, опыт)',
    icon: Briefcase,
    gradient: 'from-slate-600 to-zinc-800',
    level: 'B1',
    order: 201,
  },
  karyera_b1: {
    label: 'Karyera',
    subtitle: 'Карьера',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-green-700',
    level: 'B1',
    order: 202,
  },
  talim_b1: {
    label: 'Ta’lim',
    subtitle: 'Образование',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-indigo-700',
    level: 'B1',
    order: 203,
  },
  fikr_va_dalil_b1: {
    label: 'Fikr va dalillar',
    subtitle: 'Мнение и аргументы',
    icon: Brain,
    gradient: 'from-violet-500 to-purple-700',
    level: 'B1',
    order: 204,
  },
  muloqot_odamlar_b1: {
    label: 'Muloqot',
    subtitle: 'Общение с людьми',
    icon: Users,
    gradient: 'from-cyan-500 to-sky-700',
    level: 'B1',
    order: 205,
  },
  muammo_yechim_b1: {
    label: 'Muammo va yechim',
    subtitle: 'Проблемы и решения',
    icon: Wrench,
    gradient: 'from-amber-500 to-orange-700',
    level: 'B1',
    order: 206,
  },
  kochish_b1: {
    label: 'Ko‘chish',
    subtitle: 'Переезд / жизнь в другой стране',
    icon: Home,
    gradient: 'from-teal-500 to-cyan-700',
    level: 'B1',
    order: 207,
  },
  hujjatlar_b1: {
    label: 'Hujjatlar',
    subtitle: 'Документы',
    icon: FileText,
    gradient: 'from-indigo-500 to-blue-700',
    level: 'B1',
    order: 208,
  },
  pul_xarajat_b1: {
    label: 'Pul va xarajatlar',
    subtitle: 'Деньги и расходы',
    icon: Wallet,
    gradient: 'from-lime-500 to-green-700',
    level: 'B1',
    order: 209,
  },
  media_b1: {
    label: 'Media',
    subtitle: 'Новости и видео',
    icon: Tv,
    gradient: 'from-fuchsia-500 to-pink-700',
    level: 'B1',
    order: 210,
  },
  dostlar_munosabat_b1: {
    label: 'Do‘stlar va munosabatlar',
    subtitle: 'Друзья и отношения',
    icon: Handshake,
    gradient: 'from-rose-500 to-red-700',
    level: 'B1',
    order: 211,
  },
  kundalik_muammo_b1: {
    label: 'Kundalik vaziyatlar',
    subtitle: 'Конфликты и просьбы',
    icon: AlertTriangle,
    gradient: 'from-orange-500 to-amber-700',
    level: 'B1',
    order: 212,
  },

  munozara_fikr_b2: {
    label: 'Fikr muhokamasi',
    subtitle: 'Обсуждение мнений',
    icon: Brain,
    gradient: 'from-violet-600 to-purple-800',
    level: 'B2',
    order: 301,
  },
  taqqoslash_tahlil_b2: {
    label: 'Taqqoslash va tahlil',
    subtitle: 'Сравнение и анализ',
    icon: Scale,
    gradient: 'from-blue-600 to-indigo-800',
    level: 'B2',
    order: 302,
  },
  biznes_b2: {
    label: 'Biznes',
    subtitle: 'Работа и бизнес',
    icon: Building2,
    gradient: 'from-slate-600 to-zinc-900',
    level: 'B2',
    order: 303,
  },
  jamiyat_b2: {
    label: 'Jamiyat',
    subtitle: 'Общество',
    icon: Users,
    gradient: 'from-cyan-600 to-blue-800',
    level: 'B2',
    order: 304,
  },
  iqtisod_b2: {
    label: 'Iqtisod',
    subtitle: 'Экономика',
    icon: BarChart3,
    gradient: 'from-emerald-600 to-green-800',
    level: 'B2',
    order: 305,
  },
  argument_b2: {
    label: 'Argumentatsiya',
    subtitle: 'Аргументация',
    icon: Megaphone,
    gradient: 'from-amber-600 to-orange-800',
    level: 'B2',
    order: 306,
  },
  muammo_chuqur_b2: {
    label: 'Muammo va yechim',
    subtitle: 'Проблемы и решения (глубже)',
    icon: ShieldAlert,
    gradient: 'from-rose-600 to-red-800',
    level: 'B2',
    order: 307,
  },
  maqsad_reja_b2: {
    label: 'Maqsad va reja',
    subtitle: 'Цели и планы',
    icon: Target,
    gradient: 'from-lime-600 to-green-800',
    level: 'B2',
    order: 308,
  },
  debat_b2: {
    label: 'Debatlar',
    subtitle: 'Дебаты',
    icon: MessagesSquare,
    gradient: 'from-indigo-600 to-violet-800',
    level: 'B2',
    order: 309,
  },
  rivojlanish_b2: {
    label: 'Ta’lim va rivojlanish',
    subtitle: 'Обучение и развитие',
    icon: GraduationCap,
    gradient: 'from-sky-600 to-cyan-800',
    level: 'B2',
    order: 310,
  },
  madaniyat_b2: {
    label: 'Madaniyat va an’ana',
    subtitle: 'Культура и традиции',
    icon: Globe2,
    gradient: 'from-fuchsia-600 to-pink-800',
    level: 'B2',
    order: 311,
  },
  texnologiya_b2: {
    label: 'Texnologiya',
    subtitle: 'Технологии',
    icon: Cpu,
    gradient: 'from-teal-600 to-emerald-800',
    level: 'B2',
    order: 312,
  },
};

function topicLabel(topic: string): string {
  return TOPIC_META[topic]?.label ?? topic.charAt(0).toUpperCase() + topic.slice(1);
}

function topicSubtitle(topic: string): string {
  return TOPIC_META[topic]?.subtitle ?? 'Mavzu';
}

export default function SpeakingPage() {
  const { token } = useAuth();
  const { access, accessLoaded } = useAccess();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('loading');
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [tasks, setTasks] = useState<SpeakingTask[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const groupedTopics = topics
    .slice()
    .sort((a, b) => {
      const ao = TOPIC_META[a.topic]?.order ?? 9999;
      const bo = TOPIC_META[b.topic]?.order ?? 9999;
      if (ao !== bo) return ao - bo;
      return a.topic.localeCompare(b.topic);
    })
    .reduce<Record<string, SpeakingTopic[]>>((acc, topic) => {
      const level = TOPIC_META[topic.topic]?.level ?? topic.level ?? 'A1';
      if (!acc[level]) acc[level] = [];
      acc[level].push(topic);
      return acc;
    }, {});

  useEffect(() => {
    if (!accessLoaded) return;
    if (!access?.subscription_active) {
      setView('paywall');
      return;
    }
    if (!token) return;
    getSpeakingTopics(token)
      .then((t) => {
        setTopics(t);
        setView('topics');
      })
      .catch(() => setView('topics'));
  }, [accessLoaded, access?.subscription_active, token]);

  const handleSelectTopic = useCallback(
    async (topic: string) => {
      if (!token) return;
      setSelectedTopic(topic);
      try {
        const t = await getSpeakingTasks(token, { topic });
        setTasks(t);
        setView('exercise');
      } catch {
        setView('topics');
      }
    },
    [token]
  );

  const handleFinish = useCallback(() => {
    setView('topics');
    setTasks([]);
    setSelectedTopic(null);
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5 sm:py-8">
        {view !== 'exercise' && (
          <button
            type="button"
            onClick={() => navigate('/russian')}
            className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </button>
        )}

        <AnimatePresence mode="wait">
          {view === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </motion.div>
          )}

          {view === 'paywall' && (
            <motion.div
              key="paywall"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-md"
            >
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <Lock className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  Gapirish mashqini ochish uchun obuna kerak
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Obuna orqali rus tilida gapirish mashqini bajarishingiz mumkin
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/tariflar')}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_12px_32px_rgba(37,99,235,0.4)]"
                >
                  Obunani olish
                </button>
              </div>
            </motion.div>
          )}

          {view === 'topics' && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Gapir</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Mavzuni tanlang va rus tilida tarjima qiling
                </p>
              </div>

              {(['A1', 'A2', 'B1', 'B2'] as const).map((level) => {
                const levelTopics = groupedTopics[level] ?? [];
                if (!levelTopics.length) return null;

                return (
                  <section key={level} className="mb-7 last:mb-0">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-slate-900">
                        {level} daraja
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {levelTopics.length} mavzu
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {levelTopics.map((t) => {
                        const meta = TOPIC_META[t.topic];
                        const Icon = meta?.icon ?? BookOpen;
                        const gradient = meta?.gradient ?? 'from-slate-500 to-slate-600';

                        return (
                          <button
                            key={`${level}-${t.topic}`}
                            type="button"
                            onClick={() => handleSelectTopic(t.topic)}
                            className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-[0_14px_34px_rgba(148,163,184,0.12)] transition-all hover:shadow-[0_18px_44px_rgba(37,99,235,0.15)]"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
                              >
                                <Icon className="h-6 w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-slate-900">
                                  {topicLabel(t.topic)}
                                </h3>
                                <p className="mt-0.5 text-sm text-slate-500">
                                  {topicSubtitle(t.topic)}
                                </p>
                                <p className="mt-1 text-xs font-medium text-slate-400">
                                  {t.count} ta topshiriq
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {topics.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <Mic className="h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-sm text-slate-400">
                    Hozircha topshiriqlar yo'q
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'exercise' && tasks.length > 0 && (
            <motion.div
              key="exercise"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <SpeakingExercise
                tasks={tasks}
                topicLabel={selectedTopic ? topicLabel(selectedTopic) : ''}
                onFinish={handleFinish}
                onBack={handleFinish}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
