import { apiUrl } from '../api';

/**
 * Video dars: platforma orqali to'langan dars yoki sinov darsiga ulanish.
 * Server vaqtni va ishtirokchini tekshiradi.
 * (Admin yaratadigan "video xonalar" 2026-10-24 da olib tashlandi — ishlatilmagan.)
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

/** Platforma orqali to'langan dars yoki sinov darsi — FalaRus xonasi (faqat ishtirokchilar, vaqtida). */
export async function joinLessonRoom(token: string, kind: 'lesson' | 'trial', id: number): Promise<MeetJoinInfo> {
  const path = kind === 'lesson' ? `/api/lessons/${id}/join` : `/api/teacher-trials/${id}/join`;
  const res = await fetch(apiUrl(path), { headers: authHeaders(token) });
  return parse<MeetJoinInfo>(res, 'Darsga ulanib bo‘lmadi');
}
