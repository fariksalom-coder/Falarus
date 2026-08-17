import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { DbClient } from '../types/dbClient';

/**
 * adminAuth.ts — /api/admin/* yo'llarining qorovuli.
 *
 * NIMA UCHUN UCH BOSQICHLI TEKSHIRUV.
 *
 * Ilgari bu yerda `decoded.adminId ?? decoded.id` turardi va token oddiy
 * foydalanuvchilarniki bilan BIR XIL sekret bilan tekshirilardi. Oddiy
 * foydalanuvchi tokeni `jwt.sign({ id: user.id }, JWT_SECRET)` ko'rinishida
 * imzolanadi, ya'ni u `decoded.id` ni beradi — natijada ro'yxatdan o'tgan
 * ISTALGAN odam o'z tokenini `/api/admin/*` ga yuborib to'lovlarni tasdiqlash,
 * pul yechishni ma'qullash va narx o'zgartirish huquqini olardi.
 *
 * Endi token uchta shartning HAMMASIDAN o'tishi kerak:
 *   1. `role === 'admin'`  — oddiy foydalanuvchi tokenida bu da'vo umuman yo'q;
 *   2. `adminId` butun son — `decoded.id` ga qaytish OLIB TASHLANDI;
 *   3. shu `adminId` `admins` jadvalida HOZIR ham mavjud.
 *
 * Uchinchi shart muhim: admin o'chirilgan bo'lsa ham uning eski tokeni
 * muddati tugagunicha ishlayverardi.
 */

/**
 * ADMIN_JWT_SECRET bo'lmasa JWT_SECRET ishlatiladi — bu ATAYLAB shunday.
 *
 * Majburiy qilinsa, o'zgaruvchi hali qo'shilmagan serverda ilova umuman
 * ko'tarilmasdi. Sekret umumiy bo'lgan holda ham teshik yopiq: yuqoridagi
 * `role` va `admins` tekshiruvlari oddiy foydalanuvchi tokenini o'tkazmaydi.
 * Shunga qaramay ADMIN_JWT_SECRET ni alohida qo'yish tavsiya etiladi —
 * u holda foydalanuvchi sekreti sizib chiqsa ham admin paneli himoyalangan
 * qoladi (`scripts/check-env.mjs` buni eslatib turadi).
 */
const adminJwtSecretEnv = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
if (!adminJwtSecretEnv || adminJwtSecretEnv.length < 32) {
  throw new Error('ADMIN_JWT_SECRET (or JWT_SECRET) must be set to a strong value (>=32 chars)');
}
const JWT_SECRET = adminJwtSecretEnv;

/**
 * Admin tokenini oddiy foydalanuvchi tokenidan ajratuvchi da'vo.
 *
 * Login shu qiymatni tokenga yozadi (`adminController.login`), middleware esa
 * uni talab qiladi. Ikkalasi shu bitta konstantadan oladi — biri o'zgarib,
 * ikkinchisi qolib ketmasin.
 */
export const ADMIN_TOKEN_ROLE = 'admin';

export interface AdminPayload {
  adminId: number;
  email: string;
  role: typeof ADMIN_TOKEN_ROLE;
}

/**
 * `admins` jadvalidagi tekshiruv natijasi shu muddatga saqlanadi.
 *
 * Har so'rovda bazaga borilsa admin paneli sekinlashardi (bir sahifa o'nlab
 * so'rov yuboradi). Faqat MUSBAT natija keshlanadi: admin o'chirilsa, uning
 * tokeni eng ko'pi bilan shu muddat davomida ishlaydi.
 */
const ADMIN_KESH_MS = 60_000;

/** adminId -> kesh muddati tugash vaqti (ms). */
const adminKesh = new Map<number, number>();

/** Admin o'chirilganda yoki huquqi olinganda keshni darhol bo'shatish uchun. */
export function adminKeshniTozala(adminId?: number): void {
  if (adminId == null) adminKesh.clear();
  else adminKesh.delete(adminId);
}

/**
 * Admin bazada bormi. Baza javob bermasa XATO tashlaydi — chaqiruvchi 503
 * qaytaradi. Ataylab "yopiq" tomonga xato qilamiz: baza uzilganda kirishga
 * ruxsat berish tekshiruvni butunlay ma'nosiz qilardi.
 */
async function adminMavjudmi(supabase: DbClient, adminId: number): Promise<boolean> {
  const hozir = Date.now();
  const muddat = adminKesh.get(adminId);
  if (muddat != null && muddat > hozir) return true;

  const { data, error } = await supabase
    .from('admins')
    .select('id')
    .eq('id', adminId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    adminKesh.delete(adminId);
    return false;
  }
  adminKesh.set(adminId, hozir + ADMIN_KESH_MS);
  return true;
}

/**
 * Admin yo'llarini himoyalaydi. Baza javob bermasa 503, qolgan hamma rad
 * etish holati 401.
 *
 * NIMA UCHUN 403 EMAS: klient (`src/lib/adminApi.ts`) saqlangan tokenni faqat
 * 401 da tozalaydi. 403 qaytarilsa, eski tokenli admin tizimdan chiqarilmay,
 * har bir sahifada xato ko'rib qolardi. 401 esa uni login sahifasiga olib
 * chiqadi — «bu token admin uchun yaroqli emas» ma'nosi ham aynan shu.
 */
export function createAdminAuthMiddleware(supabase: DbClient) {
  return function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Token kerak' });
      return;
    }

    let decoded: { adminId?: unknown; role?: unknown; email?: unknown };
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as typeof decoded;
    } catch {
      res.status(401).json({ error: 'Yaroqsiz token' });
      return;
    }

    // 1-shart: admin da'vosi. Foydalanuvchi tokenida `role` umuman yo'q.
    if (decoded.role !== ADMIN_TOKEN_ROLE) {
      res.status(401).json({ error: 'Admin tokeni kerak' });
      return;
    }

    // 2-shart: `adminId` butun musbat son. `decoded.id` ga qaytish yo'q.
    const adminId = decoded.adminId;
    if (typeof adminId !== 'number' || !Number.isInteger(adminId) || adminId <= 0) {
      res.status(401).json({ error: 'Admin tokeni kerak' });
      return;
    }

    // 3-shart: admin bazada hozir ham bor.
    void adminMavjudmi(supabase, adminId)
      .then((bor) => {
        if (!bor) {
          res.status(401).json({ error: 'Admin tokeni kerak' });
          return;
        }
        (req as unknown as { adminId?: number }).adminId = adminId;
        (req as unknown as { adminEmail?: unknown }).adminEmail = decoded.email;
        next();
      })
      .catch((err: Error) => {
        console.error('[adminAuth] admin tekshiruvi muvaffaqiyatsiz:', err.message);
        res.status(503).json({ error: 'Xizmat vaqtincha ishlamayapti' });
      });
  };
}

export { JWT_SECRET };
