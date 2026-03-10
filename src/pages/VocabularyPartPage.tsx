import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, BookMarked, House, User } from 'lucide-react';
import { getSubtopicContent, VocabularyEntry } from '../data/vocabularyContent';

type Mode = 'cards' | 'test' | 'pairs';

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
  const { topicId, subtopicId, partId } = useParams();
  const content = getSubtopicContent(topicId, subtopicId);
  const part = content?.parts.find((item) => item.id === partId);

  const [mode, setMode] = useState<Mode>('cards');

  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

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
    if (known) setKnownCount((v) => v + 1);
    else setUnknownCount((v) => v + 1);
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
    } else {
      setPairMessage('Xato, yana urinib ko‘ring.');
    }
    setPairSelectedLeft(null);
  };

  const onNextGroup = () => {
    setPairGroupIndex((i) => i + 1);
    setMatched([]);
    setPairSelectedLeft(null);
    setPairMessage('');
  };

  const isGroupDone = currentGroup ? matched.length === currentGroup.pairs.length * 2 : false;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="w-full flex items-center justify-center gap-2">
          <button type="button" aria-label="Главная" onClick={() => navigate('/')} className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"><House className="w-5 h-5 text-slate-600" /></button>
          <button type="button" aria-label="Словарь" onClick={() => navigate('/vocabulary')} className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center"><BookMarked className="w-5 h-5 text-white" /></button>
          <button type="button" aria-label="Статистика" onClick={() => navigate('/course-map')} className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"><BarChart3 className="w-5 h-5 text-slate-600" /></button>
          <button type="button" aria-label="Профиль" onClick={() => navigate('/profile')} className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"><User className="w-5 h-5 text-slate-600" /></button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <button
          type="button"
          onClick={() => navigate(`/vocabulary/${content.topicId}/${content.subtopicId}`)}
          className="mb-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Orqaga
        </button>

        <h2 className="text-lg font-bold text-slate-900">{part.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{part.entries.length} ta so'z</p>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setMode('cards')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'cards' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>Карточки</button>
          <button type="button" onClick={() => setMode('test')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'test' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>Тест</button>
          <button type="button" onClick={() => setMode('pairs')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'pairs' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>Пары</button>
        </div>

        {mode === 'cards' && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            {currentCard ? (
              <>
                <p className="text-sm text-slate-500">
                  {cardIndex + 1} / {part.entries.length}
                </p>
                <button
                  type="button"
                  onClick={() => setCardFlipped((v) => !v)}
                  className="mt-3 w-full rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-8 text-center"
                >
                  <p className="text-xs text-slate-500">{cardFlipped ? 'Русский' : 'Uzbek (latin)'}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{cardFlipped ? currentCard.russian : currentCard.uzbek}</p>
                </button>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => onCardAction(false)} className="rounded-xl border border-red-200 bg-red-50 py-2.5 font-semibold text-red-700 hover:bg-red-100">Не знаю</button>
                  <button type="button" onClick={() => onCardAction(true)} className="rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-100">Знаю</button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="font-semibold text-slate-900">Карточки закончились</p>
                <p className="mt-2 text-sm text-slate-500">Знаю: {knownCount} | Не знаю: {unknownCount}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'test' && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            {currentTest ? (
              <>
                <p className="text-sm text-slate-500">{testIndex + 1} / {testQuestions.length}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{currentTest.uzbek}</p>
                <div className="mt-4 space-y-2">
                  {currentTest.options.map((opt) => {
                    const isSelected = testSelected === opt;
                    const isCorrect = testSelected && opt === currentTest.correct;
                    const isWrong = isSelected && testSelected !== currentTest.correct;
                    const cls = isCorrect
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : isWrong
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
                    return (
                      <button key={opt} type="button" disabled={!!testSelected} onClick={() => onTestChoose(opt)} className={`w-full rounded-xl border px-4 py-2.5 text-left font-medium ${cls}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {testSelected && (
                  <button type="button" onClick={onTestNext} className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">
                    Keyingisi
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="font-semibold text-slate-900">Тест закончен</p>
                <p className="mt-2 text-sm text-slate-500">To'g'ri: {testCorrect} / {testQuestions.length}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'pairs' && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            {currentGroup ? (
              <>
                <p className="text-sm text-slate-500">Guruh {pairGroupIndex + 1} / {pairGroups.length}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    {currentGroup.left.map((left) => {
                      const done = matched.includes(left.id);
                      return (
                        <button
                          key={left.id}
                          type="button"
                          disabled={done}
                          onClick={() => onPickLeft(left.id)}
                          className={`w-full rounded-xl border px-3 py-2 text-left font-medium ${done ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : pairSelectedLeft === left.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        >
                          {left.text}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    {currentGroup.right.map((right) => {
                      const done = matched.includes(right.id);
                      return (
                        <button
                          key={right.id}
                          type="button"
                          disabled={done}
                          onClick={() => onPickRight(right.id)}
                          className={`w-full rounded-xl border px-3 py-2 text-left font-medium ${done ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        >
                          {right.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {pairMessage && <p className="mt-3 text-sm text-center text-slate-600">{pairMessage}</p>}
                {isGroupDone && (
                  <button type="button" onClick={onNextGroup} className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">
                    {pairGroupIndex + 1 === pairGroups.length ? 'Tugatish' : 'Keyingi'}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="font-semibold text-slate-900">Пары закончились</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
