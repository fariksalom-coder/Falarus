import { useCallback, useEffect, useState } from 'react';

/**
 * Ilovani bosh ekranga chiqarish (PWA o'rnatish) holati.
 *
 * NEGA ALOHIDA MODUL: `beforeinstallprompt` hodisasi sahifa yuklangach DARHOL
 * otiladi — ko'pincha React ilova ulgurmasdan oldin. Agar tinglovchi komponent
 * ichida ro'yxatdan o'tsa, hodisa o'tib ketadi va «O'rnatish» tugmasi hech
 * qachon ishlamaydi. Shuning uchun tinglovchi `main.tsx` da, render'dan oldin
 * qo'yiladi (`initPwaInstall()`), hodisa esa shu modulda saqlanadi.
 *
 * MUHIM CHEKLOV: iOS'da dasturiy o'rnatish API'si UMUMAN YO'Q. Safari faqat
 * «Ulashish → Bosh ekranga qo'shish» orqali qo'shadi, shuning uchun iOS'da
 * tugma ko'rsatma oynasini ochadi. Android/Chrome'da esa haqiqiy tizim
 * so'rovi (ruxsat oynasi) chiqadi.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallPlatform = 'ios' | 'android' | 'desktop';
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

let deferredEvent: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
let started = false;
const subscribers = new Set<() => void>();

function emit(): void {
  subscribers.forEach((fn) => fn());
}

/** `main.tsx` dan render'dan OLDIN chaqiriladi. */
export function initPwaInstall(): void {
  if (typeof window === 'undefined' || started) return;
  started = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Brauzerning o'z bannerini to'xtatamiz — so'rovni o'zimiz, tugma
    // bosilganda ko'rsatamiz (aks holda tugma bosilganda hech nima chiqmaydi).
    e.preventDefault();
    deferredEvent = e as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredEvent = null;
    installedFlag = true;
    emit();
  });
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // iOS Safari: standart `display-mode` o'rniga o'z bayrog'i.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function detectInstallPlatform(): InstallPlatform {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent;
  // iPadOS 13+ o'zini Mac deb ko'rsatadi — sensorli ekran bo'yicha ajratamiz.
  const iPadOS = /Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

type InstallState = {
  /** Tizim so'rovini chaqirish mumkin (Android/Chrome/Edge). */
  canPrompt: boolean;
  /** Ilova allaqachon o'rnatilgan yoki standalone rejimda ochilgan. */
  isInstalled: boolean;
  platform: InstallPlatform;
};

function readState(): InstallState {
  return {
    canPrompt: deferredEvent !== null,
    isInstalled: installedFlag || isStandaloneMode(),
    platform: detectInstallPlatform(),
  };
}

function sameState(a: InstallState, b: InstallState): boolean {
  return a.canPrompt === b.canPrompt && a.isInstalled === b.isInstalled && a.platform === b.platform;
}

export function usePwaInstall(): InstallState & {
  promptInstall: () => Promise<InstallOutcome>;
} {
  const [state, setState] = useState<InstallState>(readState);

  useEffect(() => {
    const update = () => setState((prev) => (sameState(prev, readState()) ? prev : readState()));
    subscribers.add(update);
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', update);
    // Hodisa React ulgurmasidan oldin kelgan bo'lishi mumkin — darhol o'qiymiz.
    update();
    return () => {
      subscribers.delete(update);
      mq.removeEventListener('change', update);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    const ev = deferredEvent;
    if (!ev) return 'unavailable';
    /*
     * Hodisa BIR MARTALIK: `prompt()` chaqirilgach uni qayta ishlatib
     * bo'lmaydi. Shuning uchun darhol tozalaymiz — aks holda ikkinchi bosishda
     * brauzer xato beradi.
     */
    deferredEvent = null;
    emit();
    try {
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome === 'accepted') {
        installedFlag = true;
        emit();
      }
      return outcome;
    } catch {
      return 'unavailable';
    }
  }, []);

  return { ...state, promptInstall };
}

/*
 * ─────────────────────────────────────────────────────────────
 * AVTOMATIK TAKLIF
 * ─────────────────────────────────────────────────────────────
 *
 * CHEKLOV: hech bir brauzer ilovani foydalanuvchi tasdig'isiz o'rnatmaydi.
 * `prompt()` FAQAT foydalanuvchi harakatiga (tegish/bosish) javoban chaqirilishi
 * mumkin — aks holda brauzer «must be called with a user gesture» deb rad etadi.
 * Shuning uchun "avtomatik" degani: foydalanuvchi tugmani qidirmaydi — ilova
 * ochilgach, uning BIRINCHI tegishida tizim oynasi o'zi chiqadi.
 *
 * Bezovta qilmaslik uchun: ilova ochilgandan ~4 soniya o'tgach kutila boshlaydi
 * (shunda birinchi tegish tasodifan o'g'irlanmaydi), va rad etilsa yoki
 * ko'rsatilsa — belgilanib qo'yiladi, keyingi 14 kun qayta chiqmaydi.
 */

const AUTO_KEY = 'install_auto_prompt_after';
const AUTO_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14;
/** Birinchi tegish tasodifan o'g'irlanmasin — shu qadar kutamiz. */
const ARM_DELAY_MS = 4000;

function autoPromptAllowed(): boolean {
  try {
    const until = Number(window.localStorage.getItem(AUTO_KEY));
    return !(Number.isFinite(until) && until > Date.now());
  } catch {
    return true;
  }
}

function rememberAutoPrompt(): void {
  try {
    window.localStorage.setItem(AUTO_KEY, String(Date.now() + AUTO_COOLDOWN_MS));
  } catch {
    /* localStorage yopiq — shunchaki har safar urinamiz */
  }
}

/**
 * Ilova ochilgach, foydalanuvchining birinchi tegishida o'rnatish oynasini
 * o'zi chiqaradi (Android/Chrome). Tizim oynasini chaqirib bo'lmaydigan
 * brauzerlarda (iOS Safari) `onNeedsGuide` chaqiriladi — u qo'lda qo'shish
 * ko'rsatmasini ochadi.
 *
 * @param enabled ota komponent tayyor bo'lganda (kartochka ko'rinib turganda)
 */
export function useAutoInstallPrompt(
  enabled: boolean,
  onNeedsGuide: () => void,
  onInstalled: () => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    if (isStandaloneMode() || installedFlag) return;
    if (!autoPromptAllowed()) return;

    let armed = false;
    let done = false;
    const platform = detectInstallPlatform();

    const fire = () => {
      if (done) return;
      const ev = deferredEvent;

      if (!ev) {
        /*
         * Tizim oynasi hozircha yo'q. iOS'da u UMUMAN kelmaydi — darhol qo'lda
         * qo'shish ko'rsatmasini beramiz. Android'da esa Chrome hodisani bir
         * necha soniya kechikib otishi mumkin: bu holda urinishni SARFLAMAYMIZ,
         * tinglashda davom etamiz (aks holda foydalanuvchi hech nima ko'rmay,
         * 14 kunlik tanaffus behuda yoqilardi). Kompyuterda avtomatik oyna
         * ochmaymiz — u yerda bu bezovta qiladi.
         */
        if (platform !== 'ios') return;
        done = true;
        cleanup();
        rememberAutoPrompt();
        onNeedsGuide();
        return;
      }

      done = true;
      cleanup();
      rememberAutoPrompt();
      deferredEvent = null;
      emit();
      void (async () => {
        try {
          await ev.prompt();
          const { outcome } = await ev.userChoice;
          if (outcome === 'accepted') {
            installedFlag = true;
            emit();
            onInstalled();
          }
        } catch {
          /* brauzer rad etdi — kartochkadagi tugma joyida qoladi */
        }
      })();
    };

    const onGesture = () => {
      if (armed) fire();
    };

    function cleanup() {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    }

    const timer = setTimeout(() => {
      armed = true;
    }, ARM_DELAY_MS);

    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [enabled, onNeedsGuide, onInstalled]);
}
