import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary';
import './index.css';
import './styles/text-scale-overrides.css';
import './styles/motion.css';
import './styles/platform-theme.css';
import { audioUnlockInit } from './utils/audioUnlock';
import { haptikaniUlash } from './utils/haptic';
import { captureAttributionOnce } from './api/onboarding';
import { initPwaInstall } from './hooks/usePwaInstall';
import { initAutoUpdate } from './utils/appUpdate';

// Birinchi tegishda audioni "ochamiz" — o'qish matnidagi so'z talaffuzi
// mobil brauzerlarda avtoijro bloki tufayli jim qolmasligi uchun.
audioUnlockInit();
// Tegishga jismoniy javob — butun ilova bo'ylab bitta tinglovchi orqali.
haptikaniUlash();

/*
 * TOZALASH MANZILI: falarus.uz/?reset=1
 *
 * Brauzerda eski service worker yoki buzuq kesh qolib ketsa, sahifa oq bo'lib
 * qolishi mumkin va oddiy yangilash yordam bermaydi. Shu manzil hammasini
 * o'chirib, toza holatda qayta ochadi.
 */
if (typeof window !== 'undefined' && /[?&]reset=1/.test(window.location.search)) {
  void (async () => {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((regs ?? []).map((r) => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* tozalanmasa ham qayta ochamiz */
    }
    window.location.replace('/');
  })();
}

/*
 * XATO MAYOG'I: brauzerda ushlanmagan xato serverga yoziladi.
 *
 * Foydalanuvchida oq ekran chiqsa, sabab endi ko'rinmay qolmaydi — u
 * `pm2 logs` da turadi. Bitta sahifa uchun eng ko'pi 3 ta xabar yuboriladi.
 */
if (typeof window !== 'undefined' && !import.meta.env.DEV) {
  let sent = 0;
  const report = (message: string, stack?: string) => {
    if (sent >= 3) return;
    sent += 1;
    try {
      const body = JSON.stringify({
        message: String(message).slice(0, 500),
        stack: String(stack ?? '').slice(0, 1000),
        url: window.location.pathname,
        ua: navigator.userAgent.slice(0, 200),
      });
      // `keepalive` — sahifa yopilayotgan bo'lsa ham yetib boradi.
      void fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      /* xabar ketmasa ham ilova ishlayveradi */
    }
  };
  window.addEventListener('error', (e) => report(e.message, e.error?.stack));
  window.addEventListener('unhandledrejection', (e) =>
    report(String((e.reason as Error)?.message ?? e.reason), (e.reason as Error)?.stack)
  );
}

// «Bosh ekranga chiqarish» hodisasini render'dan OLDIN ushlaymiz: u sahifa
// yuklangach darhol otiladi va React ulgurmasa, o'rnatish tugmasi ishlamaydi.
initPwaInstall();

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In dev, SW breaks Vite HMR/websocket and can serve stale chunks.
    window.addEventListener('load', async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    });
  } else {
    // Yangi versiya chiqqanда foydalanuvchini avtomatik yangi kodga o'tkazamiz.
    let swRefreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (swRefreshed) return; // qayta yuklash tsiklidan himoya
      swRefreshed = true;
      window.location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker
        // `updateViaCache: 'none'` — sw.js hech qachon brauzer keshidan
        // olinmasin, aks holda yangi versiya kechikib yetadi.
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          // Offline yoki vaqtinchalik HTTP xatosi ilovaning ushlanmagan
          // xatosiga aylanmasin. Keyingi tekshiruvda yana uriniladi.
          let updating = false;
          const checkForUpdate = async () => {
            if (updating || !navigator.onLine) return;
            updating = true;
            try {
              await reg.update();
            } catch {
              // Amaldagi service worker ishlashda davom etadi.
            } finally {
              updating = false;
            }
          };
          void checkForUpdate();
          // Har 60 soniyada yangilanishни tekshirib turamiz.
          setInterval(() => {
            void checkForUpdate();
          }, 60_000);
          // Ilovaga qaytganda ham tekshiramiz: fon rejimida taymerlar
          // to'xtatib qo'yiladi, shuning uchun interval yetarli emas.
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') void checkForUpdate();
          });
          window.addEventListener('online', () => void checkForUpdate());
        })
        .catch(() => {
          /* SW registration failed — offline mode simply unavailable */
        });
    });
  }
}

/*
 * Service worker'ga TAYANMAYDIGAN yangilanish yo'li: `index.html` dagi skript
 * nomi o'zgarsa — yangi versiya chiqqan. SW ni qo'llab-quvvatlamaydigan yoki
 * uni o'chirib qo'ygan brauzerlarda ham ishlashi uchun shu yerda, SW
 * tekshiruvidan TASHQARIDA chaqiriladi.
 */
if (!import.meta.env.DEV) {
  initAutoUpdate();
}

// Reklama manbasini ILK kirishda saqlab qo'yamiz — so'rovnoma keyinroq
// to'ldirilganda manzilda UTM qolmaydi.
captureAttributionOnce();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
