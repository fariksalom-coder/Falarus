import { useEffect, useState } from 'react';
import { getRubUzsRate } from '../api/fx';
import { RUB_UZS_FALLBACK_RATE } from '../../shared/rubUzs';

export type RubUzsRateState = {
  rate: number;
  asOf: string;
  loading: boolean;
};

/**
 * CBU RUB→UZS kursi (5 daqiqa client cache orqali).
 */
export function useRubUzsRate(): RubUzsRateState {
  const [rate, setRate] = useState(RUB_UZS_FALLBACK_RATE);
  const [asOf, setAsOf] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getRubUzsRate()
      .then((payload) => {
        if (cancelled) return;
        setRate(payload.rate);
        setAsOf(payload.as_of);
      })
      .catch(() => {
        if (cancelled) return;
        setRate(RUB_UZS_FALLBACK_RATE);
        setAsOf('fallback');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rate, asOf, loading };
}
