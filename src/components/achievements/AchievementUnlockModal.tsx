import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import {
  Flame,
  Zap,
  Star,
  Medal,
  Trophy,
  Crown,
  Sparkles,
  BookOpen,
  Library,
  GraduationCap,
  Share2,
} from 'lucide-react';
import type { AchievementItem } from '../../api/achievements';

const ICON_BY_KEY = {
  flame: Flame,
  zap: Zap,
  star: Star,
  medal: Medal,
  trophy: Trophy,
  crown: Crown,
  sparkles: Sparkles,
  book: BookOpen,
  library: Library,
  graduation: GraduationCap,
} as const;

type Props = {
  open: boolean;
  item: AchievementItem | null;
  unlockedCount: number;
  totalCount: number;
  completedDays: number;
  wordsLearned: number;
  onClose: () => void;
};

function medalTitle(item: AchievementItem): string {
  if (item.kind === 'days') return `${item.threshold} kunlik`;
  return `${item.threshold} so'z`;
}

function medalDescription(item: AchievementItem): string {
  if (item.kind === 'days') {
    return `Siz Kunlik rejaning ${item.threshold}-kunini yakunladingiz va «${item.threshold} kunlik» medalini oldingiz.`;
  }
  return `Siz ${item.threshold} ta rus tili so'zini o'rgandingiz va «${item.threshold} so'z» medalini oldingiz.`;
}

export default function AchievementUnlockModal({
  open,
  item,
  unlockedCount,
  totalCount,
  completedDays,
  wordsLearned,
  onClose,
}: Props) {
  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const Icon = useMemo(() => {
    if (!item) return Zap;
    return ICON_BY_KEY[item.icon] ?? Zap;
  }, [item]);

  const share = async () => {
    if (!item) return;
    const text = `Men FalaRus.uz'da «${medalTitle(item)}» medalini oldim! 🏆`;
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://falarus.uz';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'FalaRus.uz', text, url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 80% at 50% 30%, rgba(11,26,58,0.92) 0%, rgba(6,15,36,0.98) 60%, rgba(4,10,26,0.98) 100%)',
            }}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-[380px] overflow-hidden rounded-[28px]"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              background:
                'linear-gradient(180deg, #0F1B3B 0%, #0B1633 55%, #06102A 100%)',
              boxShadow:
                '0 40px 90px -20px rgba(2,6,20,0.7), 0 0 0 1px rgba(212,172,92,0.14)',
            }}
          >
            {/* Guilloche background rings */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                background:
                  'radial-gradient(circle at 50% 34%, rgba(212,172,92,0.35) 0%, transparent 60%), repeating-radial-gradient(circle at 50% 34%, transparent 0 22px, rgba(212,172,92,0.15) 22px 23px)',
              }}
            />

            {/* Confetti dots */}
            <div className="pointer-events-none absolute inset-0">
              {[
                { top: '18%', left: '18%', color: '#D4AC5C', size: 6 },
                { top: '22%', left: '76%', color: '#F5D48F', size: 4 },
                { top: '48%', left: '10%', color: '#C7D0E2', size: 3 },
                { top: '54%', left: '82%', color: '#D4AC5C', size: 5 },
                { top: '30%', left: '86%', color: '#F5D48F', size: 4 },
                { top: '12%', left: '46%', color: '#F5D48F', size: 4 },
                { top: '38%', left: '30%', color: '#C7D0E2', size: 3 },
              ].map((d, i) => (
                <span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    top: d.top,
                    left: d.left,
                    width: d.size,
                    height: d.size,
                    background: d.color,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>

            <div className="relative flex flex-col items-center px-6 pb-6 pt-8 text-center">
              {/* Kicker */}
              <p
                className="text-[11px] font-bold tracking-[0.35em] text-[#D4AC5C]"
                style={{ fontFamily: 'ui-sans-serif, system-ui' }}
              >
                ✧ YANGI MEDAL OCHILDI ✧
              </p>

              {/* Medal coin — pure coin, no burst rays. */}
              <motion.div
                className="relative mt-6 flex items-center justify-center"
                initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
              >
                {/* Coin */}
                <div
                  className="relative flex h-[120px] w-[120px] items-center justify-center rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 30%, #F9E3AC 0%, #E6C078 45%, #B98A3E 100%)',
                    boxShadow:
                      'inset 0 -6px 12px rgba(80,50,10,0.35), 0 12px 30px -8px rgba(212,172,92,0.5)',
                  }}
                >
                  <div
                    className="flex h-[92px] w-[92px] items-center justify-center rounded-full"
                    style={{
                      background:
                        'radial-gradient(circle at 40% 35%, #F5D48F 0%, #C9942E 100%)',
                      border: '2px dashed rgba(255,240,200,0.55)',
                    }}
                  >
                    <Icon className="h-11 w-11 text-[#3B2A0A]" strokeWidth={2.4} />
                  </div>
                </div>
              </motion.div>

              {/* Title */}
              <h2
                className="mt-7 text-[36px] font-black leading-tight text-white"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                Tabriklaymiz!
              </h2>

              {/* Description */}
              <p className="mt-3 max-w-[300px] text-[14.5px] leading-relaxed text-[#C7D0E2]">
                {medalDescription(item)}
              </p>

              {/* Stats row: +BALL / progress-in-medal-family / medals-collected.
                  Middle chip mirrors the medal type — days-family shows total
                  completed Kunlik reja days; words-family shows total words
                  learned. Prevents the "words medal unlocked but 0 KUN" mismatch. */}
              <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
                <StatChip label="BALL" value={`+${item.reward}`} accent />
                {item.kind === 'days' ? (
                  <StatChip
                    label="KUN"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-[#F5D48F]" strokeWidth={2.4} />
                        {completedDays}
                      </span>
                    }
                  />
                ) : (
                  <StatChip label="SO'Z" value={wordsLearned.toLocaleString('ru-RU').replace(/,/g, ' ')} />
                )}
                <StatChip label="MEDAL" value={`${unlockedCount}/${totalCount}`} />
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-[18px] py-3.5 text-[16px] font-black text-[#0A1638] transition-transform active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(180deg, #F5D48F 0%, #D4AC5C 100%)',
                  boxShadow: '0 12px 26px -10px rgba(212,172,92,0.6)',
                }}
              >
                Davom etish
              </button>

              {/* Secondary CTA */}
              <button
                type="button"
                onClick={share}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] py-3 text-[14px] font-bold text-[#F5D48F] transition-colors"
                style={{
                  border: '1px solid rgba(245,212,143,0.35)',
                  background: 'rgba(15,27,59,0.5)',
                }}
              >
                <Share2 className="h-4 w-4" strokeWidth={2.4} />
                Ulashish
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatChip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 rounded-[14px] py-2.5"
      style={{
        background: 'rgba(15,27,59,0.65)',
        border: '1px solid rgba(212,172,92,0.22)',
      }}
    >
      <span
        className="text-[15px] font-black leading-none"
        style={{ color: accent ? '#F5D48F' : '#FFFFFF' }}
      >
        {value}
      </span>
      <span
        className="text-[9.5px] font-bold tracking-[0.18em]"
        style={{ color: '#8894B0' }}
      >
        {label}
      </span>
    </div>
  );
}
