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
  const encodedPath = encodeURIComponent(lessonPath);
  const res = await fetch(apiUrl(`/api/lessons/path/${encodedPath}/tasks/${taskNumber}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error || 'Savollar yuklanmadi');
  }
  return Array.isArray(body) ? (body as ApiQuestion[]) : [];
}
