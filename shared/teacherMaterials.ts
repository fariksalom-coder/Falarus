/** DARS MATERIALLARI — server va o'qituvchi paneli uchun umumiy qoidalar. */

export type MaterialKind = 'pdf' | 'image' | 'audio' | 'video';
/** `processing` — PowerPoint/Word hali PDF ga aylantirilmoqda; `failed` — aylanmadi. */
export type MaterialStatus = 'processing' | 'ready' | 'failed';

/** Bitta fayl 100 MB gacha (nginx 120 MB o'tkazadi), bitta o'qituvchiga jami 2 GB. */
export const MATERIAL_MAX_BYTES = 100 * 1024 * 1024;
export const MATERIAL_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;
export const MATERIAL_TITLE_MAX = 120;

/** Serverda PDF ga aylantiriladigan fayllar (kengaytma bo'yicha; ichi zip yoki eski OLE bo'lishi shart). */
export const OFFICE_EXTENSIONS = ['pptx', 'ppt', 'docx', 'doc', 'odp', 'odt'] as const;

/**
 * Sahifa rasmlari kengligi (px): kartochka, telefon, katta ekran / kattalashtirish.
 * Brauzer o'z ekraniga eng yaqinini so'raydi — kesh shu uchta o'lcham bilan cheklanadi.
 */
export const PAGE_WIDTHS = [480, 1280, 2048] as const;
export type PageWidth = (typeof PAGE_WIDTHS)[number];

/** Fayl tanlash oynasida ko'rinadigan turlar (server baribir baytlardan tekshiradi). */
export const MATERIAL_ACCEPT = [
  '.pdf', '.pptx', '.ppt', '.docx', '.doc', '.odp', '.odt',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp3', '.m4a', '.wav', '.ogg', '.oga', '.opus', '.mp4', '.mov', '.webm',
  'application/pdf', 'image/*', 'audio/*', 'video/*',
].join(',');

export function normalizeMaterialTitle(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MATERIAL_TITLE_MAX);
}
