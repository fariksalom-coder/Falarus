import { apiUrl } from '../api';
import type { AnswerResult, HomeworkKind, HomeworkStatus, PublicQuestion, TeacherTest, TestQuestion, WordPair } from '../../shared/teacherTests';

/** O'qituvchi testlari va uy vazifalari (o'qituvchi kabineti, dars doskasi, o'quvchi). */

export type TestSummary = { id: number; title: string; question_count: number; created_at: string; updated_at: string };

export type HomeworkMaterial = { id: number; title: string; kind: string; page_count: number | null; status: string };
export type Homework = {
  id: number;
  kind: HomeworkKind;
  title: string;
  note: string;
  test_id: number | null;
  material_id: number | null;
  words: WordPair[] | null;
  due_at: string | null;
  status: HomeworkStatus;
  answered: number;
  score: number | null;
  total: number | null;
  question_count: number;
  seen_at: string | null;
  done_at: string | null;
  created_at: string;
  student?: { id: number; first_name: string | null; last_name: string | null };
  teacher?: { id: number; first_name: string | null; last_name: string | null };
  material?: HomeworkMaterial;
};
export type HomeworkDetail = Homework & {
  questions: PublicQuestion[] | TestQuestion[] | null;
  answers: Record<string, AnswerResult>;
};
export type HomeworkStudent = { id: number; first_name: string | null; last_name: string | null };

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(`/api${path}`), {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((data as { error?: string })?.error ?? 'Xatolik yuz berdi'));
  return data as T;
}

export const getTests = (token: string) => call<{ tests: TestSummary[] }>(token, '/teacher/tests').then((r) => r.tests);
export const getTest = (token: string, id: number) => call<TeacherTest>(token, `/teacher/tests/${id}`);
export const saveTest = (token: string, test: { id?: number; title: string; questions: TestQuestion[] }) =>
  call<TeacherTest>(token, test.id ? `/teacher/tests/${test.id}` : '/teacher/tests', {
    method: test.id ? 'PUT' : 'POST',
    body: JSON.stringify({ title: test.title, questions: test.questions }),
  });
export const deleteTest = (token: string, id: number) => call<{ ok: true }>(token, `/teacher/tests/${id}`, { method: 'DELETE' });

export const getHomeworkStudents = (token: string) =>
  call<{ students: HomeworkStudent[] }>(token, '/teacher/homework-students').then((r) => r.students);
export const getTeacherHomework = (token: string, studentId?: number) =>
  call<{ homework: Homework[] }>(token, `/teacher/homework${studentId ? `?student=${studentId}` : ''}`).then((r) => r.homework);
export const getTeacherHomeworkDetail = (token: string, id: number) => call<HomeworkDetail>(token, `/teacher/homework/${id}`);
export const createHomework = (token: string, body: {
  student_id: number; kind: HomeworkKind; title?: string; note?: string; test_id?: number; material_id?: number; words?: WordPair[]; due_at?: string | null;
}) => call<Homework>(token, '/teacher/homework', { method: 'POST', body: JSON.stringify(body) });
export const deleteHomework = (token: string, id: number) => call<{ ok: true }>(token, `/teacher/homework/${id}`, { method: 'DELETE' });

export const getMyHomework = (token: string) => call<{ homework: Homework[]; new_count: number }>(token, '/my-homework');
export const getMyHomeworkDetail = (token: string, id: number) => call<HomeworkDetail>(token, `/my-homework/${id}`);
export const answerHomework = (token: string, id: number, q: number, choice: number) =>
  call<AnswerResult & { score?: number; total?: number; done?: boolean; already?: boolean }>(token, `/my-homework/${id}/answer`, {
    method: 'POST', body: JSON.stringify({ q, choice }),
  });
export const finishHomework = (token: string, id: number) => call<{ ok: true }>(token, `/my-homework/${id}/done`, { method: 'POST' });
