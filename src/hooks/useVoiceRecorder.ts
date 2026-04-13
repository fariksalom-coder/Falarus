import { useState, useRef, useCallback } from 'react';

const MAX_DURATION_MS = 15_000;

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

export function useVoiceRecorder(): VoiceRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopMeters = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
    } else {
      stopStream();
    }
    setIsRecording(false);
    stopMeters();
  }, [stopMeters, stopStream]);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setElapsedSeconds(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stopStream();
      };

      mr.onerror = () => {
        setError("Ovoz yozib bo'lmadi");
        setIsRecording(false);
        stopMeters();
        stopStream();
      };

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const sampleData = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser) return;
        currentAnalyser.getByteTimeDomainData(sampleData);
        let sumSq = 0;
        for (let i = 0; i < sampleData.length; i++) {
          const normalized = (sampleData[i] - 128) / 128;
          sumSq += normalized * normalized;
        }
        const rms = Math.sqrt(sumSq / sampleData.length);
        setAudioLevel(Math.min(1, rms * 6));
        rafRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      mr.start();
      setIsRecording(true);
      startedAtRef.current = Date.now();

      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds(Math.min(15, Math.floor((Date.now() - startedAtRef.current) / 1000)));
      }, 200);

      maxTimerRef.current = setTimeout(() => stopRecording(), MAX_DURATION_MS);
    } catch {
      setError("Mikrofonga ruxsat berilmadi");
      stopMeters();
      stopStream();
    }
  }, [stopMeters, stopRecording, stopStream]);

  const reset = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    setError(null);
    setElapsedSeconds(0);
    setAudioLevel(0);
    chunksRef.current = [];
  }, [stopRecording]);

  return {
    isRecording,
    audioBlob,
    error,
    elapsedSeconds,
    audioLevel,
    startRecording,
    stopRecording,
    reset,
  };
}
