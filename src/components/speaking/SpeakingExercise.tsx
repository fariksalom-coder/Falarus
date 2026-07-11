import { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mic, Loader2, Send, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  checkSpeakingAnswer,
  checkSpeakingPromptAnswer,
  isPassingStatus,
  transcribeSpeakingAudio,
  type SpeakingTask,
  type CheckResult,
} from '../../api/speaking';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import SpeakingFeedback from './SpeakingFeedback';
import { playCorrectSound } from '../../utils/sound';

type Props = {
  tasks: SpeakingTask[];
  topicLabel: string;
  onFinish: () => void;
  onBack: () => void;
  /** `speaking_tasks` id o‘rniga `uz_text` / `ru_correct` bilan tekshirish (kunlik topshiriqlar) */
  useInlineCheck?: boolean;
  /** Tashqi sahifada allaqachon «Orqaga» bo‘lsa, ichki sarlavhani yashirish */
  embedded?: boolean;
  /** Kunlik: DB dagi `speaking_level` — tugallangan topshiruvlar soni (keyingi topshiruv indeksi) */
  initialResumeIndex?: number;
  /** Kunlik kun raqami — obunasiz 1–2-kunlar uchun AI tekshiruvi */
  kunlikDayNumber?: number;
  /** To‘g‘ri javobdan keyin «Keyingisi» bosilganda (oxirgisidan oldin) */
  onCheckpoint?: (completedTasksCount: number) => void;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatTimer(seconds: number): string {
  return `0:${String(seconds).padStart(2, '0')}`;
}

export default function SpeakingExercise({
  tasks,
  topicLabel,
  onFinish,
  onBack,
  useInlineCheck = false,
  embedded = false,
  initialResumeIndex = 0,
  kunlikDayNumber,
  onCheckpoint,
}: Props) {
  const { token } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(() => {
    if (tasks.length === 0) return 0;
    return Math.max(0, Math.min(initialResumeIndex, tasks.length - 1));
  });
  const [answer, setAnswer] = useState('');
  const [checking, setChecking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isVoiceEditing, setIsVoiceEditing] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');

  const recorder = useVoiceRecorder();
  const task = tasks[currentIdx];
  const progress = ((currentIdx + (result && isPassingStatus(result.status) ? 1 : 0)) / tasks.length) * 100;

  useEffect(() => {
    let cancelled = false;

    async function transcribe() {
      if (!token || !recorder.audioBlob || recorder.isRecording) return;
      setTranscribing(true);
      setError('');
      try {
        const base64 = await blobToBase64(recorder.audioBlob);
        const text = await transcribeSpeakingAudio(token, base64, kunlikDayNumber);
        if (!cancelled) {
          const normalized = text.trim();
          setVoiceText(normalized);
          setVoiceDraft(normalized);
          setIsVoiceEditing(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message
              ? err.message
              : "Ovozni tanib bo'lmadi. Qayta urinib ko'ring.",
          );
        }
      } finally {
        if (!cancelled) {
          setTranscribing(false);
        }
      }
    }

    void transcribe();
    return () => {
      cancelled = true;
    };
  }, [token, recorder.audioBlob, recorder.isRecording, kunlikDayNumber]);

  const handleCheck = useCallback(
    async (text: string, mode: 'text' | 'voice') => {
      if (!token || !text.trim() || checking) return;
      setChecking(true);
      setError('');
      try {
        const nextAttempt = attempts + 1;
        const r = useInlineCheck
          ? await checkSpeakingPromptAnswer(
              token,
              text.trim(),
              task.uz_text,
              task.ru_correct,
              mode,
              nextAttempt,
              kunlikDayNumber
            )
          : await checkSpeakingAnswer(token, task.id, text.trim(), mode, nextAttempt);
        setResult(r);
        setAttempts(nextAttempt);
        if (isPassingStatus(r.status)) {
          playCorrectSound();
        }
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Tekshirishda xatolik yuz berdi. Qayta urinib ko'ring.",
        );
      } finally {
        setChecking(false);
      }
    },
    [token, task?.id, task?.uz_text, task?.ru_correct, useInlineCheck, kunlikDayNumber, checking, attempts]
  );

  const handleTextSubmit = useCallback(() => {
    handleCheck(answer, 'text');
  }, [answer, handleCheck]);

  const handleVoiceCheck = useCallback(() => {
    const text = voiceText.trim();
    if (!text) return;
    setAnswer(text);
    void handleCheck(text, 'voice');
  }, [voiceText, handleCheck]);

  const handleStartVoiceEdit = useCallback(() => {
    setVoiceDraft(voiceText);
    setIsVoiceEditing(true);
  }, [voiceText]);

  const handleSaveVoiceEdit = useCallback(() => {
    const normalized = voiceDraft.trim();
    setVoiceText(normalized);
    setIsVoiceEditing(false);
  }, [voiceDraft]);

  const handleCancelVoiceEdit = useCallback(() => {
    setVoiceDraft(voiceText);
    setIsVoiceEditing(false);
  }, [voiceText]);

  const handleStartVoice = useCallback(() => {
    setVoiceText('');
    setVoiceDraft('');
    setIsVoiceEditing(false);
    setError('');
    void recorder.startRecording();
  }, [recorder]);

  const handleResetVoice = useCallback(() => {
    setVoiceText('');
    setVoiceDraft('');
    setIsVoiceEditing(false);
    setError('');
    recorder.reset();
  }, [recorder]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= tasks.length) {
      onFinish();
      return;
    }
    if (result && isPassingStatus(result.status)) {
      onCheckpoint?.(currentIdx + 1);
    }
    setCurrentIdx((i) => i + 1);
    setAnswer('');
    setVoiceText('');
    setVoiceDraft('');
    setIsVoiceEditing(false);
    setResult(null);
    setAttempts(0);
    setError('');
    recorder.reset();
  }, [currentIdx, tasks.length, onFinish, onCheckpoint, recorder, result?.status]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setAnswer('');
    setError('');
    recorder.reset();
  }, [recorder]);

  if (!task) return null;

  const voiceIdle = !recorder.audioBlob && !recorder.isRecording;
  const voiceRecording = recorder.isRecording;
  const voiceReady = Boolean(recorder.audioBlob) && !recorder.isRecording;

  return (
    <div className="mx-auto max-w-[720px]">
      {/* Header row: back tile + topic + counter */}
      {!embedded ? (
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-[#0B2A6B] shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold text-app-text">{topicLabel}</p>
          </div>
          <span className="rounded-full bg-[#EAF1FB] px-3 py-1 text-[12px] font-black text-[#0B2A6B]">
            {currentIdx + 1}/{tasks.length}
          </span>
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.06em] text-app-text-muted">{topicLabel}</p>
          <span className="rounded-full bg-[#EAF1FB] px-3 py-1 text-[12px] font-black text-[#0B2A6B]">
            {currentIdx + 1}/{tasks.length}
          </span>
        </div>
      )}

      {/* Progress bar (navy) */}
      <div className="h-3 overflow-hidden rounded-full bg-[#E4EAF3]">
        <motion.div
          className="h-full rounded-full bg-[#0B2A6B]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Caption above phrase card */}
      <p className="mt-5 text-[12px] font-black uppercase tracking-[0.04em] text-app-text-muted">
        Ruschaga tarjima qiling
      </p>

      {/* Navy phrase card with speaker emoji */}
      <div
        className="relative mt-3 overflow-hidden rounded-[24px] p-6 text-white shadow-[0_18px_36px_-14px_rgba(11,42,107,0.55)]"
        style={{ background: 'linear-gradient(165deg, #12357F, #0B2A6B)' }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-[110px] w-[110px] rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div className="relative flex flex-col items-center text-center">
          <span className="text-[34px] leading-none" aria-hidden>🗣️</span>
          <p className="mt-3 text-[26px] font-black leading-tight tracking-[-0.01em] sm:text-[30px]">
            {task.uz_text}
          </p>
        </div>
      </div>

      {/* Dashed text input */}
      {!result && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
                placeholder="Ruscha tarjimani yozing..."
                className="w-full rounded-[20px] border-2 border-dashed border-[#C4D6EC] bg-white px-5 py-4 text-[16px] font-semibold text-app-text placeholder:text-[#9AA9C4] outline-none transition-colors focus:border-[#0B2A6B] focus:ring-4 focus:ring-[#EAF1FB]"
              />
            </div>
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={checking || !answer.trim()}
              aria-label="Yuborish"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#0B2A6B] text-white shadow-[0_12px_24px_-10px_rgba(11,42,107,0.55)] transition-all hover:bg-[#071B5E] disabled:opacity-40 active:scale-[0.98]"
            >
              {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>

          {/* "— yoki —" divider */}
          <div className="my-5 flex items-center justify-center gap-2">
            <span className="text-[13px] font-bold text-app-text-muted">— yoki —</span>
          </div>

          {/* Voice section */}
          <div className="flex flex-col items-center text-center">
            {voiceIdle && (
              <>
                <button
                  type="button"
                  onClick={handleStartVoice}
                  className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#EEF3FF] text-[46px] shadow-[0_0_0_10px_rgba(238,243,255,0.6)] transition-all hover:shadow-[0_0_0_14px_rgba(238,243,255,0.75)] active:scale-[0.98]"
                  aria-label="Ovozli javob"
                >
                  <span aria-hidden>🎤</span>
                </button>
                <p className="mt-4 text-[16px] font-black text-[#0B2A6B]">Ovozli javob</p>
                <p className="mt-0.5 text-[13px] font-bold text-app-text-muted">Bosib ushlab turing va gapiring</p>
              </>
            )}

            {voiceRecording && (
              <>
                <motion.button
                  type="button"
                  onClick={recorder.stopRecording}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#0B2A6B] text-white shadow-[0_14px_28px_-10px_rgba(11,42,107,0.55)]"
                >
                  <Mic className="h-9 w-9" />
                </motion.button>

                <div className="mt-4 flex items-end justify-center gap-1.5">
                  {[0.6, 0.9, 1.2, 0.9, 0.6].map((mult, idx) => {
                    const height = Math.max(8, 8 + recorder.audioLevel * 26 * mult);
                    return (
                      <motion.span
                        key={idx}
                        className="w-1.5 rounded-full bg-[#3B6FE0]"
                        animate={{ height }}
                        transition={{ duration: 0.18 }}
                        style={{ height: 10 }}
                      />
                    );
                  })}
                </div>
                <p className="mt-3 text-[14px] font-black text-[#0B2A6B]">
                  Gapiryapsiz... {formatTimer(recorder.elapsedSeconds)}
                </p>
                <p className="text-[12px] font-bold text-app-text-muted">To'xtatish uchun mikrofonni bosing</p>
              </>
            )}

            {voiceReady && (
              <div className="w-full">
                {transcribing ? (
                  <div className="flex flex-col items-center gap-2 rounded-[20px] border border-[#EAEFF7] bg-white p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-[#0B2A6B]" />
                    <p className="text-[13px] font-semibold text-app-text-muted">Ovoz matnga aylantirilmoqda...</p>
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-[#EAEFF7] bg-white p-4 text-left">
                    <p className="text-[11px] font-black uppercase tracking-[0.04em] text-app-text-muted">Siz aytdingiz:</p>
                    {isVoiceEditing ? (
                      <div className="mt-2 space-y-3">
                        <textarea
                          value={voiceDraft}
                          onChange={(e) => setVoiceDraft(e.target.value)}
                          rows={3}
                          className="w-full rounded-[14px] border-2 border-dashed border-[#C4D6EC] bg-white px-3 py-2 text-[14px] font-semibold text-app-text outline-none transition-colors focus:border-[#0B2A6B]"
                          placeholder="Matnni tahrirlang..."
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveVoiceEdit}
                            disabled={!voiceDraft.trim()}
                            className="rounded-[12px] bg-[#0B2A6B] px-4 py-2 text-[12px] font-black text-white transition-colors hover:bg-[#071B5E] disabled:opacity-50"
                          >
                            Saqlash
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelVoiceEdit}
                            className="rounded-[12px] border border-[#DCE6F3] bg-white px-4 py-2 text-[12px] font-black text-app-text-muted transition-colors hover:bg-[#F5F7FB]"
                          >
                            Bekor qilish
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 min-h-10 text-[15px] font-semibold text-app-text">
                        {voiceText || "Matn aniqlanmadi. Qayta yozib ko'ring."}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleVoiceCheck}
                    disabled={checking || transcribing || isVoiceEditing || !voiceText.trim()}
                    className="rounded-[14px] bg-[#0B2A6B] px-5 py-3 text-[13px] font-black text-white shadow-[0_10px_20px_-8px_rgba(11,42,107,0.55)] transition-all hover:bg-[#071B5E] disabled:opacity-50"
                  >
                    {checking ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Tekshirilmoqda...
                      </span>
                    ) : (
                      'Tekshirish'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartVoiceEdit}
                    disabled={transcribing || isVoiceEditing || !voiceText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-[14px] border border-[#DCE6F3] bg-white px-4 py-3 text-[13px] font-black text-app-text-muted transition-colors hover:bg-[#F5F7FB] disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    onClick={handleResetVoice}
                    className="rounded-[14px] border border-[#DCE6F3] bg-white px-4 py-3 text-[13px] font-black text-app-text-muted transition-colors hover:bg-[#F5F7FB]"
                  >
                    Qayta yozish
                  </button>
                </div>
              </div>
            )}

            {recorder.error && (
              <p className="mt-3 text-[13px] font-bold text-[#D14343]">{recorder.error}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-[14px] bg-[#FFEDED] px-4 py-2.5 text-[13px] font-black text-[#D14343]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5">
          {answer && (
            <p className="mb-3 text-[13px] font-semibold text-app-text-muted">
              Sizning javobingiz:{' '}
              <span className="font-black text-app-text">{answer}</span>
            </p>
          )}
          <SpeakingFeedback
            result={result}
            attempts={attempts}
            referenceAnswer={task.ru_correct}
            onNext={handleNext}
            onRetry={handleRetry}
          />
        </div>
      )}
    </div>
  );
}
