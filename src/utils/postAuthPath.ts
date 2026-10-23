/**
 * So'rovnoma FAQAT KIRISHDA so'raladi — ro'yxatdan o'tishda emas.
 *
 * - Ro'yxatdan o'tish (yoki Google orqali yangi hisob) → bosh sahifa.
 * - Keyingi kirishda, agar so'rovnoma hali tugallanmagan bo'lsa → /onboarding.
 * - `returnTo` — mehmon yopiq sahifadan (masalan, ustoz profili) kirishga yuborilgan bo'lsa,
 *   kirgach o'sha sahifaga qaytadi. Faqat o'z saytimizdagi yo'l qabul qilinadi.
 */
export function pathAfterAuth(opts: {
  isRegistration: boolean;
  onboardingCompleted?: boolean;
  returnTo?: string | null;
}): string {
  const back = opts.returnTo && opts.returnTo.startsWith('/') && !opts.returnTo.startsWith('//') ? opts.returnTo : null;
  if (opts.isRegistration) return back ?? '/';
  if (!opts.onboardingCompleted) return '/onboarding';
  return back ?? '/';
}
