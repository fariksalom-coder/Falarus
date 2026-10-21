import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { initNativeGoogleAuth } from './googleAuth';
import { isNativeApp } from './platform';


/**
 * Android qobig‘i: status bar, orqaga tugmasi, klaviatura, Google Sign-In.
 * Brauzerda no-op.
 */
export async function bootstrapNativeShell(): Promise<void> {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('native-app');
  document.documentElement.style.backgroundColor = '#092B73';
  if (document.body) document.body.style.backgroundColor = '#092B73';

  const yozuvMaydoni = (el: EventTarget | null): boolean => {
    if (!(el instanceof HTMLElement)) return false;
    return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
  };
  document.addEventListener(
    'contextmenu',
    (e) => {
      if (!yozuvMaydoni(e.target)) e.preventDefault();
    },
    { capture: true },
  );
  document.addEventListener(
    'selectstart',
    (e) => {
      if (!yozuvMaydoni(e.target)) e.preventDefault();
    },
    { capture: true },
  );

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#0B2A6B' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* emulator yoki eski WebView */
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
  } catch {
    /* plugin yo‘q */
  }

  void initNativeGoogleAuth().catch(() => undefined);

  // Ovozli media bir vaqtda faqat bittasi: yangisi boshlansa, boshqalari to'xtaydi.
  document.addEventListener(
    'play',
    (e) => {
      const started = e.target;
      if (!(started instanceof HTMLMediaElement) || started.muted) return;
      document.querySelectorAll<HTMLMediaElement>('video, audio').forEach((el) => {
        if (el !== started && !el.paused && !el.muted) el.pause();
      });
    },
    { capture: true },
  );

  let lastExitPress = 0;
  let exitHint: HTMLDivElement | null = null;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  const resetExit = () => {
    lastExitPress = 0;
    exitHint?.remove(); exitHint = null;
    if (hintTimer) clearTimeout(hintTimer);
  };
  window.addEventListener('popstate', resetExit);
  void App.addListener('appStateChange', resetExit);
  void App.addListener('backButton', () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen(); resetExit(); return;
    }
    if (closeTopDialog()) { resetExit(); return; }
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    // Dars yo'li — tarixga emas, ierarxiyaga qarab: dars → kun topshiriqlari → 182 kunlik xarita.
    const parent = courseParentPath(path);
    if (parent) {
      resetExit(); navigateInApp(parent); return;
    }
    // Asosiy bo'limlarda (pastki menyu) — ilovadan chiqish; boshqa joyda — oldingi sahifa.
    const idx = typeof window.history.state?.idx === 'number' ? window.history.state.idx : 0;
    if (!MAIN_ROOT_PATHS.has(path) && idx > 0) {
      resetExit(); window.history.back(); return;
    }
    const now = Date.now();
    if (lastExitPress && now - lastExitPress < 2000) {
      resetExit(); void App.exitApp(); return;
    }
    resetExit(); lastExitPress = now;
    exitHint = document.createElement('div');
    exitHint.setAttribute('role', 'status');
    exitHint.textContent = 'Chiqish uchun yana bir marta Orqaga bosing';
    Object.assign(exitHint.style, {
      position:'fixed', zIndex:'2147483647', left:'24px', right:'24px', bottom:'90px',
      padding:'12px 16px', borderRadius:'14px', background:'#172554', color:'#fff',
      textAlign:'center', fontSize:'14px', boxShadow:'0 4px 18px #0003', pointerEvents:'none',
    });
    document.body.appendChild(exitHint);
    hintTimer = setTimeout(resetExit, 2000);
  });

  window.setTimeout(() => {
    void SplashScreen.hide({ fadeOutDuration: 220 }).catch(() => undefined);
  }, 400);
}

/** Pastki menyudagi asosiy bo'limlar va xarita — bu yerda «Orqaga» ilovadan chiqadi. */
const MAIN_ROOT_PATHS = new Set(['/', '/games', '/partner', '/teachers', '/statistika', '/profile', '/kunlik-reja/xarita']);

/** Kunlik dars yo'lidagi ota sahifa: `/kunlik-reja/kun/3/...` → `/kunlik-reja/kun/3` → xarita. */
function courseParentPath(path: string): string | null {
  const match = /^\/kunlik-reja\/kun\/([^/]+)(\/.*)?$/.exec(path);
  if (!match) return null;
  return match[2] ? `/kunlik-reja/kun/${match[1]}` : '/kunlik-reja/xarita';
}

/** React Router'ga sahifani almashtirishni aytadi (sahifani qayta yuklamasdan). */
function navigateInApp(path: string): void {
  const state = (window.history.state ?? {}) as Record<string, unknown>;
  window.history.replaceState({ ...state, usr: null, key: Math.random().toString(36).slice(2, 10) }, '', path);
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}

/**
 * Telefonning «Orqaga» tugmasi avval ochiq oynani yopadi, sahifani emas.
 * Oyna Escape'ni tinglasa — shu yetadi; aks holda ichidagi yopish tugmasi bosiladi,
 * u ham bo'lmasa oddiy orqaga qaytiladi.
 * Oyna topilsa `true` qaytadi: shu bosishda sahifa orqaga ketmaydi.
 */
function closeTopDialog(): boolean {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[aria-modal="true"], [role="dialog"], [role="alertdialog"]'),
  ).filter((el) => el.isConnected && el.getClientRects().length > 0);
  const dialog = dialogs[dialogs.length - 1];
  if (!dialog) return false;

  dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  window.setTimeout(() => {
    if (!dialog.isConnected || dialog.getClientRects().length === 0) return;
    const close = Array.from(dialog.querySelectorAll<HTMLElement>('button, [role="button"], a')).find((el) =>
      /yopish|yop$|close|закрыть|bekor|orqaga|назад/i.test(
        `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`.trim(),
      ),
    );
    // Yopish tugmasi yo'q oynada foydalanuvchi qotib qolmasin — oddiy orqaga qaytamiz.
    if (close) close.click();
    else window.history.back();
  }, 60);
  return true;
}
