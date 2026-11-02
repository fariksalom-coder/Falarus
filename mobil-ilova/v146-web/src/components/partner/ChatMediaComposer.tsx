import { useEffect, useRef } from 'react';
import { Check, Mic, Square, Video, X } from 'lucide-react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useVideoRecorder } from '../../hooks/useVideoRecorder';

/**
 * YOZIB OLISH OYNASI — ovozli xabar va dumaloq video xabar uchun.
 *
 * Ikkalasi bitta oynada, chunki oqim bir xil: yozamiz → to'xtatamiz →
 * ko'rib chiqamiz → yuboramiz yoki bekor qilamiz. Farqi faqat manbada
 * (mikrofon yoki kamera) va ko'rinishda.
 *
 * BEKOR QILISH HAM, YOPISH HAM qurilmani qo'yib yuboradi — mikrofon yoki
 * kamera chirog'i yonib qolmasin.
 */

function vaqt(ms: number): string {
  const jami = Math.round(ms / 1000);
  return `${Math.floor(jami / 60)}:${String(jami % 60).padStart(2, '0')}`;
}

/** Ovozli xabar yozish. */
function OvozYozish({
  onYubor,
  onYop,
}: {
  onYubor: (blob: Blob, ms: number) => void;
  onYop: () => void;
}) {
  const r = useVoiceRecorder();
  const boshlandiRef = useRef(false);

  // Oyna ochilishi bilan darhol yozishni boshlaymiz — ortiqcha bosish bo'lmasin.
  useEffect(() => {
    if (boshlandiRef.current) return;
    boshlandiRef.current = true;
    void r.startRecording();
    return () => r.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ms = r.elapsedSeconds * 1000;

  return (
    <div className="flex flex-col items-center gap-5 px-6 py-7">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Ovoz balandligiga qarab kengayadigan halqa. */}
        <span
          className="absolute rounded-full bg-[#0EA5A5]/25 transition-all duration-100"
          style={{ width: `${64 + r.audioLevel * 44}px`, height: `${64 + r.audioLevel * 44}px` }}
        />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0EA5A5] text-white">
          <Mic className="h-7 w-7" />
        </span>
      </div>

      <p className="text-[22px] font-black tabular-nums text-pmn-text">{vaqt(ms)}</p>
      {r.error ? <p className="text-[13px] font-semibold text-red-600">{r.error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            r.reset();
            onYop();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/10 text-pmn-text"
          aria-label="Bekor qilish"
        >
          <X className="h-5 w-5" />
        </button>

        {r.isRecording ? (
          <button
            type="button"
            onClick={() => r.stopRecording()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white"
            aria-label="To'xtatish"
          >
            <Square className="h-5 w-5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!r.audioBlob}
            onClick={() => {
              if (r.audioBlob) onYubor(r.audioBlob, ms);
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0EA5A5] text-white disabled:opacity-40"
            aria-label="Yuborish"
          >
            <Check className="h-6 w-6" />
          </button>
        )}
      </div>

      <p className="text-center text-[12px] text-pmn-text-muted">
        {r.isRecording ? 'Tugatish uchun to‘rtburchakni bosing' : 'Yuborish uchun belgini bosing'}
      </p>
    </div>
  );
}

/** Dumaloq video xabar yozish. */
function DumaloqYozish({
  onYubor,
  onYop,
}: {
  onYubor: (blob: Blob, ms: number, mime: string) => void;
  onYop: () => void;
}) {
  const r = useVideoRecorder(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const boshlandiRef = useRef(false);
  const oxirgiMsRef = useRef(0);

  useEffect(() => {
    if (boshlandiRef.current) return;
    boshlandiRef.current = true;
    void r.start();
    return () => r.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jonli ko'rinishni `<video>` ga ulaymiz.
  useEffect(() => {
    const v = videoRef.current;
    if (v && r.stream) {
      v.srcObject = r.stream;
      void v.play().catch(() => {});
    }
  }, [r.stream]);

  if (r.isRecording) oxirgiMsRef.current = r.elapsedMs;

  const korish = r.blob ? URL.createObjectURL(r.blob) : null;
  useEffect(() => () => { if (korish) URL.revokeObjectURL(korish); }, [korish]);

  return (
    <div className="flex flex-col items-center gap-5 px-6 py-7">
      <div className="relative h-[220px] w-[220px] overflow-hidden rounded-full bg-black ring-4 ring-[#0EA5A5]/30">
        {r.blob && korish ? (
          <video src={korish} controls playsInline className="h-full w-full object-cover" />
        ) : (
          // Old kamera — o'zini ko'rgan odam oynadagidek ko'rishi uchun aks ettiriladi.
          <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
        )}
      </div>

      <p className="text-[22px] font-black tabular-nums text-pmn-text">
        {vaqt(r.isRecording ? r.elapsedMs : oxirgiMsRef.current)}
      </p>
      {r.error ? <p className="text-center text-[13px] font-semibold text-red-600">{r.error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            r.reset();
            onYop();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/10 text-pmn-text"
          aria-label="Bekor qilish"
        >
          <X className="h-5 w-5" />
        </button>

        {r.isRecording ? (
          <button
            type="button"
            onClick={() => r.stop()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white"
            aria-label="To'xtatish"
          >
            <Square className="h-5 w-5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!r.blob}
            onClick={() => {
              if (r.blob) onYubor(r.blob, oxirgiMsRef.current, r.mimeType);
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0EA5A5] text-white disabled:opacity-40"
            aria-label="Yuborish"
          >
            <Check className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}

export type ComposerRejim = 'voice' | 'video_note';

export default function ChatMediaComposer({
  rejim,
  onYop,
  onOvoz,
  onVideo,
}: {
  rejim: ComposerRejim;
  onYop: () => void;
  onOvoz: (blob: Blob, ms: number) => void;
  onVideo: (blob: Blob, ms: number, mime: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-[24px] bg-pmn-card sm:rounded-[24px]">
        <div className="flex items-center justify-between border-b border-pmn-border px-5 py-3">
          <span className="inline-flex items-center gap-2 text-[14px] font-black text-pmn-text">
            {rejim === 'voice' ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            {rejim === 'voice' ? 'Ovozli xabar' : 'Dumaloq video'}
          </span>
          <button
            type="button"
            onClick={onYop}
            className="rounded-lg p-1.5 text-pmn-text-muted"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {rejim === 'voice' ? (
          <OvozYozish onYubor={onOvoz} onYop={onYop} />
        ) : (
          <DumaloqYozish onYubor={onVideo} onYop={onYop} />
        )}
      </div>
    </div>
  );
}
