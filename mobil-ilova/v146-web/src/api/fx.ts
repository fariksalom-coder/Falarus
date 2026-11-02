import { apiUrl } from '../api';
import { cachedRequest } from '../utils/requestCache';
import { RUB_UZS_FALLBACK_RATE } from '../../shared/rubUzs';

export type RubUzsRatePayload = {
  rate: number;
  as_of: string;
  source: string;
  updated_at: string;
};

const FX_TTL_MS = 5 * 60 * 1000;

export async function getRubUzsRate(): Promise<RubUzsRatePayload> {
  return cachedRequest('fx:rub-uzs', FX_TTL_MS, async () => {
    const res = await fetch(apiUrl('/api/fx/rub-uzs'));
    if (!res.ok) throw new Error('Kurs yuklanmadi');
    const data = (await res.json()) as Partial<RubUzsRatePayload>;
    const rate = Number(data.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return {
        rate: RUB_UZS_FALLBACK_RATE,
        as_of: 'fallback',
        source: 'fallback',
        updated_at: new Date().toISOString(),
      };
    }
    return {
      rate,
      as_of: String(data.as_of ?? ''),
      source: String(data.source ?? 'cbu'),
      updated_at: String(data.updated_at ?? ''),
    };
  });
}
