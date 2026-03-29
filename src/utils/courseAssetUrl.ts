/**
 * Бинарные файлы курсов (аудио/видео/фото) не храним в Git из‑за размера.
 * Локально кладите их в `public/courses/...` — пути вида `/courses/...` отдаются с того же хоста.
 * В проде укажите публичный URL бакета Supabase Storage (или CDN), совпадающий по путям:
 *   VITE_COURSE_MEDIA_BASE_URL=https://xxx.supabase.co/storage/v1/object/public/course-assets
 * Тогда запрос пойдёт на base + `/courses/patent/media/...` и т.д.
 */
export function courseAssetUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const base = (env?.VITE_COURSE_MEDIA_BASE_URL ?? '').trim().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}
