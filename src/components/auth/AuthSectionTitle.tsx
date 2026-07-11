import type { ReactNode } from 'react';
import { useTextScale } from '../../context/TextScaleContext';
import { useLocale } from '../../context/LocaleContext';
import { useAuthLayoutMetrics } from '../../hooks/useAuthLayoutMetrics';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
};

export function AuthSectionTitle({ title, subtitle, onBack, trailing }: Props) {
  const metrics = useAuthLayoutMetrics();
  const { t } = useLocale();
  const { multiplier: textScale } = useTextScale();
  const titleFontSize = metrics.titleFontSize * textScale;

  return (
    <div className="mb-0" style={{ marginBottom: metrics.afterHeader }}>
      {onBack ? (
        <div className="relative mb-4 flex items-center">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('common.back')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-slate-50"
          >
            <img src="/auth/back.svg" alt="" width={24} height={24} className="text-[#2F6BFF]" />
          </button>
          <h1
            className="pointer-events-none absolute inset-x-0 text-center font-semibold text-[#0F172A]"
            style={{ fontSize: titleFontSize, lineHeight: 1.2 }}
          >
            {title}
          </h1>
          <div className="ml-auto flex h-11 w-11 items-center justify-end">{trailing}</div>
        </div>
      ) : (
        <h1
          className="text-center font-semibold text-[#0F172A]"
          style={{ fontSize: titleFontSize, lineHeight: 1.2 }}
        >
          {title}
        </h1>
      )}
      {subtitle ? (
        <>
          <div style={{ height: metrics.section }} />
          <p className="text-center text-base font-semibold text-[#4B4B4B]">{subtitle}</p>
        </>
      ) : null}
    </div>
  );
}
