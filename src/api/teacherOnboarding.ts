import { apiUrl } from '../api';
import type { CommissionTier, ErrorCode, OnboardingData, OnboardingSettings } from '../../shared/teacherOnboarding';

export type OnboardingDocument = { id: number; original_name: string; mime: string; size_bytes: number; status: string; created_at: string };
export type OnboardingState = {
  data: OnboardingData;
  step: number;
  status: 'draft' | 'pending_review' | 'needs_revision' | 'active' | 'paused' | 'rejected';
  submitted_at: string | null;
  review: { comment: string | null; step: number | null; at: string | null } | null;
  certified_verified: boolean;
  documents: OnboardingDocument[];
  settings: OnboardingSettings;
  terms: { version: string; uz: string[]; ru: string[] };
  commission: { completed: number; percent: number; next_percent: number | null; lessons_until_next: number | null };
  ready_step: number | null;
};
export type FieldError = { code: ErrorCode; uz: string; ru: string };

/** Server javobidagi xato: oddiy matn yoki maydonlar bo'yicha xatolar (422). */
export class OnboardingError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, FieldError> = {}, public extra: Record<string, unknown> = {}) { super(message); }
}

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api${path}`), { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) } });
  } catch {
    throw new OnboardingError('Internet aloqasi yoʻq. Maʼlumotlar saqlangan joyidan davom etadi.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new OnboardingError(String(data?.error ?? 'Xatolik'), res.status, data?.fields ?? {}, data);
  return data as T;
}

export const getOnboarding = (token: string) => call<OnboardingState>(token, '/teacher/onboarding');

export const saveStep = (token: string, step: number, body: unknown, draft = false) =>
  call<OnboardingState>(token, `/teacher/onboarding/steps/${step}${draft ? '?draft=1' : ''}`, { method: 'PUT', body: JSON.stringify(body) });

export const savePosition = (token: string, step: number) =>
  call<{ ok: true }>(token, '/teacher/onboarding/position', { method: 'POST', body: JSON.stringify({ step }) }).catch(() => undefined);

export function uploadPhoto(token: string, blob: Blob) {
  const f = new FormData();
  f.append('file', blob, 'photo.jpg');
  return call<OnboardingState>(token, '/teacher/onboarding/photo', { method: 'POST', body: f });
}

export function uploadDocument(token: string, file: File) {
  const f = new FormData();
  f.append('file', file, file.name);
  return call<OnboardingDocument>(token, '/teacher/onboarding/documents', { method: 'POST', body: f });
}

export const deleteDocument = (token: string, id: number) => call<{ ok: true }>(token, `/teacher/onboarding/documents/${id}`, { method: 'DELETE' });

/** Hujjatni ko'rish: fayl token bilan olinadi va yangi oynada ochiladi (oddiy havola ishlamaydi — fayl yopiq). */
export async function openDocument(token: string, id: number) {
  const win = window.open('', '_blank');
  const res = await fetch(apiUrl(`/api/teacher/onboarding/documents/${id}/file`), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { win?.close(); throw new OnboardingError('Hujjat ochilmadi', res.status); }
  const url = URL.createObjectURL(await res.blob());
  if (win) win.location.href = url; else window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const generateAbout = (token: string, answers: Record<string, string>, lang: 'uz' | 'ru') =>
  call<{ text: string; source: 'ai' | 'template' }>(token, '/teacher/onboarding/about/generate', { method: 'POST', body: JSON.stringify({ answers, lang }) });

export const submitOnboarding = (token: string) => call<OnboardingState>(token, '/teacher/onboarding/submit', { method: 'POST' });

export const getCommission = (token: string) =>
  call<{ completed: number; percent: number; next_percent: number | null; lessons_until_next: number | null; tiers: CommissionTier[]; lesson_price_uzs: number | null }>(token, '/teacher/commission');

/**
 * Videoni bo'laklab yuklash. Aloqa uzilsa 3 marta qayta urinadi; to'xtab
 * qolsa, xuddi shu faylni qayta tanlash serverdagi joyidan davom ettiradi
 * (server fayl nomi + hajmi bo'yicha topadi). `signal` — bekor qilish.
 */
export async function uploadVideo(token: string, file: Blob, name: string, onProgress: (sent: number, total: number) => void, signal?: AbortSignal) {
  const init = await call<{ id: string; received: number; chunk_size: number }>(token, '/teacher/onboarding/video/uploads', {
    method: 'POST', body: JSON.stringify({ size: file.size, mime: file.type || 'video/mp4', name }),
  });
  let offset = init.received;
  onProgress(offset, file.size);
  let failures = 0;
  while (offset < file.size) {
    if (signal?.aborted) throw new OnboardingError('Bekor qilindi', 0);
    const chunk = file.slice(offset, offset + init.chunk_size);
    try {
      const res = await fetch(apiUrl(`/api/teacher/onboarding/video/uploads/${init.id}?offset=${offset}`), {
        method: 'PUT', body: chunk, signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && typeof data.received === 'number') { offset = data.received; continue; }
      if (!res.ok) throw new OnboardingError(String(data?.error ?? 'Yuklashda xato'), res.status);
      offset = data.received;
      failures = 0;
      onProgress(offset, file.size);
    } catch (e) {
      if (signal?.aborted) throw new OnboardingError('Bekor qilindi', 0);
      if (e instanceof OnboardingError && e.status >= 400 && e.status < 500) throw e;
      if (++failures > 3) throw new OnboardingError('Aloqa uzildi. Videoni qayta tanlang — yuklash toʻxtagan joyidan davom etadi.', 0);
      await new Promise((r) => setTimeout(r, 1500 * failures));
      // Server qayerdaligini so'raymiz: bo'lak yetib borgan bo'lishi mumkin.
      const st = await call<{ received: number }>(token, `/teacher/onboarding/video/uploads/${init.id}`).catch(() => null);
      if (st) offset = st.received;
    }
  }
  return call<OnboardingState>(token, `/teacher/onboarding/video/uploads/${init.id}/complete`, { method: 'POST' });
}
