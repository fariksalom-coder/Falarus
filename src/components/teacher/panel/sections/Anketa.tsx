/**
 * Profil → «Tahrirlash»: o'qituvchi anketasi (onboarding v2, 8 qadam).
 * Tasdiqlangan o'qituvchi uchun tahrir rejimi — o'zgarish moderatsiyaga tushadi.
 * `step` — profildagi «O'zgartirish» tugmasi ochgan qadam.
 */
import OnboardingWizard from '../../onboarding/OnboardingWizard';

export default function Anketa({ step }: { step?: number }) {
  return <OnboardingWizard initialStep={step} />;
}
