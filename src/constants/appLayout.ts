/**
 * AppNavBar ichki qatorining balandligi.
 * 62px — ikonka (22) + nom (10.5) + oraliqlar; nom qo'shilgach 59 kam edi.
 */
export const APP_NAV_INNER_HEIGHT_PX = 62;
/** Border thickness on nav (border-b / border-t). */
export const APP_NAV_BORDER_PX = 1;

/**
 * Pastki navigatsiya uchun asosiy kontent ustidan qoldiriladigan joy:
 * panel balandligi + border + safe-area-bottom.
 */
export function appMainBottomOffsetCss(): string {
  return `calc(${APP_NAV_INNER_HEIGHT_PX}px + ${APP_NAV_BORDER_PX}px + env(safe-area-inset-bottom, 0px))`;
}
