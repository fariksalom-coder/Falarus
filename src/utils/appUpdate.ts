/**
 * Ilovani AVTOMATIK yangilash — barcha foydalanuvchi va qurilmalarda.
 *
 * Muammo: service worker faqat `sw.js` faylining O'ZI o'zgarganda yangilanadi,
 * biz esa har deploy'da uni o'zgartirmaymiz. Natijada ochiq turgan ilova
 * (ayniqsa bosh ekrandan ochilgan PWA — u kunlab yopilmaydi) eski kodda
 * qolib ketishi mumkin edi.
 *
 * Yechim: `index.html` ni vaqti-vaqti bilan tekshiramiz. Vite har build'da
 * asosiy skriptga yangi nom beradi (`index-XXXX.js`), shuning uchun nom
 * o'zgargani = yangi versiya chiqqani.
 *
 * QAYTA YUKLASH XAVFSIZ PAYTDA: foydalanuvchi mashq o'rtasida bo'lishi mumkin,
 * shuning uchun sahifa KO'RINMAY turganda (boshqa ilovaga o'tganda) yangilanadi.
 * Shunda u qaytib kelganida ilova allaqachon yangi bo'ladi va hech narsa
 * yo'qolmaydi.
 */

/** Yangi versiyani qanchada bir tekshirish. */
const CHECK_INTERVAL_MS = 5 * 60_000;

function currentEntryScript(): string | null {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
  if (!el) return null;
  try {
    return new URL(el.src, location.href).pathname;
  } catch {
    return null;
  }
}

function entryFromHtml(html: string): string | null {
  const m = html.match(/<script[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/i);
  if (!m) return null;
  try {
    return new URL(m[1], location.href).pathname;
  } catch {
    return null;
  }
}

export function initAutoUpdate(): void {
  if (typeof window === 'undefined') return;

  const running = currentEntryScript();
  // Skript nomi hashsiz bo'lsa (dev rejim) — taqqoslashning ma'nosi yo'q.
  if (!running) return;

  let updatePending = false;
  let checking = false;

  const reloadNow = () => {
    // `replace` — tarixda ikkilanish qoldirmaydi.
    window.location.reload();
  };

  const check = async () => {
    if (checking || updatePending || !navigator.onLine) return;
    checking = true;
    try {
      const res = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const next = entryFromHtml(await res.text());
      if (next && next !== running) {
        updatePending = true;
        // Ko'rinmay turgan bo'lsa — darhol, aks holda foydalanuvchi
        // chiqib ketguncha kutamiz (mashqning o'rtasida uzmaslik uchun).
        if (document.visibilityState === 'hidden') reloadNow();
      }
    } catch {
      /* tarmoq yo'q — keyingi tekshiruvda urinamiz */
    } finally {
      checking = false;
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (updatePending) reloadNow();
      return;
    }
    // Ilovaga qaytdi — yangi versiya chiqqan-chiqmaganini darhol tekshiramiz.
    void check();
  });

  window.addEventListener('online', () => void check());
  setInterval(() => void check(), CHECK_INTERVAL_MS);
  void check();
}
