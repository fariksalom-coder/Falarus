/**
 * Dars xonasiga kim va qachon kira oladi — video xonaga kirish (teacherLessonRoutes) bilan bir xil qoida:
 * faqat shu darsning o'qituvchisi va o'quvchisi, to'langan dars, boshlanishdan 10 daqiqa oldin —
 * tugagandan 30 daqiqa keyingacha. Material fayllari va real vaqt kanali shu yerdan tekshiriladi.
 */
import { LESSON_MINUTES, joinState, joinWindow } from '../../shared/teacherLessons.js';
import type { LessonKind, RoomRole } from '../../shared/lessonRoom.js';

export type AccessQuery = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;

export type LessonAccess = {
  kind: LessonKind;
  lessonId: number;
  teacherId: number;
  studentId: number;
  role: RoomRole;
  /** Xona yopiladigan vaqt (ms). */
  closesAt: number;
};

export type AccessDenied = 'not_found' | 'unpaid' | 'early' | 'closed';

export class LessonAccessError extends Error {
  constructor(public reason: AccessDenied, message: string) { super(message); }
}

const MESSAGES: Record<AccessDenied, string> = {
  not_found: 'Dars topilmadi',
  unpaid: 'Dars toʻlanmagan yoki bekor qilingan',
  early: 'Dars xonasi hali ochilmagan',
  closed: 'Dars xonasi yopilgan',
};

export const parseLessonKind = (raw: unknown): LessonKind | null => (raw === 'lesson' || raw === 'trial' ? raw : null);

export async function checkLessonAccess(q: AccessQuery, kind: LessonKind, lessonId: number, userId: number, now = Date.now()): Promise<LessonAccess> {
  const deny = (reason: AccessDenied) => new LessonAccessError(reason, MESSAGES[reason]);
  if (!Number.isInteger(lessonId) || lessonId <= 0) throw deny('not_found');
  const l = kind === 'lesson'
    ? (await q(`SELECT teacher_user_id, student_user_id, starts_at, ends_at,
        status IN ('paid', 'disputed', 'completed') AS ok FROM teacher_lessons WHERE id = $1`, [lessonId])).rows[0]
    : (await q(`SELECT teacher_user_id, student_user_id, scheduled_starts_at AS starts_at,
        coalesce(scheduled_ends_at, scheduled_starts_at + ($2::int * interval '1 minute')) AS ends_at,
        status NOT IN ('pending_payment', 'cancelled', 'refunded') AS ok FROM teacher_trial_lessons WHERE id = $1`, [lessonId, LESSON_MINUTES])).rows[0];
  if (!l || (Number(l.teacher_user_id) !== userId && Number(l.student_user_id) !== userId)) throw deny('not_found');
  if (!l.ok || !l.starts_at) throw deny('unpaid');
  const starts = new Date(l.starts_at).toISOString();
  const ends = new Date(l.ends_at).toISOString();
  const state = joinState(starts, ends, now);
  if (state === 'early') throw deny('early');
  if (state === 'late') throw deny('closed');
  return {
    kind, lessonId,
    teacherId: Number(l.teacher_user_id),
    studentId: Number(l.student_user_id),
    role: Number(l.teacher_user_id) === userId ? 'teacher' : 'student',
    closesAt: joinWindow(starts, ends).closesAt,
  };
}
