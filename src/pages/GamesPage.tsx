import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchWordSwipeLevels,
  fetchWordSwipeProgress,
  type WordSwipeLevelSummary,
  type WordSwipeProgressResponse,
} from '../api/wordSwipeGame';
import { getGameQuota, type GameQuota } from '../api/games';
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
  const [quota, setQuota] = useState<GameQuota | null>(null);

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

  // Bepul o'yin cheki — kartochkalar ustida ko'rsatiladi.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void getGameQuota(token)
      .then((q) => !cancelled && setQuota(q))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

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

        {/* To'lov qilmaganlarda bepul o'yin cheki bor — oldindan ko'rinib tursin. */}
        {quota && !quota.premium ? (
          <button
            type="button"
            onClick={() => navigate('/tariflar')}
            className={`mt-3 flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left ${
              quota.allowed ? 'bg-[#FFF7E6]' : 'bg-[#FDECEC]'
            }`}
          >
            <span className="text-[15px]">{quota.allowed ? '✨' : '🔒'}</span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[13px] font-black ${
                  quota.allowed ? 'text-[#8A5A00]' : 'text-[#B3261E]'
                }`}
              >
                {quota.allowed
                  ? `Bepul o'yin: ${quota.used} / ${quota.limit}`
                  : 'Bepul o\u2018yinlar tugadi'}
              </span>
              <span className="block text-[12px] font-semibold text-app-text-muted">
                {quota.allowed
                  ? 'Cheksiz o\u2018ynash uchun premium'
                  : 'Premium sotib oling — barcha o\u2018yinlar ochiladi'}
              </span>
            </span>
            <span className="shrink-0 text-[12.5px] font-black text-app-primary">Sotib olish →</span>
          </button>
        ) : null}

        {/*
          Ikkala o'yin BITTA QATORDA — 2 ustunli to'r. Kartochkalar ixcham:
          ikonka, nom, qisqa izoh va bitta ko'rsatkich. Ilgari ular butun
          kenglikni egallab, ekranni to'ldirib yuborardi va yangi o'yin
          qo'shilsa sahifa cho'zilib ketardi.
        */}
        <div className="mt-[18px] grid grid-cols-2 gap-3">
          {/* So'zni yig'ing — bosqichlar xaritasi */}
          <button
            type="button"
            onClick={openMap}
            onMouseEnter={() => prefetchRoutePath(mapHref)}
            onTouchStart={() => prefetchRoutePath(mapHref)}
            onFocus={() => prefetchRoutePath(mapHref)}
            className="group relative flex flex-col overflow-hidden rounded-[22px] p-4 text-left shadow-[0_16px_32px_-16px_rgba(62,99,255,0.55)] transition active:scale-[0.97]"
            style={{ background: 'linear-gradient(160deg, #3E63FF 0%, #3A54E8 45%, #5B3BE0 100%)' }}
            aria-label="So'zni yig'ing o'yinini ochish"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-[110px] w-[110px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(0,0,0,0) 70%)' }}
            />
            <div className="relative z-[2] flex items-start justify-between">
              <span
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] text-[15px] font-black text-[#2E3A78] shadow-[0_8px_18px_-8px_rgba(15,22,66,0.4)]"
                style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #DCE3FF 100%)' }}
              >
                abc
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-2 py-1 ring-1 ring-white/22">
                <span aria-hidden className="text-[11px] leading-none">⭐</span>
                <span className="text-[11px] font-black text-[#FFE9B0]">{totalStars}</span>
              </span>
            </div>

            <p className="relative z-[2] mt-3 text-[16px] font-black leading-tight text-white">
              So'zni yig'ing
            </p>
            <p className="relative z-[2] mt-0.5 text-[11.5px] font-bold leading-snug text-white/75">
              Harflardan so'z tuzing
            </p>

            <div className="relative z-[2] mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] font-extrabold text-white/80">
                <span>Lvl {currentSeq}</span>
                <span>
                  {currentSeq}/{totalMapLevels}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/18">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(((currentSeq - 1) / Math.max(1, totalMapLevels)) * 100)}%`,
                    background: 'linear-gradient(90deg, #FFE9B0 0%, #FFC53D 100%)',
                  }}
                />
              </div>
            </div>
          </button>

          {/* So'z savati — ko'tarilayotgan so'zlarni terib ulgurish */}
          <button
            type="button"
            onClick={() => {
              if (!token) {
                navigate('/login', { state: { from: '/games/soz-savati' } });
                return;
              }
              navigate('/games/soz-savati');
            }}
            onMouseEnter={() => prefetchRoutePath('/games/soz-savati')}
            onTouchStart={() => prefetchRoutePath('/games/soz-savati')}
            onFocus={() => prefetchRoutePath('/games/soz-savati')}
            className="group relative flex flex-col overflow-hidden rounded-[22px] p-4 text-left shadow-[0_16px_32px_-16px_rgba(109,40,217,0.5)] transition active:scale-[0.97]"
            style={{ background: 'linear-gradient(160deg, #8B5CF6 0%, #7C3AED 45%, #6D28D9 100%)' }}
            aria-label="So'z savati o'yinini ochish"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-[110px] w-[110px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(0,0,0,0) 70%)' }}
            />
            <div className="relative z-[2] flex items-start justify-between">
              <span
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] text-[22px] shadow-[0_8px_18px_-8px_rgba(49,17,97,0.4)]"
                style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #E6DBFF 100%)' }}
              >
                🧺
              </span>
              <span className="inline-flex items-center rounded-full bg-white/16 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/22">
                род
              </span>
            </div>

            <p className="relative z-[2] mt-3 text-[16px] font-black leading-tight text-white">
              So'z savati
            </p>
            <p className="relative z-[2] mt-0.5 text-[11.5px] font-bold leading-snug text-white/75">
              Rodni taning — o'shanisini bosing
            </p>

            <div className="relative z-[2] mt-3 flex items-center gap-1.5">
              <span className="rounded-full bg-white/14 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/20">
                он · она · оно
              </span>
              <span className="rounded-full bg-white/14 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/20">
                3062 ot
              </span>
            </div>
          </button>

          {/* So'z zanjiri — oxirgi harfdan so'z topish */}
          <button
            type="button"
            onClick={() => {
              if (!token) {
                navigate('/login', { state: { from: '/games/soz-zanjiri' } });
                return;
              }
              navigate('/games/soz-zanjiri');
            }}
            onMouseEnter={() => prefetchRoutePath('/games/soz-zanjiri')}
            onTouchStart={() => prefetchRoutePath('/games/soz-zanjiri')}
            onFocus={() => prefetchRoutePath('/games/soz-zanjiri')}
            className="group relative flex flex-col overflow-hidden rounded-[22px] p-4 text-left shadow-[0_16px_32px_-16px_rgba(16,140,100,0.5)] transition active:scale-[0.97]"
            style={{ background: 'linear-gradient(160deg, #12B37A 0%, #0E9A6B 45%, #0B7F63 100%)' }}
            aria-label="So'z zanjiri o'yinini ochish"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-[110px] w-[110px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(0,0,0,0) 70%)' }}
            />
            <div className="relative z-[2] flex items-start justify-between">
              <span
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] text-[22px] shadow-[0_8px_18px_-8px_rgba(6,60,45,0.4)]"
                style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #CEF5E6 100%)' }}
              >
                🔗
              </span>
              {/* CEFR kodi emas — o'quvchi uchun ma'noli yozuv. */}
              <span className="inline-flex items-center rounded-full bg-white/16 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/22">
                4 daraja
              </span>
            </div>

            <p className="relative z-[2] mt-3 text-[16px] font-black leading-tight text-white">
              So'z zanjiri
            </p>
            <p className="relative z-[2] mt-0.5 text-[11.5px] font-bold leading-snug text-white/75">
              Oxirgi harfdan so'z toping
            </p>

            <div className="relative z-[2] mt-3 flex items-center gap-1.5">
              <span className="rounded-full bg-white/14 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/20">
                ⏱ 30 s
              </span>
              <span className="rounded-full bg-white/14 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/20">
                6828 so'z
              </span>
            </div>
          </button>

          {/* Fe'l ustasi — olmoshga qarab to'g'ri tuslangan shaklni tanlash */}
          <button
            type="button"
            onClick={() => {
              if (!token) {
                navigate('/login', { state: { from: '/games/fel-ustasi' } });
                return;
              }
              navigate('/games/fel-ustasi');
            }}
            onMouseEnter={() => prefetchRoutePath('/games/fel-ustasi')}
            onTouchStart={() => prefetchRoutePath('/games/fel-ustasi')}
            onFocus={() => prefetchRoutePath('/games/fel-ustasi')}
            className="group relative flex flex-col overflow-hidden rounded-[22px] p-4 text-left shadow-[0_16px_32px_-16px_rgba(217,119,6,0.5)] transition active:scale-[0.97]"
            style={{ background: 'linear-gradient(160deg, #F59E0B 0%, #EA8A04 45%, #D97706 100%)' }}
            aria-label="Fe'l ustasi o'yinini ochish"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-[110px] w-[110px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(0,0,0,0) 70%)' }}
            />
            <div className="relative z-[2] flex items-start justify-between">
              <span
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] text-[22px] shadow-[0_8px_18px_-8px_rgba(87,50,2,0.4)]"
                style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #FFEBC7 100%)' }}
              >
                ⚡
              </span>
              <span className="inline-flex items-center rounded-full bg-white/16 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/22">
                глагол
              </span>
            </div>

            <p className="relative z-[2] mt-3 text-[16px] font-black leading-tight text-white">
              Fe'l ustasi
            </p>
            <p className="relative z-[2] mt-0.5 text-[11.5px] font-bold leading-snug text-white/75">
              To'g'ri tuslangan shaklni tanlang
            </p>

            <div className="relative z-[2] mt-3 flex items-center gap-1.5">
              <span className="rounded-full bg-white/14 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/20">
                3 zamon
              </span>
              <span className="rounded-full bg-white/14 px-2 py-1 text-[10px] font-black text-white ring-1 ring-white/20">
                ⏱ 15 s
              </span>
            </div>
          </button>
        </div>

      </main>
    </div>
  );
}
