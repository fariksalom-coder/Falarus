/**
 * VocabularyPhraseExercise — lug'atning 4-vazifasi: ibora testlari.
 *
 * Ruscha ibora ko'rsatiladi va uning tarjimasi 4 ta variantdan tanlanadi.
 * Variantlar bir ustunda: tarjimalar so'zlardan uzunroq bo'ladi va ikki
 * ustunda kesilib ketardi.
 *
 * MUHIM: javob to'g'ri yoki xato ekanini bu komponent BILMAYDI — javob kaliti
 * brauzerga umuman yuborilmaydi. Tekshiruvni server qiladi, natija esa
 * `verdict` orqali keladi.
 *
 * Ibora paydo bo'lganda avtomatik o'qib beriladi — lug'at bo'limining qolgan
 * qadamlari ham shunday ishlaydi (talaffuzni eshitish shu bo'limning maqsadi).
 */
import { useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { speakText } from '../../../utils/speak';
import type { DailyPhraseMcq } from '../../../../shared/dailyCourseDay';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

/** Serverning shu savol bo'yicha hukmi. */
export type PhraseVerdict = { choice: number; correct: boolean; correctIndex: number };

type Props = {
  phrases: DailyPhraseMcq[];
  index: number;
  /** Server javobi. `null` — hali javob berilmagan. */
  verdict: PhraseVerdict | null;
  /** Javob serverga yuborilmoqda — variantlar bloklanadi. */
  checking: boolean;
  correctCount: number;
  /** Yakunlangach: umumiy XP va platformadagi o'rin (serverdan). */
  standing?: { points: number; rank: number | null } | null;
  errorText?: string;
  onChoose: (optionIndex: number) => void;
  onNext: () => void;
  onFinish: () => void;
  onRetry: () => void;
};

export function VocabularyPhraseExercise({
  phrases,
  index,
  verdict,
  checking,
  correctCount,
  standing,
  errorText,
  onChoose,
  onNext,
  onFinish,
  onRetry,
}: Props) {
  const { token } = useAuth();
  const current = phrases[index];
  const total = phrases.length;
  /** Har ibora uchun bir marta — takroriy render ovozni qaytarmasin. */
  const spokenRef = useRef<number | null>(null);

  useEffect(() => {
    if (!current) return;
    if (spokenRef.current === current.id) return;
    spokenRef.current = current.id;
    void speakText(current.phraseRu, { token, speed: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (current) {
    const answered = verdict !== null;
    const last = index + 1 >= total;

    return (
      <div className="mx-auto max-w-[720px]">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((index + 1) / total) * 100}%`,
                background: 'linear-gradient(90deg, #8B7AF7, #5B4CE0)',
              }}
            />
          </div>
          <span className="grammar-heading text-[13px] text-[#5B4CE0]">
            {index + 1}/{total}
          </span>
        </div>

        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#8B7FAB]">
          VAZIFA 4 · IBORALAR · {index + 1}/{total}
        </p>

        <div className="mt-3 text-center">
          <p className="mb-2 text-[13px] font-black text-[#8B7FAB]">Iborani tarjima qiling</p>
          <div className="relative overflow-hidden rounded-[24px] border-[1.5px] border-[#DDD7F5] bg-white p-[26px] shadow-[0_10px_28px_-14px_rgba(45,27,105,0.14)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 bottom-4 h-20 w-20 rounded-full"
              style={{ background: 'rgba(176,206,255,0.35)' }}
            />
            <p className="grammar-heading relative z-[2] text-[28px] leading-tight tracking-[-0.01em] text-[#2D1B69]">
              {current.phraseRu}
            </p>
            <button
              type="button"
              onClick={() => void speakText(current.phraseRu, { token, speed: 0.7 })}
              aria-label="Iborani tinglash"
              className="relative z-[2] mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#EDE9FB] px-4 text-[13px] font-black text-[#5B4CE0] active:scale-95"
            >
              <Volume2 className="h-4 w-4" strokeWidth={2.5} />
              Tinglash
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-[10px]">
          {current.options.map((opt, i) => {
            const isPicked = verdict?.choice === i;
            const isCorrect = answered && i === verdict.correctIndex;
            const isWrong = isPicked && !verdict.correct;

            let cls =
              'grammar-heading flex min-h-[60px] w-full items-center gap-3 rounded-[16px] border-[1.5px] border-[#DDD7F5] bg-white px-4 py-3 text-left text-[17px] text-[#2D1B69] shadow-[0_6px_14px_-8px_rgba(45,27,105,0.12)] transition-all';
            let badge = 'bg-[#F0EDFB] text-[#8B7FAB]';
            if (isCorrect) {
              cls =
                'grammar-heading flex min-h-[60px] w-full items-center gap-3 rounded-[16px] border-[1.5px] border-[#82E5B8] bg-[#DCFCE7] px-4 py-3 text-left text-[17px] text-[#0F7C3A] shadow-[0_8px_18px_-8px_rgba(34,197,94,0.35)]';
              badge = 'bg-[#22C55E] text-white';
            } else if (isWrong) {
              cls =
                'grammar-heading flex min-h-[60px] w-full items-center gap-3 rounded-[16px] border-[1.5px] border-[#F5B5B5] bg-[#FEEBEB] px-4 py-3 text-left text-[17px] text-[#B4282E] shadow-[0_10px_22px_-10px_rgba(180,40,46,0.28)]';
              badge = 'bg-[#E5484D] text-white';
            } else if (answered) {
              cls += ' opacity-70';
            } else if (checking) {
              cls += ' opacity-60';
            }

            return (
              <button
                key={i}
                type="button"
                disabled={answered || checking}
                onClick={() => onChoose(i)}
                className={cls}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[13px] ${badge}`}
                >
                  {OPTION_LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">{opt}</span>
              </button>
            );
          })}
        </div>

        {errorText ? (
          <p className="mt-3 rounded-2xl bg-[#FEEBEB] px-3 py-2 text-center text-[13px] font-bold text-[#B4282E]">
            {errorText}
          </p>
        ) : null}

        {checking && !answered ? (
          <p className="mt-4 text-center text-[13px] font-bold text-[#8B7FAB]">Tekshirilmoqda…</p>
        ) : null}

        {answered ? (
          <button
            type="button"
            onClick={last ? onFinish : onNext}
            className="grammar-heading mt-5 h-[54px] w-full rounded-full bg-[#22C55E] text-[16px] text-white shadow-[0_14px_28px_-12px_rgba(34,197,94,0.55)] active:scale-[0.99]"
          >
            {last ? 'Yakunlash →' : 'Keyingi ibora →'}
          </button>
        ) : null}
      </div>
    );
  }

  // Yakuniy ekran
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return (
    <div className="mx-auto max-w-[720px]">
      <div className="rounded-[20px] border-[1.5px] border-[#ABEBC8] bg-[#F0FFF6] p-8 text-center shadow-[0_8px_20px_rgba(23,34,74,0.06)]">
        <p className="text-[19px] font-extrabold text-app-text">Iboralar tugadi</p>
        <p className="mt-2 text-sm font-bold text-[#12813F]">
          {correctCount} / {total} to'g'ri ({percentage}%)
        </p>
        {/* Har bir to'g'ri javob — 1 XP. */}
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px] font-black text-[#5B4CE0] ring-1 ring-[#DDD7F5]">
          +{correctCount} XP
        </p>

        {/* Serverdagi yangilangan holat — darhol, sahifani yangilamasdan. */}
        {standing ? (
          <div className="mt-4 flex items-stretch justify-center gap-2.5">
            <div className="min-w-[104px] rounded-2xl bg-white px-4 py-3 ring-1 ring-[#DDD7F5]">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8B7FAB]">
                Jami XP
              </p>
              <p className="grammar-heading mt-0.5 text-[22px] leading-none text-[#2D1B69]">
                {standing.points}
              </p>
            </div>
            <div className="min-w-[104px] rounded-2xl bg-white px-4 py-3 ring-1 ring-[#DDD7F5]">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8B7FAB]">
                O‘rningiz
              </p>
              <p className="grammar-heading mt-0.5 text-[22px] leading-none text-[#2D1B69]">
                {standing.rank != null ? `#${standing.rank}` : '—'}
              </p>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 h-12 w-full rounded-full border-2 border-[#DDD7F5] bg-white text-[15px] font-black text-[#5B4CE0] active:scale-[0.99]"
        >
          Qaytadan ishlash
        </button>
      </div>
    </div>
  );
}
