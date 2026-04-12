import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLessonTaskQuestions, type ApiQuestion } from '../api/lessonQuestions';
import { addUserPoints } from '../api/leaderboard';
import { setLessonTaskResult } from '../utils/lessonTaskResults';
import { resolveGrammarTaskFromPath } from '../utils/grammarTaskPaths';
import {
  parseChoicePayload,
  parseMatchingPayload,
  parseSentencePayload,
} from '../../shared/grammarQuestionContent';

type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };
type SentencePoolItem = { id: string; word: string; used: boolean };

/** `fill` / `choice` — bir xil JSON (`options` + `answer.value`); `reorder` ham shu shaklda, lekin so‘z banki bilan tekshiriladi. */
type NormChoice = { kind: 'choice' | 'fill'; prompt: string; options: string[]; correct: string };
type NormMatching = { kind: 'matching'; prompt: string; pairs: { left: string; right: string }[] };
type NormSentence = { kind: 'sentence' | 'reorder'; prompt: string; words: string[]; correct: string };
type NormTask = NormChoice | NormMatching | NormSentence;

function isWordBankTask(t: NormTask | undefined): t is NormSentence {
  return t != null && (t.kind === 'sentence' || t.kind === 'reorder');
}

function isChoiceLikeTask(t: NormTask | undefined): t is NormChoice {
  return t != null && (t.kind === 'choice' || t.kind === 'fill');
}

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

function buildMatchCards(pairs: { left: string; right: string }[]) {
  const left = pairs.map((pair, idx) => ({ id: `${idx}-l`, text: pair.left, pairId: idx, side: 'left' as const }));
  const rightBase = pairs.map((pair, idx) => ({ id: `${idx}-r`, text: pair.right, pairId: idx, side: 'right' as const }));
  const right = shuffle(rightBase);
  return { left: shuffle(left), right };
}

function normalizeQuestions(rows: ApiQuestion[]): NormTask[] {
  const out: NormTask[] = [];
  for (const q of rows) {
    const t = String(q.type ?? '').trim().toLowerCase();
    let added = false;

    if (t === 'choice' || t === 'fill') {
      const p = parseChoicePayload(q.content, q.answer);
      if (p) {
        out.push({
          kind: t === 'fill' ? 'fill' : 'choice',
          prompt: q.prompt || '',
          ...p,
        });
        added = true;
      }
    } else if (t === 'reorder') {
      const p = parseChoicePayload(q.content, q.answer);
      if (p) {
        out.push({
          kind: 'reorder',
          prompt: q.prompt || '',
          words: p.options,
          correct: p.correct,
        });
        added = true;
      }
    } else if (t === 'matching') {
      const p = parseMatchingPayload(q.content, q.answer);
      if (p) {
        out.push({ kind: 'matching', prompt: q.prompt || '', ...p });
        added = true;
      }
    } else if (t === 'sentence') {
      const p = parseSentencePayload(q.content, q.answer);
      if (p) {
        out.push({ kind: 'sentence', prompt: q.prompt || '', ...p });
        added = true;
      }
    }

    if (!added) {
      const pc = parseChoicePayload(q.content, q.answer);
      if (pc) {
        out.push({ kind: 'choice', prompt: q.prompt || '', ...pc });
        continue;
      }
      const pm = parseMatchingPayload(q.content, q.answer);
      if (pm) {
        out.push({ kind: 'matching', prompt: q.prompt || '', ...pm });
        continue;
      }
      const ps = parseSentencePayload(q.content, q.answer);
      if (ps) out.push({ kind: 'sentence', prompt: q.prompt || '', ...ps });
    }
  }
  return out;
}

export default function GrammarLessonTaskPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { token } = useAuth();

  const resolved = useMemo(() => resolveGrammarTaskFromPath(pathname), [pathname]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<NormTask[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');

  const [sentencePool, setSentencePool] = useState<SentencePoolItem[]>([]);
  const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);

  const [matchLeft, setMatchLeft] = useState<MatchCard[]>([]);
  const [matchRight, setMatchRight] = useState<MatchCard[]>([]);
  const [matchSelected, setMatchSelected] = useState<MatchCard | null>(null);
  const [matchWrongIds, setMatchWrongIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [matchLocked, setMatchLocked] = useState(false);

  const load = useCallback(async () => {
    if (!resolved || !token) {
      setLoading(false);
      setError(!resolved ? "Yo‘l noto‘g‘ri" : 'Kirish kerak');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await getLessonTaskQuestions(token, resolved.lessonPath, resolved.taskNumber);
      const norm = normalizeQuestions(rows);
      setTasks(norm);
      if (norm.length === 0) {
        if (rows.length === 0) {
          setError(
            "Bu topshiriq uchun ma'lumotlar bazasida savollar yo'q. `npm run extract:lesson-tasks && npm run import:lesson-tasks` yoki admin orqali savollarni qo'shing.",
          );
        } else {
          setError(
            "Savollar yuklandi, lekin ayrimlari `choice`, `fill`, `matching`, `sentence`, `reorder` dan boshqa turda yoki `content`/`answer` JSON noto‘g‘ri. Admin panelda tur va JSONni tekshiring.",
          );
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Yuklashda xato';
      setError(
        msg === 'Failed to fetch'
          ? "Serverga ulanib bo'lmadi (tarmoq yoki VPN). Internetni tekshiring yoki sahifani yangilang."
          : msg,
      );
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [resolved, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCurrentIndex(0);
    setFinished(false);
    setCorrectCount(0);
    setStatus('idle');
    setMessage('');
    setSelectedOption('');
  }, [tasks]);

  const currentTask = tasks[currentIndex];
  const progress = useMemo(
    () => ((currentIndex + (finished ? 1 : 0)) / Math.max(tasks.length, 1)) * 100,
    [currentIndex, finished, tasks.length],
  );

  useEffect(() => {
    if (!currentTask) return;
    setStatus('idle');
    setMessage('');
    if (isChoiceLikeTask(currentTask)) {
      setChoiceOptions(shuffle(currentTask.options));
      setSelectedOption('');
    }
    if (isWordBankTask(currentTask)) {
      setSentencePool(
        shuffle(currentTask.words).map((word, idx) => ({
          id: `${idx}-${word}`,
          word,
          used: false,
        })),
      );
      setSentenceAnswer([]);
    }
    if (currentTask.kind === 'matching') {
      const cards = buildMatchCards(currentTask.pairs);
      setMatchLeft(cards.left);
      setMatchRight(cards.right);
      setMatchSelected(null);
      setMatchWrongIds([]);
      setMatchedPairIds([]);
      setMatchLocked(false);
    }
  }, [currentIndex, currentTask]);

  const handleBack = () => {
    if (resolved) navigate(resolved.lessonPath);
    else navigate('/russian/grammar');
  };

  const handleNext = () => {
    const delta = status === 'correct' ? 1 : 0;
    const nextCorrect = correctCount + delta;
    if (delta) setCorrectCount(nextCorrect);
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex((p) => p + 1);
      return;
    }
    if (resolved && tasks.length > 0) {
      const total = tasks.length;
      setLessonTaskResult(resolved.lessonPath, resolved.taskNumber, nextCorrect, total);
      if (token) void addUserPoints(token, total);
      window.dispatchEvent(new Event('lesson-task-saved'));
    }
    setFinished(true);
  };

  const handleCheckSentence = () => {
    if (!isWordBankTask(currentTask)) return;
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const built = norm(sentenceAnswer.join(' '));
    const ok = built === norm(currentTask.correct);
    setStatus(ok ? 'correct' : 'wrong');
    setMessage(ok ? 'To‘g‘ri!' : 'Xato. Yana urinib ko‘ring.');
  };

  const handleMatchingClick = (card: MatchCard) => {
    if (!currentTask || currentTask.kind !== 'matching') return;
    if (matchLocked || status === 'correct') return;
    if (matchedPairIds.includes(card.pairId)) return;
    if (matchSelected?.id === card.id) return;

    if (!matchSelected) {
      setMatchSelected(card);
      return;
    }
    if (matchSelected.side === card.side) {
      setMatchSelected(card);
      return;
    }
    if (matchSelected.pairId === card.pairId) {
      const nextMatched = [...matchedPairIds, card.pairId];
      setMatchedPairIds(nextMatched);
      setMatchSelected(null);
      setMessage('To‘g‘ri!');
      if (nextMatched.length === matchLeft.length) {
        setStatus('correct');
      }
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
    if (!isWordBankTask(currentTask)) return;
    if (status === 'correct') return;
    if (item.used) return;
    if (status === 'wrong') {
      setStatus('idle');
      setMessage('');
    }
    setSentenceAnswer((prev) => [...prev, item.word]);
    setSentencePool((prev) => prev.map((poolItem, i) => (i === idx ? { ...poolItem, used: true } : poolItem)));
  };

  const clearSentence = () => {
    if (status === 'correct') return;
    if (status === 'wrong') {
      setStatus('idle');
      setMessage('');
    }
    setSentencePool((prev) => prev.map((item) => ({ ...item, used: false })));
    setSentenceAnswer([]);
  };

  if (!resolved) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <p className="text-slate-700">Yo‘l aniqlanmadi.</p>
        <button type="button" className="mt-4 text-blue-600 underline" onClick={() => navigate('/russian/grammar')}>
          Darslarga qaytish
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || tasks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <main className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <p className="font-semibold">Topshiriq</p>
          <p className="mt-2 text-sm">{error ?? "Savollar yo‘q."}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Orqaga
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          Orqaga
        </button>

        <div className="mt-4 rounded-2xl border border-indigo-100/90 bg-indigo-50/80 px-4 py-3 shadow-[0_6px_22px_rgba(99,102,241,0.1)] max-sm:border-0 max-sm:bg-indigo-50/60 max-sm:shadow-none">
          <p className="text-lg font-bold text-slate-900">Topshiriq {resolved.taskNumber}</p>
        </div>

        {!finished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {!finished && currentTask && (
          <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_36px_rgba(15,23,42,0.07)] sm:border-slate-200 sm:p-5 sm:shadow-[0_14px_40px_rgba(148,163,184,0.1)] max-sm:border-0 max-sm:shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            {currentTask.kind === 'sentence' ? (
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold text-slate-600">Gapni tuzing</p>
                <p className="text-2xl font-bold text-slate-900">
                  {currentTask.prompt.split(':').slice(1).join(':').trim() || currentTask.prompt}
                </p>
              </div>
            ) : currentTask.kind === 'reorder' ? (
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold text-slate-600">So‘zlarni to‘g‘ri tartiblang</p>
                <p className="text-lg font-bold text-slate-900">{currentTask.prompt}</p>
              </div>
            ) : (
              <p className="text-base font-semibold text-slate-900">{currentTask.prompt}</p>
            )}

            {isChoiceLikeTask(currentTask) && (
              <div className="mt-4 space-y-2">
                {currentTask.kind === 'fill' ? (
                  <p className="text-sm font-medium text-slate-600">Bo‘shliq uchun to‘g‘ri variantni tanlang</p>
                ) : null}
                {choiceOptions.map((option) => {
                  const isSelected = selectedOption === option;
                  const showCorrect = status === 'correct' && isSelected;
                  const showWrong = status === 'wrong' && isSelected;
                  const className = showCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : showWrong
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (status === 'correct') return;
                        setSelectedOption(option);
                        const ok = option === currentTask.correct;
                        setStatus(ok ? 'correct' : 'wrong');
                        setMessage(ok ? 'To‘g‘ri!' : `Noto‘g‘ri. To‘g‘ri javob: ${currentTask.correct}`);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all active:scale-[0.98] max-sm:border-slate-200/70 sm:shadow-none ${className}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {currentTask.kind === 'matching' && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  {matchLeft.map((card) => {
                    const isSelected = matchSelected?.id === card.id;
                    const isWrong = matchWrongIds.includes(card.id);
                    const isMatched = matchedPairIds.includes(card.pairId);
                    const stateClass = isMatched
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : isWrong
                        ? 'border-red-400 bg-red-50'
                        : isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-slate-50';
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleMatchingClick(card)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left text-sm font-semibold shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all sm:shadow-none ${stateClass}`}
                      >
                        {card.text}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  {matchRight.map((card) => {
                    const isSelected = matchSelected?.id === card.id;
                    const isWrong = matchWrongIds.includes(card.id);
                    const isMatched = matchedPairIds.includes(card.pairId);
                    const stateClass = isMatched
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : isWrong
                        ? 'border-red-400 bg-red-50'
                        : isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-slate-50';
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleMatchingClick(card)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left text-sm font-semibold shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all sm:shadow-none ${stateClass}`}
                      >
                        {card.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isWordBankTask(currentTask) && (
              <div className="mt-5 space-y-4">
                <div className="min-h-[3rem] rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/90 px-3 py-3 text-center text-lg font-semibold text-slate-900 max-sm:border-slate-300/60 max-sm:bg-slate-50">
                  {sentenceAnswer.length ? sentenceAnswer.join(' ') : '—'}
                </div>
                <div
                  className={`grid w-full gap-2 ${
                    sentencePool.length <= 1
                      ? 'grid-cols-1'
                      : sentencePool.length === 2
                        ? 'grid-cols-2'
                        : sentencePool.length === 4
                          ? 'grid-cols-2'
                          : 'grid-cols-3'
                  }`}
                >
                  {sentencePool.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.used}
                      onClick={() => moveWordToAnswer(item, idx)}
                      className={`flex min-h-11 w-full items-center justify-center break-words rounded-2xl border border-indigo-200/70 bg-white px-2 py-2.5 text-center text-sm font-semibold leading-snug shadow-[0_4px_16px_rgba(99,102,241,0.08)] transition-all active:scale-[0.98] sm:min-h-12 sm:border-indigo-200 sm:px-3 sm:shadow-none ${
                        item.used ? 'cursor-not-allowed opacity-30' : 'text-indigo-700 hover:bg-indigo-50'
                      }`}
                    >
                      {item.word}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={clearSentence}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Tozalash
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckSentence}
                    disabled={status === 'correct'}
                    className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Tekshirish
                  </button>
                </div>
              </div>
            )}

            {message ? <p className="mt-4 text-center text-sm font-medium text-slate-600">{message}</p> : null}

            {status !== 'idle' && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  {currentIndex < tasks.length - 1 ? 'Keyingisi' : 'Yakunlash'}
                </button>
              </div>
            )}
          </div>
        )}

        {finished ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-lg font-bold text-emerald-900">Tabriklaymiz!</p>
            <p className="mt-2 text-sm text-emerald-800">
              Natija: {correctCount} / {tasks.length}
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-4 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white"
            >
              Darsga qaytish
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
