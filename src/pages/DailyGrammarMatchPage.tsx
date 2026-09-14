import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import type { DailyCourseMatchSet } from '../../shared/dailyCourseDay';
import { xaritaYoli } from '../utils/kunlikNavigation';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { isKunlikGrammarFullyDone } from '../../shared/kunlikProgressMerge';
import { playCorrectSound, playWrongSound } from '../utils/sound';
import { sameMatchText } from '../../shared/matchPairAnswer';

type MatchCard = {
  id: string;
  text: string;
  pairId: number;
  side: 'left' | 'right';
  /** Chap karta uchun — shu juftning to'g'ri o'ng matni (taqqoslash uchun). */
  partnerText: string;
};

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Bir ekranda ko‘rinadigan juftlar soni (mobil uchun). */
const PAIRS_PER_SCREEN = 4;

function buildMatchCards(pairs: { left: string; right: string }[], chunkKey: string) {
  const left = pairs.map((pair, idx) => ({
    id: `${chunkKey}-${idx}-l`,
    text: pair.left,
    pairId: idx,
    side: 'left' as const,
    partnerText: pair.right,
  }));
  const rightBase = pairs.map((pair, idx) => ({
    id: `${chunkKey}-${idx}-r`,
    text: pair.right,
    pairId: idx,
    side: 'right' as const,
    partnerText: pair.left,
  }));
  const right = shuffle(rightBase);
  return { left: shuffle(left), right };
}

function chunkPairsForBlock(pairs: { left: string; right: string }[]): { left: string; right: string }[][] {
  const out: { left: string; right: string }[][] = [];
  for (let i = 0; i < pairs.length; i += PAIRS_PER_SCREEN) {
    out.push(pairs.slice(i, i + PAIRS_PER_SCREEN));
  }
  return out;
}

const EMPTY_PAIRS: { left: string; right: string }[] = [];

export default function DailyGrammarMatchPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const gateEnabled = isValidDailyCourseDay(dayNumber);
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);
  const backPath = `/kunlik-reja/kun/${dayNumber}/grammatika`;
  const { getDay, loaded: kunlikLoaded, patchDay } = useKunlikProgress();
  const grammar2PatchSent = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchSets, setMatchSets] = useState<DailyCourseMatchSet[]>([]);

  const [blockIndex, setBlockIndex] = useState(0);
  const [chunkSubIndex, setChunkSubIndex] = useState(0);
  const [matchLeft, setMatchLeft] = useState<MatchCard[]>([]);
  const [matchRight, setMatchRight] = useState<MatchCard[]>([]);
  const [matchSelected, setMatchSelected] = useState<MatchCard | null>(null);
  const [matchWrongIds, setMatchWrongIds] = useState<string[]>([]);
  // Juft indeksi emas, KARTA id'lari saqlanadi: bir xil matnli kartalar
  // kesishib juftlashishi mumkin (masalan uchta "были"), shunda chap va o'ng
  // kartaning pairId'si har xil bo'ladi.
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);
  const [matchLocked, setMatchLocked] = useState(false);
  const [blockComplete, setBlockComplete] = useState(false);
  const [finished, setFinished] = useState(false);
  /** Oxirgi blokdan keyin progress serverga yozilmoqda — tugma ikki marta bosilmasin. */
  const [advancing, setAdvancing] = useState(false);
  const [hint, setHint] = useState('');
  const [ruleMcqsCount, setRuleMcqsCount] = useState(0);

  const load = useCallback(async () => {
    if (!token || !isValidDailyCourseDay(dayNumber)) {
      setLoading(false);
      setError(!token ? t('auth.loginRequired') : t('kunlik.invalidDay'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bundle = await getDailyCourseDay(token, dayNumber);
      setRuleMcqsCount(bundle.grammar?.ruleMcqs?.length ?? 0);
      const sets = bundle.grammar?.matchSets ?? [];
      const nonEmpty = sets.filter((s) => s.pairs.length > 0);
      setMatchSets(nonEmpty);
      if (nonEmpty.length === 0) {
        setError(sets.length === 0 ? 'Bu kun uchun juftlik topshiriqlari yo‘q.' : 'Juftliklar bo‘sh.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xato');
      setRuleMcqsCount(0);
      setMatchSets([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setBlockIndex(0);
    setChunkSubIndex(0);
    setFinished(false);
    setBlockComplete(false);
    grammar2PatchSent.current = false;
  }, [matchSets]);

  useEffect(() => {
    if (!kunlikLoaded || loading || error || matchSets.length === 0) return;
    const row = getDay(dayNumber);
    if (isKunlikGrammarFullyDone(row)) return;
    if (ruleMcqsCount > 0 && !row.grammar_1) {
      navigate(backPath, { replace: true });
    }
  }, [kunlikLoaded, loading, error, matchSets.length, ruleMcqsCount, dayNumber, getDay, navigate, backPath]);

  useEffect(() => {
    if (!finished || grammar2PatchSent.current) return;
    grammar2PatchSent.current = true;
    patchDay(dayNumber, { grammar_2: true });
  }, [finished, dayNumber, patchDay]);

  const totalChunks = useMemo(
    () =>
      matchSets.reduce((acc, s) => acc + Math.max(1, Math.ceil(s.pairs.length / PAIRS_PER_SCREEN)), 0),
    [matchSets],
  );

  const chunksBeforeCurrentBlock = useMemo(() => {
    let n = 0;
    for (let bi = 0; bi < blockIndex; bi += 1) {
      const len = matchSets[bi]?.pairs.length ?? 0;
      n += Math.max(1, Math.ceil(len / PAIRS_PER_SCREEN));
    }
    return n;
  }, [matchSets, blockIndex]);

  const pairsInCurrentBlock = useMemo(
    () => matchSets[blockIndex]?.pairs ?? EMPTY_PAIRS,
    [matchSets, blockIndex],
  );

  const chunksInCurrentBlock = useMemo(() => chunkPairsForBlock(pairsInCurrentBlock), [pairsInCurrentBlock]);

  const currentPairs = chunksInCurrentBlock[chunkSubIndex] ?? [];

  const chunkKey = `${blockIndex}-${chunkSubIndex}`;

  useEffect(() => {
    if (currentPairs.length === 0 || finished) return;
    const cards = buildMatchCards(currentPairs, chunkKey);
    setMatchLeft(cards.left);
    setMatchRight(cards.right);
    setMatchSelected(null);
    setMatchWrongIds([]);
    setMatchedCardIds([]);
    setMatchLocked(false);
    setBlockComplete(false);
    setHint('');
  }, [chunkKey, finished, currentPairs]);

  const progress = useMemo(() => {
    if (finished) return 100;
    const completed = chunksBeforeCurrentBlock + chunkSubIndex + (blockComplete ? 1 : 0);
    return Math.min(100, (completed / Math.max(totalChunks, 1)) * 100);
  }, [chunksBeforeCurrentBlock, chunkSubIndex, blockComplete, finished, totalChunks]);

  const handleMatchingClick = (card: MatchCard) => {
    if (blockComplete || finished) return;
    if (matchLocked) return;
    if (matchedCardIds.includes(card.id)) return;
    if (matchSelected?.id === card.id) return;

    if (!matchSelected) {
      setMatchSelected(card);
      setHint('');
      return;
    }
    if (matchSelected.side === card.side) {
      setMatchSelected(card);
      return;
    }
    // Taqqoslash MATN bo'yicha: chap kartaning kutilgan javobi tanlangan o'ng
    // karta matniga teng bo'lsa — to'g'ri. Juft indeksiga qarab bo'lmaydi,
    // aks holda bir xil matnli kartalarda o'quvchi to'g'ri javob bersa ham
    // "noto'g'ri" olardi (shared/matchPairAnswer.ts izohiga qarang).
    const leftCard = matchSelected.side === 'left' ? matchSelected : card;
    const rightCard = matchSelected.side === 'left' ? card : matchSelected;
    if (sameMatchText(leftCard.partnerText, rightCard.text)) {
      const nextMatched = [...matchedCardIds, leftCard.id, rightCard.id];
      setMatchedCardIds(nextMatched);
      setMatchSelected(null);
      setHint("To'g'ri!");
      playCorrectSound();
      // Har juftlik 2 ta karta yopadi.
      if (nextMatched.length >= matchLeft.length * 2) {
        setBlockComplete(true);
      }
      return;
    }
    setHint("Noto'g'ri. Boshqa juftni tanlang.");
    playWrongSound();
    setMatchWrongIds([matchSelected.id, card.id]);
    setMatchLocked(true);
    setTimeout(() => {
      setMatchWrongIds([]);
      setMatchSelected(null);
      setMatchLocked(false);
      setHint('');
    }, 650);
  };

  const handleNextChunkOrBlock = async () => {
    if (!blockComplete || advancing) return;
    const nChunksInBlock = Math.max(1, Math.ceil(pairsInCurrentBlock.length / PAIRS_PER_SCREEN));

    if (chunkSubIndex < nChunksInBlock - 1) {
      setChunkSubIndex((i) => i + 1);
      return;
    }
    if (blockIndex < matchSets.length - 1) {
      setBlockIndex((i) => i + 1);
      setChunkSubIndex(0);
      return;
    }
    // «gap-tuzish» mount bo'lishi bilan grammar_2 ni serverdan tekshiradi —
    // shuning uchun patch yozilib bo'lgunicha o'tilmaydi.
    setAdvancing(true);
    await patchDay(dayNumber, { grammar_2: true });
    navigate(`/kunlik-reja/kun/${dayNumber}/grammatika/gap-tuzish`, { replace: true });
  };

  const nextButtonLabel = (() => {
    const nChunksInBlock = Math.max(1, Math.ceil(pairsInCurrentBlock.length / PAIRS_PER_SCREEN));
    if (chunkSubIndex < nChunksInBlock - 1) return 'Keyingisi';
    if (blockIndex < matchSets.length - 1) return 'Keyingisi';
    return 'Yakunlash';
  })();

  const chunkPositionLabel =
    chunksInCurrentBlock.length > 1
      ? `${chunkSubIndex + 1}/${chunksInCurrentBlock.length} qism`
      : null;

  const pillClass = (card: MatchCard) => {
    const isSelected = matchSelected?.id === card.id;
    const isWrong = matchWrongIds.includes(card.id);
    const isMatched = matchedCardIds.includes(card.id);
    const base =
      'grammar-heading min-h-[50px] w-full rounded-full border-[1.5px] px-4 py-3 text-center text-[15px] transition-all active:scale-[0.98]';
    if (isMatched) return `${base} border-[#82E5B8] bg-[#DCFCE7] text-[#0F7C3A] shadow-[0_6px_14px_-8px_rgba(34,197,94,0.35)]`;
    if (isWrong) return `${base} border-[#F5B5B5] bg-[#FEEBEB] text-[#B4282E]`;
    if (isSelected) return `${base} border-[#5B4CE0] bg-[#EDE9FB] text-[#2D1B69] shadow-[0_0_0_4px_rgba(91,76,224,0.14)]`;
    return `${base} border-[#DDD7F5] bg-white text-[#2D1B69] shadow-[0_4px_10px_-6px_rgba(45,27,105,0.08)]`;
  };

  const handleBack = () => navigate(backPath);

  if (!isValidDailyCourseDay(dayNumber)) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <p className="text-gray-700">{t('common.pageNotFound')}</p>
        <button type="button" className="mt-4 text-[#0B2A6B] underline" onClick={() => navigate(xaritaYoli())}>
          {t('kunlik.backToPlan')}
        </button>
      </div>
    );
  }

  if (gatePending) {
    return <KunlikSequentialGateSpinner />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0B2A6B] border-t-transparent" />
      </div>
    );
  }

  if (error || matchSets.length === 0) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm">{error ?? 'Maʼlumot yo‘q.'}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 min-h-[44px] rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
          >
            {t('common.back')}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="grammar-theme min-h-screen pb-28">
      <main className="mx-auto w-full max-w-lg px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[#DDD7F5] bg-white text-[#2D1B69] shadow-[0_4px_10px_rgba(91,76,224,0.08)]"
            aria-label={t('common.back')}
          >
            ‹
          </button>
          <p className="grammar-heading flex-1 text-[16px] leading-none text-[#2D1B69]">
            Grammatika · Juftini toping
          </p>
        </div>

        {!finished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #8B7AF7, #5B4CE0)',
              }}
            />
          </div>
        )}

        {!finished ? (
          <div className="mt-5 rounded-[24px] border border-[#DDD7F5] bg-white p-4 shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)] sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
              VAZIFA 2 · JUFTINI TOPING
            </p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="grammar-heading text-[22px] leading-tight text-[#2D1B69]">Mos juftni tanlang</h2>
              {chunkPositionLabel ? (
                <span className="text-xs font-black tabular-nums text-[#8B7FAB]">{chunkPositionLabel}</span>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-3.5">
              <div className="flex flex-col gap-3">
                {matchLeft.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      if (!matchedCardIds.includes(card.id)) handleMatchingClick(card);
                    }}
                    className={`${pillClass(card)} ${matchedCardIds.includes(card.id) ? 'cursor-default' : ''}`}
                  >
                    {card.text}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                {matchRight.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      if (!matchedCardIds.includes(card.id)) handleMatchingClick(card);
                    }}
                    className={`${pillClass(card)} ${matchedCardIds.includes(card.id) ? 'cursor-default' : ''}`}
                  >
                    {card.text}
                  </button>
                ))}
              </div>
            </div>

            {hint ? (
              <div className="mt-4 flex justify-center">
                <span
                  key={`hint-${hint}-${matchedCardIds.length}`}
                  className={`${matchLocked || matchWrongIds.length ? 'msg-shake' : 'msg-pop'} rounded-full px-4 py-2 text-sm font-black ${
                    blockComplete
                      ? 'bg-[#DCFCE7] text-[#0F7C3A] shadow-[0_6px_14px_-8px_rgba(34,197,94,0.35)]'
                      : matchLocked || matchWrongIds.length
                        ? 'bg-[#FEEBEB] text-[#B4282E] shadow-[0_6px_14px_-8px_rgba(180,40,46,0.35)]'
                        : 'bg-[#EDE9FB] text-[#5B4CE0]'
                  }`}
                >
                  {blockComplete ? '✓' : matchLocked || matchWrongIds.length ? '✕' : '👆'} {hint}
                </span>
              </div>
            ) : null}

            {blockComplete ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => void handleNextChunkOrBlock()}
                  disabled={advancing}
                  className="grammar-heading min-h-[50px] rounded-full bg-[#22C55E] px-8 py-3 text-[15px] text-white shadow-[0_14px_28px_-10px_rgba(34,197,94,0.55)] disabled:opacity-70"
                >
                  {advancing ? 'Saqlanmoqda…' : nextButtonLabel}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] p-6 text-center shadow-[0_14px_30px_-14px_rgba(34,197,94,0.25)]">
            <p className="grammar-heading text-[22px] text-[#0F7C3A]">Yaxshi! 🎉</p>
            <p className="mt-2 text-sm font-black text-[#0F7C3A]">Barcha juftliklar topildi.</p>
            <button
              type="button"
              onClick={handleBack}
              className="grammar-heading mt-5 min-h-[50px] rounded-full bg-[#22C55E] px-8 py-3 text-[15px] text-white shadow-[0_14px_28px_-10px_rgba(34,197,94,0.55)]"
            >
              Grammatikaga qaytish
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
