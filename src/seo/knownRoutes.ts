/**
 * Mirrors App.tsx routing enough for SEO / 404 detection.
 * Update when adding major path prefixes.
 */
import { ADMIN_BASE_PATH } from '../constants/adminPath';

export function isKnownAppRoute(pathname: string): boolean {
  const p = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  const exact = new Set([
    '/',
    '/login',
    '/register',
    '/russian',
    '/russian/grammar',
    '/russian/speaking',
    '/kunlik-reja',
    '/partner',
    '/help',
    '/vocabulary',
    '/vocabulary/words',
    '/vocabulary/matnlar',
    '/profile',
    '/profile/settings',
    '/invite',
    '/statistika',
    '/kurslar',
    '/kurslar/patent',
    '/kurslar/vnzh',
    '/tariflar',
    '/pricing',
    '/payment',
    '/payment/click',
    '/payment/rahmat/done',
    '/huquqiy/ommaviy-oferta',
    '/huquqiy/maxfiylik',
    '/huquqiy/qaytarish',
    '/payment-history',
    '/reyting',
    '/auth',
  ]);
  exact.add(ADMIN_BASE_PATH);

  if (exact.has(p)) return true;

  const patterns: RegExp[] = [
    /^\/help\/[^/]+$/,
    new RegExp(`^${ADMIN_BASE_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/|$)`),
    /^\/vocabulary\/matnlar\/[^/]+$/,
    /^\/vocabulary\/[^/]+\/?$/,
    /^\/vocabulary\/[^/]+\/[^/]+\/?$/,
    /^\/vocabulary\/[^/]+\/[^/]+\/[^/]+(?:\/[^/]+)?$/,
    /^\/kurslar\/patent\/[^/]+$/,
    /^\/kurslar\/vnzh\/[^/]+$/,
    /^\/kurslar\/vnzh\/[^/]+\/[^/]+$/,
    /^\/lesson-\d+/,
    /^\/lesson\/[^/]+$/,
    /^\/preview\//,
  ];

  if (patterns.some((re) => re.test(p))) return true;

  return false;
}
