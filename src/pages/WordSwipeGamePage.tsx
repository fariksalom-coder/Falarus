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
  const [hintedId, setHintedId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [progress, setProgress] = useState<WordSwipeProgressResponse | null>(null);
  const [availableStagesTotal, setAvailableStagesTotal] = useState(5);
  const [saving, setSaving] = useState(false);
  const [stageSaved, setStageSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedStageKeyRef = useRef<string | null>(null);

  const completionKey = `${levelNumber}-${stageNumber}`;

  const resetRound = useCallback(() => {
    setFoundIds(new Set());
    setFoundCellKeys(new Set());
    setHintedId(null);
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
    setHintedId((current) => (current === idKey ? null : current));
  };

  const handleHint = () => {
    const remaining = words.find((w) => !foundIds.has(wordEntryIdKey(w.id)));
    if (!remaining) return;
    setHintedId(wordEntryIdKey(remaining.id));
  };

  useEffect(() => {
    if (!allDone || !token || saving) return;
    if (savedStageKeyRef.current === completionKey) return;

    let cancelled = false;
    setSaving(true);
    setSaveError(null);

    (async () => {
      const saved = await saveWordSwipeProgress(token, {
        levelNumber,
        stageNumber,
        completed: true,
      });

      if (cancelled) return;

      setSaving(false);

      if (saved) {
        savedStageKeyRef.current = completionKey;
        setProgress(saved);
        setStageSaved(true);
      } else {
        setSaveError(t('games.saveProgressFailed'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allDone, completionKey, levelNumber, saving, stageNumber, t, token]);

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
    <div className="fixed inset-0 z-[5] flex flex-col overflow-hidden bg-[linear-gradient(165deg,#1D4ED8_0%,#2563EB_42%,#6D28D9_100%)]">
      <header className="shrink-0 border-b border-white/10 bg-[#1e40af]/50 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white sm:h-10 sm:w-10"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold text-white sm:text-lg">
              {t('games.wordSwipeTitle')}
            </h1>
            <p className="truncate text-[10px] font-semibold text-white/70 sm:text-xs">
              {loadState.status === 'ready'
                ? `${t('games.levelLabel', { level: levelNumber })} · ${progressLabel} · ${foundWordsLabel}`
                : progressLabel}
            </p>
          </div>
          {loadState.status === 'ready' ? (
            <>
              <button
                type="button"
                onClick={resetRound}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white sm:h-10 sm:w-10"
                aria-label={t('games.reset')}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={allDone}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white disabled:opacity-40 sm:h-10 sm:w-10"
                aria-label={t('games.hint')}
              >
                <Lightbulb className="h-4 w-4" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white sm:h-10 sm:w-10"
            aria-label={t('games.howToPlay')}
          >
            <HelpCircle className="h-4 w-4" />
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
                  navigate('/games');
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
              onClick={() => navigate('/games')}
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
                  hintedId={hintedId}
                  className="min-h-0 flex-1"
                />

                {allDone ? (
                  <div className="shrink-0 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-center">
                    <p className="text-sm font-extrabold text-emerald-800">
                      {saving
                        ? t('common.saving')
                        : availableStagesEnded
                          ? t('games.availableStagesEnded')
                          : t('games.completedTitle')}
                    </p>
                    {saveError ? (
                      <p className="mt-2 text-xs font-semibold text-rose-600">{saveError}</p>
                    ) : null}
                    {hasNextStage ? (
                      <button
                        type="button"
                        onClick={goNextStage}
                        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-sm font-bold text-white"
                      >
                        {t('games.nextStage')}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : !saving ? (
                      <button
                        type="button"
                        onClick={() => navigate('/games')}
                        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-4 text-sm font-bold text-white"
                      >
                        {t('common.back')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </main>

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
