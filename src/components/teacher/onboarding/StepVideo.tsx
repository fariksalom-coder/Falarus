/**
 * 6-qadam: video-taqdimot. Kamerada yozish (savol-yo'riqlar ekranda) yoki faylni yuklash.
 * Davomiylik klientda tekshiriladi (kamida 1 daqiqa), server ffprobe bilan qayta tekshiradi.
 * Yuklash bo'laklab — aloqa uzilsa xuddi shu faylni qayta tanlash davom ettiradi.
 */
import { useEffect, useRef, useState } from 'react';
import { Circle, Loader2, Square, Upload, Video } from 'lucide-react';
import { Card, ErrorNote, GhostButton, PrimaryButton, ProgressBar } from '../panel/ui';
import { VIDEO_MAX_BYTES, VIDEO_MIN_SECONDS } from '../../../../shared/teacherOnboarding';
import { uploadVideo } from '../../../api/teacherOnboarding';
import { resolveAssetUrl } from '../../../api';
import { ONBOARDING_TEXT } from './text';
import type { StepProps } from './OnboardingWizard';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const RECORD_MIME = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) ?? '';

/** Fayl davomiyligi metama'lumotdan; aniqlab bo'lmasa null (server baribir tekshiradi). */
function fileDuration(file: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    v.preload = 'metadata';
    v.onloadedmetadata = () => { const d = v.duration; URL.revokeObjectURL(url); resolve(Number.isFinite(d) ? d : null); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    v.src = url;
  });
}

export default function StepVideo({ state, setState, lang, token, onNext }: StepProps & { onNext: () => void }) {
  const t = ONBOARDING_TEXT[lang];
  const [mode, setMode] = useState<'idle' | 'camera' | 'recorded'>('idle');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recorded, setRecorded] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const current = state.data.video_url ? resolveAssetUrl(state.data.video_url) ?? state.data.video_url : null;

  const stopCamera = () => { stream.current?.getTracks().forEach((tr) => tr.stop()); stream.current = null; };
  useEffect(() => () => { stopCamera(); abort.current?.abort(); if (recorded) URL.revokeObjectURL(recorded.url); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed((Date.now() - started.current) / 1000), 250);
    return () => window.clearInterval(id);
  }, [recording]);

  const openCamera = async () => {
    setError('');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      setMode('camera');
      requestAnimationFrame(() => { if (preview.current) { preview.current.srcObject = stream.current; void preview.current.play(); } });
    } catch {
      setError(t.noCamera);
    }
  };

  const startRec = () => {
    if (!stream.current) return;
    chunks.current = [];
    const rec = new MediaRecorder(stream.current, RECORD_MIME ? { mimeType: RECORD_MIME, videoBitsPerSecond: 1_500_000 } : undefined);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    rec.onstop = () => {
      const seconds = (Date.now() - started.current) / 1000;
      const blob = new Blob(chunks.current, { type: (rec.mimeType || 'video/webm').split(';')[0] });
      stopCamera();
      setRecorded({ blob, url: URL.createObjectURL(blob), seconds });
      setMode('recorded');
    };
    recorder.current = rec;
    started.current = Date.now();
    setElapsed(0);
    rec.start(1000);
    setRecording(true);
  };
  const stopRec = () => { recorder.current?.stop(); setRecording(false); };

  const send = async (blob: Blob, name: string, seconds: number | null) => {
    setError('');
    if (seconds != null && seconds < VIDEO_MIN_SECONDS) { setError(t.videoTooShort); return; }
    if (blob.size > VIDEO_MAX_BYTES) { setError(t.videoHint); return; }
    abort.current = new AbortController();
    setProgress(0);
    try {
      const s = await uploadVideo(token, blob, name, (sent, total) => {
        setProgress(Math.round((sent / total) * 100));
        if (sent === total) setChecking(true);
      }, abort.current.signal);
      setState(s);
      if (recorded) URL.revokeObjectURL(recorded.url);
      setRecorded(null); setMode('idle');
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setProgress(null); setChecking(false);
    }
  };

  const pickFile = async (file?: File) => {
    if (!file) return;
    if (!/^video\/(mp4|quicktime|webm|x-matroska)$/.test(file.type)) { setError(t.videoHint); return; }
    await send(file, file.name, await fileDuration(file));
  };

  const uploading = progress != null;

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-[16px] font-bold text-app-text">{t.videoTitle}</h2>
        <p className="mt-1 text-[13px] text-app-text-muted">{t.videoHint}</p>
      </div>

      <div className="rounded-[16px] bg-app-bg-subtle p-3.5">
        <p className="text-[12.5px] font-semibold text-app-text">{t.videoQuestionsTitle}</p>
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-[13px] text-app-text">{t.videoQuestions.map((q) => <li key={q}>{q}</li>)}</ol>
      </div>

      {mode === 'camera' && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-[18px] bg-black">
            <video ref={preview} muted playsInline className="aspect-video w-full -scale-x-100 object-cover" />
            {recording && (
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[12px] font-bold text-white">
                <Circle className="h-3 w-3 animate-pulse fill-red-500 text-red-500" />{t.videoRecording} · {clock(elapsed)}
              </span>
            )}
          </div>
          {recording && elapsed < VIDEO_MIN_SECONDS && <ProgressBar percent={(elapsed / VIDEO_MIN_SECONDS) * 100} />}
          <div className="flex flex-col gap-2 sm:flex-row">
            {!recording
              ? <PrimaryButton onClick={startRec}><Circle className="mr-1 inline h-4 w-4 fill-current" />{t.videoRecord}</PrimaryButton>
              : <PrimaryButton onClick={stopRec} className="bg-[#C23A3F]"><Square className="mr-1 inline h-4 w-4 fill-current" />{t.videoStop}</PrimaryButton>}
            {!recording && <GhostButton onClick={() => { stopCamera(); setMode('idle'); }}>{t.back}</GhostButton>}
          </div>
        </div>
      )}

      {mode === 'recorded' && recorded && (
        <div className="space-y-3">
          <video src={recorded.url} controls playsInline className="aspect-video w-full rounded-[18px] bg-black" />
          <p className={`text-[13px] font-semibold ${recorded.seconds < VIDEO_MIN_SECONDS ? 'text-[#C23A3F]' : 'text-app-text'}`}>
            {clock(recorded.seconds)}{recorded.seconds < VIDEO_MIN_SECONDS ? ` — ${t.videoTooShort}` : ''}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton disabled={uploading || recorded.seconds < VIDEO_MIN_SECONDS} onClick={() => void send(recorded.blob, `recording-${Date.now()}.${recorded.blob.type.includes('mp4') ? 'mp4' : 'webm'}`, recorded.seconds)}>{t.videoUse}</PrimaryButton>
            <GhostButton disabled={uploading} onClick={() => { URL.revokeObjectURL(recorded.url); setRecorded(null); void openCamera(); }}>{t.videoRetake}</GhostButton>
          </div>
        </div>
      )}

      {mode === 'idle' && (
        <div className="space-y-3">
          {current && (
            <div className="space-y-2">
              <video src={current} controls playsInline preload="metadata" className="aspect-video w-full rounded-[18px] bg-black" />
              {state.data.video_duration_sec ? <p className="text-[13px] font-semibold text-[#17803D]">{t.videoDone(state.data.video_duration_sec)}</p> : null}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {typeof MediaRecorder !== 'undefined' && navigator.mediaDevices?.getUserMedia && (
              <GhostButton tone="dark" disabled={uploading} onClick={() => void openCamera()}><Video className="mr-1 inline h-4 w-4" />{t.videoRecord}</GhostButton>
            )}
            <label className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-app-border-strong bg-app-surface px-4 text-[13px] font-semibold text-app-text active:scale-[0.98] ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
              <Upload className="h-4 w-4" />{current ? t.videoReplace : t.videoUpload}
              <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
          {current && !uploading && <GhostButton onClick={onNext}>{t.next}</GhostButton>}
        </div>
      )}

      {uploading && (
        <div className="space-y-2" role="status">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-app-text">
            <Loader2 className="h-4 w-4 animate-spin" />{checking ? t.videoChecking : t.videoUploading(progress ?? 0)}
          </p>
          <ProgressBar percent={progress ?? 0} />
          <p className="text-[11.5px] text-app-text-muted">{t.videoResumeHint}</p>
        </div>
      )}
      {error && <ErrorNote text={error} />}
    </Card>
  );
}
