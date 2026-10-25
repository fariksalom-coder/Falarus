/** DARS MATERIALLARI — server va o'qituvchi paneli uchun umumiy qoidalar. */

export type MaterialKind = 'pdf' | 'image' | 'audio' | 'video';

/** Bitta fayl 100 MB gacha (nginx 120 MB o'tkazadi), bitta o'qituvchiga jami 2 GB. */
export const MATERIAL_MAX_BYTES = 100 * 1024 * 1024;
export const MATERIAL_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;
export const MATERIAL_TITLE_MAX = 120;

/** Fayl tanlash oynasida ko'rinadigan turlar (server baribir baytlardan tekshiradi). */
export const MATERIAL_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.m4a,.wav,.ogg,.mp4,.mov,.webm,application/pdf,image/*,audio/*,video/*';

export function normalizeMaterialTitle(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MATERIAL_TITLE_MAX);
}
