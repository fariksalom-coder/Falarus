import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';
import { kunlikRejaPath } from '../utils/kunlikNavigation';
import {
  answerTakrorlash,
  fetchTakrorlash,
  type TakrorlashSavol,
  type TakrorlashTest,
} from '../api/kunlikProgress';
import { playCorrectSound, playWrongSound } from '../utils/sound';

/**
 * HAFTALIK TAKRORLASH.
 *
 * Kurs 182 kun to'g'ri chiziq edi: 5-kun grammatikasi 40-kunda hech qayerda
 * uchramasdi va unutilardi. Bu ekran har 7-kunda oldingi olti kunning
 * savollarini qaytaradi — birinchi navbatda O'SHA o'quvchi xato qilganlarini.
 *
 * Javob serverda tekshiriladi: to'g'ri javob berilsa eski xato yozuvi ustiga
 * yoziladi, ya'ni savol "xatolar" ro'yxatidan chiqadi va o'sha kunning balli
 * qayta sanaladi (XP faqat oshadi).
 */

type Javob = { chosen: number; correct: boolean; correctIndex: number; explanation: string };

export default function KunlikTakrorlashPage() {
  const { dayNum } = useParams<{ dayNum: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const dayNumber = Number(dayNum ?? '');

  const [test, setTest] = useState<TakrorlashTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);
  const [javob, setJavob] = useState<Javob | null>(null);
  const [togriSoni, setTogriSoni] = useState(0);
  const [tugadi, setTugadi] = useState(false);
  const [band, setBand] = useState(false);

  const load = useCallback(async () => {
    if (!token || !isValidDailyCourseDay(dayNumber)) {
      setLoading(false);
      setError('Sahifa topilmadi');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTest(await fetchTakrorlash(token, dayNumber));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [token, dayNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const savollar: TakrorlashSavol[] = test?.questions ?? [];
  const joriy = savollar[idx];

  const javobBer = async (tanlov: number) => {
    if (!joriy || javob || band) return;
    setBand(true);
    try {
      const r = await answerTakrorlash(token, joriy.id, tanlov);
      setJavob({ chosen: tanlov, correct: r.correct, correctIndex: r.correctIndex, explanation: r.explanation });
      if (r.correct) {
        setTogriSoni((c) => c + 1);
        playCorrectSound();
      } else {
        playWrongSound();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Javob tekshirilmadi');
    } finally {
      setBand(false);
    }
  };

  const keyingi = () => {
    setJavob(null);
    if (idx < savollar.length - 1) setIdx((p) => p + 1);
    else setTugadi(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5B4CE0] border-t-transparent" />
      </div>
    );
  }

  if (error || savollar.length === 0) {
    return (
      <div className="grammar-theme min-h-screen p-6">
        <main className="mx-auto max-w-lg rounded-[24px] border border-[#DDD7F5] bg-white p-5 text-[#2D1B69]">
          <p className="text-sm font-semibold">{error ?? 'Takrorlash uchun savol topilmadi.'}</p>
          <button
            type="button"
            onClick={() => navigate(kunlikRejaPath(dayNumber))}
            className="mt-4 min-h-[44px] rounded-2xl border border-[#DDD7F5] bg-white px-4 py-2 text-sm font-bold"
          >
            Ortga
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="grammar-theme min-h-screen pb-28">
      <main className="mx-auto w-full max-w-lg px-4 pt-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(kunlikRejaPath(dayNumber))}
            className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[#DDD7F5] bg-white text-[#2D1B69]"
            aria-label="Ortga"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="grammar-heading flex-1 text-[16px] leading-none text-[#2D1B69]">
            Haftalik takrorlash
          </p>
          {!tugadi ? (
            <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-[#5B4CE0]">
              {idx + 1}/{savollar.length}
            </span>
          ) : null}
        </div>

        {!tugadi ? (
          <>
            <div className="mt-3 rounded-[18px] border border-[#DDD7F5] bg-white px-4 py-3">
              <p className="text-[12.5px] font-bold text-[#5C5470]">
                {test?.fromDay}–{test?.toDay}-kunlar takrori
                {test && test.xatoSoni > 0 ? ` · ${test.xatoSoni} ta xatoyingiz bor` : ''}
              </p>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#DDD7F5]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((idx + (javob ? 1 : 0)) / savollar.length) * 100}%`,
                  background: 'linear-gradient(90deg, #8B7AF7, #5B4CE0)',
                }}
              />
            </div>

            {joriy ? (
              <>
                <div className="relative mt-4 overflow-hidden rounded-[22px] border border-[#DDD7F5] bg-white px-5 py-6 text-center">
                  {joriy.xatoEdi ? (
                    <span className="absolute right-3 top-3 rounded-full bg-[#FEEBEB] px-2.5 py-1 text-[10.5px] font-black text-[#B4282E]">
                      ilgari xato
                    </span>
                  ) : null}
                  <p className="text-[10.5px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
                    {joriy.dayNumber}-kun
                  </p>
                  <p className="grammar-heading relative z-[2] mt-2 text-[21px] leading-tight text-[#2D1B69]">
                    {joriy.questionText}
                  </p>
                </div>

                <div className="mt-4 flex flex-col gap-[10px]">
                  {joriy.options.map((option, i) => {
                    const tanlangan = javob?.chosen === i;
                    const togri = javob !== null && i === javob.correctIndex;
                    const xato = tanlangan && javob !== null && !javob.correct;
                    const cls = togri
                      ? 'border-[#82E5B8] bg-[#DCFCE7] text-[#0F7C3A]'
                      : xato
                        ? 'border-[#F5B5B5] bg-[#FEEBEB] text-[#B4282E]'
                        : 'border-[#DDD7F5] bg-white text-[#2D1B69]';
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={javob !== null || band}
                        onClick={() => void javobBer(i)}
                        className={`grammar-heading min-h-[54px] w-full rounded-[16px] border-[1.5px] px-5 py-3 text-left text-[17px] transition active:scale-[0.98] disabled:opacity-100 ${cls}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {javob ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-[16px] bg-white px-4 py-3.5 text-[13px] leading-relaxed text-[#5C5470] shadow-[0_8px_20px_-14px_rgba(45,27,105,0.3)]"
                  >
                    {javob.explanation ||
                      (javob.correct
                        ? 'To‘g‘ri!'
                        : `To‘g‘ri javob: ${joriy.options[javob.correctIndex] ?? '—'}`)}
                  </motion.div>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <div className="mt-8 rounded-[24px] border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0F7C3A]">
              <RotateCcw className="h-6 w-6" />
            </span>
            <p className="grammar-heading mt-3 text-[22px] text-[#0F7C3A]">Takrorlash tugadi</p>
            <p className="mt-1.5 text-sm font-black text-[#0F7C3A]">
              {togriSoni} / {savollar.length} to‘g‘ri
            </p>
            <button
              type="button"
              onClick={() => navigate(kunlikRejaPath(dayNumber))}
              className="mt-5 min-h-[54px] w-full rounded-[16px] bg-[#22C55E] px-6 py-3 text-[16px] font-black text-white"
            >
              Rejaga qaytish
            </button>
          </div>
        )}
      </main>

      {javob && !tugadi ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-[#DDD7F5] bg-white px-[18px] pb-6 pt-4">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              onClick={keyingi}
              className="grammar-heading h-[54px] w-full rounded-[16px] bg-[#5B4CE0] text-[16px] text-white"
            >
              {idx < savollar.length - 1 ? 'Keyingisi →' : 'Yakunlash'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
