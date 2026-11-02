import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceRecorderState = {
  isRecording: boolean;
  audioBlob: Blob | null;
  error: string | null;
  elapsedSeconds: number;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
};

type Session = {
  recorder: MediaRecorder | null;
  stream: MediaStream | null;
  context: AudioContext | null;
  timers: ReturnType<typeof setTimeout>[];
  cancelled: boolean;
};

export function useVoiceRecorder(maxDurationMs = 15_000): VoiceRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const sessionRef = useRef<Session | null>(null);

  const release = useCallback((session: Session) => {
    session.timers.forEach(clearTimeout);
    session.timers = [];
    session.stream?.getTracks().forEach(t => t.stop());
    session.stream = null;
    void session.context?.close().catch(() => {});
    session.context = null;
  }, []);

  const cancel = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    session.cancelled = true;
    if (session.recorder?.state !== 'inactive') {
      try { session.recorder?.stop(); } catch { /* already stopped */ }
    }
    release(session);
  }, [release]);

  useEffect(() => cancel, [cancel]);

  const stopRecording = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    if (!session.recorder) { cancel(); setIsRecording(false); return; }
    session.timers.forEach(clearTimeout);
    session.timers = [];
    // Keep this session owned until its final dataavailable + stop events arrive.
    if (session.recorder.state !== 'inactive') session.recorder.stop();
    setAudioLevel(0);
  }, [cancel]);

  const startRecording = useCallback(async () => {
    if (sessionRef.current) return;
    const session: Session = { recorder: null, stream: null, context: null, timers: [], cancelled: false };
    sessionRef.current = session;
    setError(null); setAudioBlob(null); setElapsedSeconds(0); setAudioLevel(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1,
      } });
      session.stream = stream;
      if (session.cancelled) { release(session); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      session.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (!session.cancelled && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        release(session);
        if (sessionRef.current !== session || session.cancelled) return;
        sessionRef.current = null;
        setIsRecording(false); setAudioLevel(0);
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || chunks[0]?.type });
        if (blob.size) setAudioBlob(blob);
        else setError("Ovoz yozilmadi. Qayta urinib ko'ring.");
      };
      recorder.onerror = () => {
        if (sessionRef.current !== session) return;
        cancel(); setIsRecording(false); setAudioLevel(0); setError("Ovoz yozib bo'lmadi");
      };
      recorder.start(1000);
      setIsRecording(true);
      const startedAt = Date.now();
      session.timers.push(setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500));
      session.timers.push(setTimeout(stopRecording, maxDurationMs));
      // A meter is optional; its failure must never discard a valid recording.
      try {
        const context = new AudioContext();
        session.context = context;
        void context.resume().catch(() => {});
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        session.timers.push(setInterval(() => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const value of data) sum += ((value - 128) / 128) ** 2;
          setAudioLevel(Math.min(1, Math.sqrt(sum / data.length) * 6));
        }, 100));
      } catch { /* microphone recording continues without a meter */ }
    } catch (err) {
      release(session);
      if (sessionRef.current !== session || session.cancelled) return;
      sessionRef.current = null;
      setIsRecording(false);
      setError(err instanceof DOMException && err.name === 'NotAllowedError'
        ? "Mikrofonga ruxsat berilmadi" : "Mikrofonni ochib bo'lmadi. Qayta urinib ko'ring.");
    }
  }, [cancel, maxDurationMs, release, stopRecording]);

  const reset = useCallback(() => {
    cancel(); setIsRecording(false); setAudioBlob(null); setError(null); setElapsedSeconds(0); setAudioLevel(0);
  }, [cancel]);

  return { isRecording, audioBlob, error, elapsedSeconds, audioLevel, startRecording, stopRecording, reset };
}
