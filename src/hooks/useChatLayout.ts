import { useEffect, useState, type CSSProperties } from 'react';

/** `sm` nuqtasi: undan tor ekran — telefon (to'liq ekranli chat, ekran klaviaturasi). */
export const CHAT_SM_BREAKPOINT = 640;
/** Kompyuterdagi yuqori menyu balandligi — chat undan pastda boshlanadi. */
const NAV_BAR_HEIGHT = 79;

type ViewportState = {
  vpHeight: number;
  vpOffsetTop: number;
  innerHeight: number;
  isDesktop: boolean;
};

function readViewport(): ViewportState {
  const w = typeof window !== 'undefined' ? window : null;
  const vv = w?.visualViewport;
  return {
    vpHeight: vv?.height ?? w?.innerHeight ?? 800,
    vpOffsetTop: vv?.offsetTop ?? 0,
    innerHeight: w?.innerHeight ?? 800,
    isDesktop: (w?.innerWidth ?? 1024) >= CHAT_SM_BREAKPOINT,
  };
}

/**
 * TO'LIQ EKRANLI CHAT JOYLASHUVI — ekran klaviaturasi ochilganda ham yozish maydoni ko'rinsin.
 *
 * Telefonda klaviatura ochilsa `window.innerHeight` o'zgarmaydi (ayniqsa iOS va Android
 * WebView), faqat `visualViewport` qisqaradi. Shuning uchun chat konteyneri ko'rinadigan
 * qismga (`visualViewport`) moslab joylashtiriladi: tepasi `offsetTop`, balandligi `height`.
 *
 * @param desktopStyle Kompyuterdagi konteyner joylashuvi (standart — yuqori menyu ostida).
 */
export function useChatLayout(desktopStyle: CSSProperties = { top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0 }) {
  const [state, setState] = useState<ViewportState>(readViewport);

  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setState(readViewport());
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const keyboardOpen = !state.isDesktop && state.vpHeight < state.innerHeight - 80;

  const containerStyle: CSSProperties = state.isDesktop
    ? desktopStyle
    : keyboardOpen
      ? { top: state.vpOffsetTop, left: 0, right: 0, height: state.vpHeight }
      : { top: 0, left: 0, right: 0, bottom: 0 };

  return { containerStyle, keyboardOpen, isDesktop: state.isDesktop, vpHeight: state.vpHeight };
}
