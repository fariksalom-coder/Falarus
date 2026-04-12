import { apiUrl } from '../api';

export type ApiQuestion = {
  id: number;
  type: 'choice' | 'matching' | 'sentence' | 'fill' | 'reorder';
  prompt: string;
  order_index: number;
  version?: number;
  difficulty?: number;
  skill?: string;
  meta?: Record<string, unknown>;
  content: Record<string, unknown>;
  answer: Record<string, unknown>;
};

export async function getLessonQuestions(token: string, lessonId: number): Promise<ApiQuestion[]> {
  const res = await fetch(apiUrl(`/api/lessons/${lessonId}/questions`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error || 'Savollar yuklanmadi');
  }
  return Array.isArray(body) ? (body as ApiQuestion[]) : [];
}

export async function postUserAnswer(
  token: string,
  lessonId: number,
  payload: { question_id: number; answer: unknown; is_correct?: boolean; duration_ms?: number }
): Promise<void> {
  const res = await fetch(apiUrl(`/api/lessons/${lessonId}/answers`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error || 'Javob saqlanmadi');
  }
}

export async function getLessonTaskQuestions(token: string, lessonPath: string, taskNumber: number): Promise<ApiQuestion[]> {
  const idMatch = lessonPath.match(/^\/lesson-(\d+)$/);
  const lessonId = idMatch ? Number(idMatch[1]) : NaN;
  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    throw new Error('Dars yo‘li noto‘g‘ri');
  }
  /** Alohida endpoint — Vercel ba’zan `/api/lessons/path/%2F...` va ichki catch-allda 404 beradi. */
  const res = await fetch(
    apiUrl(`/api/lesson-task-questions?lesson_id=${lessonId}&task_number=${taskNumber}`),
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { error?: string; message?: string })?.error;
    const msg = (body as { message?: string })?.message;
    if (res.status === 401) {
      throw new Error(err || 'Kirish muddati tugagan yoki token yaroqsiz. Qayta kiring.');
    }
    if (res.status === 403 && (err === 'locked' || msg)) {
      throw new Error(msg || 'Ushbu dars uchun tarif kerak.');
    }
    throw new Error(err || 'Savollar yuklanmadi');
  }
  return Array.isArray(body) ? (body as ApiQuestion[]) : [];
}
