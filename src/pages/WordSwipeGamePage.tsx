import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, HelpCircle, Lightbulb, RotateCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchWordSwipeLevels,
  fetchWordSwipeProgress,
  fetchWordSwipeStageDetailed,
  saveWordSwipeProgress,
  type WordSwipeProgressResponse,
  type WordSwipeStageResponse,
} from '../api/wordSwipeGame';
import WordSwipeAnswerList from '../components/games/WordSwipeAnswerList';
import WordSwipeBoard from '../components/games/WordSwipeBoard';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import {
  DEV_WORD_SWIPE_FALLBACK_COLS,
  DEV_WORD_SWIPE_FALLBACK_ROWS,
  DEV_WORD_SWIPE_FALLBACK_WORDS,
} from '../data/wordSwipeLevel1';
import { generateWordSwipeGrid } from '../../shared/wordSwipeGridGenerator';
import {
  coordKey,
  wordEntryIdKey,
  type GridCoord,
  type WordSwipeEntry,
} from '../../shared/wordSwipeUtils';
import { playCorrectSound } from '../utils/sound';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; locked?: boolean; needsLogin?: boolean }
  | { status: 'empty' }
  | {
      status: 'ready';
      stage: WordSwipeStageResponse;
      words: WordSwipeEntry[];
      grid: string[][];
      gridRows: number;
      gridCols: number;
    };

function parseRouteNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return fallback;
  return n;
}

export default function WordSwipeGamePage() {
  const navigate = useNavigate();
  const { levelNumber: levelParam, stageNumber: stageParam } = useParams();
  const { t } = useLocale();
  const { token } = useAuth();

  const levelNumber = parseRouteNumber(levelParam, 1);
  const stageNumber = parseRouteNumber(stageParam, 1);

  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [foundIds, setFoundIds] = useState<Set<string>>(() => new Set());
  const [foundCellKeys, setFoundCellKeys] = useState<Set<string>>(() => new Set());
  const [hintCounts, setHintCounts] = useState<Record<string, number>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [progress, setProgress] = useState<WordSwipeProgressResponse | null>(null);
  const [availableStagesTotal, setAvailableStagesTotal] = useState(5);
  const [saving, setSaving] = useState(false);
  const [stageSaved, setStageSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedStageKeyRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);

  const completionKey = `${levelNumber}-${stageNumber}`;

  const resetRound = useCallback(() => {
    setFoundIds(new Set());
    setFoundCellKeys(new Set());
    setHintCounts({});
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true, state: { from: `/games/word-swipe/${levelNumber}/${stageNumber}` } });
      return;
    }

    let cancelled = false;
    fetchWordSwipeProgress(token).then((data) => {
      if (!cancelled && data) setProgress(data);
    });

    return () => {
      cancelled = true;
    };
  }, [levelNumber, navigate, stageNumber, token]);

  useEffect(() => {
    let cancelled = false;
    fetchWordSwipeLevels().then((data) => {
      if (cancelled) return;
      const level = data?.levels.find((entry) => entry.levelNumber === levelNumber);
      if (level && level.availableStagesCount > 0) {
        setAvailableStagesTotal(level.availableStagesCount);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [levelNumber]);

  useEffect(() => {
    resetRound();
    setStageSaved(false);
    setSaveError(null);
    savedStageKeyRef.current = null;
    setLoadState({ status: 'loading' });

    if (!token) return;

    let cancelled = false;

    (async () => {
      const result = await fetchWordSwipeStageDetailed(token, levelNumber, stageNumber);

      if (cancelled) return;

      if (result.ok === false) {
        if (import.meta.env.DEV && levelNumber === 1 && stageNumber === 1) {
          try {
            const generated = generateWordSwipeGrid({
              words: DEV_WORD_SWIPE_FALLBACK_WORDS,
              rows: DEV_WORD_SWIPE_FALLBACK_ROWS,
              cols: DEV_WORD_SWIPE_FALLBACK_COLS,
              seed: `word-swipe-${levelNumber}-${stageNumber}`,
            });
            setLoadState({
              status: 'ready',
              stage: {
                levelNumber: 1,
                stageNumber: 1,
                gridRows: generated.rows,
                gridCols: generated.cols,
                words: DEV_WORD_SWIPE_FALLBACK_WORDS.map((w, i) => ({
                  id: i + 1,
                  uz: w.uz,
                  ru: w.ru,
                })),
              },
              words: DEV_WORD_SWIPE_FALLBACK_WORDS,
              grid: generated.grid,
              gridRows: generated.rows,
              gridCols: generated.cols,
            });
            return;
          } catch {
            // fall through
          }
        }

        setLoadState({
          status: 'error',
          message:
            result.status === 403
              ? t('games.stageLocked')
              : result.status === 401
                ? t('games.loginRequired')
                : t('common.loadError'),
          locked: result.status === 403,
          needsLogin: result.status === 401,
        });
        return;
      }

      const stage = result.data;
      if (stage.words.length === 0) {
        setLoadState({ status: 'empty' });
        return;
      }

      const words: WordSwipeEntry[] = stage.words.map((w) => ({
        id: w.id,
        uz: w.uz,
        ru: w.ru,
      }));

      try {
        const generated = generateWordSwipeGrid({
          words,
          rows: stage.gridRows,
          cols: stage.gridCols,
          seed: `word-swipe-${stage.levelNumber}-${stage.stageNumber}`,
        });

        setLoadState({
          status: 'ready',
          stage,
          words,
          grid: generated.grid,
          gridRows: generated.rows,
          gridCols: generated.cols,
        });
      } catch {
        setLoadState({
          status: 'error',
          message: t('games.gridGenerationFailed'),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [levelNumber, resetRound, stageNumber, t, token]);

  const words = loadState.status === 'ready' ? loadState.words : [];
  const foundCount = foundIds.size;
  const totalCount = words.length;
  const allDone = loadState.status === 'ready' && totalCount > 0 && foundCount >= totalCount;
  const availableStagesEnded = stageSaved && Boolean(progress?.completedAvailableStages);
  const hasNextStage = allDone && stageSaved && !availableStagesEnded;

  const progressLabel = useMemo(() => {
    if (loadState.status !== 'ready') return '';
    return t('games.stageProgress', { stage: stageNumber, total: availableStagesTotal });
  }, [availableStagesTotal, loadState.status, stageNumber, t]);

  const foundWordsLabel = useMemo(
    () => t('games.foundProgress', { found: foundCount, total: totalCount }),
    [foundCount, t, totalCount],
  );

  const handleWordFound = (word: WordSwipeEntry, path: GridCoord[]) => {
    const idKey = wordEntryIdKey(word.id);
    if (!foundIds.has(idKey)) playCorrectSound();
    setFoundIds((prev) => {
      if (prev.has(idKey)) return prev;
      const next = new Set(prev);
      next.add(idKey);
      return next;
    });
    setFoundCellKeys((prev) => {
      const next = new Set(prev);
      for (const { row, col } of path) {
        next.add(coordKey(row, col));
      }
      return next;
    });
    // Word solved — no need to clear individual hint counts, they simply become irrelevant.
  };

  const handleHint = () => {
    const unfound = words.filter((w) => !foundIds.has(wordEntryIdKey(w.id)));
    if (unfound.length === 0) return;
    // Prefer a word that's already partially hinted but not yet fully revealed —
    // that way each Lightbulb tap reveals the NEXT letter of the same word.
    const inProgress = unfound.find((w) => {
      const idKey = wordEntryIdKey(w.id);
      const shown = hintCounts[idKey] ?? 0;
      return shown > 0 && shown < w.ru.length - 1;
    });
    const target = inProgress ?? unfound[0];
    if (!target) return;
    const idKey = wordEntryIdKey(target.id);
    setHintCounts((prev) => {
      const current = prev[idKey] ?? 0;
      const max = Math.max(0, target.ru.length - 1); // never fully solve the word
      const next = Math.min(current + 1, max);
      if (next === current) return prev;
      return { ...prev, [idKey]: next };
    });
  };

  useEffect(() => {
    if (!allDone || !token) return;
    if (savedStageKeyRef.current === completionKey) return;
    if (saveInFlightRef.current) return;

    let cancelled = false;
    saveInFlightRef.current = true;
    setSaving(true);
    setSaveError(null);

    (async () => {
      try {
        const saved = await saveWordSwipeProgress(token, {
          levelNumber,
          stageNumber,
          completed: true,
        });

        if (cancelled) return;

        if (saved) {
          savedStageKeyRef.current = completionKey;
          setProgress(saved);
          setStageSaved(true);
        } else {
          setSaveError(t('games.saveProgressFailed'));
        }
      } finally {
        if (!cancelled) {
          saveInFlightRef.current = false;
          setSaving(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      saveInFlightRef.current = false;
      setSaving(false);
    };
  }, [allDone, completionKey, levelNumber, stageNumber, t, token]);

  const nextTarget = useMemo(() => {
    if (progress && !progress.completedAvailableStages) {
      return {
        levelNumber: progress.levelNumber,
        stageNumber: progress.stageNumber,
      };
    }
    return { levelNumber, stageNumber };
  }, [levelNumber, progress, stageNumber]);

  const goNextStage = () => {
    if (!stageSaved || !progress || progress.completedAvailableStages) return;
    navigate(`/games/word-swipe/${nextTarget.levelNumber}/${nextTarget.stageNumber}`);
  };

  return (
    <div
      className="fixed inset-0 z-[5] flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #3E63FF 0%, #3A54E8 45%, #5B3BE0 100%)' }}
    >
      <header className="shrink-0 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => navigate('/games/word-swipe/xarita')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/16 text-white ring-1 ring-white/22 backdrop-blur transition hover:bg-white/22 active:scale-95 sm:h-11 sm:w-11"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold text-white sm:text-lg">
              So'zni yig'ing
            </h1>
            <p className="truncate text-[11px] font-semibold text-white/75 sm:text-xs">
              {loadState.status === 'ready'
                ? `${t('games.levelLabel', { level: levelNumber })} · ${progressLabel}`
                : progressLabel}
            </p>
          </div>
          {/* Score pill (diamond + points) */}
          {loadState.status === 'ready' ? (
            <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/16 pl-2.5 pr-3 text-white ring-1 ring-white/22 backdrop-blur">
              <span aria-hidden className="text-[15px] leading-none">💎</span>
              <span className="text-[13px] font-black tracking-tight text-[#FFE9B0]">
                {foundCount * 20}
              </span>
            </span>
          ) : null}
          {loadState.status === 'ready' ? (
            <>
              <button
                type="button"
                onClick={resetRound}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/16 text-white ring-1 ring-white/22 backdrop-blur transition hover:bg-white/22 active:scale-95 sm:h-11 sm:w-11"
                aria-label={t('games.reset')}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={allDone}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[#22306B] shadow-[0_6px_14px_-6px_rgba(255,197,61,0.6)] transition hover:brightness-105 active:scale-95 disabled:opacity-40 sm:h-11 sm:w-11"
                style={{ background: 'linear-gradient(150deg, #FFE9B0 0%, #FFC53D 100%)' }}
                aria-label={t('games.hint')}
              >
                <Lightbulb className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/16 text-white ring-1 ring-white/22 backdrop-blur transition hover:bg-white/22 active:scale-95 sm:h-11 sm:w-11"
            aria-label={t('games.howToPlay')}
          >
            <HelpCircle className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 overflow-hidden px-3 py-2 sm:gap-3 sm:py-3 md:flex-row md:items-center md:justify-center md:gap-8 md:overflow-visible sm:px-4">
        {loadState.status === 'loading' ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm font-semibold text-white/80">{t('common.loading')}</p>
          </div>
        ) : null}

        {loadState.status === 'error' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-sm font-semibold text-white">{loadState.message}</p>
            <button
              type="button"
              onClick={() => {
                if (loadState.needsLogin) {
                  navigate('/login', { state: { from: `/games/word-swipe/${levelNumber}/${stageNumber}` } });
                  return;
                }
                if (loadState.locked) {
                  navigate('/games/word-swipe/xarita');
                  return;
                }
                window.location.reload();
              }}
              className="rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-slate-800"
            >
              {loadState.needsLogin
                ? t('games.loginToPlay')
                : loadState.locked
                  ? t('common.back')
                  : t('common.retry')}
            </button>
          </div>
        ) : null}

        {loadState.status === 'empty' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-sm font-semibold text-white">{t('games.stageEmpty')}</p>
            <button
              type="button"
              onClick={() => navigate('/games/word-swipe/xarita')}
              className="rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-slate-800"
            >
              {t('common.back')}
            </button>
          </div>
        ) : null}

        {loadState.status === 'ready' ? (
          <>
            <div className="flex w-full shrink-0 justify-center md:min-h-0 md:max-w-[38rem] md:flex-1 md:items-center lg:max-w-[42rem]">
              <WordSwipeBoard
                grid={loadState.grid}
                gridRows={loadState.gridRows}
                gridCols={loadState.gridCols}
                words={loadState.words}
                foundIds={foundIds}
                foundCellKeys={foundCellKeys}
                onWordFound={handleWordFound}
                className="w-[min(100%,calc(34dvh*6/5),20.5rem)] md:w-[min(100%,calc(72dvh*6/5),34rem)]"
              />
            </div>

            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden pb-[max(0.25rem,env(safe-area-inset-bottom))] md:w-[22rem] md:flex-none md:overflow-visible md:pb-0 lg:w-[24rem]">
              <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
                <WordSwipeAnswerList
                  words={loadState.words}
                  foundIds={foundIds}
                  hintCounts={hintCounts}
                  className="min-h-0 flex-1"
                />

                {allDone ? null : null}
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* Ajoyib! full-screen win overlay */}
      {allDone ? (
        <div
          className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          style={{ background: 'linear-gradient(160deg, #3E63FF 0%, #3A54E8 45%, #5B3BE0 100%)' }}
          role="dialog"
          aria-label="Bosqich yakunlandi"
        >
          {/* Party emoji in soft circle */}
          <div className="relative flex h-[168px] w-[168px] items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-white/10 blur-[2px]" />
            <div className="absolute inset-6 rounded-full bg-white/12" />
            <span aria-hidden className="relative text-[64px] leading-none">🎉</span>
          </div>

          <h2 className="mt-4 text-[36px] font-black leading-tight text-white">Ajoyib!</h2>
          <p className="mt-1 text-[15px] font-semibold text-white/80">Barcha so'zlar topildi</p>

          <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-2.5">
            <div className="rounded-[16px] bg-white/16 px-3 py-3.5 text-center ring-1 ring-white/20 backdrop-blur">
              <p className="text-[22px] font-black leading-none text-white">{totalCount}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">So'z</p>
            </div>
            <div className="rounded-[16px] bg-white/16 px-3 py-3.5 text-center ring-1 ring-white/20 backdrop-blur">
              <p className="text-[22px] font-black leading-none text-[#FFE9B0]">+{totalCount * 20}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                Ball <span aria-hidden>💎</span>
              </p>
            </div>
            <div className="rounded-[16px] bg-white/16 px-3 py-3.5 text-center ring-1 ring-white/20 backdrop-blur">
              <p className="text-[22px] font-black leading-none text-white">
                {saving ? '…' : stageSaved ? '✓' : '—'}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Saqlash</p>
            </div>
          </div>

          {saveError ? (
            <div className="mt-4 w-full max-w-sm space-y-2 rounded-2xl bg-rose-500/20 p-3 text-center ring-1 ring-rose-300/40">
              <p className="text-xs font-semibold text-white">{saveError}</p>
              <button
                type="button"
                onClick={() => {
                  savedStageKeyRef.current = null;
                  saveInFlightRef.current = false;
                  setStageSaved(false);
                  setSaveError(null);
                  setSaving(false);
                }}
                className="inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-white/20 px-3 text-xs font-bold text-white"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : null}

          <div className="mt-6 flex w-full max-w-sm flex-col gap-2.5">
            {hasNextStage ? (
              <button
                type="button"
                onClick={goNextStage}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-[15px] font-black text-[#3E63FF] shadow-[0_14px_28px_-10px_rgba(15,22,66,0.35)] transition hover:brightness-[0.98] active:scale-[0.99]"
              >
                {t('games.nextStage')}
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/games/word-swipe/xarita')}
              className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-transparent px-4 text-[14px] font-bold text-white ring-1.5 ring-white/50 transition hover:bg-white/10 active:scale-[0.99]"
            >
              O'yinlarga qaytish
            </button>
          </div>

          {availableStagesEnded ? (
            <p className="mt-4 max-w-sm text-center text-[12px] font-semibold text-white/70">
              {t('games.availableStagesEnded')}
            </p>
          ) : null}
        </div>
      ) : null}

      {showHelp ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={() => setShowHelp(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-lg font-extrabold text-slate-900">{t('games.howToPlay')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('games.howToPlayText')}</p>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-5 min-h-11 w-full rounded-2xl bg-[#2563EB] text-sm font-bold text-white"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
