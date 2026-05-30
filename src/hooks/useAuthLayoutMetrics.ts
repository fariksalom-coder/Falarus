import { useEffect, useState } from 'react';

export type AuthLayoutMetrics = {
  isCompact: boolean;
  isNarrow: boolean;
  section: number;
  afterHeader: number;
  titleFontSize: number;
  fieldLabelGap: number;
};

const DEFAULT: AuthLayoutMetrics = {
  isCompact: false,
  isNarrow: false,
  section: 16,
  afterHeader: 20,
  titleFontSize: 30,
  fieldLabelGap: 6,
};

function computeMetrics(): AuthLayoutMetrics {
  if (typeof window === 'undefined') return DEFAULT;
  const h = window.innerHeight;
  const w = window.innerWidth;
  const isCompact = h < 740;
  const isNarrow = w < 680;
  return {
    isCompact,
    isNarrow,
    section: isCompact ? 12 : 16,
    afterHeader: isCompact ? 16 : 20,
    titleFontSize: isNarrow ? 26 : 30,
    fieldLabelGap: isCompact ? 4 : 6,
  };
}

export function useAuthLayoutMetrics(): AuthLayoutMetrics {
  const [metrics, setMetrics] = useState<AuthLayoutMetrics>(computeMetrics);

  useEffect(() => {
    const update = () => setMetrics(computeMetrics());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return metrics;
}
