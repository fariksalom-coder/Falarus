import { registerPlugin } from '@capacitor/core';

/*
 * ANDROID: TIZIM PANELLARI SAHIFA RANGIDA.
 *
 * Yuqoridagi panel (soat, batareya) va pastdagi tugmalar paneli sahifaning eng yuqori va eng
 * pastki rangini oladi — oq sahifada oq, dars xonasida to'q. Rang sahifadan o'qiladi, shuning
 * uchun har bir sahifaga alohida sozlash shart emas. O'zgarganda faqat bir marta yuboriladi.
 */
type SystemBarsPlugin = { setColors(opts: { top: string; bottom: string }): Promise<void> };
const SystemBars = registerPlugin<SystemBarsPlugin>('SystemBars');

function toHex(css: string): string | null {
  const m = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/);
  if (!m) return null;
  if (m[4] !== undefined && Number(m[4]) < 0.5) return null;
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

/** Shu balandlikdagi ko'rinadigan fon rangi (shaffof qatlamlar o'tkazib yuboriladi). */
function colorAt(y: number): string | null {
  let el = document.elementFromPoint(window.innerWidth / 2, y) as HTMLElement | null;
  while (el) {
    const hex = toHex(getComputedStyle(el).backgroundColor);
    if (hex) return hex;
    el = el.parentElement;
  }
  return toHex(getComputedStyle(document.body).backgroundColor);
}

let last = '';
function sync() {
  if (document.visibilityState !== 'visible') return;
  const top = colorAt(2);
  const bottom = colorAt(window.innerHeight - 2);
  if (!top || !bottom) return;
  const key = `${top}|${bottom}`;
  if (key === last) return;
  last = key;
  void SystemBars.setColors({ top, bottom }).catch(() => { last = ''; });
}

export function startSystemBarsSync(): void {
  // Sahifa almashganda, oyna o'lchami o'zgarganda va har soniyada (yengil: faqat ikki nuqta o'qiladi).
  sync();
  window.setInterval(sync, 800);
  window.addEventListener('resize', sync);
  document.addEventListener('visibilitychange', sync);
}
