/**
 * UstozdanSora — grammatika bo'limidagi "Ustozdan so'ra" kartasi.
 *
 * Oqim: o'quvchi kunning rus gapini ovoz bilan o'qiydi -> ustoz o'qishni
 * baholaydi (aniqlik + xatolar) va AYNAN shu gapning qoidasini misollar bilan
 * tushuntiradi.
 *
 * Gaplar kunning o'z materialidan olinadi (gap tuzish mashqlari), ya'ni
 * o'quvchi bugungi mavzuni mashq qiladi — tasodifiy matn emas.
 *
 * GAPLAR KETMA-KET BAJARILADI. Ilgari "Boshqa gap" tugmasi ro'yxat bo'ylab
 * AYLANARDI (`(i + 1) % length`): nechta gap borligi, qaysi biri qolgani va
 * qachon tugagani ko'rinmasdi — vazifa hech qachon "bajarildi" bo'lmasdi.
 * Endi gaplar tartib bilan yuriladi, oxirida esa yakun ekrani chiqadi va
 * o'quvchi keyingi bosqichga o'tadi.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  Square,
  RotateCcw,
  ChevronRight,
  GraduationCap,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { checkReading, type ReadingFeedback } from '../../api/ustoz';

export type UstozSentence = { ru: string; uz?: string };

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const DARAJA_STYLE: Record<ReadingFeedback['daraja'], { label: string; ring: string; chip: string }> = {
  zor: { label: 'Zo\'r', ring: '#22A552', chip: 'bg-[#E7F7ED] text-[#177A3C]' },
  yaxshi: { label: 'Yaxshi', ring: '#2563EB', chip: 'bg-[#E8F0FE] text-[#1D4ED8]' },
  qoniqarli: { label: 'Qoniqarli', ring: '#F59E0B', chip: 'bg-[#FEF3E2] text-[#B45309]' },
  yomon: { label: 'Yana mashq kerak', ring: '#EF4444', chip: 'bg-[#FDECEC] text-[#B91C1C]' },
};

function AniqlikRing({ value, color }: { value: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#EDE9FB" strokeWidth="6" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * Math.min(100, Math.max(0, value))) / 100 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-black text-[#2D1B69]">
        {value}
      </span>
    </div>
  );
}

export default function UstozdanSora({
  sentences,
  onTugadi,
  keyingiNomi,
}: {
  sentences: UstozSentence[];
  /** Barcha gaplar o'qilgach keyingi bosqichga o'tkazadi. */
  onTugadi?: () => void;
  /** Keyingi bosqichning nomi — yakundagi tugmada ko'rinadi. */
  keyingiNomi?: string;
}) {
  const { token } = useAuth();
  const recorder = useVoiceRecorder();
  const [index, setIndex] = useState(0);
  const [tugadi, setTugadi] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<ReadingFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = sentences[index];
  const oxirgi = index >= sentences.length - 1;

  // Yozuv tugagach avtomatik yuboriladi — o'quvchi ortiqcha tugma bosmasin.
  useEffect(() => {
    let cancelled = false;
    async function send() {
      if (!token || !recorder.audioBlob || recorder.isRecording || !current) return;
      setChecking(true);
      setError(null);
      try {
        const audioBase64 = await blobToBase64(recorder.audioBlob);
        const res = await checkReading(token, {
          referenceText: current.ru,
          referenceUz: current.uz,
          audioBase64,
          mimeType: recorder.audioBlob.type || 'audio/webm',
        });
        if (!cancelled) setFeedback(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ustoz javob bermadi. Qayta urinib ko'ring.");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void send();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, recorder.audioBlob, recorder.isRecording]);

  const style = useMemo(
    () => (feedback ? DARAJA_STYLE[feedback.daraja] : DARAJA_STYLE.yaxshi),
    [feedback],
  );

  if (!current) return null;

  function qaytaOqish() {
    recorder.reset();
    setFeedback(null);
    setError(null);
  }

  function keyingiGap() {
    if (oxirgi) {
      setTugadi(true);
      return;
    }
    setIndex((i) => i + 1);
    qaytaOqish();
  }

  function boshidan() {
    setIndex(0);
    setTugadi(false);
    qaytaOqish();
  }

  /* ---------- Yakun: barcha gaplar o'qildi ---------- */
  if (tugadi) {
    return (
      <div className="rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] p-5 text-center shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F7ED] text-[#177A3C]">
          <CheckCircle2 size={24} />
        </span>
        <p className="mt-2.5 text-[15px] font-black text-[#2D1B69]">Barcha gaplar o'qildi</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5C5470]">
          {sentences.length} ta gapni ustoz bilan mashq qildingiz.
        </p>

        {onTugadi ? (
          <button
            type="button"
            onClick={onTugadi}
            className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[15px] font-bold text-white transition active:scale-[0.98]"
          >
            {keyingiNomi ? `Davom etish: ${keyingiNomi}` : 'Davom etish'}
            <ArrowRight size={17} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={boshidan}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 text-[14px] font-bold text-[#5B3FA8] transition active:scale-[0.98] ${
            onTugadi ? 'mt-2.5' : 'mt-4 bg-[#F3F0FC]'
          }`}
        >
          <RotateCcw size={16} /> Qaytadan o'qish
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#DDD7F5] bg-[color:var(--rd-white)] p-4 shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)] sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full"
        style={{ background: 'rgba(139,127,171,0.12)' }}
      />

      <div className="relative flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EDE9FB] text-[#5B3FA8]">
          <GraduationCap size={18} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black leading-tight text-[#2D1B69]">Ustozdan so'ra</p>
          <p className="text-[12px] leading-tight text-[#8B7FAB]">
            Gapni ovoz chiqarib o'qing — ustoz tekshiradi va tushuntiradi
          </p>
        </div>
        {/* Nechanchi gap — o'quvchi qancha qolganini ko'rib tursin. */}
        <span className="shrink-0 rounded-full bg-[#F3F0FC] px-2.5 py-1 text-[11.5px] font-bold text-[#5B3FA8]">
          {index + 1} / {sentences.length}
        </span>
      </div>

      <div className="relative mt-3 flex gap-1">
        {sentences.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= index ? 'bg-[#5B4CE0]' : 'bg-[#E6E1F7]'
            }`}
          />
        ))}
      </div>

      {/* O'qiladigan gap */}
      <div className="relative mt-3.5 rounded-2xl bg-[#F7F5FE] p-3.5">
        <p className="text-[17px] font-bold leading-snug text-[#2D1B69]">{current.ru}</p>
        {current.uz ? <p className="mt-1 text-[13px] text-[#7A6C9E]">{current.uz}</p> : null}
      </div>

      {/* Boshqaruv */}
      <div className="relative mt-3.5 flex flex-wrap items-center gap-2">
        {!recorder.isRecording ? (
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setError(null);
              void recorder.startRecording();
            }}
            disabled={checking}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#5B3FA8] px-4 text-[14px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {checking ? <Loader2 size={17} className="animate-spin" /> : <Mic size={17} />}
            {checking ? 'Tekshirilmoqda…' : feedback ? "Qayta o'qish" : "O'qishni boshlash"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => recorder.stopRecording()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#EF4444] px-4 text-[14px] font-bold text-white transition active:scale-[0.98]"
          >
            <Square size={15} fill="currentColor" />
            To'xtatish · {recorder.elapsedSeconds}s
          </button>
        )}

        {/*
          Baho kelgach bu tugma ASOSIY ko'rinishga o'tadi: o'quvchi natijani
          o'qib bo'lgach keyingi gapga o'tishi kerakligi ko'rinib tursin.
        */}
        <button
          type="button"
          onClick={keyingiGap}
          disabled={recorder.isRecording || checking}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3.5 text-[13px] font-bold transition active:scale-[0.98] disabled:opacity-50 ${
            feedback
              ? 'bg-[#5B3FA8] text-white'
              : 'text-[#5B3FA8] ring-1 ring-[#DDD7F5]'
          }`}
        >
          {oxirgi ? 'Yakunlash' : 'Keyingi gap'}
          {oxirgi ? <ArrowRight size={15} /> : <ChevronRight size={15} />}
        </button>

        {feedback ? (
          <button
            type="button"
            onClick={qaytaOqish}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3 text-[13px] font-bold text-[#8B7FAB] transition active:scale-[0.98]"
          >
            <RotateCcw size={15} /> Tozalash
          </button>
        ) : null}
      </div>

      {/* Yozuv paytidagi jonli daraja */}
      {recorder.isRecording ? (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-[#EDE9FB]">
          <motion.div
            className="h-full rounded-full bg-[#5B3FA8]"
            animate={{ width: `${Math.min(100, Math.round(recorder.audioLevel * 100))}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      ) : null}

      {recorder.error ? (
        <p className="relative mt-3 text-[13px] font-semibold text-[#B91C1C]">{recorder.error}</p>
      ) : null}
      {error ? (
        <p className="relative mt-3 text-[13px] font-semibold text-[#B91C1C]">{error}</p>
      ) : null}

      {/* Natija */}
      <AnimatePresence>
        {feedback ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative mt-4 space-y-3"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-[#FBFAFF] p-3 ring-1 ring-[#EDE9FB]">
              <AniqlikRing value={feedback.aniqlik} color={style.ring} />
              <div className="min-w-0">
                <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-black ${style.chip}`}>
                  {style.label}
                </span>
                <p className="mt-1 text-[13.5px] leading-snug text-[#463578]">{feedback.izoh}</p>
              </div>
            </div>

            {feedback.transcript ? (
              <p className="px-1 text-[12.5px] text-[#8B7FAB]">
                Siz o'qidingiz: <span className="text-[#463578]">"{feedback.transcript}"</span>
              </p>
            ) : null}

            {feedback.xatolar.length > 0 ? (
              <div className="space-y-2">
                {feedback.xatolar.map((x, i) => (
                  <div key={`${x.soz}-${i}`} className="rounded-2xl bg-[#FDF6F6] p-3 ring-1 ring-[#F6DDDD]">
                    <p className="text-[13.5px] font-bold text-[#B91C1C]">{x.soz}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-[#7A5B5B]">{x.muammo}</p>
                    {x.tuzatish ? (
                      <p className="mt-1 text-[13px] font-semibold text-[#177A3C]">
                        To'g'risi: {x.tuzatish}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {feedback.qoida ? (
              <div className="rounded-2xl bg-[#F7F5FE] p-3.5">
                {feedback.qoida.sarlavha ? (
                  <p className="text-[14px] font-black text-[#2D1B69]">{feedback.qoida.sarlavha}</p>
                ) : null}
                <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#463578]">
                  {feedback.qoida.tushuntirish}
                </p>
                {feedback.qoida.misollar.length > 0 ? (
                  <div className="mt-2.5 space-y-1.5">
                    {feedback.qoida.misollar.map((m, i) => (
                      <div key={`${m.ru}-${i}`} className="rounded-xl bg-white/70 px-3 py-2">
                        <p className="text-[13.5px] font-semibold text-[#2D1B69]">{m.ru}</p>
                        {m.uz ? <p className="text-[12.5px] text-[#7A6C9E]">{m.uz}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
