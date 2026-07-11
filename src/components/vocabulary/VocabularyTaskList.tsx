import type { CSSProperties } from 'react';
import { useLocale } from '../../context/LocaleContext';

export type VocabularyTaskListProps = {
  partTitle: string;
  learnedWords: number;
  totalWords: number;
  hasServerSnapshot: boolean;
  step1Completed: boolean;
  step1KnownDisplay: number;
  step1UnknownDisplay: number;
  step2Completed: boolean;
  step2Passed: boolean;
  step2CorrectDisplay: number;
  step2IncorrectDisplay: number;
  step2PercentageDisplay: number;
  step3Unlocked: boolean;
  step3Completed: boolean;
  onOpenStep1: () => void;
  onOpenStep2: () => void;
  onOpenStep3: () => void;
  /** Preview words shown as chips in the purple hero (top 4 shown, rest → +N). */
  wordPreviews?: string[];
};

export function VocabularyTaskList({
  partTitle,
  learnedWords,
  totalWords,
  hasServerSnapshot,
  step1Completed,
  step1KnownDisplay,
  step1UnknownDisplay,
  step2Completed,
  step2Passed,
  step2CorrectDisplay,
  step2IncorrectDisplay,
  step2PercentageDisplay,
  step3Unlocked,
  step3Completed,
  onOpenStep1,
  onOpenStep2,
  onOpenStep3,
  wordPreviews = [],
}: VocabularyTaskListProps) {
  const { t } = useLocale();
  const step2Locked = !step1Completed;
  const step3Locked = !step3Unlocked;

  const step1Current = !step1Completed;
  const step2Current = step1Completed && !step2Passed;
  const step3Current = step2Passed && !step3Completed;

  const previewShown = wordPreviews;

  const doneCount = [step1Completed, step2Passed, step3Completed].filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);

  type CardVars = {
    style: CSSProperties;
    captionColor: string;
    titleColor: string;
    subtitleColor: string;
    iconBg: string;
    iconColor: string;
    iconGlyph: string;
    caption: string;
    subtitle: string;
    showCta: boolean;
    showDone: boolean;
    doneLabel: string;
  };

  const buildVars = (
    n: number,
    active: boolean,
    done: boolean,
    locked: boolean,
    subtitle: string,
    doneLabel: string,
    emojiActive: string,
  ): CardVars => {
    const iconGlyph = done ? '✓' : locked ? '🔒' : emojiActive;
    return {
      style: done
        ? {
            background: '#DCFCE7',
            border: '1.5px solid #82E5B8',
            boxShadow: '0 8px 18px -8px rgba(34,197,94,0.24)',
          }
        : active
          ? {
              background: '#5B4CE0',
              border: 'none',
              boxShadow: '0 14px 30px -12px rgba(91,76,224,0.55)',
            }
          : {
              background: '#FFFFFF',
              border: '1.5px solid #DDD7F5',
              boxShadow: '0 6px 14px -8px rgba(45,27,105,0.06)',
            },
      captionColor: done ? '#0F7C3A' : active ? 'rgba(255,255,255,0.7)' : '#8B7FAB',
      titleColor: done ? '#0F7C3A' : active ? '#FFFFFF' : locked ? '#8B7FAB' : '#2D1B69',
      subtitleColor: done ? '#0F7C3A' : active ? 'rgba(255,255,255,0.75)' : '#8B7FAB',
      iconBg: done ? '#22C55E' : active ? 'rgba(255,255,255,0.16)' : '#F0EDFB',
      iconColor: done ? '#FFFFFF' : active ? '#FFFFFF' : '#8B7FAB',
      iconGlyph,
      caption: `VAZIFA ${n}${done ? ' · BAJARILDI' : active ? ' · HOZIR' : ''}`,
      subtitle,
      showCta: active && !done && !locked,
      showDone: done,
      doneLabel,
    };
  };

  const cards: Array<{ vars: CardVars; title: string; onPress: () => void; disabled: boolean }> = [
    {
      title: t('kunlik.stepLearn'),
      onPress: onOpenStep1,
      disabled: false,
      vars: buildVars(
        1,
        step1Current,
        step1Completed,
        false,
        step1Completed
          ? t('kunlik.knowDontKnow', { known: step1KnownDisplay, unknown: step1UnknownDisplay })
          : 'Kartani bosing — tarjimasi chiqadi',
        t('kunlik.completed'),
        '🃏',
      ),
    },
    {
      title: t('kunlik.stepTest'),
      onPress: onOpenStep2,
      disabled: step2Locked,
      vars: buildVars(
        2,
        step2Current && !step2Locked,
        step2Passed,
        step2Locked,
        step2Locked
          ? t('kunlik.step2LockedHint')
          : step2Completed
            ? `${step2CorrectDisplay} / ${step2CorrectDisplay + step2IncorrectDisplay} (${Math.round(step2PercentageDisplay)}%)`
            : t('kunlik.testHint'),
        t('kunlik.passed'),
        '🎯',
      ),
    },
    {
      title: t('kunlik.stepPairs'),
      onPress: onOpenStep3,
      disabled: step3Locked,
      vars: buildVars(
        3,
        step3Current && !step3Locked,
        step3Completed,
        step3Locked,
        step3Locked ? t('kunlik.step3LockedHint') : step3Completed ? t('kunlik.allPairsFound') : t('kunlik.ruUzPairs'),
        t('kunlik.completed'),
        '🔗',
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Purple hero: word set preview */}
      <div
        className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-[0_18px_44px_-18px_rgba(91,76,224,0.5)]"
        style={{ background: 'linear-gradient(155deg, #7B6BEE 0%, #5B4CE0 60%, #4C3EC7 100%)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-6 h-32 w-32 rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        />
        <div className="relative z-[2] flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-black uppercase tracking-[0.18em] text-white/70">
              {partTitle}
            </p>
            <p className="grammar-heading mt-1 text-[28px] leading-none">
              {hasServerSnapshot ? `${totalWords} ta so'z` : '…'}
            </p>
            {hasServerSnapshot ? (
              <p className="mt-1 text-[12px] font-bold text-white/75">
                {t('kunlik.learnedWords')} <span className="font-black text-white">{learnedWords}</span>
              </p>
            ) : null}
          </div>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[22px]"
            style={{ background: 'rgba(255,255,255,0.18)' }}
            aria-hidden
          >
            🧳
          </span>
        </div>
        {previewShown.length > 0 ? (
          <div className="relative z-[2] mt-4 flex flex-wrap gap-2">
            {previewShown.map((w) => (
              <span
                key={w}
                className="grammar-heading rounded-full bg-white/16 px-3 py-1 text-[12px] text-white ring-1 ring-white/10"
              >
                {w}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* "3 ta vazifa" header + progress */}
      <div className="flex items-center gap-3">
        <p className="grammar-heading text-[18px] leading-none text-[#2D1B69]">3 ta vazifa</p>
        <div className="flex flex-1 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#DDD7F5]">
            <div
              className="h-full rounded-full bg-[#22C55E] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12px] font-black text-[#8B7FAB]">{doneCount}/3</span>
        </div>
      </div>

      {/* 3 vazifa cards */}
      <div className="flex flex-col gap-3">
        {cards.map(({ vars, title, onPress, disabled }, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) onPress();
            }}
            className="w-full rounded-[20px] p-4 text-left transition-transform active:scale-[0.99] disabled:cursor-default"
            style={vars.style}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[22px] leading-none"
                style={{ background: vars.iconBg, color: vars.iconColor }}
              >
                {vars.iconGlyph}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: vars.captionColor }}>
                  {vars.caption}
                </p>
                <p className="grammar-heading mt-0.5 truncate text-[18px] leading-tight" style={{ color: vars.titleColor }}>
                  {title}
                </p>
                <p className="mt-0.5 truncate text-[12px] font-semibold" style={{ color: vars.subtitleColor }}>
                  {vars.subtitle}
                </p>
              </div>
            </div>

            {vars.showCta ? (
              <div className="mt-3">
                <span className="flex items-center justify-center rounded-[14px] bg-white px-4 py-3 text-[14px] font-black text-[#5B4CE0] shadow-[0_4px_10px_rgba(45,27,105,0.12)]">
                  {t('common.start')} →
                </span>
              </div>
            ) : vars.showDone ? (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-black text-[#0F7C3A]">
                ✓ {vars.doneLabel}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
