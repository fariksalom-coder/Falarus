/**
 * TurnArena — «So'z zanjiri» o'yinining bitta maydoni.
 *
 * Ilgari kompyuter va o'yinchi ALOHIDA ikki kartada edi: biri ochilib, ikkinchisi
 * pastda yakka chip bo'lib qolardi. Endi ikkovi BITTA qatorda:
 *
 *   [🤖 burchakda]   ——— faol tomonning maydoni ———   [🙋 burchakda]
 *
 * Navbat almashganda karta foni yashildan ko'kka (va aksincha) sekin o'tadi,
 * o'yinchi maydoni O'NGGA yopiladi, kompyuterniki esa ayni paytda CHAPDAN
 * chiqib keladi. Ikki harakat bir vaqtda ketgani uchun almashinuv silliq
 * ko'rinadi; tezligi ataylab pasaytirilgan — o'yinchi ko'rib ulgursin.
 */
import { forwardRef, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Send } from 'lucide-react';

/** Fikr pufagida almashadigan harflar — «qidiryapti» taassuroti uchun. */
const SCAN_LETTERS = 'абвгдеёжзийклмнопрстуфхцчшщыэюя'.split('');

export type ComputerState =
  | { kind: 'idle' }
  | { kind: 'thinking' }
  | { kind: 'typing'; word: string; revealed: number }
  | { kind: 'done'; word: string };

type Props = {
  /** Hozir kim o'ynayapti — maydonning rangi va tarkibi shunga qarab o'zgaradi. */
  turn: 'computer' | 'player';
  computer: ComputerState;
  /** O'yinchi profil rasmi — bo'lmasa emoji ko'rsatiladi. */
  playerAvatarUrl?: string | null;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  /** Javob shu harfdan boshlanishi kerak — placeholder uchun. */
  requiredLetter: string;
  secondsLeft: number;
  totalSeconds: number;
  timeColor: string;
};

const GREEN = 'linear-gradient(135deg, #12A150 0%, #0E8B45 60%, #0B7A3C 100%)';
const BLUE = 'linear-gradient(135deg, #0F2A6B 0%, #1E3A8A 55%, #2563EB 100%)';

/** Burchakdagi avatar: faol tomonniki kattaroq va nur taratib turadi. */
function CornerAvatar({
  active,
  reduce,
  children,
}: {
  active: boolean;
  reduce: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      {active && !reduce ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-2xl"
          animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.45)', '0 0 0 13px rgba(255,255,255,0)'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      ) : null}
      <motion.span
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl ${
          active ? 'bg-white/20' : 'bg-white/85'
        }`}
        animate={{
          width: active ? 56 : 42,
          height: active ? 56 : 42,
          fontSize: active ? 27 : 20,
          opacity: active ? 1 : 0.9,
        }}
        transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 260, damping: 26 }}
      >
        {children}
      </motion.span>
    </div>
  );
}

export const TurnArena = forwardRef<HTMLInputElement, Props>(function TurnArena(
  {
    turn,
    computer,
    playerAvatarUrl,
    value,
    onChange,
    onSubmit,
    requiredLetter,
    secondsLeft,
    totalSeconds,
    timeColor,
  },
  ref,
) {
  const reduce = useReducedMotion();
  const [scan, setScan] = useState('а');

  // Harflar almashinuvi — faqat «o'ylash» paytida.
  useEffect(() => {
    if (computer.kind !== 'thinking') return;
    const id = window.setInterval(
      () => setScan(SCAN_LETTERS[Math.floor(Math.random() * SCAN_LETTERS.length)]),
      reduce ? 320 : 90,
    );
    return () => window.clearInterval(id);
  }, [computer.kind, reduce]);

  const isPlayer = turn === 'player';
  // Yashil fonda yashil raqam ko'rinmaydi: vaqt tugayotgandagina ogohlantiruvchi
  // rangga o'tamiz, aks holda oq qoladi.
  const urgentColor = secondsLeft > 15 ? '#FFFFFF' : timeColor;
  const slide = reduce
    ? { duration: 0.18 }
    : { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    /* Yuborish tugmasi ramkadan TASHQARIDA — kartaning ostida, rasm ostiga
       to'g'ri keladigan qilib o'ngga tekislangan. */
    <div className="flex flex-col items-end gap-2.5">
    <div className="relative w-full overflow-hidden rounded-[24px] p-3.5">
      {/* Fon: yashil ↔ ko'k sekin almashadi (gradientni to'g'ridan-to'g'ri
          animatsiya qilib bo'lmaydi — ikki qatlam bir-birini yopadi) */}
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={{ background: GREEN }}
        animate={{ opacity: isPlayer ? 1 : 0 }}
        transition={{ duration: reduce ? 0.2 : 0.7, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={{ background: BLUE }}
        animate={{ opacity: isPlayer ? 0 : 1 }}
        transition={{ duration: reduce ? 0.2 : 0.7, ease: 'easeInOut' }}
      />

      <div className="relative z-[2] flex items-center gap-3">
        <CornerAvatar active={!isPlayer} reduce={reduce}>
          <motion.span
            animate={computer.kind === 'thinking' && !reduce ? { rotate: [0, -6, 6, 0] } : { rotate: 0 }}
            transition={{ duration: 2.2, repeat: computer.kind === 'thinking' ? Infinity : 0 }}
          >
            🤖
          </motion.span>
        </CornerAvatar>

        {/* Maydon: ikki tarkib bir vaqtda — biri o'ngga yopiladi, ikkinchisi
            chapdan chiqadi. Shuning uchun ikkovi ham absolyut joylashgan. */}
        <div className="relative min-h-[90px] min-w-0 flex-1">
          <AnimatePresence initial={false}>
            {isPlayer ? (
              <motion.div
                key="player"
                initial={{ opacity: 0, x: 34 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 34 }}
                transition={slide}
                className="absolute inset-0 flex flex-col justify-center"
              >
                <div className="flex flex-row-reverse items-baseline justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
                    Sizning navbatingiz
                  </p>
                  <span
                    className="rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-black tabular-nums"
                    style={{ color: urgentColor }}
                  >
                    {secondsLeft} s
                  </span>
                </div>

                <div className="mt-2 flex">
                  <input
                    ref={ref}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSubmit();
                    }}
                    placeholder={`${requiredLetter}…`}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    /* w-0 min-w-0 shart: input'ning ichki eni katta, aks holda u
                       siqilmaydi va «Yuborish» tugmasi paneldan chiqib ketadi. */
                    className="min-h-[44px] w-0 min-w-0 flex-1 rounded-2xl bg-white/95 px-3.5 text-[16px] font-bold text-app-text ring-1 ring-white/30 outline-none transition focus:ring-2 focus:ring-white"
                  />
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: urgentColor }}
                    animate={{
                      width: `${Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100))}%`,
                    }}
                    transition={{ duration: 0.4, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="computer"
                initial={{ opacity: 0, x: -34 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -34 }}
                transition={slide}
                className="absolute inset-0 flex flex-col justify-center"
              >
                <div className="flex items-baseline gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
                    Kompyuter
                  </p>
                  {computer.kind === 'thinking' ? (
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="inline-block h-1.5 w-1.5 rounded-full bg-white/80"
                          animate={reduce ? {} : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
                        />
                      ))}
                    </span>
                  ) : null}
                </div>

                <p className="mt-0.5 text-[15px] font-black text-white">
                  {computer.kind === 'thinking'
                    ? "O'ylayapti"
                    : computer.kind === 'typing'
                      ? 'Yozayapti'
                      : computer.kind === 'done'
                        ? 'Javob berdi'
                        : 'Kutmoqda'}
                </p>

                <div className="mt-2 flex min-h-[40px] items-center rounded-2xl bg-white/12 px-3 ring-1 ring-white/15">
                  {computer.kind === 'thinking' ? (
                    <span className="flex items-center gap-1.5">
                      <span className="grammar-heading text-[19px] leading-none text-white/90">
                        {scan}
                      </span>
                      <span className="text-[12.5px] font-bold text-white/55">
                        so'z qidirilmoqda…
                      </span>
                    </span>
                  ) : computer.kind === 'typing' ? (
                    <span className="grammar-heading text-[19px] leading-none text-white">
                      {computer.word.slice(0, computer.revealed)}
                      <motion.span
                        aria-hidden
                        className="ml-0.5 inline-block h-[19px] w-[2px] translate-y-[3px] bg-white"
                        animate={reduce ? {} : { opacity: [1, 0, 1] }}
                        transition={{ duration: 0.7, repeat: Infinity }}
                      />
                    </span>
                  ) : computer.kind === 'done' ? (
                    <span className="grammar-heading text-[19px] leading-none text-white">
                      {computer.word}
                    </span>
                  ) : (
                    <span className="text-[12.5px] font-bold text-white/55">Navbat sizda</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CornerAvatar active={isPlayer} reduce={reduce}>
          {playerAvatarUrl ? (
            <img src={playerAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>🙋</span>
          )}
        </CornerAvatar>
      </div>
    </div>

      <AnimatePresence initial={false}>
        {isPlayer ? (
          <motion.button
            key="send"
            type="button"
            onClick={onSubmit}
            aria-label="Yuborish"
            initial={{ opacity: 0, scale: 0.6, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -10 }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 26 }}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#12A150] text-white shadow-[0_12px_26px_-10px_rgba(18,161,80,0.9)] transition active:scale-95"
          >
            <Send className="h-[22px] w-[22px]" strokeWidth={2.4} />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
