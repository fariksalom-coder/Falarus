import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ArrowLeft, MessageSquare, Mic, BookOpen } from 'lucide-react';
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

const TOPIC_META: Record<string, { label: string; icon: typeof BookOpen; gradient: string }> = {
  tanishuv: { label: 'Tanishuv', icon: MessageSquare, gradient: 'from-blue-500 to-blue-600' },
  oila: { label: 'Oila', icon: BookOpen, gradient: 'from-purple-500 to-purple-600' },
  xarid: { label: 'Xarid', icon: Mic, gradient: 'from-emerald-500 to-emerald-600' },
};

function topicLabel(topic: string): string {
  return TOPIC_META[topic]?.label ?? topic.charAt(0).toUpperCase() + topic.slice(1);
}

export default function SpeakingPage() {
  const { token } = useAuth();
  const { access, accessLoaded } = useAccess();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('loading');
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [tasks, setTasks] = useState<SpeakingTask[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

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

              <div className="grid gap-4 sm:grid-cols-2">
                {topics.map((t) => {
                  const meta = TOPIC_META[t.topic];
                  const Icon = meta?.icon ?? BookOpen;
                  const gradient = meta?.gradient ?? 'from-slate-500 to-slate-600';

                  return (
                    <button
                      key={t.topic}
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
                            {t.count} ta topshiriq · {t.level}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

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
