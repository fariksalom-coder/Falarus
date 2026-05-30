import { motion } from 'motion/react';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
};

export function AuthSegmentedTabs<T extends string>({ value, options, onChange }: Props<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <div className="relative h-[34px] rounded-xl bg-[#F1F5F9] p-[3px]">
      <motion.div
        className="absolute bottom-[3px] top-[3px] rounded-[9px] bg-white shadow-[0_2px_10px_rgba(30,58,138,0.1),0_1px_4px_rgba(0,0,0,0.05)]"
        initial={false}
        animate={{
          left: `calc(${selectedIndex} * (100% / ${options.length}) + 3px)`,
          width: `calc(100% / ${options.length} - 6px)`,
        }}
        transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
      />
      <div className="relative z-10 flex h-full">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={[
                'flex-1 rounded-[9px] text-sm transition-colors duration-180',
                selected ? 'font-semibold text-[#1E3A8A]' : 'font-medium text-[#4B4B4B]',
              ].join(' ')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
