/** Inner row height in AppNavBar (matches h-[78px]). */
export const APP_NAV_INNER_HEIGHT_PX = 78;
/** Border thickness on nav (border-b / border-t). */
export const APP_NAV_BORDER_PX = 1;

/**
 * Pastki navigatsiya uchun asosiy kontent ustidan qoldiriladigan joy:
 * panel balandligi + border + safe-area-bottom.
 */
export function appMainBottomOffsetCss(): string {
  return `calc(${APP_NAV_INNER_HEIGHT_PX}px + ${APP_NAV_BORDER_PX}px + env(safe-area-inset-bottom, 0px))`;
}
