import type { AccessInfo } from '../api/access';

/** Obunasiz foydalanuvchi uchun yopiq pastki menyu yo'llari. */
export const PREMIUM_LOCKED_NAV_PATHS = [
  '/games',
  '/partner',
  '/teachers',
  '/statistika',
] as const;

export type PremiumLockedNavPath = (typeof PREMIUM_LOCKED_NAV_PATHS)[number];

export function hasAppPremiumAccess(access: AccessInfo | null | undefined): boolean {
  return Boolean(access?.subscription_active || access?.golden);
}

export function isPremiumNavPathLocked(
  path: string,
  access: AccessInfo | null | undefined,
): boolean {
  if (hasAppPremiumAccess(access)) return false;
  return PREMIUM_LOCKED_NAV_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export const PREMIUM_LOCK_TOAST_UZ =
  "Bu bo‘lim tarif faollashtirilgandan keyin ochiladi. Asosiy sahifadan tarifni tanlang.";
