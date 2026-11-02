import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { apiUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';

type LugatAudioItem = { uz: string; ru: string; start: number; ruStart: number; end: number };
type LugatAudioResponse =
  | { ready: true; url: string; duration: number; items: LugatAudioItem[] }
  | { ready: false; empty?: boolean };

/** Fayl birinchi marta serverda ~1 daqiqa tayyorlanadi — shu oraliqda qayta so'raladi. */
const POLL_MS = 6000;

const clock = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

/**
 * Kun lug'atini tinglash: har so'z avval o'zbekcha, keyin ruscha.
 * Hozir qaysi so'z o'qilayotgani ko'rinib turadi; so'z ustiga bosib o'sha joydan eshitish mumkin.
 */
export function LugatAudioPlayer({ dayNumber }: { dayNumber: number }) {
  const { token } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [data, setData] = useState<LugatAudioResponse | null>(null);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/api/daily-course/day/${dayNumber}/lugat-audio`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as LugatAudioResponse;
        if (cancelled) return;
        setData(body);
        setError(false);
        if (!body.ready && !('empty' in body && body.empty)) timer = window.setTimeout(load, POLL_MS);
      } catch {
        if (!cancelled) setError(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [dayNumber, token]);

  const items = data?.ready ? data.items : [];
  const duration = data?.ready ? data.duration : 0;
  const currentIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < items.length; i += 1) if (time >= items[i].start - 0.05) idx = i;
    return idx;
  }, [items, time]);
  const current = items[currentIndex];
  const speakingRu = Boolean(current && time >= current.ruStart - 0.05);

  const seekTo = useCallback((index: number) => {
    const audio = audioRef.current;
    const item = items[Math.max(0, Math.min(items.length - 1, index))];
    if (!audio || !item) return;
    audio.currentTime = item.start;
    setTime(item.start);
    void audio.play().catch(() => setPlaying(false));
  }, [items]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };

  if (error || (data && !data.ready && 'empty' in data && data.empty)) return null;

  return (
    <section className="rounded-[24px] border border-[#DDD7F5] bg-white p-4 shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FB] text-[#5B4CE0]">
          <Headphones className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="grammar-heading text-[16px] leading-tight text-[#2D1B69]">So‘zlarni tinglash</p>
          <p className="mt-0.5 text-xs font-semibold text-[#8B7FAB]">
            Avval o‘zbekcha, keyin ruscha{data?.ready ? ` · ${items.length} ta so‘z · ${clock(duration)}` : ''}
          </p>
        </div>
      </div>

      {!data?.ready ? (
        <div role="status" className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F5F2FE] px-4 py-3 text-sm font-semibold text-[#5B4CE0]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5B4CE0] border-t-transparent" />
          {data ? 'Audio tayyorlanmoqda… bir daqiqa kuting' : 'Yuklanmoqda…'}
        </div>
      ) : (
        <>
          <audio
            ref={audioRef}
            src={apiUrl(data.url)}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          />

          <div className="mt-4 rounded-2xl bg-[#F5F2FE] px-4 py-3 text-center" aria-live="polite">
            <p className={`text-[18px] font-black leading-snug transition-colors ${speakingRu ? 'text-[#8B7FAB]' : 'text-[#2D1B69]'}`}>{current?.uz}</p>
            <p className={`mt-0.5 text-[18px] font-black leading-snug transition-colors ${speakingRu ? 'text-[#5B4CE0]' : 'text-[#B0A8CE]'}`}>{current?.ru}</p>
          </div>

          <input
            type="range"
            aria-label="Audio joyi"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(time, duration)}
            onChange={(e) => {
              const audio = audioRef.current;
              if (audio) audio.currentTime = Number(e.target.value);
              setTime(Number(e.target.value));
            }}
            className="mt-4 w-full accent-[#5B4CE0]"
          />
          <div className="flex justify-between text-[11px] font-bold text-[#8B7FAB]">
            <span>{clock(time)}</span>
            <span>{currentIndex + 1} / {items.length}</span>
            <span>{clock(duration)}</span>
          </div>

          <div className="mt-2 flex items-center justify-center gap-4">
            <button type="button" aria-label="Oldingi so‘z" onClick={() => seekTo(currentIndex - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DDD7F5] text-[#5B4CE0] transition active:scale-95">
              <SkipBack className="h-5 w-5" />
            </button>
            <button type="button" aria-label={playing ? 'To‘xtatish' : 'Tinglash'} onClick={toggle}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5B4CE0] text-white shadow-[0_14px_28px_-12px_rgba(91,76,224,0.55)] transition active:scale-95">
              {playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="ml-0.5 h-6 w-6" fill="currentColor" />}
            </button>
            <button type="button" aria-label="Keyingi so‘z" onClick={() => seekTo(currentIndex + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DDD7F5] text-[#5B4CE0] transition active:scale-95">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-1.5">
            {items.map((item, i) => (
              <li key={`${i}-${item.uz}`}>
                <button type="button" onClick={() => seekTo(i)}
                  className={`w-full rounded-xl px-2.5 py-2 text-left text-xs font-bold transition ${
                    i === currentIndex && (playing || time > 0) ? 'bg-[#5B4CE0] text-white' : 'bg-[#F5F2FE] text-[#2D1B69] hover:bg-[#EDE9FB]'
                  }`}>
                  <span className="block truncate">{item.uz}</span>
                  <span className={`block truncate ${i === currentIndex && (playing || time > 0) ? 'text-white/80' : 'text-[#8B7FAB]'}`}>{item.ru}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
