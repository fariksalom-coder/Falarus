import { apiUrl } from '../api';
import type { MaterialKind } from '../../shared/teacherMaterials';

/** O'qituvchining dars materiallari va darsdagi doska. */

export type TeacherMaterial = {
  id: number;
  title: string;
  kind: MaterialKind;
  mime: string;
  size_bytes: number;
  original_name: string | null;
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

/** Faylni (egasi uchun) yoki doskadagi faylni (dars ishtirokchilari uchun) Blob qilib oladi. */
export async function fetchMaterialBlob(token: string, source: { materialId: number } | { kind: LessonKind; lessonId: number; materialId: number }): Promise<Blob> {
  // Doskadan: `material` — kutilgan fayl; o'qituvchi shu orada boshqasini chiqargan bo'lsa server 404 beradi.
  const path = 'kind' in source
    ? `/api/lesson-board/${source.kind}/${source.lessonId}/file?material=${source.materialId}`
    : `/api/teacher/materials/${source.materialId}/file`;
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new MaterialError('Internet aloqasi yoʻq', 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new MaterialError(String((data as { error?: string })?.error ?? 'Faylni ochib boʻlmadi'), res.status);
  }
  return res.blob();
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
