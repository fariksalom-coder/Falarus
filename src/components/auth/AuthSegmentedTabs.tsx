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
    <div className="relative h-[54px] rounded-[16px] bg-[#F1F4FA] p-[5px]">
<motion.div
        className="absolute bottom-[5px] top-[5px] rounded-[12px] bg-white shadow-[0_3px_8px_rgba(23,34,74,0.1)]"
        initial={false}
        animate={{
          left: `calc(${selectedIndex} * (100% / ${options.length}) + 5px)`,
          width: `calc(100% / ${options.length} - 10px)`,
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
                'flex-1 rounded-[12px] text-[14px] transition-colors duration-180',
                selected ? 'font-black text-[#2F6BFF]' : 'font-extrabold text-[#8794AC]',
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
