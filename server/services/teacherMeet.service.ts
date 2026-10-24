import { randomBytes } from 'node:crypto';

/**
 * Video dars xonasi (Jitsi) uchun umumiy sozlamalar: domen va xona nomi.
 * Platforma darslari (teacherLessonRoutes) va jonli efir shu yerdan oladi.
 * Admin biriktiradigan "video xonalar" 2026-10-24 da olib tashlandi — ishlatilmagan
 * (teacher_meet_rooms / teacher_meet_sessions jadvallari bazada qoldi).
 */

/** Jitsi domeni. O'z serveringiz bo'lsa MEET_DOMAIN orqali almashtiriladi. */
export const MEET_DOMAIN = (process.env.MEET_DOMAIN || 'meet.jit.si').replace(/^https?:\/\//, '').replace(/\/+$/, '');

/** Taxmin qilib bo'lmaydigan xona nomi — havolani bilmagan odam kira olmaydi. */
export function generateRoomSlug(): string {
  return `falarus-${randomBytes(9).toString('hex')}`;
}
