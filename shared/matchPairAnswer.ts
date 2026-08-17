/**
 * «Juftlikni top» mashqida javob taqqoslash.
 *
 * NEGA MATN BO'YICHA, INDEKS BO'YICHA EMAS: bir blokda bir nechta juft bir xil
 * o'ng tomonga ega bo'lishi mumkin va bu KONTENT XATOSI EMAS — masalan
 * "Мы → были", "Вы → были", "Они → были" rus tilida hammasi to'g'ri.
 * Agar tekshiruv juft indeksiga qarasa, o'quvchi to'g'ri "были" kartasini
 * tanlaganda ham "noto'g'ri" olardi (uchtadan faqat bittasi "o'ziniki").
 */

/** Registr, tinish belgilari va ortiqcha bo'shliqlarni hisobga olmaydi. */
export function normMatchText(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:—–«»"'`…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ikki tomon matni bir xil ma'noni bildiradimi. */
export function sameMatchText(a: string, b: string): boolean {
  const na = normMatchText(a);
  return na.length > 0 && na === normMatchText(b);
}
