import { adminApi } from '../lib/adminApi';

export type AdminGrammarLessonRow = {
  id: number;
  title: string;
  lesson_path: string;
  is_active: boolean;
};

export type AdminGrammarQuestionRow = {
  id: number;
  lesson_id: number;
  type: string;
  prompt: string;
  order_index: number;
  is_active: boolean;
  version?: number;
  difficulty?: number;
  skill?: string;
  meta?: Record<string, unknown>;
};

export async function adminListGrammarLessons(): Promise<{ lessons: AdminGrammarLessonRow[] }> {
  return adminApi('/grammar/lessons');
}

export async function adminListGrammarQuestions(
  lessonId: number,
  task?: number,
): Promise<{ questions: AdminGrammarQuestionRow[] }> {
  const q = task != null ? `?task=${encodeURIComponent(String(task))}` : '';
  return adminApi(`/grammar/lessons/${lessonId}/questions${q}`);
}

export async function adminGetGrammarQuestion(questionId: number): Promise<{
  question: AdminGrammarQuestionRow & Record<string, unknown>;
  content: Record<string, unknown>;
  answer: Record<string, unknown>;
}> {
  return adminApi(`/grammar/questions/${questionId}`);
}

export async function adminUpdateGrammarQuestion(
  questionId: number,
  body: {
    type: string;
    prompt: string;
    order_index: number;
    is_active: boolean;
    content: unknown;
    answer: unknown;
    difficulty?: number;
    skill?: string;
    meta?: Record<string, unknown>;
  },
): Promise<{ ok: boolean }> {
  return adminApi(`/grammar/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function adminCreateGrammarQuestion(
  lessonId: number,
  body: {
    type: string;
    prompt: string;
    order_index: number;
    is_active?: boolean;
    content: unknown;
    answer: unknown;
    difficulty?: number;
    skill?: string;
    meta?: Record<string, unknown>;
  },
): Promise<{ id: number }> {
  return adminApi(`/grammar/lessons/${lessonId}/questions`, { method: 'POST', body: JSON.stringify(body) });
}
