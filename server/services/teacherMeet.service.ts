import { randomBytes } from 'node:crypto';
import type { DbClient } from '../types/dbClient';

/**
 * Video dars xonalari ("met") uchun umumiy logika.
 *
 * Xona = doimiy video xona (Jitsi room). Admin xonalarni yaratadi va o'qituvchiga
 * biriktiradi. O'qituvchi xonaga dars vaqtlarini (sessions) qo'shadi.
 * Xona faqat o'qituvchining o'ziga va unga yozilgan o'quvchilarga ko'rinadi.
 */

/** Jitsi domeni. O'z serveringiz bo'lsa MEET_DOMAIN orqali almashtiriladi. */
export const MEET_DOMAIN = (process.env.MEET_DOMAIN || 'meet.jit.si').replace(/^https?:\/\//, '').replace(/\/+$/, '');

/**
 * O'quvchi o'qituvchiga "yozilgan" hisoblanadigan sinov darsi holatlari.
 * pending_payment / cancelled / refunded — hisobga olinmaydi.
 */
export const ENROLLED_TRIAL_STATUSES = [
  'paid',
  'teacher_notified',
  'scheduled',
  'completed_by_teacher',
  'completed',
] as const;

export type MeetRoom = {
  id: number;
  room_slug: string;
  provider: string;
  title: string;
  note: string;
  teacher_user_id: number | null;
  status: 'free' | 'assigned' | 'paused' | 'archived';
  created_by_admin_id: number | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetSession = {
  id: number;
  room_id: number | null;
  teacher_user_id: number;
  title: string;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  created_by: 'teacher' | 'admin';
  /** Tashqi havola (Google Meet / Zoom). Bo'sh bo'lsa FalaRus video xonasi ishlatiladi. */
  join_url: string | null;
  created_at: string;
  updated_at: string;
};

/** Dars boshlanishidan necha daqiqa oldin kirish ochiladi. */
export const JOIN_EARLY_MINUTES = 10;
/** Dars tugaganidan keyin ham necha daqiqa kirish ochiq qoladi. */
export const JOIN_GRACE_MINUTES = 20;

/** Kirish oynasi: qachondan qachongacha "Kirish" tugmasi ishlaydi. */
export function joinWindow(session: Pick<MeetSession, 'starts_at' | 'duration_minutes'>): {
  opensAt: number;
  closesAt: number;
} {
  const start = new Date(session.starts_at).getTime();
  return {
    opensAt: start - JOIN_EARLY_MINUTES * 60_000,
    closesAt: start + (Number(session.duration_minutes) || 60) * 60_000 + JOIN_GRACE_MINUTES * 60_000,
  };
}

/** Hozir shu darsga kirish mumkinmi? */
export function isSessionJoinable(
  session: Pick<MeetSession, 'starts_at' | 'duration_minutes' | 'status'>,
  now: number = Date.now()
): boolean {
  if (session.status === 'cancelled' || session.status === 'ended') return false;
  const { opensAt, closesAt } = joinWindow(session);
  return now >= opensAt && now <= closesAt;
}

/** Tashqi havolani tekshirish — faqat https va meet/zoom kabi oddiy havolalar. */
export function normalizeJoinUrl(raw: unknown): { url: string | null; error: string | null } {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return { url: null, error: null };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { url: null, error: 'Havola noto‘g‘ri. To‘liq havolani qo‘ying: https://...' };
  }
  if (parsed.protocol !== 'https:') {
    return { url: null, error: 'Havola https:// bilan boshlanishi kerak' };
  }
  if (value.length > 500) return { url: null, error: 'Havola juda uzun' };
  return { url: parsed.toString(), error: null };
}

/** Taxmin qilib bo'lmaydigan xona nomi — havolani bilmagan odam kira olmaydi. */
export function generateRoomSlug(): string {
  return `falarus-${randomBytes(9).toString('hex')}`;
}

/** O'quvchi yozilgan o'qituvchilar ro'yxati (unikal user_id lar). */
export async function getEnrolledTeacherIds(supabase: DbClient, studentUserId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('teacher_trial_lessons')
    .select('teacher_user_id, status')
    .eq('student_user_id', studentUserId)
    .in('status', [...ENROLLED_TRIAL_STATUSES]);
  if (error) throw error;
  const ids = new Set<number>();
  for (const row of ((data as { teacher_user_id: number }[]) ?? [])) {
    const id = Number(row.teacher_user_id);
    if (Number.isFinite(id)) ids.add(id);
  }
  return Array.from(ids);
}

/** O'quvchi shu o'qituvchiga yozilganmi? */
export async function isStudentOfTeacher(
  supabase: DbClient,
  studentUserId: number,
  teacherUserId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('teacher_trial_lessons')
    .select('id')
    .eq('student_user_id', studentUserId)
    .eq('teacher_user_id', teacherUserId)
    .in('status', [...ENROLLED_TRIAL_STATUSES])
    .limit(1);
  if (error) throw error;
  return (((data as unknown[]) ?? []).length) > 0;
}

export type JoinAccess = {
  /** 200 — ruxsat bor; aks holda HTTP xato kodi. */
  status: number;
  error: string;
  role: 'teacher' | 'student' | null;
  room: MeetRoom | null;
};

/**
 * Xonaga kirish huquqini tekshiradi.
 * - O'qituvchi: xona unga biriktirilgan bo'lsa (moderator).
 * - O'quvchi: xona egasi bo'lgan o'qituvchiga yozilgan bo'lsa.
 */
export async function resolveJoinAccess(
  supabase: DbClient,
  roomId: number,
  userId: number
): Promise<JoinAccess> {
  const { data, error } = await supabase
    .from('teacher_meet_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  const room = data as MeetRoom | null;
  if (!room) return { status: 404, error: 'Xona topilmadi', role: null, room: null };

  if (room.teacher_user_id == null) {
    return { status: 409, error: 'Xona hali o‘qituvchiga biriktirilmagan', role: null, room: null };
  }
  if (room.status === 'paused' || room.status === 'archived') {
    return { status: 409, error: 'Xona hozir faol emas', role: null, room: null };
  }
  if (Number(room.teacher_user_id) === userId) {
    return { status: 200, error: '', role: 'teacher', room };
  }
  if (await isStudentOfTeacher(supabase, userId, Number(room.teacher_user_id))) {
    return { status: 200, error: '', role: 'student', room };
  }
  return { status: 403, error: 'Bu xonaga kirish huquqingiz yo‘q', role: null, room: null };
}

/** Xonaning kelgusi (va yaqinda tugagan) darslari. */
export async function listSessionsForRooms(
  supabase: DbClient,
  roomIds: number[],
  options: { includePast?: boolean } = {}
): Promise<MeetSession[]> {
  if (roomIds.length === 0) return [];
  let query = supabase
    .from('teacher_meet_sessions')
    .select('*')
    .in('room_id', roomIds)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(200);
  if (!options.includePast) {
    // Boshlanishiga 2 soatdan kam qolgan yoki hali boshlanmagan darslar.
    const from = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    query = query.gte('starts_at', from);
  }
  const { data, error } = await query;
  if (error) throw error;
  return ((data as MeetSession[]) ?? []).map((s) => ({ ...s, id: Number(s.id), room_id: Number(s.room_id) }));
}

export type SessionAccess = {
  /** 200 — ruxsat bor; 425 — vaqti hali kelmagan; aks holda xato kodi. */
  status: number;
  error: string;
  role: 'teacher' | 'student' | null;
  session: MeetSession | null;
  room: MeetRoom | null;
};

/**
 * Darsga kirish huquqi + VAQT nazorati.
 * Vaqti kelmagan bo'lsa 425 qaytadi (tugma faqat vaqtida faollashadi).
 */
export async function resolveSessionAccess(
  supabase: DbClient,
  sessionId: number,
  userId: number
): Promise<SessionAccess> {
  const deny = (status: number, error: string): SessionAccess => ({
    status,
    error,
    role: null,
    session: null,
    room: null,
  });

  const { data, error } = await supabase
    .from('teacher_meet_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  const session = data as MeetSession | null;
  if (!session) return deny(404, 'Dars topilmadi');
  if (session.status === 'cancelled') return deny(409, 'Bu dars bekor qilingan');

  const teacherId = Number(session.teacher_user_id);
  const role: 'teacher' | 'student' | null =
    teacherId === userId
      ? 'teacher'
      : (await isStudentOfTeacher(supabase, userId, teacherId))
        ? 'student'
        : null;
  if (!role) return deny(403, 'Bu darsga kirish huquqingiz yo‘q');

  if (!isSessionJoinable(session)) {
    const { opensAt, closesAt } = joinWindow(session);
    if (Date.now() < opensAt) {
      return {
        status: 425,
        error: 'Dars hali boshlanmadi',
        role,
        session,
        room: null,
      };
    }
    if (Date.now() > closesAt) return deny(410, 'Bu dars allaqachon tugagan');
  }

  let room: MeetRoom | null = null;
  if (session.room_id != null) {
    const roomRes = await supabase
      .from('teacher_meet_rooms')
      .select('*')
      .eq('id', Number(session.room_id))
      .maybeSingle();
    if (roomRes.error) throw roomRes.error;
    room = (roomRes.data as MeetRoom | null) ?? null;
  }
  if (!room && !session.join_url) {
    return deny(409, 'Bu dars uchun havola yoki xona topilmadi');
  }

  return { status: 200, error: '', role, session, room };
}

/** O'qituvchiga bildirishnoma yozish (xato bo'lsa jimgina o'tkazib yuboriladi). */
export async function notifyTeacher(
  supabase: DbClient,
  recipientUserId: number,
  type: 'meet_room_assigned' | 'meet_session_scheduled',
  title: string,
  body: string,
  entityId: number | null
): Promise<void> {
  try {
    await supabase.from('teacher_notifications').insert({
      recipient_user_id: recipientUserId,
      type,
      title,
      body,
      entity_type: 'teacher_meet_room',
      entity_id: entityId,
    });
  } catch (e) {
    console.error('[teacherMeet.notifyTeacher]', e);
  }
}
