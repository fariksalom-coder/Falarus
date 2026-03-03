import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ChoiceTask = { type: 'choice'; prompt: string; options: string[]; correct: string };
type SentenceTask = { type: 'sentence'; prompt: string; words: string[]; correct: string };
type MatchingTask = { type: 'matching'; prompt: string; pairs: { left: string; right: string }[] };
type Task = ChoiceTask | SentenceTask | MatchingTask;

type MatchCard = { id: string; text: string; pairId: number; side: 'left' | 'right' };
type SentencePoolItem = { id: string; word: string; used: boolean };

const TASKS: Task[] = [
  { type: 'choice', prompt: 'Sifat qaysi savolga javob beradi?', options: ['Кто?', 'Какой?', 'Сколько?'], correct: 'Какой?' },
  { type: 'choice', prompt: 'дом uchun to‘g‘ri shaklni tanlang', options: ['большая дом', 'большой дом', 'большое дом'], correct: 'большой дом' },
  { type: 'choice', prompt: 'книга uchun to‘g‘ri shakl', options: ['новая книга', 'новый книга', 'новое книга'], correct: 'новая книга' },
  { type: 'choice', prompt: 'молоко uchun to‘g‘ri shakl', options: ['вкусный молоко', 'вкусное молоко', 'вкусная молоко'], correct: 'вкусное молоко' },
  { type: 'choice', prompt: 'Ko‘plikdagi to‘g‘ri shakl', options: ['новые книги', 'новая книги', 'новый книги'], correct: 'новые книги' },
  { type: 'choice', prompt: 'Qaysi antonim to‘g‘ri?', options: ['новый — старый', 'новый — длинный', 'новый — добрый'], correct: 'новый — старый' },
  { type: 'choice', prompt: 'Qaysi antonim to‘g‘ri?', options: ['трудный — лёгкий', 'трудный — высокий', 'трудный — новый'], correct: 'трудный — лёгкий' },
  { type: 'choice', prompt: 'Какая? savoliga mos so‘zni tanlang', options: ['большая', 'большой', 'большое'], correct: 'большая' },
  { type: 'choice', prompt: 'Какое? savoliga mos so‘zni tanlang', options: ['лёгкий', 'лёгкое', 'лёгкая'], correct: 'лёгкое' },
  { type: 'choice', prompt: 'Какие? savoliga mos so‘zni tanlang', options: ['старые', 'старый', 'старая'], correct: 'старые' },

  { type: 'sentence', prompt: 'Gapni tuzing: Kichik bola', words: ['маленький', 'мальчик', 'маленькая'], correct: 'маленький мальчик' },
  { type: 'sentence', prompt: 'Gapni tuzing: Yangi mashina', words: ['новая', 'машина', 'новый'], correct: 'новая машина' },
  { type: 'sentence', prompt: 'Gapni tuzing: Toza sut', words: ['чистое', 'молоко', 'чистый'], correct: 'чистое молоко' },
  { type: 'sentence', prompt: 'Gapni tuzing: Katta uy', words: ['большой', 'дом', 'большая'], correct: 'большой дом' },
  { type: 'sentence', prompt: 'Gapni tuzing: Qiziqarli kitob', words: ['интересная', 'книга', 'интересный'], correct: 'интересная книга' },
  { type: 'sentence', prompt: 'Gapni tuzing: Yaxshi odam', words: ['хороший', 'человек', 'хорошая'], correct: 'хороший человек' },
  { type: 'sentence', prompt: 'Gapni tuzing: Katta muammo', words: ['большая', 'проблема', 'большой'], correct: 'большая проблема' },
  { type: 'sentence', prompt: 'Gapni tuzing: Yengil masala', words: ['лёгкая', 'задача', 'лёгкий'], correct: 'лёгкая задача' },
  { type: 'sentence', prompt: 'Gapni tuzing: Eski uylar', words: ['старые', 'дома', 'старый'], correct: 'старые дома' },
  { type: 'sentence', prompt: 'Gapni tuzing: Foydali maslahat', words: ['полезный', 'совет', 'полезная'], correct: 'полезный совет' },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu mening telefonim, bu esa sening kitobing.',
    words: ['это', 'это', 'мой', 'твоя', 'телефон', 'книга', 'а', 'моя'],
    correct: 'это мой телефон а это твоя книга',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu mening katta uyim, bu esa uning kichik uyi.',
    words: ['это', 'это', 'мой', 'его', 'маленький', 'большой', 'дом', 'дом', 'а'],
    correct: 'это мой большой дом а это его маленький дом',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu bizning yangi maktabimiz, bu esa sizning eski maktabingiz.',
    words: ['это', 'это', 'наша', 'ваша', 'новая', 'старая', 'школа', 'школа', 'а'],
    correct: 'это наша новая школа а это ваша старая школа',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu uning qiziqarli kitobi, bu esa mening yangi kitobim.',
    words: ['это', 'это', 'его', 'моя', 'интересная', 'новая', 'книга', 'книга', 'а'],
    correct: 'это его интересная книга а это моя новая книга',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu sening chiroyli mashinang, bu esa mening eski mashinam.',
    words: ['это', 'это', 'твоя', 'моя', 'красивая', 'старая', 'машина', 'машина', 'а'],
    correct: 'это твоя красивая машина а это моя старая машина',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu bizning katta shaharimiz, bu esa ularning kichik shahri.',
    words: ['это', 'это', 'наш', 'их', 'маленький', 'большой', 'город', 'город', 'а'],
    correct: 'это наш большой город а это их маленький город',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu mening yangi telefonim va uning eski telefoni.',
    words: ['это', 'это', 'мой', 'его', 'новый', 'старый', 'телефон', 'телефон', 'и'],
    correct: 'это мой новый телефон и это его старый телефон',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu sizning yaxshi o‘qituvchingiz, bu esa bizning yangi o‘qituvchimiz.',
    words: ['это', 'это', 'ваш', 'наш', 'хороший', 'новый', 'учитель', 'учитель', 'а'],
    correct: 'это ваш хороший учитель а это наш новый учитель',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu mening issiq choyim, bu esa sening sovuq suving.',
    words: ['это', 'это', 'мой', 'твоя', 'горячий', 'холодная', 'чай', 'вода', 'а'],
    correct: 'это мой горячий чай а это твоя холодная вода',
  },
  {
    type: 'sentence',
    prompt: 'Gapni tuzing: Bu uning katta uyi va ularning kichik uyi.',
    words: ['это', 'это', 'его', 'их', 'большой', 'маленький', 'дом', 'дом', 'и'],
    correct: 'это его большой дом и это их маленький дом',
  },

  {
    type: 'matching',
    prompt: 'Juftini toping (antonimlar)',
    pairs: [
      { left: 'новый', right: 'старый' },
      { left: 'дорогой', right: 'дешёвый' },
      { left: 'богатый', right: 'бедный' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping (antonimlar)',
    pairs: [
      { left: 'длинный', right: 'короткий' },
      { left: 'светлый', right: 'тёмный' },
      { left: 'трудный', right: 'лёгкий' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping (antonimlar)',
    pairs: [
      { left: 'холодный', right: 'горячий' },
      { left: 'сложный', right: 'простой' },
      { left: 'интересный', right: 'скучный' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping (rodga moslashuv)',
    pairs: [
      { left: 'дом', right: 'большой' },
      { left: 'книга', right: 'большая' },
      { left: 'море', right: 'большое' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping (rodga moslashuv)',
    pairs: [
      { left: 'мальчик', right: 'добрый' },
      { left: 'машина', right: 'новая' },
      { left: 'пальто', right: 'новое' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping (rodga moslashuv)',
    pairs: [
      { left: 'сумка', right: 'маленькая' },
      { left: 'телефон', right: 'дорогой' },
      { left: 'часы', right: 'новые' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'Какой?', right: 'мужской род' },
      { left: 'Какая?', right: 'женский род' },
      { left: 'Какое?', right: 'средний род' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'старый', right: 'старое' },
      { left: 'новый', right: 'новая' },
      { left: 'лёгкий', right: 'лёгкие' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'молоко', right: 'вкусное' },
      { left: 'проблема', right: 'сложная' },
      { left: 'книга', right: 'интересная' },
    ],
  },
  {
    type: 'matching',
    prompt: 'Juftini toping',
    pairs: [
      { left: 'высокий', right: 'низкий' },
      { left: 'хороший', right: 'плохой' },
      { left: 'первый', right: 'последний' },
    ],
  },
];

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildMatchCards = (pairs: MatchingTask['pairs']) => {
  const left = pairs.map((pair, idx) => ({ id: `${idx}-l`, text: pair.left, pairId: idx, side: 'left' as const }));
  const right = shuffle(pairs.map((pair, idx) => ({ id: `${idx}-r`, text: pair.right, pairId: idx, side: 'right' as const })));
  return { left: shuffle(left), right };
};

export default function UnifiedLessonNinePracticePage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
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

  const currentTask = TASKS[currentIndex];
  const progress = useMemo(() => ((currentIndex + (finished ? 1 : 0)) / TASKS.length) * 100, [currentIndex, finished]);

  useEffect(() => {
    const task = TASKS[currentIndex];
    setStatus('idle');
    setMessage('');

    if (task.type === 'choice') {
      setChoiceOptions(shuffle(task.options));
      setSelectedOption('');
    }

    if (task.type === 'sentence') {
      setSentencePool(
        shuffle(task.words).map((word, idx) => ({
          id: `${idx}-${word}`,
          word,
          used: false,
        }))
      );
      setSentenceAnswer([]);
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
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < TASKS.length - 1) setCurrentIndex((prev) => prev + 1);
    else setFinished(true);
  };

  const handleMatchingClick = (card: MatchCard) => {
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
    if (status === 'correct' || item.used) return;
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/lesson-9')}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Orqaga
        </button>

        {!finished && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {!finished && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            {currentTask.type === 'sentence' ? (
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold text-slate-600">Gapni tuzing</p>
                <p className="text-2xl font-bold text-slate-900">
                  {currentTask.prompt.split(':').slice(1).join(':').trim() || currentTask.prompt}
                </p>
              </div>
            ) : (
              <p className="text-base font-semibold text-slate-900">{currentTask.prompt}</p>
            )}

            {currentTask.type === 'choice' && (
              <div className="mt-4 space-y-2">
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
                    const isSelected = matchSelected?.id === card.id;
                    const isWrong = matchWrongIds.includes(card.id);
                    const isMatched = matchedPairIds.includes(card.pairId);
                    const stateClass = isMatched
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : isWrong
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleMatchingClick(card)}
                        className={`w-full rounded-2xl border px-3 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${stateClass}`}
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
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300';
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleMatchingClick(card)}
                        className={`w-full rounded-2xl border px-3 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${stateClass}`}
                      >
                        {card.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentTask.type === 'sentence' && (
              <div className="mt-4">
                <div
                  className={`min-h-16 rounded-2xl border px-3 py-3 ${
                    status === 'idle'
                      ? 'border-slate-300 bg-slate-50'
                      : status === 'correct'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  {sentenceAnswer.length > 0 ? (
                    <p className="text-sm font-semibold text-slate-900">{sentenceAnswer.join(' ')}</p>
                  ) : (
                    <p className="text-sm text-slate-400">Javob shu yerda yig‘iladi...</p>
                  )}
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={clearSentence}
                    disabled={status === 'correct' || sentenceAnswer.length === 0}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-all ${
                        item.used
                          ? 'border-slate-200 bg-white text-transparent cursor-default'
                          : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]'
                      }`}
                    >
                      {item.used ? '\u00A0' : item.word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {message && (
              <p className={`mt-4 text-sm font-bold ${status === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>
            )}

            {currentTask.type === 'sentence' && status !== 'correct' && (
              <button
                type="button"
                onClick={() => {
                  const built = sentenceAnswer.join(' ').trim();
                  const ok = built === currentTask.correct;
                  setStatus(ok ? 'correct' : 'wrong');
                  setMessage(ok ? 'To‘g‘ri!' : `Noto‘g‘ri. To‘g‘ri javob: ${currentTask.correct}`);
                }}
                disabled={sentenceAnswer.length === 0}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tekshirish
              </button>
            )}

            {((currentTask.type === 'choice' && status !== 'idle') || (currentTask.type === 'sentence' && status === 'correct') ||
              (currentTask.type === 'matching' && status === 'correct')) && (
              <button
                type="button"
                onClick={handleNext}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {currentIndex < TASKS.length - 1 ? 'Keyingi' : 'Yakunlash'}
              </button>
            )}
          </div>
        )}

        {finished && (
          <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-5">
            <p className="text-lg font-bold text-emerald-700">Mashq tugadi! Barakalla!</p>
            <p className="mt-2 text-emerald-700">Tabriklaymiz! Siz mashqni tugatdingiz.</p>
          </div>
        )}
      </main>
    </div>
  );
}
