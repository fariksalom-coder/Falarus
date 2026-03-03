import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
export type MatchingTask = { type: 'matching'; prompt: string; pairs: { left: string; right: string }[] };
export type SentenceTask = { type: 'sentence'; prompt: string; words: string[]; correct: string };
export type Task = ChoiceTask | MatchingTask | SentenceTask;

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

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const checkSentence = (built: string, correct: string) => {
  const b = normalize(built);
  const c = normalize(correct);
  if (b === c) return true;
  if (correct.endsWith('?') && b === normalize(correct.slice(0, -1))) return true;
  return false;
};

type Props = { tasks: Task[]; backPath?: string };

export default function LessonFourteenTaskRunner({ tasks: TASKS, backPath = '/lesson-14' }: Props) {
  const navigate = useNavigate();
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
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [matchLocked, setMatchLocked] = useState(false);
  const [sentencePool, setSentencePool] = useState<SentencePoolItem[]>([]);
  const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);

  const currentTask = TASKS[currentIndex];
  const progress = useMemo(() => ((currentIndex + (finished ? 1 : 0)) / TASKS.length) * 100, [currentIndex, finished, TASKS.length]);

  useEffect(() => {
    const task = TASKS[currentIndex];
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
      setMatchedPairIds([]);
      setMatchLocked(false);
    }
    if (task.type === 'sentence') {
      setSentencePool(shuffle(task.words).map((word, idx) => ({ id: `${idx}-${word}`, word, used: false })));
      setSentenceAnswer([]);
    }
  }, [currentIndex, TASKS]);

  const handleNext = () => {
    if (currentIndex < TASKS.length - 1) setCurrentIndex((prev) => prev + 1);
    else setFinished(true);
  };

  const handleMatchingClick = (card: MatchCard) => {
    if (currentTask.type !== 'matching') return;
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
      if (nextMatched.length === matchLeft.length) setStatus('correct');
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
              {currentTask.type === 'choice' ? 'To‘g‘ri variantni tanlang.' : currentTask.type === 'matching' ? 'Juftini toping.' : 'Gapni rus tiliga tarjima qiling.'}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 text-center">{currentTask.prompt}</p>
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
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-3">
                  {matchLeft.map((card) => {
                    const isMatched = matchedPairIds.includes(card.pairId);
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
                    const isMatched = matchedPairIds.includes(card.pairId);
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
                {currentIndex < TASKS.length - 1 ? 'Keyingi' : 'Yakunlash'}
              </button>
            )}
          </div>
        )}
        {finished && (
          <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-5">
            <p className="text-lg font-bold text-emerald-700">Mashq tugadi! Barakalla!</p>
          </div>
        )}
      </main>
    </div>
  );
}
