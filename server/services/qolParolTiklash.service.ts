/**
 * qolParolTiklash.service.ts — parolni QO'LDA tiklash (admin va support uchun).
 *
 * NIMA UCHUN KERAK: `passwordReset.service.ts` parolni emailga yuboradi, ammo
 * SMTP sozlanmagan bo'lsa u 503 qaytaradi. 2026-08-30 da prodda aynan shu
 * bo'ldi: foydalanuvchi parolini unutib, 15 daqiqa ichida 11 marta tiklashga
 * urindi va har safar xato oldi — SMS ham, boshqa yo'l ham yo'q edi.
 *
 * Bu yerdagi yo'l boshqacha: yangi parolni SERVER yaratadi va uni EMAILGA
 * EMAS, chaqiruvchiga (admin yoki support) qaytaradi. Support telefonda
 * turgan odamga uni og'zaki aytadi. Ya'ni pochta ishlamasa ham foydalanuvchi
 * hisobiga qaytadi.
 *
 * KIM CHAQIRA OLADI (marshrutlarda tekshiriladi):
 *   • admin  — `/api/admin/...`, admin JWT bilan;
 *   • support — oltin hisob (`users.is_golden`), oddiy ilova ichidan.
 *
 * XAVFSIZLIK:
 *   • parol qaytariladi, LEKIN jurnalga YOZILMAYDI;
 *   • kim kimning parolini tiklagani jurnalga tushadi (audit);
 *   • o'qituvchi va oddiy o'quvchi farqlanmaydi — ikkalasi ham `users` da.
 */
import bcrypt from 'bcryptjs';
import type { DbClient } from '../types/dbClient';
import { generateSecurePassword } from '../../shared/generateSecurePassword.js';

export type QolParolNatija =
  | {
      ok: true;
      /** Foydalanuvchiga og'zaki aytiladigan YANGI parol. */
      parol: string;
      foydalanuvchi: { id: number; ism: string; telefon: string | null; email: string | null };
    }
  | { ok: false; status: number; error: string };

/** Telefon raqamini solishtirish uchun faqat raqamlarini qoldiradi. */
function faqatRaqam(x: string): string {
  return String(x ?? '').replace(/\D/g, '');
}

/**
 * Telefon yoki email bo'yicha foydalanuvchini topadi.
 *
 * Telefon turli ko'rinishda saqlangan bo'lishi mumkin (+998 90 123 45 67,
 * 998901234567, 901234567), shuning uchun solishtirish RAQAMLAR bo'yicha
 * va OXIRIDAN: support odatda oxirgi 9 raqamni aytadi.
 */
export async function foydalanuvchiniTop(
  supabase: DbClient,
  sorov: string,
): Promise<{ id: number; first_name: string | null; phone: string | null; email: string | null } | null> {
  const xom = String(sorov ?? '').trim();
  if (xom.length < 4) return null;

  if (xom.includes('@')) {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, phone, email')
      .ilike('email', xom.toLowerCase())
      .limit(1)
      .maybeSingle();
    return (data as any) ?? null;
  }

  const raqam = faqatRaqam(xom);
  if (raqam.length < 7) return null;
  const oxiri = raqam.slice(-9);

  /*
   * `ilike '%oxiri'` — indeks ishlatilmaydi, lekin bu amal kuniga bir necha
   * marta bajariladi (support qo'ng'irog'i paytida), shuning uchun tezlik
   * muammo emas. Aniqlik esa muhim: bazada raqam bo'shliq va qavs bilan
   * yozilgan bo'lishi mumkin.
   */
  const { data } = await supabase
    .from('users')
    .select('id, first_name, phone, email')
    .ilike('phone', `%${oxiri}`)
    .limit(2);

  const rows = (data as any[]) ?? [];
  // Ikki xil odam topilsa — noaniq, tiklamaymiz.
  if (rows.length !== 1) return null;
  return rows[0];
}

/**
 * Foydalanuvchiga yangi parol o'rnatadi va uni qaytaradi.
 *
 * `kim` — amalni bajargan tomon (jurnalga yoziladi): "admin:2" yoki
 * "support:3502".
 */
export async function qolParolTiklash(
  supabase: DbClient,
  sorov: string,
  kim: string,
): Promise<QolParolNatija> {
  const user = await foydalanuvchiniTop(supabase, sorov);
  return tikla(supabase, user, kim);
}

/**
 * Aniq `id` bo'yicha tiklash — admin panelida foydalanuvchi sahifasidan.
 *
 * Qidiruvsiz: sahifa allaqachon aynan shu odam haqida, telefoni bo'lmasa
 * ham (masalan faqat email bilan ro'yxatdan o'tgan) ishlashi kerak.
 */
export async function qolParolTiklashById(
  supabase: DbClient,
  id: number,
  kim: string,
): Promise<QolParolNatija> {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, status: 400, error: "Foydalanuvchi ko'rsatilmagan" };
  }
  const { data } = await supabase
    .from('users')
    .select('id, first_name, phone, email')
    .eq('id', id)
    .maybeSingle();
  return tikla(supabase, (data as any) ?? null, kim);
}

/** Parolni almashtirishning umumiy qismi. */
async function tikla(
  supabase: DbClient,
  user: { id: number; first_name: string | null; phone: string | null; email: string | null } | null,
  kim: string,
): Promise<QolParolNatija> {
  if (!user) {
    return {
      ok: false,
      status: 404,
      error: "Bunday foydalanuvchi topilmadi (yoki bir nechta mos keldi). Telefonni to'liq kiriting.",
    };
  }

  const yangiParol = generateSecurePassword(10);
  const hash = await bcrypt.hash(yangiParol, 10);
  const { error } = await supabase.from('users').update({ password: hash }).eq('id', user.id);
  if (error) {
    console.error('[qol-parol-tiklash] update', error.message);
    return { ok: false, status: 500, error: 'Parol saqlanmadi' };
  }

  // AUDIT: kim kimga tiklaganini bilib turamiz. Parolning O'ZI yozilmaydi.
  console.log(`[qol-parol-tiklash] ${kim} -> user ${user.id} (${user.phone ?? user.email ?? '-'})`);

  return {
    ok: true,
    parol: yangiParol,
    foydalanuvchi: {
      id: user.id,
      ism: `${user.first_name ?? ''}`.trim() || `#${user.id}`,
      telefon: user.phone ?? null,
      email: user.email ?? null,
    },
  };
}
