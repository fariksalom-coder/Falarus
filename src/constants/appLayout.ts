/** Inner row height in AppNavBar (matches h-[78px]). */
export const APP_NAV_INNER_HEIGHT_PX = 78;
/** Border thickness on nav (border-b / border-t). */
export const APP_NAV_BORDER_PX = 1;

/**
 * Total offset for main content below fixed top header (desktop sm+):
 * safe-area-top + bar height + border.
 */
export function appMainTopOffsetCss(): string {
  return `calc(${APP_NAV_INNER_HEIGHT_PX}px + ${APP_NAV_BORDER_PX}px + env(safe-area-inset-top, 0px))`;
}

/**
 * Total offset for main content above fixed bottom nav (mobile < sm):
 * bar height + border + safe-area-bottom.
 */
export function appMainBottomOffsetCss(): string {
  return `calc(${APP_NAV_INNER_HEIGHT_PX}px + ${APP_NAV_BORDER_PX}px + env(safe-area-inset-bottom, 0px))`;
}
