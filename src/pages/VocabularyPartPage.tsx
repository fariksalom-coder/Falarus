import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, BookMarked, House, User, ChevronRight, Layers, ClipboardList, Puzzle, Check, Play, Lock } from 'lucide-react';
import { getSubtopicContent, VocabularyEntry } from '../data/vocabularyContent';
import {
  addLearned,
  addPartLearned,
  setLastPartId,
  getPartResultCount,
  setPartResultCount,
  getStageStatus,
  setStageStatus,
  type StageStatus,
} from '../utils/vocabProgress';
import { useAuth } from '../context/AuthContext';
import { saveVocabularyPartProgress, fetchVocabularyProgress } from '../api/vocabularyProgress';

type Mode = 'cards' | 'test' | 'pairs';

function StageStatusIcon({ status }: { status: StageStatus }) {
  if (status === 'completed') return <Check className="h-4 w-4 text-emerald-600" />;
  if (status === 'in_progress') return <Play className="h-4 w-4 text-indigo-600" />;
  return <Lock className="h-4 w-4 text-slate-400" />;
}

const shuffle = <T,>(items: T[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const groupByRules = (entries: VocabularyEntry[]) => {
  const groups: VocabularyEntry[][] = [];
  let i = 0;
  while (i < entries.length) {
    const remain = entries.length - i;
    if (remain <= 6 && remain !== 1) {
      groups.push(entries.slice(i));
      break;
    }
    groups.push(entries.slice(i, i + 5));
    i += 5;
  }
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    const last = groups.pop();
    if (last) groups[groups.length - 1].push(last[0]);
  }
  return groups;
};

export default function VocabularyPartPage() {
  const navigate = useNavigate();
  const { topicId, subtopicId, partId, mode: modeParam } = useParams();
  const { token } = useAuth();
  const content = getSubtopicContent(topicId, subtopicId);
  const part = content?.parts.find((item) => item.id === partId);

  const mode: Mode | null =
    modeParam === 'cards' || modeParam === 'test' || modeParam === 'pairs' ? modeParam : null;
  const isExerciseScreen = mode !== null;
  const partUrl = `/vocabulary/${content?.topicId}/${content?.subtopicId}/${partId}`;

  useEffect(() => {
    if (content?.topicId && content?.subtopicId && part?.id) {
      setLastPartId(content.topicId, content.subtopicId, part.id);
    }
  }, [content?.topicId, content?.subtopicId, part?.id]);

  useEffect(() => {
    fetchVocabularyProgress(token);
  }, [token]);

  useEffect(() => {
    if (content?.topicId && content?.subtopicId && part?.id && mode) {
      setStageStatus(content.topicId, content.subtopicId, part.id, mode, 'in_progress');
    }
  }, [content?.topicId, content?.subtopicId, part?.id, mode]);

  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) return;
    if (mode === 'cards' && cardIndex >= (part.entries?.length ?? 0) && (part.entries?.length ?? 0) > 0) {
      setStageStatus(content.topicId, content.subtopicId, part.id, 'cards', 'completed');
      saveVocabularyPartProgress(token, content.topicId, content.subtopicId, part.id, {
        stage_cards: 'completed',
      });
    }
  }, [content?.topicId, content?.subtopicId, part?.id, mode, cardIndex, part?.entries?.length, token]);

  const testQuestions = useMemo(() => {
    if (!part) return [];
    return part.entries.map((entry, index) => {
      const pool = part.entries.filter((e) => e.russian !== entry.russian).map((e) => e.russian);
      const distractors = shuffle(Array.from(new Set(pool))).slice(0, 3);
      const options = shuffle([entry.russian, ...distractors]);
      return { id: `${index}`, uzbek: entry.uzbek, options, correct: entry.russian };
    });
  }, [part]);

  const [testIndex, setTestIndex] = useState(0);
  const [testSelected, setTestSelected] = useState<string | null>(null);
  const [testCorrect, setTestCorrect] = useState(0);

  const pairGroups = useMemo(() => {
    if (!part) return [];
    return groupByRules(part.entries).map((group, idx) => ({
      id: idx,
      pairs: group,
      left: shuffle(group.map((p, i) => ({ id: `${idx}-l-${i}`, pairId: i, text: p.russian }))),
      right: shuffle(group.map((p, i) => ({ id: `${idx}-r-${i}`, pairId: i, text: p.uzbek }))),
    }));
  }, [part]);

  const [pairGroupIndex, setPairGroupIndex] = useState(0);
  const [pairSelectedLeft, setPairSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [pairMessage, setPairMessage] = useState('');
  const [wrongPairIds, setWrongPairIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) return;
    if (mode === 'test' && testIndex >= testQuestions.length && testQuestions.length > 0) {
      setStageStatus(content.topicId, content.subtopicId, part.id, 'test', 'completed');
      setPartResultCount(content.topicId, content.subtopicId, part.id, part.entries.length, part.entries.length);
      saveVocabularyPartProgress(token, content.topicId, content.subtopicId, part.id, {
        result_count: part.entries.length,
        stage_test: 'completed',
      });
    }
  }, [content?.topicId, content?.subtopicId, part?.id, mode, testIndex, testQuestions.length, part?.entries.length, token]);

  useEffect(() => {
    if (!content?.topicId || !content?.subtopicId || !part?.id) return;
    if (mode === 'pairs' && pairGroupIndex >= pairGroups.length && pairGroups.length > 0) {
      setStageStatus(content.topicId, content.subtopicId, part.id, 'pairs', 'completed');
      setPartResultCount(content.topicId, content.subtopicId, part.id, part.entries.length, part.entries.length);
      saveVocabularyPartProgress(token, content.topicId, content.subtopicId, part.id, {
        result_count: part.entries.length,
        stage_pairs: 'completed',
      });
    }
  }, [content?.topicId, content?.subtopicId, part?.id, mode, pairGroupIndex, pairGroups.length, part?.entries.length, token]);

  if (!content || !part) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold text-slate-900">Qism topilmadi.</p>
          <button
            type="button"
            onClick={() => navigate('/vocabulary')}
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Orqaga
          </button>
        </div>
      </div>
    );
  }

  const currentCard = part.entries[cardIndex];
  const currentTest = testQuestions[testIndex];
  const currentGroup = pairGroups[pairGroupIndex];

  const onCardAction = (known: boolean) => {
    if (known) {
      setKnownCount((v) => v + 1);
      if (content?.topicId && content?.subtopicId && part) {
        addLearned(content.topicId, content.subtopicId, 1);
        addPartLearned(
          content.topicId,
          content.subtopicId,
          part.id,
          1,
          part.entries.length
        );
      }
    } else setUnknownCount((v) => v + 1);
    setCardFlipped(false);
    setCardIndex((i) => i + 1);
  };

  const onTestChoose = (option: string) => {
    if (!currentTest || testSelected) return;
    setTestSelected(option);
    if (option === currentTest.correct) setTestCorrect((v) => v + 1);
  };

  const onTestNext = () => {
    setTestSelected(null);
    setTestIndex((i) => i + 1);
  };

  const onPickLeft = (id: string) => setPairSelectedLeft(id);

  const onPickRight = (id: string) => {
    if (!currentGroup || !pairSelectedLeft) return;
    if (matched.includes(id)) return;
    const left = currentGroup.left.find((l) => l.id === pairSelectedLeft);
    const right = currentGroup.right.find((r) => r.id === id);
    if (!left || !right) return;
    if (left.pairId === right.pairId) {
      setMatched((m) => [...m, left.id, right.id]);
      setPairMessage("To'g'ri!");
      setPairSelectedLeft(null);
    } else {
      setPairMessage("Xato, yana urinib ko'ring.");
      setWrongPairIds([left.id, right.id]);
      setTimeout(() => {
        setWrongPairIds(null);
        setPairSelectedLeft(null);
        setPairMessage('');
      }, 600);
    }
  };

  const onNextGroup = () => {
    setPairGroupIndex((i) => i + 1);
    setMatched([]);
    setPairSelectedLeft(null);
    setPairMessage('');
    setWrongPairIds(null);
  };

  const isGroupDone = currentGroup ? matched.length === currentGroup.pairs.length * 2 : false;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <header
        className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm"
        style={{ borderColor: '#E2E8F0' }}
      >
        <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between px-4">
          <button type="button" aria-label="Bosh sahifa" onClick={() => navigate('/')} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <House className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold tracking-tight text-slate-800">So&apos;zlar</h1>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Lug'at" onClick={() => navigate('/vocabulary')} className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: '#6366F1' }}>
              <BookMarked className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Statistika" onClick={() => navigate('/course-map')} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <BarChart3 className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Profil" onClick={() => navigate('/profile')} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-4 py-8">
        <button
          type="button"
          onClick={() => navigate(isExerciseScreen ? partUrl : `/vocabulary/${content.topicId}/${content.subtopicId}`)}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}
        >
          ← Orqaga
        </button>

        {!isExerciseScreen && (() => {
          if (!content || !part) return null;
          const total = part.entries?.length ?? 0;
          const resultCount = getPartResultCount(content.topicId, content.subtopicId, part.id);
          const stages: { mode: Mode; title: string; icon: typeof Layers }[] = [
            { mode: 'cards', title: "Tanishish (kartochkalar)", icon: Layers },
            { mode: 'test', title: 'Test', icon: ClipboardList },
            { mode: 'pairs', title: "Juftini topish", icon: Puzzle },
          ];
          const stageStatus = (m: Mode): StageStatus => {
            if (m === 'cards') return getStageStatus(content.topicId, content.subtopicId, part.id, 'cards');
            return getStageStatus(content.topicId, content.subtopicId, part.id, m);
          };
          const statusLabel = (s: StageStatus) => (s === 'completed' ? "Tugallangan" : s === 'in_progress' ? "Jarayonda" : "Boshlanmagan");

          return (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Natija: <span className="font-semibold text-slate-900">{resultCount} / {total}</span> so&apos;z
              </p>
              <div className="space-y-4">
                {stages.map((stage, idx) => {
                  const status = stageStatus(stage.mode);
                  const Icon = stage.icon;
                  return (
                    <button
                      key={stage.mode}
                      type="button"
                      onClick={() => navigate(`${partUrl}/${stage.mode}`)}
                      className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200/80 hover:shadow-md"
                      style={{ borderColor: '#E2E8F0' }}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-105">
                        <Icon className="h-6 w-6" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium" style={{ color: '#64748B' }}>{idx + 1}-bosqich</p>
                        <p className="mt-0.5 font-semibold" style={{ color: '#0F172A' }}>{stage.title}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: '#64748B' }}>
                          <StageStatusIcon status={status} />
                          <span>{statusLabel(status)}</span>
                        </div>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                        <ChevronRight className="h-5 w-5" strokeWidth={2} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          );
        })()}

        {mode === 'cards' && (
          <div
            className="mx-auto max-w-[720px]"
            style={{ backgroundColor: '#F8FAFC' }}
          >
            {currentCard ? (
              <>
                {/* Progress */}
                <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
                  {cardIndex + 1} / {part.entries.length} so&apos;z
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((cardIndex + 1) / part.entries.length) * 100}%`,
                      backgroundColor: '#6366F1',
                    }}
                  />
                </div>

                {/* Flip card */}
                <div className="mt-4" style={{ perspective: '1000px' }}>
                  <button
                    type="button"
                    onClick={() => setCardFlipped((v) => !v)}
                    className="relative h-64 w-full cursor-pointer overflow-hidden rounded-[20px]"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] border bg-white p-10 shadow-lg transition-transform duration-500 ease-out"
                      style={{
                        borderColor: '#E2E8F0',
                        transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
                        <span className="mr-1.5 text-base" aria-hidden>🇺🇿</span>
                        O&apos;zbekcha
                      </p>
                      <p className="mt-4 text-center text-3xl font-bold" style={{ color: '#0F172A' }}>
                        {currentCard.uzbek}
                      </p>
                    </div>
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] border bg-white p-10 shadow-lg transition-transform duration-500 ease-out"
                      style={{
                        borderColor: '#E2E8F0',
                        transform: cardFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
                        <span className="mr-1.5 text-base" aria-hidden>🇷🇺</span>
                        Ruscha
                      </p>
                      <p className="mt-4 text-center text-3xl font-bold" style={{ color: '#0F172A' }}>
                        {currentCard.russian}
                      </p>
                    </div>
                  </button>
                </div>

                <p className="mt-4 text-center text-xs" style={{ color: '#64748B' }}>
                  Kartochkani aylantirish uchun bosing
                </p>

                {/* Action buttons */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => onCardAction(false)}
                    className="rounded-[14px] border-2 py-5 text-lg font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      borderColor: '#FECACA',
                      backgroundColor: '#FEF2F2',
                      color: '#EF4444',
                    }}
                  >
                    Bilmayman
                  </button>
                  <button
                    type="button"
                    onClick={() => onCardAction(true)}
                    className="rounded-[14px] border-2 py-5 text-lg font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      borderColor: '#BBF7D0',
                      backgroundColor: '#F0FDF4',
                      color: '#22C55E',
                    }}
                  >
                    Bilaman
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-[20px] border bg-white p-12 text-center shadow-sm" style={{ borderColor: '#E2E8F0' }}>
                <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
                  Kartochkalar tugadi
                </p>
                <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
                  Bilaman: {knownCount} | Bilmayman: {unknownCount}
                </p>
              </div>
            )}
          </div>
        )}

        {mode === 'test' && (
          <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
            {currentTest ? (
              <>
                <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
                  {testIndex + 1} / {testQuestions.length} savol
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((testIndex + 1) / testQuestions.length) * 100}%`,
                      backgroundColor: '#6366F1',
                    }}
                  />
                </div>

                <div
                  className="mt-6 rounded-[20px] border bg-white p-8 text-center shadow-md"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>
                    So&apos;zni tarjimasini tanlang
                  </p>
                  <p className="mt-4 text-3xl font-bold" style={{ color: '#0F172A' }}>
                    {currentTest.uzbek}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {currentTest.options.map((opt) => {
                    const isSelected = testSelected === opt;
                    const isCorrect = testSelected && opt === currentTest.correct;
                    const isWrong = isSelected && testSelected !== currentTest.correct;
                    const baseCls = 'w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium transition-all duration-200';
                    const cls = isCorrect
                      ? `${baseCls} border-[#22C55E] bg-[#F0FDF4] text-[#166534]`
                      : isWrong
                        ? `${baseCls} border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]`
                        : testSelected
                          ? `${baseCls} border-[#E2E8F0] bg-white text-[#64748B] opacity-80`
                          : `${baseCls} border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-sm`;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!!testSelected}
                        onClick={() => onTestChoose(opt)}
                        className={cls}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {testSelected && (
                  <button
                    type="button"
                    onClick={onTestNext}
                    className="mt-6 w-full rounded-[14px] py-4 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ backgroundColor: '#6366F1' }}
                  >
                    Keyingi savol →
                  </button>
                )}
              </>
            ) : (
              <div
                className="rounded-[20px] border bg-white p-12 text-center shadow-sm"
                style={{ borderColor: '#E2E8F0' }}
              >
                <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
                  Test tugadi
                </p>
                <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
                  To&apos;g&apos;ri: {testCorrect} / {testQuestions.length}
                </p>
              </div>
            )}
          </div>
        )}

        {mode === 'pairs' && (
          <div className="mx-auto max-w-[720px]" style={{ backgroundColor: '#F8FAFC' }}>
            <style>{`
              @keyframes pair-shake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-6px); }
                40% { transform: translateX(6px); }
                60% { transform: translateX(-4px); }
                80% { transform: translateX(4px); }
              }
              .pair-shake { animation: pair-shake 0.5s ease-in-out; }
            `}</style>
            {currentGroup ? (
              <>
                <p className="text-center text-sm font-medium" style={{ color: '#64748B' }}>
                  Guruh {pairGroupIndex + 1} / {pairGroups.length}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pairGroups.length > 0 ? ((pairGroupIndex + 1) / pairGroups.length) * 100 : 0}%`,
                      backgroundColor: '#6366F1',
                    }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {currentGroup.left.map((left) => {
                      const done = matched.includes(left.id);
                      const selected = pairSelectedLeft === left.id;
                      const isWrong = wrongPairIds?.includes(left.id);
                      const cardCls = `w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium shadow-sm transition-all duration-200 ${done ? 'border-[#22C55E] bg-[#F0FDF4] text-[#166534] cursor-default' : isWrong ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C] pair-shake' : selected ? 'border-[#6366F1] bg-[#EEF2FF] text-[#0F172A]' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-md'}`;
                      return (
                        <button
                          key={left.id}
                          type="button"
                          disabled={done}
                          onClick={() => onPickLeft(left.id)}
                          className={cardCls}
                        >
                          {left.text}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-3">
                    {currentGroup.right.map((right) => {
                      const done = matched.includes(right.id);
                      const isWrong = wrongPairIds?.includes(right.id);
                      const cardCls = `w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-medium shadow-sm transition-all duration-200 ${done ? 'border-[#22C55E] bg-[#F0FDF4] text-[#166534] cursor-default' : isWrong ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C] pair-shake' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#6366F1] hover:bg-[#EEF2FF] hover:shadow-md'}`;
                      return (
                        <button
                          key={right.id}
                          type="button"
                          disabled={done}
                          onClick={() => onPickRight(right.id)}
                          className={cardCls}
                        >
                          {right.text}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {pairMessage && (
                  <p className="mt-4 text-center text-sm font-medium" style={{ color: pairMessage.includes("To'g'ri") ? '#166534' : '#B91C1C' }}>
                    {pairMessage}
                  </p>
                )}

                {isGroupDone && (
                  <div className="mt-8">
                    <p className="text-center text-xl font-semibold" style={{ color: '#0F172A' }}>
                      Ajoyib! 🎉
                    </p>
                    <button
                      type="button"
                      onClick={onNextGroup}
                      className="mt-4 w-full rounded-[14px] py-4 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ backgroundColor: '#6366F1' }}
                    >
                      {pairGroupIndex + 1 === pairGroups.length ? 'Tugatish' : 'Keyingi guruh →'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div
                className="rounded-[20px] border bg-white p-12 text-center shadow-sm"
                style={{ borderColor: '#E2E8F0' }}
              >
                <p className="text-xl font-semibold" style={{ color: '#0F172A' }}>
                  Juftliklar tugadi
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
