import { apiUrl } from '../api';

export type PatentVariantResult = {
  variant_number: number;
  correct_count: number;
  total_count: number;
  score_percent: number;
  passed: boolean;
  completed_at: string;
};

export async function getPatentVariantResults(
  token: string
): Promise<PatentVariantResult[]> {
  const res = await fetch(apiUrl('/api/patent/results'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Patent natijalari yuklanmadi');
  }
  return data ?? [];
}

export async function savePatentVariantResult(
  token: string,
  payload: {
    variantNumber: number;
    correctCount: number;
    totalCount: number;
  }
): Promise<PatentVariantResult> {
  const res = await fetch(apiUrl('/api/patent/results'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variant_number: payload.variantNumber,
      correct_count: payload.correctCount,
      total_count: payload.totalCount,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Patent natijasi saqlanmadi');
  }
  return data;
}
