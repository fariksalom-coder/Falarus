/** Inner row height in AppNavBar (matches h-[78px]). */
export const APP_NAV_INNER_HEIGHT_PX = 78;
/** Bottom border under the nav (border-b). */
export const APP_NAV_BORDER_PX = 1;

/** Total offset for main content below fixed header: safe area + bar + border. */
export function appMainTopOffsetCss(): string {
  return `calc(${APP_NAV_INNER_HEIGHT_PX}px + ${APP_NAV_BORDER_PX}px + env(safe-area-inset-top, 0px))`;
}

/** Scroll/content area min-height below the top bar. */
export function appMainContentMinHeightCss(): string {
  return `calc(100dvh - ${APP_NAV_INNER_HEIGHT_PX}px - ${APP_NAV_BORDER_PX}px - env(safe-area-inset-top, 0px))`;
}
