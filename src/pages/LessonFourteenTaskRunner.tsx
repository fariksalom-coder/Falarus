import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setLessonTaskResult } from '../utils/lessonTaskResults';
import { addUserPoints } from '../api/leaderboard';
import { getLessonQuestions, postUserAnswer } from '../api/lessonQuestions';
import { useAuth } from '../context/AuthContext';

export type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
export type MatchingTask = {
  type: 'matching';
  prompt: string;
  pairs: { left: string; right: string }[];
  allowDuplicateRightMatches?: boolean;
};
export type SentenceTask = { type: 'sentence'; prompt: string; words: string[]; correct: string };
export type Task = ChoiceTask | MatchingTask | SentenceTask;
type RuntimeTask = Task & { questionId?: number };

type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };
type SentencePoolItem = { id: string; word: string; used: boolean };

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildMatchCards = (pairs: { left: string; right: string }[]) => {
  const left = pairs.map((pair, idx) => ({ id: `${idx}-l`, text: pair.left, pairId: idx, side: 'left' as const }));
  const right = shuffle(pairs.map((pair, idx) => ({ id: `${idx}-r`, text: pair.right, pairId: idx, side: 'right' as const })));
  return { left: shuffle(left), right };
};

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .replace(/\s+/g, ' ');
const checkSentence = (built: string, correct: string) => {
  const b = normalize(built);
  const c = normalize(correct);
  return b === c;
};
const readStringAnswer = (answer: Record<string, unknown>): string => {
  const value = answer.value;
  if (typeof value === 'string' && value.trim()) return value;
  const legacy = answer.correct;
  if (typeof legacy === 'string') return legacy;
  return '';
};
const renderPrompt = (text: string) =>
  text.split(/(【[^】]+】)/g).map((part, idx) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      return <strong key={`${part}-${idx}`}>{part.slice(1, -1)}</strong>;
    }
    return <span key={`${part}-${idx}`}>{part}</span>;
  });

type Props = {
  tasks: Task[];
  backPath?: string;
  sentenceInstruction?: string;
  lessonPath?: string;
  taskNumber?: number;
  token?: string | null;
};

export default function LessonFourteenTaskRunner({
  tasks: TASKS,
  backPath = '/lesson-14',
  sentenceInstruction = 'Gapni rus tiliga tarjima qiling.',
  lessonPath,
  taskNumber,
  token,
}: Props) {
  const navigate = useNavigate();
  const { token: authToken } = useAuth();
  const effectiveToken = token ?? authToken;
  const [runtimeTasks, setRuntimeTasks] = useState<RuntimeTask[]>(TASKS);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [matchLeft, setMatchLeft] = useState<MatchCard[]>([]);
  const [matchRight, setMatchRight] = useState<MatchCard[]>([]);
  const [matchSelected, setMatchSelected] = useState<MatchCard | null>(null);
  const [matchWrongIds, setMatchWrongIds] = useState<string[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);
  const [matchLocked, setMatchLocked] = useState(false);
  const [sentencePool, setSentencePool] = useState<SentencePoolItem[]>([]);
  const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const currentTask = runtimeTasks[currentIndex];
  const progress = useMemo(() => ((currentIndex + (finished ? 1 : 0)) / Math.max(1, runtimeTasks.length)) * 100, [currentIndex, finished, runtimeTasks.length]);

  useEffect(() => {
    setRuntimeTasks(TASKS);
  }, [TASKS]);

  useEffect(() => {
    if (!effectiveToken || !lessonPath) return;
    const lessonIdMatch = lessonPath.match(/\/lesson-(\d+)/);
    const lessonId = lessonIdMatch ? Number(lessonIdMatch[1]) : null;
    if (!lessonId) return;

    setLoadingTasks(true);
    setTasksError(null);
    getLessonQuestions(effectiveToken, lessonId)
      .then((rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const mapped = rows
          .map((row) => {
            if (row.type === 'matching') {
              const pairs = Array.isArray((row.content as { pairs?: unknown }).pairs)
                ? ((row.content as { pairs: { left: string; right: string }[] }).pairs ?? [])
                : [];
              return { type: 'matching', prompt: row.prompt, pairs, questionId: row.id } as RuntimeTask;
            }
            if (row.type === 'sentence') {
              const words = Array.isArray((row.content as { words?: unknown }).words)
                ? ((row.content as { words: string[] }).words ?? [])
                : [];
              const correct = readStringAnswer(row.answer);
              return { type: 'sentence', prompt: row.prompt, words, correct, questionId: row.id } as RuntimeTask;
            }
            const options = Array.isArray((row.content as { options?: unknown }).options)
              ? ((row.content as { options: string[] }).options ?? [])
              : [];
            const correct = readStringAnswer(row.answer);
            return { type: 'choice', prompt: row.prompt, options, correct, questionId: row.id } as RuntimeTask;
          })
          .filter((task) => Boolean(task.prompt));

        if (mapped.length > 0) {
          setRuntimeTasks(mapped);
          setCurrentIndex(0);
          setFinished(false);
          setCorrectCount(0);
        }
      })
      .catch((err) => {
        setTasksError(err instanceof Error ? err.message : 'Savollar yuklanmadi');
      })
      .finally(() => setLoadingTasks(false));
  }, [effectiveToken, lessonPath, TASKS]);

  useEffect(() => {
    const task = runtimeTasks[currentIndex];
    if (!task) return;
    setStatus('idle');
    setMessage('');
    if (task.type === 'choice') {
      setSelectedOption('');
      setChoiceOptions(shuffle(task.options));
    }
    if (task.type === 'matching') {
      const cards = buildMatchCards(task.pairs);
      setMatchLeft(cards.left);
      setMatchRight(cards.right);
      setMatchSelected(null);
      setMatchWrongIds([]);
      setMatchedCardIds([]);
      setMatchedPairsCount(0);
      setMatchLocked(false);
    }
    if (task.type === 'sentence') {
      setSentencePool(shuffle(task.words).map((word, idx) => ({ id: `${idx}-${word}`, word, used: false })));
      setSentenceAnswer([]);
    }
  }, [currentIndex, runtimeTasks]);

  const handleNext = () => {
    if (status === 'correct') setCorrectCount((c) => c + 1);
    if (currentIndex < runtimeTasks.length - 1) setCurrentIndex((prev) => prev + 1);
    else setFinished(true);
  };

  const handleMatchingClick = (card: MatchCard) => {
    if (currentTask.type !== 'matching') return;
    if (matchLocked || status === 'correct') return;
    if (matchedCardIds.includes(card.id)) return;
    if (matchSelected?.id === card.id) return;
    if (!matchSelected) {
      setMatchSelected(card);
      return;
    }
    if (matchSelected.side === card.side) {
      setMatchSelected(card);
      return;
    }
    const leftCard = matchSelected.side === 'left' ? matchSelected : card;
    const rightCard = matchSelected.side === 'right' ? matchSelected : card;
    const samePair = matchSelected.pairId === card.pairId;
    const duplicateRightAllowed =
      currentTask.allowDuplicateRightMatches && rightCard.text === currentTask.pairs[leftCard.pairId]?.right;

    if (samePair || duplicateRightAllowed) {
      const nextCount = matchedPairsCount + 1;
      setMatchedCardIds((prev) => [...prev, matchSelected.id, card.id]);
      setMatchedPairsCount(nextCount);
      setMatchSelected(null);
      setMessage('To‘g‘ri!');
      if (nextCount === matchLeft.length) setStatus('correct');
      return;
    }
    setMessage('Xato. Yana urinib ko‘ring.');
    setMatchWrongIds([matchSelected.id, card.id]);
    setMatchLocked(true);
    setTimeout(() => {
      setMatchWrongIds([]);
      setMatchSelected(null);
      setMatchLocked(false);
    }, 1000);
  };

  const moveWordToAnswer = (item: SentencePoolItem, idx: number) => {
    if (currentTask.type !== 'sentence') return;
    if (status === 'correct' || item.used) return;
    if (status === 'wrong') {
      setStatus('idle');
      setMessage('');
    }
    setSentenceAnswer((prev) => [...prev, item.word]);
    setSentencePool((prev) => prev.map((poolItem, i) => (i === idx ? { ...poolItem, used: true } : poolItem)));
  };

  const clearSentence = () => {
    if (currentTask.type !== 'sentence') return;
    if (status === 'correct') return;
    if (status === 'wrong') {
      setStatus('idle');
      setMessage('');
    }
    setSentencePool((prev) => prev.map((item) => ({ ...item, used: false })));
    setSentenceAnswer([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <button type="button" onClick={() => navigate(backPath)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
          Orqaga
        </button>
        {!finished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
        {!finished && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-600 text-center">
              {currentTask.type === 'choice' ? 'To‘g‘ri variantni tanlang.' : currentTask.type === 'matching' ? 'Juftini toping.' : sentenceInstruction}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 text-center">{renderPrompt(currentTask.prompt)}</p>
            {currentTask.type === 'choice' && (
              <div className="mt-4 space-y-2">
                {choiceOptions.map((option) => {
                  const isSelected = selectedOption === option;
                  const showCorrect = status === 'correct' && isSelected;
                  const showWrong = status === 'wrong' && isSelected;
                  const className = showCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : showWrong ? 'border-red-500 bg-red-50 text-red-700' : isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (status === 'correct') return;
                        setSelectedOption(option);
                        const ok = option === currentTask.correct;
                        if (effectiveToken && lessonPath && currentTask.questionId) {
                          const lessonId = Number(lessonPath.match(/\/lesson-(\d+)/)?.[1] ?? 0);
                          if (lessonId > 0) {
                            postUserAnswer(effectiveToken, lessonId, {
                              question_id: currentTask.questionId,
                              answer: { selected: option },
                              is_correct: ok,
                            }).catch(() => {});
                          }
                        }
                        setStatus(ok ? 'correct' : 'wrong');
                        setMessage(ok ? 'To‘g‘ri!' : `Noto‘g‘ri. To‘g‘ri javob: ${currentTask.correct}`);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98] ${className}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
            {currentTask.type === 'matching' && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  {matchLeft.map((card) => {
                    const isMatched = matchedCardIds.includes(card.id);
                    const isWrong = matchWrongIds.includes(card.id);
                    const isSelected = matchSelected?.id === card.id;
                    const stateClass = isMatched ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : isWrong ? 'border-red-500 bg-red-50 text-red-700' : isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                    return (
                      <button key={card.id} type="button" onClick={() => handleMatchingClick(card)} className={`w-full rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98] ${stateClass}`}>
                        {card.text}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  {matchRight.map((card) => {
                    const isMatched = matchedCardIds.includes(card.id);
                    const isWrong = matchWrongIds.includes(card.id);
                    const isSelected = matchSelected?.id === card.id;
                    const stateClass = isMatched ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : isWrong ? 'border-red-500 bg-red-50 text-red-700' : isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                    return (
                      <button key={card.id} type="button" onClick={() => handleMatchingClick(card)} className={`w-full rounded-2xl border px-3 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${stateClass}`}>
                        {card.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {currentTask.type === 'sentence' && (
              <div className="mt-4">
                <div className={`min-h-16 rounded-2xl border px-3 py-3 ${status === 'idle' ? 'border-slate-300 bg-slate-50' : status === 'correct' ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'}`}>
                  {sentenceAnswer.length > 0 ? <p className="text-sm font-semibold text-slate-900">{sentenceAnswer.join(' ')}</p> : <p className="text-sm text-slate-400">Javob shu yerda yig‘iladi...</p>}
                </div>
                <div className="mt-3">
                  <button type="button" onClick={clearSentence} disabled={status === 'correct' || sentenceAnswer.length === 0} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    Tozalash
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sentencePool.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => moveWordToAnswer(item, idx)}
                      disabled={item.used || status === 'correct'}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-all ${item.used ? 'border-slate-200 bg-white text-transparent cursor-default' : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]'}`}
                    >
                      {item.used ? '\u00A0' : item.word}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {message && <p className={`mt-4 text-sm font-bold ${status === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>}
            {currentTask.type === 'sentence' && status !== 'correct' && (
              <button
                type="button"
                onClick={() => {
                  const built = sentenceAnswer.join(' ').trim();
                  const ok = checkSentence(built, currentTask.correct);
                  if (effectiveToken && lessonPath && currentTask.questionId) {
                    const lessonId = Number(lessonPath.match(/\/lesson-(\d+)/)?.[1] ?? 0);
                    if (lessonId > 0) {
                      postUserAnswer(effectiveToken, lessonId, {
                        question_id: currentTask.questionId,
                        answer: { built },
                        is_correct: ok,
                      }).catch(() => {});
                    }
                  }
                  setStatus(ok ? 'correct' : 'wrong');
                  setMessage(ok ? 'To‘g‘ri!' : `Noto‘g‘ri. To‘g‘ri javob: ${currentTask.correct}`);
                }}
                disabled={sentenceAnswer.length === 0}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tekshirish
              </button>
            )}
            {((currentTask.type === 'choice' && status !== 'idle') || (currentTask.type === 'matching' && status === 'correct') || (currentTask.type === 'sentence' && status === 'correct')) && (
              <button type="button" onClick={handleNext} className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                {currentIndex < runtimeTasks.length - 1 ? 'Keyingi' : 'Yakunlash'}
              </button>
            )}
          </div>
        )}
        {loadingTasks && <p className="mt-4 text-sm text-slate-500">Savollar yuklanmoqda...</p>}
        {!loadingTasks && tasksError && <p className="mt-4 text-sm text-red-600">{tasksError}</p>}
        {finished && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-6 shadow-sm">
            <p className="text-lg font-bold text-slate-900">Natija</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">
              To‘g‘ri javoblar: {correctCount} / {runtimeTasks.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {runtimeTasks.length > 0 ? Math.round((correctCount / runtimeTasks.length) * 100) : 0}%
            </p>
            <p className="mt-3 text-sm font-semibold" style={{ color: '#0F172A' }}>
              Siz {correctCount} ball oldingiz!
            </p>
            <button
              type="button"
              onClick={() => {
                if (lessonPath != null && taskNumber != null && runtimeTasks.length > 0) {
                  setLessonTaskResult(lessonPath, taskNumber, correctCount, runtimeTasks.length);
                  if (effectiveToken) {
                    addUserPoints(effectiveToken, correctCount);
                  }
                }
                navigate(backPath);
              }}
              className={`mt-6 w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white transition-colors ${
                runtimeTasks.length > 0 && correctCount / runtimeTasks.length >= 0.8
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              Tugatish
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
