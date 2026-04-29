/**
 * Mirrors App.tsx routing enough for SEO / 404 detection.
 * Update when adding major path prefixes.
 */
export function isKnownAppRoute(pathname: string): boolean {
  const p = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  const exact = new Set([
    '/',
    '/login',
    '/register',
    '/fossils',
    '/fossils/checkout',
    '/russian',
    '/russian/grammar',
    '/russian/speaking',
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
    '/payment-history',
    '/reyting',
    '/admin',
    '/auth',
  ]);

  if (exact.has(p)) return true;

  const patterns: RegExp[] = [
    /^\/help\/[^/]+$/,
    /^\/admin(?:\/|$)/,
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
