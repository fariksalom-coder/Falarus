import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  fetchWordSwipeLevels,
  fetchWordSwipeProgress,
  type WordSwipeLevelSummary,
  type WordSwipeProgressResponse,
} from '../api/wordSwipeGame';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { prefetchRoutePath } from '../routeModules';

const TOTAL_STAGES = 5;
const FALLBACK_LEVELS = 6;

export default function GamesPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { token } = useAuth();
  const [levels, setLevels] = useState<WordSwipeLevelSummary[] | null>(null);
  const [progress, setProgress] = useState<WordSwipeProgressResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchWordSwipeLevels();
      if (!cancelled) setLevels(data?.levels ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const p = await fetchWordSwipeProgress(token);
      if (!cancelled && p) setProgress(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const currentLevel = progress?.levelNumber ?? 1;
  const currentStage = progress?.stageNumber ?? 1;

  // Compute flat seq number (each stage = own map level) so the card can show it.
  const currentSeq = useMemo(() => {
    const base = levels ?? [];
    const levelCount = Math.max(base.length, FALLBACK_LEVELS);
    let seq = 0;
    for (let l = 1; l <= levelCount; l += 1) {
      const summary = base.find((x) => x.levelNumber === l);
      const stagesCount = summary?.stagesCount ?? TOTAL_STAGES;
      for (let s = 1; s <= stagesCount; s += 1) {
        seq += 1;
        if (l === currentLevel && s === currentStage) return seq;
      }
    }
    return seq;
  }, [levels, currentLevel, currentStage]);

  const totalMapLevels = useMemo(() => {
    const base = levels ?? [];
    const levelCount = Math.max(base.length, FALLBACK_LEVELS);
    let total = 0;
    for (let l = 1; l <= levelCount; l += 1) {
      const summary = base.find((x) => x.levelNumber === l);
      total += summary?.stagesCount ?? TOTAL_STAGES;
    }
    return total;
  }, [levels]);

  const totalStars = useMemo(() => {
    if (!progress) return 0;
    return Object.values(progress.completedStages ?? {}).reduce(
      (acc, arr) => acc + (arr?.length ?? 0),
      0,
    );
  }, [progress]);

  const mapHref = '/games/word-swipe/xarita';
  const openMap = () => {
    if (!token) {
      navigate('/login', { state: { from: mapHref } });
      return;
    }
    navigate(mapHref);
  };

  return (
    <div className="min-h-screen bg-app-bg pb-[84px]">
      <main className="mx-auto w-full max-w-[820px] px-5 pt-2.5">
        <h1 className="text-[26px] font-black leading-tight tracking-tight text-app-text">
          {t('games.title') || "O'yinlar"} 🎮
        </h1>
        <p className="mt-1 text-[14px] font-bold text-app-text-muted">
          O'ynab o'rganing — har kuni yangi so'zlar
        </p>

        {/* WordSwipe game card — click opens full-screen level map */}
        <button
          type="button"
          onClick={openMap}
          onMouseEnter={() => prefetchRoutePath(mapHref)}
          onTouchStart={() => prefetchRoutePath(mapHref)}
          onFocus={() => prefetchRoutePath(mapHref)}
          className="mt-[18px] block w-full overflow-hidden rounded-[26px] text-left shadow-[0_20px_44px_-16px_rgba(62,99,255,0.5)] transition active:scale-[0.995]"
          style={{ background: 'linear-gradient(160deg, #3E63FF 0%, #3A54E8 45%, #5B3BE0 100%)' }}
          aria-label="Xaritani ochish"
        >
          <div className="relative p-5 text-white">
            {/* Decor circles */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 h-[140px] w-[140px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.16), rgba(0,0,0,0) 70%)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-14 -left-6 h-[130px] w-[130px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(76,141,255,0.35), rgba(0,0,0,0) 70%)' }}
            />

            <div className="relative z-[2] flex items-center gap-[14px]">
              {/* Icon tile with "abc" glyph */}
              <div
                className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[20px] text-[20px] font-black text-[#2E3A78] shadow-[0_10px_24px_-8px_rgba(15,22,66,0.35)]"
                style={{
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(220,227,255,0.9) 100%)',
                }}
              >
                abc
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[20px] font-black leading-tight">So'zni yig'ing</p>
                <p className="mt-0.5 text-[12.5px] font-bold text-white/80">
                  Ruscha so'zlarni harflardan yig'ing
                </p>
              </div>
              <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/16 pl-2.5 pr-2.5 text-white ring-1 ring-white/22 backdrop-blur">
                <span aria-hidden className="text-[14px] leading-none">⭐</span>
                <span className="text-[12.5px] font-black text-[#FFE9B0]">{totalStars}</span>
              </span>
            </div>

            {/* Progress row */}
            <div className="relative z-[2] mt-4">
              <div className="mb-[7px] flex items-center justify-between text-[11px] font-extrabold text-white/85">
                <span>Lvl {currentSeq}</span>
                <span>
                  {currentSeq} / {totalMapLevels} bosqich
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/16">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(((currentSeq - 1) / Math.max(1, totalMapLevels)) * 100)}%`,
                    background: 'linear-gradient(90deg, #FFE9B0 0%, #FFC53D 100%)',
                  }}
                />
              </div>
            </div>

            {/* CTA row inside card */}
            <div className="relative z-[2] mt-4 flex items-center justify-between rounded-[16px] bg-white/12 px-4 py-3 ring-1 ring-white/20 backdrop-blur">
              <span className="text-[14px] font-black text-white">Xaritani ochish</span>
              <ChevronRight className="h-4 w-4 text-white" strokeWidth={2.4} />
            </div>
          </div>
        </button>

      </main>
    </div>
  );
}
