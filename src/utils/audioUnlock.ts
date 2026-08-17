// Brauzerlar tovushли avtoijroni foydalanuvchi sahifaga tegmaguncha bloklaydi.
// Birinchi tegishда (yoki bosishда) jimgina, bo'sh audioни ijro etib, hujjatga
// media-ijro ruxsatini ("sticky activation") beramiz — shundan keyin AI ovozi ham
// avtomatik, ham "Tinglash" tugmasi bilan (fetch'dan keyin ham) erkin ijro etiladi.

// 44-baytli bo'sh (jim) WAV — ijrosi bir zumда tugaydi, faqat ruxsat berish uchun.
const JIM_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

let ochildi = false;

export function audioUnlockInit(): void {
  if (typeof window === 'undefined' || ochildi) return;

  const ochish = () => {
    if (ochildi) return;
    ochildi = true;
    try {
      const a = new Audio(JIM_WAV);
      a.volume = 0;
      void a.play().then(() => a.pause()).catch(() => {});
    } catch {
      /* muhim emas */
    }
    window.removeEventListener('pointerdown', ochish);
    window.removeEventListener('touchend', ochish);
    window.removeEventListener('keydown', ochish);
    window.removeEventListener('click', ochish);
  };

  window.addEventListener('pointerdown', ochish, { passive: true });
  window.addEventListener('touchend', ochish, { passive: true });
  window.addEventListener('keydown', ochish);
  window.addEventListener('click', ochish);
}
