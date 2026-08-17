/**
 * DailySpeakingTasksPage — 4-blok (gapirish) TESTIDAN KEYIN ochiladigan
 * qo'shimcha topshiriqlar (`daily_speaking_tasks`).
 *
 * Farqi: bu tarjima emas. Ruscha topshiriq beriladi (o'zbekcha izoh —
 * ixtiyoriy), o'quvchi esa O'Z SO'ZLARI bilan ruscha javob beradi. Etalon
 * javob yo'q va bo'lishi ham mumkin emas — bitta savolga o'nlab to'g'ri javob
 * bor. Shuning uchun baholashni to'liq AI qiladi.
 *
 * Bo'lim faqat gapirish testi bajarilgach ochiladi (`speaking_level`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Lock,
  Mic,
  Pencil,
  SkipForward,
  Square,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import {
  isValidDailyCourseDay,
  SPEAKING_ATTEMPTS_BEFORE_SKIP,
  type DailySpeakingTask,
} from '../../shared/dailyCourseDay';
import {
  checkDailySpeakingTask,
  saveDailySpeakingTaskProgress,
  type SpeakingTaskCheckResult,
} from '../api/kunlikProgress';
import { transcribeSpeakingAudio } from '../api/speaking';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import { kunlikRejaPath } from '../utils/kunlikNavigation';
import { playCorrectSound, playWrongSound } from '../utils/sound';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? '').split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function DailySpeakingTasksPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const { getDay, loaded: kunlikLoaded } = useKunlikProgress();
  const recorder = useVoiceRecorder();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DailySpeakingTask[]>([]);
  const [practiceCount, setPracticeCount] = useState(0);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SpeakingTaskCheckResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  /** Ekranda ko'rsatilgan namuna javob — uni qaytarsa «xato» demasin. */
  const [shownAnswer, setShownAnswer] = useState('');
  const [actionError, setActionError] = useState('');
  const savedRef = useRef(0);

  const load = useCallback(async () => {
    if (!token || !isValidDailyCourseDay(dayNumber)) {
      setLoading(false);
      setError(!token ? t('auth.loginRequired') : t('kunlik.invalidDay'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bundle = await getDailyCourseDay(token, dayNumber);
      const rows = [...(bundle.speakingTasks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      setTasks(rows);
      setPracticeCount((bundle.practice ?? []).length);
      if (rows.length === 0) setError('Bu kunda qo‘shimcha topshiriq yo‘q.');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Ovoz yozib bo'lingach — matnga o'giramiz. */
  useEffect(() => {
    if (!token || !recorder.audioBlob || recorder.isRecording) return;
    let alive = true;
    setTranscribing(true);
    setActionError('');
    void (async () => {
      try {
        const blob = recorder.audioBlob as Blob;
        const base64 = await blobToBase64(blob);
        const text = await transcribeSpeakingAudio(token, base64, dayNumber, blob.type);
        if (alive) setAnswer(String(text ?? '').trim());
      } catch (e) {
        if (alive) setActionError(e instanceof Error ? e.message : 'Ovoz matnga o‘girilmadi');
      } finally {
        if (alive) setTranscribing(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.audioBlob, recorder.isRecording, token, dayNumber]);

  const current = tasks[index];

  const resetTask = () => {
    setAnswer('');
    setDraft('');
    setEditing(false);
    setResult(null);
    setAttempts(0);
    setShownAnswer('');
    setActionError('');
    recorder.reset();
  };

  const handleCheck = async () => {
    if (!current || !answer.trim() || checking) return;
    setChecking(true);
    setActionError('');
    try {
      const next = attempts + 1;
      const r = await checkDailySpeakingTask(
        token,
        dayNumber,
        current.id,
        answer.trim(),
        next,
        shownAnswer,
      );
      setResult(r);
      setAttempts(next);
      if (r.correct_answer?.trim()) setShownAnswer(r.correct_answer.trim());
      if (r.status === 'correct') playCorrectSound();
      else playWrongSound();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Tekshirishda xatolik');
    } finally {
      setChecking(false);
    }
  };

  /**
   * Keyingi topshiriqqa o'tish.
   *
   * To'g'ri javobdan keyin — darrov. Xato bo'lsa: 1-xatoda izoh va maslahat,
   * 2-xatodan keyin AI namuna javobni ko'rsatadi va «O'tkazish» tugmasi
   * chiqadi. Bitta topshiriqda cheksiz tiqilib qolish o'rganishni to'xtatadi.
   */
  const goNext = () => {
    const done = index + 1;
    if (done > savedRef.current) {
      savedRef.current = done;
      void saveDailySpeakingTaskProgress(token, dayNumber, done);
    }
    resetTask();
    setIndex(done);
  };

  const speakingBlockDone = useMemo(() => {
    if (!kunlikLoaded) return false;
    const row = getDay(dayNumber);
    // Gapirish testi tugagan bo'lsa — bu bo'lim ochiladi.
    return practiceCount === 0 || (row.speaking_level ?? 0) >= practiceCount;
  }, [kunlikLoaded, getDay, dayNumber, practiceCount]);

  if (!isValidDailyCourseDay(dayNumber)) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <p className="text-slate-700">Sahifa topilmadi.</p>
      </div>
    );
  }

  if (loading || !kunlikLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
      </div>
    );
  }

  if (!speakingBlockDone) {
    return (
      <div className="min-h-screen bg-app-bg px-4 py-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <main className="mx-auto max-w-[720px] rounded-[20px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <Lock className="h-7 w-7 text-red-400" />
          </div>
          <p className="mt-4 text-xl font-semibold text-slate-900">Bu bo‘lim hali yopiq</p>
          <p className="mt-2 text-sm text-slate-600">
            Avval gapirish testini to‘liq bajaring.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/kunlik-reja/kun/${dayNumber}/gapirish`)}
            className="mt-6 w-full rounded-xl bg-[#0B2A6B] px-5 py-3.5 text-base font-semibold text-white shadow-md"
          >
            Gapirish testiga qaytish
          </button>
        </main>
      </div>
    );
  }

  if (error || tasks.length === 0) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-950">{error ?? t('common.noData')}</p>
          <button
            type="button"
            onClick={() => navigate(kunlikRejaPath(dayNumber))}
            className="mt-4 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
          >
            {t('common.back')}
          </button>
        </main>
      </div>
    );
  }

  // Hammasi bajarildi
  if (!current) {
    return (
      <div className="min-h-screen bg-app-bg px-4 py-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <main className="mx-auto max-w-[720px] rounded-[22px] border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
          <p className="mt-3 text-[19px] font-black text-emerald-900">Topshiriqlar bajarildi!</p>
          <p className="mt-1.5 text-sm font-semibold text-emerald-800">
            {tasks.length} ta topshiriqning barchasiga javob berdingiz.
          </p>
          <button
            type="button"
            onClick={() => navigate(kunlikRejaPath(dayNumber))}
            className="mt-6 w-full rounded-2xl bg-[#12A150] px-5 py-3.5 text-[15px] font-black text-white"
          >
            Kun rejasiga qaytish
          </button>
        </main>
      </div>
    );
  }

  const voiceIdle = !recorder.audioBlob && !recorder.isRecording;
  const passed = result?.status === 'correct';
  // 2 marta xato — namuna javob ko'rsatiladi va «O'tkazish» tugmasi chiqadi.
  const canSkip = Boolean(result) && !passed && attempts >= SPEAKING_ATTEMPTS_BEFORE_SKIP;
  const attemptsLeft = Math.max(0, SPEAKING_ATTEMPTS_BEFORE_SKIP - attempts);

  const retryTask = () => {
    setResult(null);
    setAnswer('');
    setDraft('');
    setEditing(false);
    setActionError('');
    recorder.reset();
  };

  return (
    <div className="min-h-screen bg-app-bg px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="mx-auto max-w-[720px]">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(kunlikRejaPath(dayNumber))}
            aria-label={t('common.back')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-app-text shadow-app-soft ring-1 ring-app-border"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-app-text-muted">
              Kun {dayNumber} · Gapirish topshiriqlari
            </p>
            <p className="mt-0.5 text-[15px] font-black text-app-text">
              {index + 1}/{tasks.length}
            </p>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-app-bg-muted">
          <div
            className="h-full rounded-full bg-[#0B2A6B] transition-all duration-500"
            style={{ width: `${((index + 1) / tasks.length) * 100}%` }}
          />
        </div>

        <div className="mt-4 rounded-[22px] bg-white p-5 shadow-app-soft ring-1 ring-app-border">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-app-text-muted">
            Topshiriq
          </p>
          <p className="mt-2 text-[20px] font-black leading-snug text-app-text">{current.promptRu}</p>
          {current.promptUz ? (
            <p className="mt-2.5 text-[13.5px] font-semibold leading-relaxed text-app-text-muted">
              {current.promptUz}
            </p>
          ) : null}
        </div>

        {/* Ovozli javob */}
        <div className="mt-4 rounded-[22px] bg-white p-5 text-center shadow-app-soft ring-1 ring-app-border">
          {voiceIdle ? (
            <>
              <button
                type="button"
                onClick={() => void recorder.startRecording()}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0B2A6B] text-white shadow-[0_12px_28px_-10px_rgba(11,42,107,0.6)] active:scale-95"
                aria-label="Yozishni boshlash"
              >
                <Mic className="h-8 w-8" strokeWidth={2.2} />
              </button>
              <p className="mt-3 text-[13px] font-bold text-app-text-muted">
                Tugmani bosing va ruscha javob bering
              </p>
            </>
          ) : recorder.isRecording ? (
            <>
              <button
                type="button"
                onClick={() => recorder.stopRecording()}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E5484D] text-white shadow-[0_12px_28px_-10px_rgba(229,72,77,0.6)] active:scale-95"
                aria-label="To‘xtatish"
              >
                <Square className="h-7 w-7" strokeWidth={2.4} />
              </button>
              <p className="mt-3 text-[13px] font-black text-[#E5484D]">
                Yozilmoqda… {recorder.elapsedSeconds}s
              </p>
            </>
          ) : (
            <div className="text-left">
              <p className="text-[11px] font-black uppercase tracking-[0.04em] text-app-text-muted">
                Siz aytdingiz:
              </p>
              {transcribing ? (
                <p className="mt-2 flex items-center gap-2 text-[14px] font-bold text-app-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Matnga o‘girilmoqda…
                </p>
              ) : editing ? (
                <div className="mt-2 space-y-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    className="w-full rounded-[14px] border-2 border-dashed border-app-border bg-white px-3 py-2 text-[14px] font-semibold text-app-text outline-none focus:border-[#0B2A6B]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAnswer(draft.trim());
                        setEditing(false);
                      }}
                      disabled={!draft.trim()}
                      className="rounded-[12px] bg-[#0B2A6B] px-4 py-2 text-[12px] font-black text-white disabled:opacity-50"
                    >
                      Saqlash
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-[12px] border border-app-border bg-white px-4 py-2 text-[12px] font-black text-app-text-muted"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 min-h-10 text-[15px] font-semibold text-app-text">
                  {answer || 'Matn aniqlanmadi. Qayta yozib ko‘ring.'}
                </p>
              )}

              {!transcribing && !editing ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCheck()}
                    disabled={checking || !answer.trim() || Boolean(result)}
                    className="rounded-[14px] bg-[#0B2A6B] px-5 py-3 text-[13px] font-black text-white disabled:opacity-50"
                  >
                    {checking ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Tekshirilmoqda…
                      </span>
                    ) : (
                      'Tekshirish'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(answer);
                      setEditing(true);
                    }}
                    disabled={!answer.trim() || Boolean(result)}
                    className="inline-flex items-center gap-1.5 rounded-[14px] border border-app-border bg-white px-4 py-3 text-[13px] font-black text-app-text-muted disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" /> Tahrirlash
                  </button>
                  <button
                    type="button"
                    onClick={retryTask}
                    className="rounded-[14px] border border-app-border bg-white px-4 py-3 text-[13px] font-black text-app-text-muted"
                  >
                    Qayta yozish
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {recorder.error ? (
            <p className="mt-3 text-[13px] font-bold text-[#D14343]">{recorder.error}</p>
          ) : null}
          {actionError ? (
            <p className="mt-3 text-[13px] font-bold text-[#D14343]">{actionError}</p>
          ) : null}
        </div>

        {/* AI baholashi */}
        {result ? (
          <div
            className={`mt-4 rounded-[22px] border p-5 ${
              passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {passed ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`text-base font-bold ${passed ? 'text-emerald-800' : 'text-red-800'}`}>
                {passed ? "To'g'ri!" : "Noto'g'ri"}
              </span>
              {!passed && attemptsLeft > 0 ? (
                <span className="ml-auto rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-slate-500">
                  Yana {attemptsLeft} urinish
                </span>
              ) : null}
            </div>
            {result.feedback ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{result.feedback}</p>
            ) : null}
            {result.error_explanation && !passed ? (
              <div className="mt-3 rounded-xl bg-white/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Xato</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{result.error_explanation}</p>
              </div>
            ) : null}
            {result.hint && !passed ? (
              <div className="mt-3 rounded-xl bg-white/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maslahat</p>
                <p className="mt-1 text-sm text-slate-700">{result.hint}</p>
              </div>
            ) : null}
            {result.correct_answer && !passed ? (
              <div className="mt-3 rounded-xl bg-white/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Namuna javob
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">{result.correct_answer}</p>
              </div>
            ) : null}

            {canSkip ? (
              <p className="mt-3 text-sm font-semibold text-slate-600">
                Namuna javobni ovoz chiqarib takrorlang, keyin davom eting.
              </p>
            ) : null}

            <div className="mt-4 flex gap-3">
              {passed ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-1 rounded-2xl bg-[#12A150] px-5 py-3 text-sm font-bold text-white"
                >
                  {index + 1 >= tasks.length ? 'Yakunlash' : 'Keyingisi'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={retryTask}
                    className="flex-1 rounded-2xl border border-app-border bg-white px-5 py-3 text-sm font-semibold text-app-text"
                  >
                    Qayta urinish
                  </button>
                  {canSkip ? (
                    <button
                      type="button"
                      onClick={goNext}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0B2A6B] px-5 py-3 text-sm font-bold text-white"
                    >
                      {index + 1 >= tasks.length ? 'Yakunlash' : "O'tkazish"}
                      <SkipForward className="h-4 w-4" />
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
