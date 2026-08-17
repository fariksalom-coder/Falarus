import { apiUrl } from '../api';

export type ReadingIssue = {
  soz: string;
  muammo: string;
  tuzatish: string;
};

export type ReadingRule = {
  sarlavha: string;
  tushuntirish: string;
  misollar: { ru: string; uz: string }[];
};

export type ReadingFeedback = {
  transcript: string;
  /** 0-100 */
  aniqlik: number;
  daraja: 'zor' | 'yaxshi' | 'qoniqarli' | 'yomon';
  izoh: string;
  xatolar: ReadingIssue[];
  qoida: ReadingRule | null;
};

/** Ovoz yozuvini etalon gap bilan solishtiradi va grammatikani tushuntiradi. */
export async function checkReading(
  token: string,
  params: {
    referenceText: string;
    referenceUz?: string;
    audioBase64: string;
    mimeType: string;
  },
): Promise<ReadingFeedback> {
  const res = await fetch(apiUrl('/api/ustoz/oqish'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      referenceText: params.referenceText,
      referenceUz: params.referenceUz,
      audio: params.audioBase64,
      mimeType: params.mimeType,
    }),
  });

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    throw new Error(String((data as { error?: string }).error ?? "Ustoz javob bermadi"));
  }
  return data as ReadingFeedback;
}
