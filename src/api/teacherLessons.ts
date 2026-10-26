import { apiUrl } from '../api';
import type { ScheduleData } from '../../shared/teacherOnboarding';
import type { LessonStatus } from '../../shared/teacherLessons';

export type TeacherLesson = {
  id: number;
  teacher_user_id: number;
  student_user_id: number;
  starts_at: string;
  ends_at: string;
  price_uzs: number;
  status: LessonStatus;
  student_message: string;
  lesson_number: number | null;
  commission_percent: number | null;
  teacher_amount_uzs: number | null;
  completed_at: string | null;
  dispute_reason: string | null;
  cancel_reason: string | null;
  refund_due: boolean;
  refunded_at: string | null;
  join: { opensAt: number; closesAt: number };
  teacher_first_name?: string;
  teacher_last_name?: string;
  teacher_avatar_url?: string | null;
  /** O'quvchining shu darsga qo'ygan bahosi (sharh bo'lsa). */
  my_review_overall?: number | null;
  /** Sharh holati: admin tasdiqlagandan keyin ochiq sahifaga chiqadi. */
  my_review_status?: 'pending' | 'approved' | 'rejected' | null;
  /** Rad etilgan bo'lsa — admin sababi. */
  my_review_note?: string | null;
  student_first_name?: string;
  student_last_name?: string;
};

export type LessonSlots = { price_uzs: number | null; bookable: boolean; schedule: ScheduleData | null; busy: string[]; min_lead_minutes: number };

export type TeacherBalance = {
  balance: number;
  earned: number;
  entries: { id: number; kind: 'lesson' | 'withdrawal' | 'withdrawal_return' | 'adjustment'; amount_uzs: number; note: string; created_at: string }[];
  withdrawals: { id: number; amount_uzs: number; card_number: string; card_holder: string; status: 'requested' | 'paid' | 'rejected'; admin_note: string | null; requested_at: string; processed_at: string | null }[];
  /** To'langan, hali yakunlanmagan darslar: `net_uzs` — o'qituvchi ulushi, `ended` — o'tib bo'lganlari (tasdiq kutilmoqda). */
  upcoming: { lessons: number; gross_uzs: number; net_uzs: number; ended: number };
  min_withdrawal_uzs: number;
};

async function call<T>(token: string | null, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(`/api${path}`), {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(data?.error ?? 'Xatolik'));
  return data as T;
}

export const getLessonSlots = (teacherId: number) => call<LessonSlots>(null, `/teachers/${teacherId}/lesson-slots`);
export const bookLesson = (token: string, teacherId: number, startsAt: string, message: string) =>
  call<TeacherLesson>(token, `/teachers/${teacherId}/lessons`, { method: 'POST', body: JSON.stringify({ starts_at: startsAt, message }) });
export const getMyLessons = (token: string) => call<TeacherLesson[]>(token, '/my-lessons');
export const cancelLesson = (token: string, id: number, reason: string) =>
  call<{ ok: true; refund_due: boolean }>(token, `/lessons/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
export const disputeLesson = (token: string, id: number, reason: string) =>
  call<{ ok: true }>(token, `/lessons/${id}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) });

export const getTeacherLessons = (token: string) => call<TeacherLesson[]>(token, '/teacher/lessons');
export const completeTeacherLesson = (token: string, id: number) =>
  call<{ ok: true; percent?: number; teacher?: number }>(token, `/teacher/lessons/${id}/complete`, { method: 'POST' });
export const getTeacherBalance = (token: string) => call<TeacherBalance>(token, '/teacher/balance');
export const requestWithdrawal = (token: string, body: { amount_uzs: number; card_number: string; card_holder: string }) =>
  call<{ id: number; balance: number }>(token, '/teacher/withdrawals', { method: 'POST', body: JSON.stringify(body) });

/** Xona endi ochiq bo'lsa (dars boshlanishidan 10 daqiqa oldin — tugagach 30 daqiqa). */
export const roomOpen = (l: Pick<TeacherLesson, 'join'>, now = Date.now()) => now >= l.join.opensAt && now <= l.join.closesAt;
export const fmtSum = (n: number) => `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} soʻm`;
