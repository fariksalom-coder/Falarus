import { useCallback, useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { FileAudio, Loader2, Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react';
import { mediaPositionAt, type MediaPlayback, type RoomOp } from '../../../shared/lessonRoom';
import { fetchMaterialBlob, type MaterialSource } from '../../api/teacherMaterials';

/**
 * Darsdagi audio/video — ikkala ekranda bir vaqtda.
 *
 * O'qituvchi ijro/pauza/o'tkazishni bosadi → xona holatiga yoziladi (server vaqti bilan).
 * Har bir o'ynatgich (o'qituvchiniki ham) shu holatga ergashadi: har soniyada «hozir qayerda
 * bo'lishi kerak»ni hisoblab, 0.35 s dan ko'p farq bo'lsa joyini to'g'rilaydi.
 *
 * Telefon (ayniqsa iPhone) ovozni foydalanuvchi bosmaguncha yoqmaydi — shunda o'quvchiga
 * «Ovozni yoqish» tugmasi chiqadi; bir marta bosilgach, keyingilari o'zi yangraydi.
 */

const DRIFT_S = 0.35;
const SKIP_S = 10;

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export function SyncedMedia({ token, source, kind, title, media, teacher, serverNow, send, onAudible }: {
  token: string | null;
  source: MaterialSource;
  kind: 'audio' | 'video';
  title: string;
  media: MediaPlayback | null;
  teacher: boolean;
  serverNow: () => number;
  send: (op: RoomOp) => void;
  /** Ovoz eshitilayotganini bildiradi (mikrofonni vaqtincha o'chirish uchun). */
  onAudible: (audible: boolean) => void;
}) {
  const el = useRef<HTMLMediaElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [now, setNow] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [seeking, setSeeking] = useState<number | null>(null);
  const sourceKey = JSON.stringify(source);
  const playback = media ?? { playing: false, position: 0, at: 0 };
  const playbackRef = useRef(playback);
  playbackRef.current = playback;

  useEffect(() => {
    if (!token) return;
    let alive = true;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(false);
    fetchMaterialBlob(token, source)
      .then((b) => { if (alive) { objectUrl = URL.createObjectURL(b); setUrl(objectUrl); } })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sourceKey]);

  /** O'ynatgichni xona holatiga keltiradi. */
  const sync = useCallback(() => {
    const m = el.current;
    if (!m || !url) return;
    const p = playbackRef.current;
    const target = Math.min(mediaPositionAt(p, serverNow()), m.duration || Infinity);
    if (Math.abs(m.currentTime - target) > DRIFT_S) {
      try { m.currentTime = target; } catch { /* hali yuklanmagan — keyingi safar */ }
    }
    if (p.playing && m.paused && target < (m.duration || Infinity)) {
      m.play().then(() => setBlocked(false), (e: unknown) => {
        if ((e as { name?: string })?.name === 'NotAllowedError') setBlocked(true);
      });
    } else if (!p.playing && !m.paused) {
      m.pause();
    }
    setNow(m.currentTime);
  }, [url, serverNow]);

  useEffect(() => { sync(); }, [sync, playback.playing, playback.position, playback.at]);
  useEffect(() => {
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, [sync]);

  useEffect(() => {
    onAudible(playback.playing && !blocked);
  }, [playback.playing, blocked, onAudible]);
  useEffect(() => () => onAudible(false), [onAudible]);

  const command = (playing: boolean, position: number) => {
    send({ type: 'media', playing, position: Math.max(0, Math.min(position, duration || position)), at: serverNow() });
  };
  const current = () => el.current?.currentTime ?? mediaPositionAt(playback, serverNow());
  const toggle = () => command(!playback.playing, current());
  const skip = (d: number) => command(playback.playing, current() + d);

  const unlock = () => {
    const m = el.current;
    if (!m) return;
    m.play().then(() => { setBlocked(false); sync(); }, () => setBlocked(true));
  };

  const shownTime = seeking ?? now;
  const progress = duration ? Math.min(100, (shownTime / duration) * 100) : 0;
  // Audio va video uchun bir xil o'ynatgich xususiyatlari.
  const mediaProps = {
    ref: (node: HTMLMediaElement | null) => { el.current = node; },
    src: url ?? undefined,
    preload: 'auto' as const,
    onLoadedMetadata: (e: SyntheticEvent<HTMLMediaElement>) => { setDuration(e.currentTarget.duration || 0); sync(); },
    onTimeUpdate: (e: SyntheticEvent<HTMLMediaElement>) => setNow(e.currentTarget.currentTime),
    onEnded: () => { if (teacher) command(false, duration); },
  };

  if (error) return <Centered><p className="px-6 text-center text-[14px] font-semibold text-white/70">Faylni ochib boʻlmadi</p></Centered>;

  return (
    <Centered>
      <div className="flex w-full max-w-[560px] flex-col items-center gap-4">
        {kind === 'video' ? (
          <div className="relative w-full overflow-hidden rounded-[16px] bg-black">
            <video {...mediaProps} playsInline className="max-h-[52vh] w-full" />
          </div>
        ) : (
          <>
            <audio {...mediaProps} />
            <span className={`flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#FEF3C7] text-[#B45309] ${playback.playing ? 'animate-pulse' : ''}`}>
              <FileAudio className="h-10 w-10" />
            </span>
          </>
        )}
        <p className="max-w-full truncate text-center text-[16px] font-extrabold text-white">{title}</p>

        {!url ? (
          <span className="flex items-center gap-2 text-[13px] font-bold text-white/70"><Loader2 className="h-5 w-5 animate-spin" /> Yuklanmoqda…</span>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="w-11 shrink-0 text-right text-[12.5px] font-bold tabular-nums text-white/70">{fmt(shownTime)}</span>
              {teacher ? (
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, duration)}
                  step={0.1}
                  value={shownTime}
                  onChange={(e) => setSeeking(Number(e.target.value))}
                  onPointerUp={() => { if (seeking !== null) { command(playback.playing, seeking); setSeeking(null); } }}
                  onKeyUp={() => { if (seeking !== null) { command(playback.playing, seeking); setSeeking(null); } }}
                  aria-label="Ijro joyi"
                  className="h-10 min-w-0 flex-1 accent-[#3B82F6]"
                />
              ) : (
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden>
                  <div className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
              )}
              <span className="w-11 shrink-0 text-[12.5px] font-bold tabular-nums text-white/70">{fmt(duration)}</span>
            </div>

            {teacher ? (
              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={() => skip(-SKIP_S)} aria-label="10 soniya orqaga" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-95">
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={playback.playing ? 'Pauza' : 'Ijro etish'}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-[0_18px_44px_rgba(37,99,235,0.35)] transition hover:bg-[#1D4ED8] active:scale-95"
                >
                  {playback.playing ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
                </button>
                <button type="button" onClick={() => skip(SKIP_S)} aria-label="10 soniya oldinga" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-95">
                  <RotateCw className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <p className="text-center text-[13px] font-semibold text-white/60">
                {playback.playing ? 'Oʻqituvchi ijro etmoqda — siz bilan bir vaqtda' : 'Oʻqituvchi ijroni boshlashini kuting'}
              </p>
            )}
            {teacher ? <p className="text-center text-[12px] font-semibold text-white/45">Oʻquvchida ham shu joydan bir vaqtda yangraydi</p> : null}
          </div>
        )}

        {blocked ? (
          <button
            type="button"
            onClick={unlock}
            className="flex min-h-[56px] items-center gap-2 rounded-[16px] bg-[#16A34A] px-6 text-[16px] font-extrabold text-white shadow-[0_18px_44px_rgba(22,163,74,0.35)] transition active:scale-95"
          >
            <Volume2 className="h-6 w-6" /> Ovozni yoqish
          </button>
        ) : null}
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full items-center justify-center overflow-y-auto p-4">{children}</div>;
}
