import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mic, MicOff, Keyboard, Loader2, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  checkSpeakingAnswer,
  transcribeSpeakingAudio,
  type SpeakingTask,
  type CheckResult,
} from '../../api/speaking';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import SpeakingFeedback from './SpeakingFeedback';

type Props = {
  tasks: SpeakingTask[];
  topicLabel: string;
  onFinish: () => void;
  onBack: () => void;
};

type InputMode = 'choose' | 'text' | 'voice';

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

export default function SpeakingExercise({ tasks, topicLabel, onFinish, onBack }: Props) {
  const { token } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>('choose');
  const [answer, setAnswer] = useState('');
  const [checking, setChecking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');

  const recorder = useVoiceRecorder();
  const task = tasks[currentIdx];
  const progress = ((currentIdx + (result?.status === 'correct' ? 1 : 0)) / tasks.length) * 100;

  const handleCheck = useCallback(
    async (text: string, mode: 'text' | 'voice') => {
      if (!token || !text.trim() || checking) return;
      setChecking(true);
      setError('');
      try {
        const nextAttempt = attempts + 1;
        const r = await checkSpeakingAnswer(token, task.id, text.trim(), mode, nextAttempt);
        setResult(r);
        setAttempts(nextAttempt);
      } catch {
        setError("Tekshirishda xatolik yuz berdi. Qayta urinib ko'ring.");
      } finally {
        setChecking(false);
      }
    },
    [token, task?.id, checking, attempts]
  );

  const handleTextSubmit = useCallback(() => {
    handleCheck(answer, 'text');
  }, [answer, handleCheck]);

  const handleVoiceStop = useCallback(async () => {
    recorder.stopRecording();
  }, [recorder]);

  const handleTranscribeAndCheck = useCallback(async () => {
    if (!token || !recorder.audioBlob) return;
    setTranscribing(true);
    setError('');
    try {
      const base64 = await blobToBase64(recorder.audioBlob);
      const text = await transcribeSpeakingAudio(token, base64);
      setAnswer(text);
      await handleCheck(text, 'voice');
    } catch {
      setError("Ovozni tanib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setTranscribing(false);
    }
  }, [token, recorder.audioBlob, handleCheck]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= tasks.length) {
      onFinish();
      return;
    }
    setCurrentIdx((i) => i + 1);
    setAnswer('');
    setResult(null);
    setAttempts(0);
    setInputMode('choose');
    setError('');
    recorder.reset();
  }, [currentIdx, tasks.length, onFinish, recorder]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setAnswer('');
    setError('');
    recorder.reset();
  }, [recorder]);

  if (!task) return null;

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{topicLabel}</p>
          <p className="text-xs text-slate-500">
            {currentIdx + 1} / {tasks.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Task card */}
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Tarjima qiling
        </p>
        <p className="text-xl font-bold leading-relaxed text-slate-900">{task.uz_text}</p>
      </div>

      {/* Input area */}
      <div className="mt-5">
        {inputMode === 'choose' && !result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <Keyboard className="h-6 w-6 text-blue-600" />
              Yozma javob
            </button>
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <Mic className="h-6 w-6 text-blue-600" />
              Ovozli javob
            </button>
          </motion.div>
        )}

        {inputMode === 'text' && !result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex gap-2">
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
                autoFocus
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleTextSubmit}
                disabled={checking || !answer.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-700 disabled:opacity-40"
              >
                {checking ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setInputMode('choose')}
              className="mt-2 text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              Ovozli javobga o'tish
            </button>
          </motion.div>
        )}

        {inputMode === 'voice' && !result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {!recorder.audioBlob ? (
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={recorder.isRecording ? handleVoiceStop : recorder.startRecording}
                  className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                    recorder.isRecording
                      ? 'bg-red-500 shadow-[0_0_0_8px_rgba(239,68,68,0.2)] animate-pulse'
                      : 'bg-blue-600 shadow-[0_8px_24px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_32px_rgba(37,99,235,0.4)]'
                  }`}
                >
                  {recorder.isRecording ? (
                    <MicOff className="h-8 w-8 text-white" />
                  ) : (
                    <Mic className="h-8 w-8 text-white" />
                  )}
                </button>
                <p className="text-sm text-slate-500">
                  {recorder.isRecording
                    ? "Yozib olinmoqda... Tugatish uchun bosing"
                    : "Bosib gapiring (max 15 soniya)"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-medium text-slate-700">Ovoz yozib olindi</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      recorder.reset();
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Qayta yozish
                  </button>
                  <button
                    type="button"
                    onClick={handleTranscribeAndCheck}
                    disabled={transcribing || checking}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-700 disabled:opacity-50"
                  >
                    {transcribing || checking ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Tekshirilmoqda...
                      </span>
                    ) : (
                      'Tekshirish'
                    )}
                  </button>
                </div>
              </div>
            )}
            {recorder.error && (
              <p className="mt-3 text-sm text-red-500">{recorder.error}</p>
            )}
            <button
              type="button"
              onClick={() => {
                recorder.reset();
                setInputMode('choose');
              }}
              className="mt-3 text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              Yozma javobga o'tish
            </button>
          </motion.div>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-4">
            {answer && (
              <p className="mb-3 text-sm text-slate-500">
                Sizning javobingiz:{' '}
                <span className="font-medium text-slate-700">{answer}</span>
              </p>
            )}
            <SpeakingFeedback
              result={result}
              attempts={attempts}
              onNext={handleNext}
              onRetry={handleRetry}
            />
          </div>
        )}
      </div>
    </div>
  );
}
