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
    '/teacher-login',
    '/teacher-register',
    '/russian',
    '/russian/grammar',
    '/russian/speaking',
    '/kunlik-reja',
    '/kunlik-reja/xarita',
    '/games',
    '/games/word-swipe',
    '/games/word-swipe/xarita',
    '/games/soz-zanjiri',
    '/games/soz-savati',
    '/games/fel-ustasi',
    '/welcome',
    '/onboarding',
    '/forgot-password',
    '/partner',
    '/teachers',
    '/teacher-cabinet',
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
    '/payment/rahmat/done',
    '/huquqiy/ommaviy-oferta',
    '/huquqiy/maxfiylik',
    '/huquqiy/qaytarish',
    '/payment-history',
    '/reyting',
    '/jonli-efir',
    '/auth',
  ]);
  exact.add(ADMIN_BASE_PATH);

  if (exact.has(p)) return true;

  const patterns: RegExp[] = [
    /^\/help\/[^/]+$/,
    /^\/teachers\/[^/]+$/,
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
    // Kunlik reja ichidagi kun sahifalari va mashqlar.
    /^\/kunlik-reja\/kun\/\d+(?:\/[^/]+)*$/,
    // O'yinlar: bosqich xaritasi va daraja/bosqich sahifalari.
    /^\/games\/word-swipe\/\d+\/\d+$/,
    // Video darsxona (xona kodi yoki sessiya bo'yicha).
    /^\/dars\/(?:s\/)?[^/]+$/,
    // Ommaviy profil.
    /^\/u\/[^/]+$/,
  ];

  if (patterns.some((re) => re.test(p))) return true;

  return false;
}
