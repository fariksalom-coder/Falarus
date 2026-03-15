import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchVocabularyProgress } from '../api/vocabularyProgress';
import {
  fetchVocabularyTopics,
  getCachedTopicsProgress,
  setCachedTopicsProgress,
  type VocabularyTopic,
} from '../api/vocabulary';
import { VOCABULARY_TOPICS } from '../data/vocabularyTopics';
import { getTopicWordCount } from '../data/vocabularyContent';
import { getVocabularyStats } from '../utils/statsHelpers';
import { getVocabDailyStats } from '../utils/vocabDailyStats';
import { getTotalLessonTaskStats } from '../utils/lessonTaskResults';
import { fetchStreak } from '../api/activity';
import {
  Flame,
  MessageCircle,
  Target,
  RefreshCw,
  Award,
} from 'lucide-react';

const BG = '#F8FAFC';
const BORDER = '#E2E8F0';
const PRIMARY = '#6366F1';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const DAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function StatistikaPage() {
  const { token } = useAuth();
  const [topicsProgress, setTopicsProgress] = useState<VocabularyTopic[]>(() =>
    getCachedTopicsProgress() ?? []
  );

  useEffect(() => {
    fetchVocabularyProgress(token);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setTopicsProgress([]);
      return;
    }
    fetchVocabularyTopics(token).then((data) => {
      setTopicsProgress(data);
      setCachedTopicsProgress(data);
    });
  }, [token]);

  const [streak, setStreak] = useState<{ streak_days: number; last_7_days: boolean[] }>({
    streak_days: 0,
    last_7_days: [false, false, false, false, false, false, false],
  });
  useEffect(() => {
    if (!token) return;
    fetchStreak(token).then((data) => {
      if (data) setStreak({ streak_days: data.streak_days, last_7_days: data.last_7_days });
    });
  }, [token]);

  const vocabStats = useMemo(() => getVocabularyStats(), []);
  const totalLearnedFromApi = useMemo(
    () => topicsProgress.reduce((s, t) => s + t.learned_words, 0),
    [topicsProgress]
  );

  const [dailyStats, setDailyStats] = useState(() =>
    getVocabDailyStats(totalLearnedFromApi)
  );
  useEffect(() => {
    setDailyStats(getVocabDailyStats(totalLearnedFromApi));
  }, [totalLearnedFromApi]);

  const lessonStats = useMemo(() => getTotalLessonTaskStats(), []);
  const accuracyPercent = lessonStats.total > 0
    ? Math.round((lessonStats.correct / lessonStats.total) * 100)
    : 0;
  const wrongCount = lessonStats.total - lessonStats.correct;

  const { todayWords, weekWords } = dailyStats;

  const achievements = [
    { done: lessonStats.total > 0, text: "Birinchi dars tugatildi" },
    { done: streak.streak_days >= 7, text: '7 kun ketma-ket' },
    { done: totalLearnedFromApi >= 100, text: "100 ta so'z o'rganildi" },
  ].filter((a) => a.done);

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: BG }}>
      <main className="mx-auto max-w-2xl px-4 pt-6">
        <h1 className="mb-6 text-2xl font-bold" style={{ color: TEXT }}>
          Statistika
        </h1>

        <div className="space-y-4">
          {/* Ketma-ket kunlar */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: TEXT }}>Ketma-ket kunlar</h2>
                <p className="text-2xl font-bold" style={{ color: PRIMARY }}>{streak.streak_days} kun</p>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-1">
              {DAY_LABELS.map((d, i) => {
                const active = streak.last_7_days[i] === true;
                return (
                  <div
                    key={d}
                    className="h-8 flex-1 rounded-lg bg-slate-100"
                    title={d}
                    style={{ backgroundColor: active ? '#22c55e' : undefined, opacity: active ? 0.9 : 0.4 }}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-xs" style={{ color: TEXT_SECONDARY }}>
              Oxirgi 7 kun faoliyat
            </p>
          </div>

          {/* O'rganilgan so'zlar */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>O'rganilgan so'zlar</h2>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>{todayWords}</p>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Bugun</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>{weekWords}</p>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Bu hafta</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>{dailyStats.totalWords}</p>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>Jami</p>
              </div>
            </div>
          </div>

          {/* Javoblar aniqligi */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>Javoblar aniqligi</h2>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <div className="relative h-20 w-20">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="3"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="3"
                    strokeDasharray={`${accuracyPercent}, 100`}
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: TEXT }}>
                  {accuracyPercent}%
                </span>
              </div>
              <div className="text-sm" style={{ color: TEXT_SECONDARY }}>
                <p>{lessonStats.correct} ta to'g'ri</p>
                <p>{wrongCount} ta noto'g'ri</p>
              </div>
            </div>
          </div>

          {/* Bo'limlar progressi — те же данные, что и на странице Lug'at */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>Bo'limlar progressi</h2>
            </div>
            <div className="mt-4 space-y-3">
              {VOCABULARY_TOPICS.map((topic, index) => {
                const fromApi = topicsProgress.find((t) => t.id === topic.id);
                const total = getTopicWordCount(topic.id);
                const learned = fromApi?.learned_words ?? 0;
                const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
                return (
                  <div key={topic.id}>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>
                      {index + 1}-bo&apos;lim
                    </p>
                    <div className="flex justify-between text-sm mt-0.5">
                      <span className="font-semibold" style={{ color: TEXT }}>{topic.title}</span>
                      <span style={{ color: TEXT_SECONDARY }}>{learned} / {total} so&apos;z</span>
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: TEXT_SECONDARY }}>
                      {pct}% o&apos;rganildi
                    </p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: pct >= 50 ? '#14b8a6' : pct >= 20 ? '#f59e0b' : '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Yutuqlar */}
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <Award className="h-5 w-5" />
              </div>
              <h2 className="font-semibold" style={{ color: TEXT }}>Yutuqlar</h2>
            </div>
            <ul className="mt-4 space-y-2">
              {achievements.length > 0 ? (
                achievements.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: TEXT }}>
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    {a.text}
                  </li>
                ))
              ) : (
                <li className="text-sm" style={{ color: TEXT_SECONDARY }}>
                  Hali yutuqlar yo'q
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
