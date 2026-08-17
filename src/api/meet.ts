import { apiUrl } from '../api';

/**
 * Video darslar ("met"). Modelni o'qituvchi boshqaradi:
 * u kun/soatni belgilaydi va istasa o'z havolasini (Google Meet, Zoom) qo'yadi.
 * Havola bo'lmasa FalaRus'ning o'z video xonasi ishlatiladi.
 * O'quvchida "Kirish" tugmasi faqat belgilangan vaqtda faollashadi.
 */

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** Server xatosi + qo'shimcha maydonlar (masalan, vaqti kelmagan bo'lsa opens_at). */
export class MeetError extends Error {
  status: number;
  opensAt: string | null;
  startsAt: string | null;

  constructor(message: string, status: number, opensAt: string | null, startsAt: string | null) {
    super(message);
    this.name = 'MeetError';
    this.status = status;
    this.opensAt = opensAt;
    this.startsAt = startsAt;
  }
}

async function parse<T>(res: Response, fallbackError: string): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new MeetError(
      (data?.error as string) || fallbackError,
      res.status,
      (data?.opens_at as string) ?? null,
      (data?.starts_at as string) ?? null,
    );
  }
  return data as T;
}

export type MeetRoom = {
  id: number;
  room_slug: string;
  title: string;
  note: string;
  teacher_user_id: number | null;
  status: 'free' | 'assigned' | 'paused' | 'archived';
  created_at: string;
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
  join_url: string | null;
};

export type TeacherMeetResponse = {
  domain: string;
  rooms: MeetRoom[];
  sessions: MeetSession[];
  students_count: number;
};

/** O'qituvchi kabineti: darslar va (agar berilgan bo'lsa) FalaRus xonasi. */
export async function getTeacherMeetRooms(token: string): Promise<TeacherMeetResponse> {
  const res = await fetch(apiUrl('/api/teacher/me/meet-rooms'), { headers: authHeaders(token) });
  return parse<TeacherMeetResponse>(res, 'Video darslar yuklanmadi');
}

/** O'qituvchi yangi dars (met) ochadi. */
export async function createMeetSession(
  token: string,
  body: { starts_at: string; duration_minutes?: number; title?: string; join_url?: string },
): Promise<MeetSession> {
  const res = await fetch(apiUrl('/api/teacher/me/meet-sessions'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parse<{ session: MeetSession }>(res, 'Dars saqlanmadi');
  return data.session;
}

/** Darsni tahrirlash yoki bekor qilish. */
export async function updateMeetSession(
  token: string,
  sessionId: number,
  body: {
    starts_at?: string;
    duration_minutes?: number;
    title?: string;
    join_url?: string;
    status?: MeetSession['status'];
  },
): Promise<MeetSession | null> {
  const res = await fetch(apiUrl(`/api/teacher/me/meet-sessions/${sessionId}`), {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parse<{ session: MeetSession | null }>(res, 'Dars yangilanmadi');
  return data.session;
}

/** Darsni butunlay o'chirish. */
export async function deleteMeetSession(token: string, sessionId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/teacher/me/meet-sessions/${sessionId}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parse<{ ok: boolean }>(res, 'Dars o‘chirilmadi');
}

/** O'quvchi ko'radigan dars. Havolaning o'zi bu yerda berilmaydi. */
export type StudentMeetLesson = {
  id: number;
  title: string;
  starts_at: string;
  duration_minutes: number;
  status: MeetSession['status'];
  teacher_user_id: number;
  teacher_name: string;
  teacher_avatar_url: string | null;
  is_external: boolean;
  /** Kirish tugmasi shu vaqtdan boshlab faollashadi. */
  opens_at: string;
  closes_at: string;
  is_joinable: boolean;
};

export type StudentMeetResponse = {
  domain: string;
  lessons: StudentMeetLesson[];
};

/** O'quvchi: faqat o'zi yozilgan o'qituvchining darslari. */
export async function getMyMeetLessons(token: string): Promise<StudentMeetResponse> {
  const res = await fetch(apiUrl('/api/my-meet-lessons'), { headers: authHeaders(token) });
  return parse<StudentMeetResponse>(res, 'Video darslar yuklanmadi');
}

export type MeetJoinInfo =
  | {
      type: 'external';
      url: string;
      title: string;
      starts_at: string;
      role: 'teacher' | 'student';
    }
  | {
      type: 'jitsi';
      domain: string;
      room_slug: string;
      title: string;
      starts_at: string;
      role: 'teacher' | 'student';
      display_name: string;
      email: string | null;
    };

/**
 * Darsga ulanish. Server vaqtni tekshiradi — vaqti kelmagan bo'lsa
 * MeetError (status 425) tashlanadi va `opensAt` qaytadi.
 */
export async function joinMeetSession(token: string, sessionId: number): Promise<MeetJoinInfo> {
  const res = await fetch(apiUrl(`/api/meet-sessions/${sessionId}/join`), {
    headers: authHeaders(token),
  });
  return parse<MeetJoinInfo>(res, 'Darsga ulanib bo‘lmadi');
}

export type RoomJoinInfo = {
  domain: string;
  room_slug: string;
  room_title: string;
  role: 'teacher' | 'student';
  display_name: string;
  email: string | null;
  teacher_name: string;
};

/** Doimiy xonaga ulanish (o'qituvchi uchun; vaqt cheklovisiz). */
export async function joinMeetRoom(token: string, roomId: number): Promise<RoomJoinInfo> {
  const res = await fetch(apiUrl(`/api/meet-rooms/${roomId}/join`), { headers: authHeaders(token) });
  return parse<RoomJoinInfo>(res, 'Xonaga ulanib bo‘lmadi');
}
