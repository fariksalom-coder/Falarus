import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { getDailyCourseDay } from '../api/dailyCourse';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import { dailyMcqsToChoiceTasks, type DailyChoiceOption, type DailyChoiceTask } from '../utils/dailyGrammarMcqs';
import {
  answerGrammarQuestion,
  fetchGrammarMistakes,
  finishGrammarTest,
  startGrammarTest,
  type GrammarMistake,
} from '../api/kunlikProgress';
import { kunlikRejaPath } from '../utils/kunlikNavigation';
import { useRememberKunlikDay } from '../hooks/useRememberKunlikDay';
import {
  KunlikSequentialGateSpinner,
  useKunlikSequentialGate,
} from '../hooks/useKunlikSequentialGate';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { playCorrectSound, playWrongSound } from '../utils/sound';

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function DailyGrammarRuleMcqPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const dayNumber = Number(dayNum ?? '');
  useRememberKunlikDay(dayNumber);
  const gateEnabled = isValidDailyCourseDay(dayNumber);
  const { gatePending } = useKunlikSequentialGate(dayNumber, gateEnabled);
  const { patchDay } = useKunlikProgress();
  const grammar1PatchSent = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DailyChoiceTask[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);

  const [choiceOptions, setChoiceOptions] = useState<DailyChoiceOption[]>([]);
  /** Javob serverga ketayotganda ikkinchi marta bosilmasin. */
  const [checking, setChecking] = useState(false);
  const [mistakes, setMistakes] = useState<GrammarMistake[]>([]);
  const [savedCorrect, setSavedCorrect] = useState<number | null>(null);
  /** Variant matni takrorlansa ham tugma va kalit noyob bo‘lishi uchun indeks. */
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const backPath = `/kunlik-reja/kun/${dayNumber}/grammatika`;

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
      const mcqs = bundle.grammar?.ruleMcqs ?? [];
      const norm = dailyMcqsToChoiceTasks(mcqs);
      setTasks(norm);
      /*
       * Yangi urinish: serverdagi eski javoblar o'chiriladi, ya'ni ball shu
       * safargi javoblardan sanaladi. Eng yaxshi natija baribir saqlanadi
       * (`grammar_correct` faqat oshadi), shuning uchun bu xavfsiz.
       */
      if (norm.length > 0) {
        void startGrammarTest(token, dayNumber).catch(() => undefined);
      }
      if (norm.length === 0) {
        setError(
          mcqs.length === 0
            ? 'Bu kun uchun test savollari hali qo‘shilmagan.'
            : 'Savollar shakli noto‘g‘ri (variantlar yoki to‘g‘ri indeks).',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xato');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCurrentIndex(0);
    setFinished(false);
    setStatus('idle');
    setMessage('');
    setSelectedOptionIndex(null);
    grammar1PatchSent.current = false;
  }, [tasks]);

  useEffect(() => {
    if (!finished || grammar1PatchSent.current) return;
    grammar1PatchSent.current = true;
    patchDay(dayNumber, { grammar_1: true });
  }, [finished, dayNumber, patchDay]);

  const currentTask = tasks[currentIndex];
  const progress = useMemo(
    () => ((currentIndex + (finished ? 1 : 0)) / Math.max(tasks.length, 1)) * 100,
    [currentIndex, finished, tasks.length],
  );

  useEffect(() => {
    if (!currentTask) return;
    setStatus('idle');
    setMessage('');
    setChoiceOptions(shuffle(currentTask.options));
    setSelectedOptionIndex(null);
  }, [currentIndex, currentTask]);

  const handleBack = () => navigate(backPath);

  const handleNext = () => {
    if (status !== 'correct') return;
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex((p) => p + 1);
      return;
    }
    /*
     * Test tugadi. Ilgari bu yerdan darhol juftlikka o'tib ketilardi va
     * o'quvchi xatolarini umuman ko'rmasdi. Endi natija ekrani chiqadi:
     * ball serverda sanaladi (XP), xatolar esa to'g'ri javob bilan
     * ro'yxat bo'lib ko'rsatiladi.
     */
    setFinished(true);
    patchDay(dayNumber, { grammar_1: true });
    void (async () => {
      try {
        const r = await finishGrammarTest(token, dayNumber);
        setSavedCorrect(r.correct);
      } catch {
        /* ball saqlanmasa ham natija ekrani ko'rsatiladi */
      }
      try {
        setMistakes(await fetchGrammarMistakes(token, dayNumber));
      } catch {
        /* xatolar ro'yxati qo'shimcha imkoniyat */
      }
    })();
  };

  if (!isValidDailyCourseDay(dayNumber)) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <p className="text-gray-700">Sahifa topilmadi.</p>
        <button type="button" className="mt-4 text-[#0B2A6B] underline" onClick={() => navigate(kunlikRejaPath(dayNumber))}>
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

  if (error || tasks.length === 0) {
    return (
      <div className="min-h-screen bg-app-bg p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="mt-2 text-sm">{error ?? 'Savollar yo‘q.'}</p>
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
    <div className="grammar-theme min-h-screen pb-32">
      <main className="mx-auto w-full max-w-lg px-4 pt-2">
        {/* Header */}
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
            Grammatika · Test
          </p>
          <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-[#5B4CE0] shadow-[0_4px_10px_rgba(91,76,224,0.08)]">
            {Math.min(currentIndex + 1, tasks.length)}/{tasks.length}
          </span>
        </div>

        {/* Purple progress bar */}
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

        {!finished && currentTask && (
          <>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
              VAZIFA 1 · TEST · {Math.min(currentIndex + 1, tasks.length)}/{tasks.length}
            </p>

            {/* Question card with peach decor */}
            <div className="relative mt-3 overflow-hidden rounded-[22px] border border-[#DDD7F5] bg-white px-5 py-6 text-center shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full"
                style={{ background: 'rgba(255,206,176,0.35)' }}
              />
              <p className="grammar-heading relative z-[2] text-[22px] leading-tight text-[#2D1B69]">
                {currentTask.prompt}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-[10px]">
              {choiceOptions.map((option, optionIndex) => {
                const isSelected = selectedOptionIndex === optionIndex;
                const showCorrect = status === 'correct' && isSelected;
                const showWrong = status === 'wrong' && isSelected;

                let cardStyle: CSSProperties = {
                  background: '#FFFFFF',
                  border: '1.5px solid #DDD7F5',
                  color: '#2D1B69',
                  boxShadow: '0 6px 14px -8px rgba(45,27,105,0.12)',
                };
                let icon: ReactNode = null;

                if (showCorrect) {
                  cardStyle = {
                    background: '#DCFCE7',
                    border: '1.5px solid #82E5B8',
                    color: '#0F7C3A',
                    boxShadow: '0 10px 22px -10px rgba(34,197,94,0.35)',
                  };
                  icon = (
                    <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#22C55E] text-[14px] font-black text-white">
                      ✓
                    </span>
                  );
                } else if (showWrong) {
                  cardStyle = {
                    background: '#FEEBEB',
                    border: '1.5px solid #F5B5B5',
                    color: '#B4282E',
                    boxShadow: '0 10px 22px -10px rgba(180,40,46,0.28)',
                  };
                  icon = (
                    <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#F0656A] text-[14px] font-black text-white">
                      ✕
                    </span>
                  );
                } else if (isSelected) {
                  cardStyle = {
                    background: '#EDE9FB',
                    border: '2px solid #5B4CE0',
                    color: '#2D1B69',
                    boxShadow: '0 10px 24px -10px rgba(91,76,224,0.4), 0 0 0 4px rgba(91,76,224,0.14)',
                  };
                }

                return (
                  <button
                    key={`${currentIndex}-${optionIndex}`}
                    type="button"
                    disabled={checking}
                    onClick={() => {
                      if (status === 'correct' || checking) return;
                      setSelectedOptionIndex(optionIndex);
                      /*
                       * Javobni SERVER tekshiradi va qayd etadi: ball
                       * (`grammar_correct`) shu yozuvlardan sanaladi va xato
                       * javoblar keyin "Xatolaring" hamda haftalik
                       * takrorlashda qaytadan so'raladi.
                       *
                       * Ekran esa javobni kutib qotib qolmaydi — natija
                       * darhol ko'rsatiladi, so'rov fonda ketadi. Bir savol
                       * uchun BIRINCHI javob qayd etiladi, ya'ni qayta
                       * urinish ballni ko'tarmaydi.
                       */
                      const ok = option.index === currentTask.correctIndex;
                      setChecking(true);
                      void answerGrammarQuestion(token, dayNumber, currentTask.id, option.index)
                        .catch(() => undefined)
                        .finally(() => setChecking(false));
                      if (ok) {
                        setStatus('correct');
                        setMessage("To'g'ri! 🎉");
                        playCorrectSound();
                      } else {
                        setStatus('wrong');
                        setMessage("Noto'g'ri. Yana urinib ko'ring.");
                        playWrongSound();
                      }
                    }}
                    className={`grammar-heading flex min-h-[54px] w-full items-center justify-between rounded-[16px] px-5 py-3 text-left text-[17px] transition-all active:scale-[0.98]${
                      showCorrect ? ' javob-togri' : showWrong ? ' javob-xato' : ''
                    }`}
                    style={cardStyle}
                  >
                    <span>{option.text}</span>
                    {icon}
                  </button>
                );
              })}
            </div>

            {status === 'wrong' && message ? (
              <>
                <div className="mt-4 flex justify-center">
                  <span
                    key={`${currentIndex}-wrong-${message}`}
                    className="msg-shake rounded-full bg-[#FEEBEB] px-4 py-2 text-sm font-black text-[#B4282E] shadow-[0_6px_14px_-8px_rgba(180,40,46,0.35)]"
                  >
                    ✕ {message}
                  </span>
                </div>
                {/*
                  IZOH — xato javobdan keyin darhol. Ilgari faqat "yana urinib
                  ko'ring" deyilardi va o'quvchi qoidani bilmasdan taxmin
                  qilishda davom etardi.
                */}
                {currentTask.explanation ? (
                  <p className="mt-3 rounded-[16px] border border-[#DDD7F5] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#5C5470]">
                    {currentTask.explanation}
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        )}

        {finished ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] p-6 text-center shadow-[0_14px_30px_-14px_rgba(34,197,94,0.25)]">
              <p className="grammar-heading text-[22px] text-[#0F7C3A]">Test tugadi</p>
              <p className="mt-2 text-sm font-black text-[#0F7C3A]">
                Birinchi urinishdan to‘g‘ri: {savedCorrect ?? Math.max(tasks.length - mistakes.length, 0)} / {tasks.length}
              </p>
              {savedCorrect !== null ? (
                <p className="mt-1 text-[12.5px] font-bold text-[#0F7C3A]/80">
                  +{savedCorrect} XP
                </p>
              ) : null}
            </div>

            {/*
              XATOLARING — ilgari xato javob ekrandan ketishi bilan yo'qolardi
              va o'sha xato ertaga qaytarilardi. Endi har bir xato to'g'ri
              javobi bilan qoladi, haftalik takrorlashda esa qaytadan so'raladi.
            */}
            {mistakes.length > 0 ? (
              <div className="rounded-[24px] border border-[#F5B5B5] bg-white p-5 shadow-[0_10px_28px_-14px_rgba(180,40,46,0.18)]">
                <p className="grammar-heading text-[18px] text-[#B4282E]">
                  Xatolaring · {mistakes.length} ta
                </p>
                <p className="mt-1 text-[12.5px] font-semibold text-[#8B7FAB]">
                  Bu savollar haftalik takrorlashda yana so‘raladi.
                </p>
                <ul className="mt-3.5 space-y-3">
                  {mistakes.map((m) => (
                    <li key={m.id} className="rounded-[16px] bg-[#FBF9FF] p-3.5">
                      <p className="text-[14px] font-bold leading-snug text-[#2D1B69]">
                        {m.questionText}
                      </p>
                      <p className="mt-2 text-[13px] font-semibold text-[#B4282E]">
                        Sizning javobingiz: {m.options[m.chosenIndex] ?? '—'}
                      </p>
                      <p className="mt-0.5 text-[13px] font-black text-[#0F7C3A]">
                        To‘g‘ri javob: {m.options[m.correctIndex] ?? '—'}
                      </p>
                      {m.explanation ? (
                        <p className="mt-2 rounded-[12px] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#5C5470]">
                          {m.explanation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => navigate(`/kunlik-reja/kun/${dayNumber}/grammatika/juftlik`, { replace: true })}
              className="min-h-[54px] w-full rounded-[16px] bg-[#22C55E] px-6 py-3 text-[16px] font-black text-white shadow-[0_10px_22px_-10px_rgba(34,197,94,0.5)]"
            >
              Keyingi vazifa →
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[48px] w-full rounded-[16px] border border-[#DDD7F5] bg-white px-6 py-3 text-[15px] font-bold text-[#2D1B69]"
            >
              Grammatikaga qaytish
            </button>
          </div>
        ) : null}
      </main>

      {/* Sticky "Keyingisi" bar when correct */}
      {status === 'correct' && !finished ? (
        <div
          className="fixed inset-x-0 bottom-0 border-t px-[18px] pt-4 pb-6"
          style={{
            background: '#DCFCE7',
            borderTopColor: '#82E5B8',
          }}
        >
          <div className="mx-auto max-w-lg">
            <div key={`ok-${currentIndex}`} className="msg-pop mb-3 flex items-center gap-2.5">
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#22C55E] text-[17px] text-white">
                ✓
              </div>
              <span className="grammar-heading text-[18px] text-[#0F7C3A]">To'g'ri! 🎉</span>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="grammar-heading h-[54px] w-full rounded-[16px] bg-[#22C55E] text-[16px] text-white shadow-[0_14px_28px_-12px_rgba(34,197,94,0.55)]"
            >
              Keyingisi →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
