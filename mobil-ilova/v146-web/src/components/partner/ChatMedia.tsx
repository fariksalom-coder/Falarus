import { useEffect, useRef, useState } from 'react';
import { Clock, Pause, Play } from 'lucide-react';
import type { MediaKind } from '../../api/communityChat';

/**
 * CHATDAGI MEDIA — rasm, video, ovozli xabar va dumaloq video xabar.
 *
 * Hammasi `loading="lazy"` / `preload="metadata"` bilan keladi: guruhda
 * yuzlab xabar bo'lishi mumkin, ularning hammasini oldindan yuklash
 * mobil internetni bekorga yeydi.
 */

function vaqt(ms: number | null | undefined): string {
  const jami = Math.max(0, Math.round((ms ?? 0) / 1000));
  const d = Math.floor(jami / 60);
  const s = jami % 60;
  return `${d}:${String(s).padStart(2, '0')}`;
}

/**
 * Ovozli xabar — bitta tugma, davomiylik va o'sish chizig'i.
 *
 * Haqiqiy to'lqin shakli chizilmaydi: uni hisoblash uchun butun faylni
 * yuklab, dekodlash kerak bo'lardi. Uzunlik serverda saqlangani uchun
 * chiziq faylni ochmasdan ham to'g'ri ko'rsatiladi.
 */
function OvozliXabar({ url, ms, oziniki }: { url: string; ms: number | null; oziniki: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [oqmoqda, setOqmoqda] = useState(false);
  const [joriy, setJoriy] = useState(0);

  const jami = ms ?? 0;
  const foiz = jami > 0 ? Math.min(100, (joriy / jami) * 100) : 0;

  const ink = oziniki ? 'text-white' : 'text-pmn-text';
  const yumshoq = oziniki ? 'bg-white/25' : 'bg-black/10';
  const toq = oziniki ? 'bg-white' : 'bg-[#0EA5A5]';

  return (
    <div className="flex min-w-[190px] items-center gap-3">
      <button
        type="button"
        onClick={() => {
          const a = audioRef.current;
          if (!a) return;
          if (a.paused) void a.play();
          else a.pause();
        }}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${oziniki ? 'bg-white/25' : 'bg-[#0EA5A5]'} ${oziniki ? 'text-white' : 'text-white'}`}
        aria-label={oqmoqda ? 'Pauza' : 'Tinglash'}
      >
        {oqmoqda ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`h-1.5 w-full overflow-hidden rounded-full ${yumshoq}`}>
          <div className={`h-full rounded-full ${toq}`} style={{ width: `${foiz}%` }} />
        </div>
        <div className={`mt-1 text-[11px] font-semibold tabular-nums ${ink} opacity-80`}>
          {vaqt(oqmoqda || joriy > 0 ? joriy : jami)}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setOqmoqda(true)}
        onPause={() => setOqmoqda(false)}
        onEnded={() => {
          setOqmoqda(false);
          setJoriy(0);
        }}
        onTimeUpdate={(e) => setJoriy(e.currentTarget.currentTime * 1000)}
      />
    </div>
  );
}

/**
 * Dumaloq video xabar.
 *
 * Kadr kvadrat, ustiga `rounded-full` niqob qo'yiladi. Bosilganda
 * o'ynaydi va tugagach boshiga qaytadi — Telegramdagi xulq.
 */
function DumaloqVideo({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [oqmoqda, setOqmoqda] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        const v = ref.current;
        if (!v) return;
        if (v.paused) void v.play();
        else v.pause();
      }}
      className="relative block h-[200px] w-[200px] overflow-hidden rounded-full ring-2 ring-black/10"
      aria-label={oqmoqda ? 'Pauza' : 'Ijro etish'}
    >
      <video
        ref={ref}
        src={url}
        preload="metadata"
        playsInline
        className="h-full w-full object-cover"
        onPlay={() => setOqmoqda(true)}
        onPause={() => setOqmoqda(false)}
        onEnded={(e) => {
          setOqmoqda(false);
          e.currentTarget.currentTime = 0;
        }}
      />
      {!oqmoqda ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
            <Play className="h-5 w-5 translate-x-[1px] text-[#0B2A6B]" />
          </span>
        </span>
      ) : null}
    </button>
  );
}

/** Rasm — bosilganda to'liq o'lchamda yangi oynada ochiladi. */
function Rasm({ url }: { url: string }) {
  const [xato, setXato] = useState(false);
  if (xato) {
    return <div className="rounded-[12px] bg-black/10 px-3 py-2 text-[12px]">Rasm yuklanmadi</div>;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setXato(true)}
        className="max-h-[320px] w-auto max-w-full rounded-[12px] object-cover"
      />
    </a>
  );
}

/** Turning odamga tushunarli nomi — muddati tugagan xabarda ko'rsatiladi. */
const TUR_NOMI: Record<MediaKind, string> = {
  image: 'Rasm',
  video: 'Video',
  voice: 'Ovozli xabar',
  video_note: 'Video xabar',
};

export default function ChatMedia({
  kind,
  url,
  ms,
  oziniki,
  ochirilgan,
}: {
  kind: MediaKind;
  url: string;
  ms?: number | null;
  /** O'z xabarimi — ranglar shunga qarab tanlanadi. */
  oziniki: boolean;
  /**
   * Fayl serverdan o'chirilganmi. Media 100 soatdan keyin diskdan
   * olinadi — xabar chatda qoladi, lekin faylni ochib bo'lmaydi.
   */
  ochirilgan?: boolean;
}) {
  /*
   * HOOK'LAR HAR DOIM BIRINCHI.
   *
   * "Muddati tugadi" holati uchun erta `return` shu qatorlardan OLDIN
   * turgan edi. Media eskirganda komponent hook chaqirmay qo'yardi va
   * React "Rendered fewer hooks than expected" bilan yiqilardi — chat
   * butunlay oq ekranga aylanardi.
   */
  // Manzil `/uploads/...` ko'rinishida keladi; boshqa manba kutilmaydi.
  const [buzuq, setBuzuq] = useState(false);
  useEffect(() => setBuzuq(false), [url]);

  if (ochirilgan) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12.5px] font-semibold ${
          oziniki ? 'bg-white/15 text-white/80' : 'bg-black/5 text-pmn-text-muted'
        }`}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {TUR_NOMI[kind]} · muddati tugadi
      </div>
    );
  }

  if (!url || buzuq) return null;

  if (kind === 'image') return <Rasm url={url} />;
  if (kind === 'voice') return <OvozliXabar url={url} ms={ms ?? null} oziniki={oziniki} />;
  if (kind === 'video_note') return <DumaloqVideo url={url} />;

  return (
    <video
      src={url}
      controls
      preload="metadata"
      playsInline
      onError={() => setBuzuq(true)}
      className="max-h-[320px] w-full max-w-[320px] rounded-[12px] bg-black"
    />
  );
}
