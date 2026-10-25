import { apiUrl } from '../api';
import type { MaterialKind, MaterialStatus, PageWidth } from '../../shared/teacherMaterials';

/** O'qituvchining dars materiallari va darsdagi doska. */

export type TeacherMaterial = {
  id: number;
  title: string;
  kind: MaterialKind;
  mime: string;
  size_bytes: number;
  original_name: string | null;
  status: MaterialStatus;
  /** PDF sahifalari soni (rasmda 1). */
  page_count: number | null;
  error: string | null;
  /** PowerPoint/Word dan aylantirilgan bo'lsa — asl turi (pptx, docx …). */
  source_kind: string | null;
  created_at: string;
  updated_at: string;
};

export type MaterialLibrary = {
  materials: TeacherMaterial[];
  used_bytes: number;
  quota_bytes: number;
  max_file_bytes: number;
};

export type { LessonKind } from '../../shared/lessonRoom';
import type { LessonKind } from '../../shared/lessonRoom';

export class MaterialError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'MaterialError';
  }
}

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api${path}`), {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch {
    throw new MaterialError('Internet aloqasi yoʻq', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new MaterialError(String((data as { error?: string })?.error ?? 'Xatolik'), res.status);
  return data as T;
}

export const getMaterials = (token: string) => call<MaterialLibrary>(token, '/teacher/materials');

export const getMaterial = (token: string, id: number) => call<TeacherMaterial>(token, `/teacher/materials/${id}`);

export const renameMaterial = (token: string, id: number, title: string) =>
  call<TeacherMaterial>(token, `/teacher/materials/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });

export const deleteMaterial = (token: string, id: number) =>
  call<{ ok: true }>(token, `/teacher/materials/${id}`, { method: 'DELETE' });

/**
 * Yuklash XHR bilan — fetch yuklash foizini bermaydi, katta video uchun esa
 * foiz ko'rinib turishi kerak. `signal` bilan bekor qilinadi.
 */
export function uploadMaterial(
  token: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<TeacherMaterial> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/teacher/materials'));
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* bo'sh javob */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as unknown as TeacherMaterial);
      else reject(new MaterialError(String(data.error ?? (xhr.status === 413 ? 'Fayl juda katta' : 'Yuklab boʻlmadi')), xhr.status));
    };
    xhr.onerror = () => reject(new MaterialError('Internet aloqasi uzildi', 0));
    xhr.onabort = () => reject(new MaterialError('Bekor qilindi', -1));
    signal?.addEventListener('abort', () => xhr.abort());
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

/** Material qayerdan olinadi: o'qituvchining kutubxonasi yoki dars doskasi (o'quvchi ham). */
export type MaterialSource =
  | { materialId: number }
  | { kind: LessonKind; lessonId: number; materialId: number };

const sourceBase = (s: MaterialSource) => ('kind' in s ? `/api/lesson-board/${s.kind}/${s.lessonId}` : `/api/teacher/materials/${s.materialId}`);
// Doskadan: `material` — kutilgan fayl; o'qituvchi shu orada boshqasini chiqargan bo'lsa server 404 beradi.
const sourceQuery = (s: MaterialSource) => ('kind' in s ? `material=${s.materialId}` : '');

async function getBlob(token: string, url: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(apiUrl(url), { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new MaterialError('Internet aloqasi yoʻq', 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new MaterialError(String((data as { error?: string })?.error ?? 'Faylni ochib boʻlmadi'), res.status);
  }
  return res.blob();
}

/** Butun fayl (audio, video). */
export function fetchMaterialBlob(token: string, source: MaterialSource): Promise<Blob> {
  const query = sourceQuery(source);
  return getBlob(token, `${sourceBase(source)}/file${query ? `?${query}` : ''}`);
}

/** Mobil tarmoq uzilsa yoki server band bo'lsa — 3 martagacha qayta urinadi (0.8 s, 2 s, 4 s). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [800, 2000, 4000];
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as MaterialError).status;
      const retriable = status === 0 || status >= 500;
      if (!retriable || i >= delays.length) throw e;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
}

/*
 * Sahifa rasmlari keshi: varaqlab qaytilganda qayta yuklanmaydi. Oxirgi 24 ta sahifa xotirada
 * (≈3 MB), eskisi chiqarib yuboriladi va uning blob manzili bo'shatiladi.
 */
const PAGE_CACHE_LIMIT = 24;
const pageCache = new Map<string, Promise<string>>();

/** Sahifa (yoki rasm) — `blob:` manzil. Bir xil so'rov bir marta yuboriladi. */
export function loadPageUrl(token: string, source: MaterialSource, page: number, width: PageWidth): Promise<string> {
  const query = [sourceQuery(source), `w=${width}`].filter(Boolean).join('&');
  const key = `${sourceBase(source)}/page/${page}?${query}`;
  const hit = pageCache.get(key);
  if (hit) {
    pageCache.delete(key);
    pageCache.set(key, hit);
    return hit;
  }
  const job = withRetry(() => getBlob(token, key)).then((b) => URL.createObjectURL(b));
  job.catch(() => pageCache.delete(key));
  pageCache.set(key, job);
  while (pageCache.size > PAGE_CACHE_LIMIT) {
    const [oldKey, old] = pageCache.entries().next().value as [string, Promise<string>];
    pageCache.delete(oldKey);
    void old.then((u) => URL.revokeObjectURL(u), () => undefined);
  }
  return job;
}

export const getLessonMaterials = (token: string, kind: LessonKind, lessonId: number) =>
  call<{ material_ids: number[] }>(token, `/teacher/lesson-materials/${kind}/${lessonId}`);

export const setLessonMaterials = (token: string, kind: LessonKind, lessonId: number, ids: number[]) =>
  call<{ material_ids: number[] }>(token, `/teacher/lesson-materials/${kind}/${lessonId}`, { method: 'PUT', body: JSON.stringify({ material_ids: ids }) });

/** Doskaga chiqarish uchun materialning qisqa tavsifi. */
export const roomMaterialOf = (m: TeacherMaterial) => ({ id: m.id, title: m.title, kind: m.kind, mime: m.mime, size_bytes: m.size_bytes, page_count: m.page_count });

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
