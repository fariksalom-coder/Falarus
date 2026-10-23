/**
 * O'quvchi uchun ustozlar katalogi (2026-10-24): kartochka, profil, sharhlar,
 * darsdan keyingi baho va ustoz bilan chat. Server: teacherLessonRoutes `/market/*`.
 */
import { apiUrl } from '../api';
import type { LanguageRow } from '../../shared/teacherOnboarding';
import type { ReviewCriterion, TeacherLevelKey } from '../../shared/teacherLessons';

export type MarketTeacher = {
  user_id: number;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  about: string;
  price_uzs: number | null;
  lesson_minutes: number;
  experience_years: number | null;
  specializations: string[];
  languages: LanguageRow[];
  certified: boolean;
  rating_avg: number | null;
  rating_count: number;
  lessons_done: number;
  active_students: number;
  level: TeacherLevelKey;
  bookable: boolean;
  /** Keyingi 7 kundagi bo'sh vaqtlar (ISO, UTC). */
  free_slots: string[];
};

export type MarketReview = {
  id: number;
  overall: number;
  support: number;
  honesty: number;
  progress: number;
  preparation: number;
  comment: string;
  created_at: string;
  student_name: string;
  student_avatar_url: string | null;
};

export type MarketTeacherDetail = MarketTeacher & {
  video_url: string | null;
  proficiency: string | null;
  birth_country: string | null;
  certificates: { title: string; institution: string; year: number | null }[];
  education: { institution: string; specialty: string; degree: string; year_from: number | null; year_to: number | null }[];
  criteria: Record<ReviewCriterion, number> | null;
  reviews: MarketReview[];
  reviews_total: number;
};

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(`/api${path}`), {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(data?.error ?? 'Xatolik'));
  return data as T;
}

export const listMarketTeachers = (token: string) => call<MarketTeacher[]>(token, '/market/teachers');
export const getMarketTeacher = (token: string, id: number) => call<MarketTeacherDetail>(token, `/market/teachers/${id}`);
export const getMarketReviews = (token: string, id: number, offset: number, limit = 10) =>
  call<MarketReview[]>(token, `/market/teachers/${id}/reviews?offset=${offset}&limit=${limit}`);
export const openTeacherChat = (token: string, teacherId: number) =>
  call<{ conversation_id: number }>(token, `/market/teachers/${teacherId}/chat`, { method: 'POST' });
export const reviewLesson = (token: string, lessonId: number, scores: Record<ReviewCriterion, number>, comment: string) =>
  call<{ ok: true; overall: number }>(token, `/lessons/${lessonId}/review`, { method: 'POST', body: JSON.stringify({ scores, comment }) });
