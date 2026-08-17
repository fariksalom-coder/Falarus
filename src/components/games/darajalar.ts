/**
 * O'yinlardagi darajalarning nomlari va namunalari.
 *
 * A1/A2/B1/B2 — bu ta'lim standartining kodi, o'quvchi uchun esa bo'sh harf.
 * Kurs auditoriyasi rus tilini noldan o'rganayotgan o'zbek tilida so'zlashuvchi
 * odamlar: ular «B1» nima ekanini bilishi shart emas. Shuning uchun ekranda
 * faqat o'zbekcha nom turadi, kod esa kodda qoladi (ma'lumot bazasi va
 * saqlangan tanlovlar buzilmasin uchun).
 */
export type DarajaKodi = 'A1' | 'A2' | 'B1' | 'B2';

export const DARAJA_NOMI: Record<DarajaKodi, string> = {
  A1: "Boshlang'ich",
  A2: 'Asosiy',
  B1: "O'rta",
  B2: 'Yuqori',
};

/**
 * Darajaga NAMUNA so'zlarni tanlaydi.
 *
 * Ro'yxat bo'ylab TENG TARQATIB olinadi (taxminan 20%, 50%, 80% joylardan) —
 * shunda uchta so'z butun darajani ifodalaydi.
 *
 * Ikkita oson yo'l sinaldi va ikkalasi ham yaramadi:
 *  - «birinchi uchtasi» — ro'yxat alifbo tartibida, ya'ni doim «а» bilan
 *    boshlanadigan kam uchraydigan so'zlar chiqardi (адресовать, активировать);
 *  - «eng qisqasi» — barcha darajalarga bir xil ko'rinish berardi va yuqori
 *    darajaga «жрать» kabi qo'pol so'zlarni olib chiqardi. O'quv ilovasida
 *    namuna sifatida turadigan so'z bunday bo'lmasligi kerak.
 *
 * Juda qisqalari (3 harfdan kam) chiqarib tashlanadi: «же», «за», «до» kabi
 * yuklama va ko'makchilar daraja haqida hech narsa aytmaydi.
 *
 * Natija har ochilishda BIR XIL bo'ladi (tasodif yo'q) — aks holda ekran
 * o'z-o'zidan o'zgarib turgandek ko'rinardi.
 */
export function namunaSozlar(sozlar: string[], soni = 3): string[] {
  const tartib = [...sozlar].sort((a, b) => a.localeCompare(b, 'ru'));
  const manba = tartib.filter((w) => w.length >= 4);
  const royxat = manba.length >= soni ? manba : tartib;
  if (royxat.length <= soni) return royxat;

  const natija: string[] = [];
  for (let i = 0; i < soni; i += 1) {
    // 0.2, 0.5, 0.8 … — chetlariga yopishmasdan, teng oraliqda.
    const ulush = (i + 1) / (soni + 1);
    const joy = Math.min(royxat.length - 1, Math.floor(royxat.length * ulush));
    const soz = royxat[joy];
    if (!natija.includes(soz)) natija.push(soz);
  }
  return natija;
}

/** «1 240 so'z» ko'rinishidagi yozuv — uch xonadan keyin bo'sh joy. */
export function hajmYozuvi(soni: number, birlik: string): string {
  return `${soni.toLocaleString('ru-RU').replace(/ /g, ' ')} ${birlik}`;
}
