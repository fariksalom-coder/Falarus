import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * KAMERAGA YOZISH — oddiy video va dumaloq video xabar uchun.
 *
 * `useVoiceRecorder` faqat mikrofon bilan ishlaydi; bu yerda kamera ham
 * kerak, ustiga jonli ko'rinish (preview) ham chiqarilishi lozim. Shuning
 * uchun oqim (`MediaStream`) tashqariga beriladi — komponent uni
 * `<video>` ga ulaydi.
 *
 * TO'XTATISHDA KAMERA O'CHIRILISHI SHART. Aks holda telefonda kamera
 * chirog'i yonib qolaveradi va foydalanuvchi ilovadan shubhalanadi.
 */

export type VideoRecorderState = {
  isRecording: boolean;
  /** Jonli ko'rinish uchun — `<video srcObject>` ga beriladi. */
  stream: MediaStream | null;
  blob: Blob | null;
  mimeType: string;
  error: string | null;
  elapsedMs: number;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
};

/** Brauzer qo'llab-quvvatlaydigan birinchi formatni tanlaydi. */
function tanlaFormat(): string {
  const nomzodlar = [
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const m of nomzodlar) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

/**
 * @param dumaloq Dumaloq video xabar uchun kvadrat kadr so'raladi — kesilganda
 *   yuz qirqilmasin. Oddiy videoda kadr o'zgartirilmaydi.
 */
export function useVideoRecorder(dumaloq = false): VideoRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const mimeRef = useRef<string>(tanlaFormat());

  const oqimniYop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const taymerniYop = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    chunksRef.current = [];
    try {
      const video: MediaTrackConstraints = dumaloq
        ? { width: { ideal: 480 }, height: { ideal: 480 }, aspectRatio: 1, facingMode: 'user' }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };
      const s = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      streamRef.current = s;
      setStream(s);

      const mime = tanlaFormat();
      mimeRef.current = mime;
      const mr = new MediaRecorder(s, { mimeType: mime });
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        setBlob(new Blob(chunksRef.current, { type: mime }));
        // Yozish tugadi — kamerani DARHOL qo'yib yuboramiz.
        oqimniYop();
      };
      recorderRef.current = mr;
      mr.start();
      setIsRecording(true);

      const boshlandi = Date.now();
      setElapsedMs(0);
      taymerniYop();
      timerRef.current = window.setInterval(() => setElapsedMs(Date.now() - boshlandi), 100);
    } catch (e) {
      oqimniYop();
      const nom = e instanceof Error ? e.name : '';
      setError(
        nom === 'NotAllowedError'
          ? 'Kamera va mikrofonga ruxsat berilmadi'
          : nom === 'NotFoundError'
            ? 'Kamera topilmadi'
            : 'Kamerani ochib bo‘lmadi',
      );
    }
  }, [dumaloq, oqimniYop, taymerniYop]);

  const stop = useCallback(() => {
    taymerniYop();
    setIsRecording(false);
    const mr = recorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    else oqimniYop();
    recorderRef.current = null;
  }, [oqimniYop, taymerniYop]);

  const reset = useCallback(() => {
    stop();
    setBlob(null);
    setError(null);
    setElapsedMs(0);
    chunksRef.current = [];
  }, [stop]);

  // Komponent yopilganda kamera ochiq qolmasin.
  useEffect(() => {
    return () => {
      taymerniYop();
      const mr = recorderRef.current;
      if (mr && mr.state !== 'inactive') {
        mr.ondataavailable = null;
        mr.onstop = null;
        mr.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [taymerniYop]);

  return {
    isRecording,
    stream,
    blob,
    mimeType: mimeRef.current,
    error,
    elapsedMs,
    start,
    stop,
    reset,
  };
}
