/**
 * haptic.ts — tegishga jismoniy javob (telefon tebranishi).
 *
 * NIMA UCHUN: ekranga tegilganda qurilma sezilarli javob bermasa, interfeys
 * "o'lik" tuyuladi. Qisqa tebranish tugma bosilganini tasdiqlaydi va ilova
 * tirik his qilinadi. Foydalanuvchilarning aksariyati telefondan kiradi.
 *
 * QO'LLAB-QUVVATLASH: `navigator.vibrate` Android brauzerlarida ishlaydi.
 * iOS Safari uni umuman qo'llamaydi — u yerda jim o'tadi, xatolik bermaydi.
 * Shuning uchun haptika hech qachon YAGONA javob bo'lmasligi kerak: har doim
 * ko'rinadigan javob (rang, harakat) ham bo'ladi.
 */

const SOZLAMA_KALITI = 'falarus_haptika';

export type HaptikTuri =
  /** Oddiy tegish — tugma, havola. */
  | 'tegish'
  /** To'g'ri javob, muvaffaqiyat. */
  | 'togri'
  /** Xato javob. */
  | 'xato'
  /** Muhim voqea — daraja ochildi, kun tugadi. */
  | 'bayram';

const NAQSHLAR: Record<HaptikTuri, number | number[]> = {
  tegish: 10,
  togri: [14, 40, 22],
  xato: [26, 50, 26],
  bayram: [18, 40, 18, 40, 44],
};

let yoqilgan: boolean | null = null;

function ruxsatBormi(): boolean {
  if (yoqilgan !== null) return yoqilgan;
  if (typeof window === 'undefined' || typeof navigator.vibrate !== 'function') {
    yoqilgan = false;
    return false;
  }
  try {
    yoqilgan = window.localStorage.getItem(SOZLAMA_KALITI) !== 'off';
  } catch {
    yoqilgan = true;
  }
  return yoqilgan;
}

/** Qisqa tebranish. Qo'llab-quvvatlanmasa jim o'tadi. */
export function haptic(tur: HaptikTuri = 'tegish'): void {
  if (!ruxsatBormi()) return;
  try {
    navigator.vibrate(NAQSHLAR[tur]);
  } catch {
    /* brauzer rad etdi — e'tiborsiz */
  }
}

/**
 * Butun ilova bo'ylab tegish javobini yoqadi.
 *
 * NIMA UCHUN DELEGATSIYA: ilovada yuzlab tugma bor va har biriga alohida
 * ishlov qo'shish — yuzlab tahrir va kelajakda unutiladigan joylar degani.
 * Hujjat darajasidagi bitta tinglovchi hammasini qamrab oladi va yangi
 * tugmalar avtomatik ishlaydi.
 *
 * `pointerdown` tanlangan, `click` emas: tebranish barmoq tekkan ZAHOTI
 * sezilishi kerak, aks holda kechikkan va begona tuyuladi.
 */
export function haptikaniUlash(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!ruxsatBormi()) return;
      const nishon = e.target as HTMLElement | null;
      if (!nishon?.closest) return;

      // Faqat bosiladigan elementlar. `.haptika-yoq` — ataylab chetlatish
      // uchun (masalan sirg'aluvchi ro'yxatlar).
      const bosiladigan = nishon.closest(
        'button, [role="button"], a[href], input[type="checkbox"], input[type="radio"], label[for]',
      ) as HTMLElement | null;
      if (!bosiladigan) return;
      if (bosiladigan.closest('.haptika-yoq')) return;
      if (bosiladigan.hasAttribute('disabled')) return;

      haptic('tegish');
    },
    { passive: true, capture: true },
  );
}
