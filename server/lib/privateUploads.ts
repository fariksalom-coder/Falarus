import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Yopiq fayllar (o'qituvchi hujjatlari, chala yuklangan videolar).
 * `uploads/` dan TASHQARIDA: express.static uni hech qachon bermaydi,
 * fayl faqat egasi yoki admin uchun API orqali o'qiladi.
 */
export const PRIVATE_UPLOADS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'private-uploads');
