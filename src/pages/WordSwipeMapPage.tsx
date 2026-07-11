import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  fetchWordSwipeLevels,
  fetchWordSwipeProgress,
  type WordSwipeLevelSummary,
  type WordSwipeProgressResponse,
} from '../api/wordSwipeGame';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

const TOTAL_STAGES = 5;
const FALLBACK_LEVELS = 6;

type LevelNode = {
  seq: number;
  levelNumber: number;
  stageNumber: number;
  status: 'done' | 'current' | 'locked';
};

export default function WordSwipeMapPage() {
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

  const levelNodes: LevelNode[] = useMemo(() => {
    const base = levels ?? [];
    const levelCount = Math.max(base.length, FALLBACK_LEVELS);
    const nodes: LevelNode[] = [];
    let seq = 0;
    for (let l = 1; l <= levelCount; l += 1) {
      const summary = base.find((x) => x.levelNumber === l);
      const stagesCount = summary?.stagesCount ?? TOTAL_STAGES;
      for (let s = 1; s <= stagesCount; s += 1) {
        seq += 1;
        let status: LevelNode['status'];
        if (l < currentLevel || (l === currentLevel && s < currentStage)) status = 'done';
        else if (l === currentLevel && s === currentStage) status = 'current';
        else status = 'locked';
        nodes.push({ seq, levelNumber: l, stageNumber: s, status });
      }
    }
    return nodes;
  }, [levels, currentLevel, currentStage]);

  const totalStars = useMemo(() => {
    if (!progress) return 0;
    return Object.values(progress.completedStages ?? {}).reduce(
      (acc, arr) => acc + (arr?.length ?? 0),
      0,
    );
  }, [progress]);

  const currentSeq = useMemo(() => {
    const cur = levelNodes.find((n) => n.status === 'current');
    return cur?.seq ?? 1;
  }, [levelNodes]);

  const openLevel = (node: LevelNode) => {
    if (node.status === 'locked') return;
    const target = `/games/word-swipe/${node.levelNumber}/${node.stageNumber}`;
    if (!token) {
      navigate('/login', { state: { from: target } });
      return;
    }
    navigate(target);
  };

  return (
    <div
      className="fixed inset-0 z-[5] flex flex-col overflow-hidden text-white"
      style={{ background: 'linear-gradient(180deg, #0F1642 0%, #171E5A 48%, #221A5E 100%)' }}
    >
      {/* Radial glow around current level */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(76,141,255,0.28), rgba(0,0,0,0) 65%)' }}
      />

      {/* Header — back tile + Lvl N + stars pill */}
      <header className="relative z-[3] flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate('/games')}
          aria-label={t('common.back')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/16 text-white ring-1 ring-white/22 backdrop-blur transition hover:bg-white/22 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-white/70">
            So'zni yig'ing
          </p>
          <h1 className="mt-0.5 text-[22px] font-black leading-tight">Lvl {currentSeq}</h1>
        </div>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/16 pl-2.5 pr-3 ring-1 ring-white/22 backdrop-blur">
          <span aria-hidden className="text-[15px] leading-none">⭐</span>
          <span className="text-[13px] font-black text-[#FFE9B0]">{totalStars}</span>
        </span>
      </header>

      {/* Scrollable map */}
      <main className="relative z-[2] flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <div className="relative mx-auto flex w-full max-w-[360px] flex-col items-stretch">
          {levelNodes.map((node, i) => {
            const isFirst = i === 0;
            const isLast = i === levelNodes.length - 1;
            const shift = i % 2 === 0 ? 'ml-auto mr-[18%]' : 'ml-[18%] mr-auto';
            const isCurrent = node.status === 'current';
            const isDone = node.status === 'done';
            const nextIsDoneOrCurrent =
              i < levelNodes.length - 1 &&
              (levelNodes[i + 1].status === 'done' || levelNodes[i + 1].status === 'current');
            const connectorGreen = isDone && nextIsDoneOrCurrent;
            return (
              <div key={node.seq} className="relative flex flex-col items-stretch">
                {!isLast ? (
                  <div
                    className="pointer-events-none absolute left-1/2 top-[48px] h-[68px] -translate-x-1/2"
                    aria-hidden
                  >
                    <svg width="100%" height="100%" viewBox="0 0 40 68" preserveAspectRatio="none">
                      <line
                        x1={i % 2 === 0 ? 34 : 6}
                        y1="0"
                        x2={i % 2 === 0 ? 6 : 34}
                        y2="68"
                        stroke={connectorGreen ? '#4CE3B2' : 'rgba(255,255,255,0.22)'}
                        strokeWidth="3"
                        strokeDasharray="6 8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => openLevel(node)}
                  disabled={node.status === 'locked'}
                  className={`relative z-[3] flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full text-[26px] font-black transition active:scale-95 ${
                    isCurrent ? 'text-white' : isDone ? 'text-white' : 'text-white/50'
                  } ${shift} ${
                    isCurrent
                      ? 'shadow-[0_18px_40px_-8px_rgba(76,141,255,0.7),0_0_0_12px_rgba(76,141,255,0.16)]'
                      : ''
                  }`}
                  style={
                    isCurrent
                      ? { background: 'linear-gradient(150deg, #5C97FF 0%, #2E6BF0 100%)' }
                      : isDone
                        ? {
                            background:
                              'linear-gradient(150deg, #4CE3B2 0%, #25D19A 55%, #1FC48C 100%)',
                            boxShadow: '0 14px 28px -8px rgba(37,209,154,0.5)',
                          }
                        : { background: 'linear-gradient(150deg, #3C4670 0%, #2B3454 100%)' }
                  }
                  aria-label={`Level ${node.seq}${node.status === 'locked' ? ' (yopiq)' : ''}`}
                >
                  {node.seq}
                </button>
                {!isLast ? <div className="h-[68px]" /> : null}
                {isFirst && !isLast ? null : null}
              </div>
            );
          })}
          <div
            className="pointer-events-none mx-auto mt-1 h-8 w-[3px] rounded-full"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.22) 0 6px, transparent 6px 14px)',
            }}
          />
        </div>
      </main>
    </div>
  );
}
