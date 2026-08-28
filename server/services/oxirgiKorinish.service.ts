import type { DbClient } from '../types/dbClient';

/**
 * PLATFORMADA OXIRGI KO'RINISH.
 *
 * Belgi autentifikatsiya bosqichida qo'yiladi — ya'ni foydalanuvchi
 * ilovaning qaysi qismida bo'lishidan qat'i nazar. Chat presence'i esa
 * faqat muloqotni biladi va darsda o'tirgan odamni "yo'q" deb ko'rsatardi.
 *
 * HAR SO'ROVDA YOZILMAYDI. Faol foydalanuvchi daqiqasiga o'nlab so'rov
 * yuboradi; har biriga UPDATE qilish bazaga bekorga yuk bo'lardi va
 * `users` jadvalini uzluksiz yangilab turardi. Shuning uchun xotirada
 * oxirgi yozuv vaqti saqlanadi va yangilanish `YANGILASH_MS` da bir
 * martadan tez bo'lmaydi.
 *
 * ANIQLIK YO'QOLMAYDI: qiziqtiradigan narsa "hozir onlaynmi" va "qachon
 * oxirgi marta kirgan" — ikkalasi uchun ham bir necha daqiqalik xatolik
 * ahamiyatsiz.
 */

/** Bir foydalanuvchi uchun yozuvlar orasidagi eng qisqa masofa. */
const YANGILASH_MS = 2 * 60 * 1000;

/** Xotira cheksiz o'smasin: shundan eski yozuvlar tozalanadi. */
const UNUTISH_MS = 30 * 60 * 1000;

/** Tozalash har shuncha vaqtda bir marta — har chaqiruvda emas. */
const TOZALASH_MS = 5 * 60 * 1000;

const oxirgiYozuv = new Map<number, number>();
let keyingiTozalash = 0;

/**
 * Xotiradagi jadvalni qisqartiradi.
 *
 * Bu SHART: jadval faqat o'sib borsa, uzoq ishlagan jarayonda o'n minglab
 * yozuv to'planardi. Eski yozuvni unutish xavfsiz — u yo'qolsa, keyingi
 * so'rovda bazaga bir marta ortiqcha yozuv ketadi, xolos.
 */
function tozala(hozir: number): void {
  if (hozir < keyingiTozalash) return;
  keyingiTozalash = hozir + TOZALASH_MS;
  for (const [id, vaqt] of oxirgiYozuv) {
    if (hozir - vaqt > UNUTISH_MS) oxirgiYozuv.delete(id);
  }
}

/**
 * Foydalanuvchini "hozir ko'rindi" deb belgilaydi.
 *
 * SO'ROVNI KUTTIRMAYDI: chaqiruvchi `void` bilan chaqiradi va javob
 * yuborilishini kutmaydi. Belgi qo'yilmasa ham hech narsa buzilmaydi,
 * shuning uchun xato yutiladi — oddiy so'rov shu sababdan yiqilmasin.
 */
export function belgilaKorinish(supabase: DbClient, userId: number): void {
  if (!Number.isFinite(userId) || userId < 1) return;

  const hozir = Date.now();
  tozala(hozir);

  const oldingi = oxirgiYozuv.get(userId);
  if (oldingi != null && hozir - oldingi < YANGILASH_MS) return;

  /*
   * Belgi bazaga yozilishidan OLDIN qo'yiladi. Aks holda sekin yozuv
   * paytida kelgan o'nlab so'rov ham "hali yozilmagan" deb hisoblab,
   * bir vaqtda bir nechta UPDATE yuborardi.
   */
  oxirgiYozuv.set(userId, hozir);

  void supabase
    .from('users')
    .update({ last_seen_at: new Date(hozir).toISOString() })
    .eq('id', userId)
    .then(undefined, () => {
      // Yozilmadi — keyingi safar qayta urinsin.
      oxirgiYozuv.delete(userId);
    });
}

/** Testlar uchun: xotiradagi holatni tozalaydi. */
export function unutHammasini(): void {
  oxirgiYozuv.clear();
  keyingiTozalash = 0;
}
