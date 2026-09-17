/**
 * So'rovnoma FAQAT KIRISHDA so'raladi — ro'yxatdan o'tishda emas.
 *
 * - Ro'yxatdan o'tish (yoki Google orqali yangi hisob) → bosh sahifa.
 * - Keyingi kirishda, agar so'rovnoma hali tugallanmagan bo'lsa → /onboarding.
 */
export function pathAfterAuth(opts: {
  isRegistration: boolean;
  onboardingCompleted?: boolean;
}): string {
  if (opts.isRegistration) return '/';
  if (!opts.onboardingCompleted) return '/onboarding';
  return '/';
}
