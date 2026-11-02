import { apiUrl } from '../api';

export type OnboardingAnswers = {
  age_range?: string | null;
  country?: string | null;
  region?: string | null;
  goal?: string | null;
  level?: string | null;
  daily_minutes?: number | null;
  source?: string | null;
};

export type OnboardingStatus = {
  completed: boolean;
  answers: (OnboardingAnswers & { completed_at?: string | null }) | null;
};

function authHeaders(token: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>).Authorization = `Bearer ${token}`;
  return h;
}

/*
 * Eslatma: bu yerda ilgari `onboardingShownThisSession`/`markOnboardingShown`
 * bor edi — ular `MainLayout` dagi umumiy yo'naltirish aylanib qolmasligi uchun
 * kerak edi. Yo'naltirish olib tashlandi (so'rovnoma faqat KIRISHDA
 * `LoginPage` orqali so'raladi), shuning uchun sessiya belgisi ham keraksiz.
 */

const ATTRIBUTION_KEY = 'falarus:attribution:v1';

type Attribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  referrer: string;
  landing_path: string;
};

/**
 * Reklama manbasini ILK KIRISHDA saqlab qo'yadi.
 *
 * Nima uchun kerak: UTM parametrlari `/register?utm_source=instagram` kabi
 * BIRINCHI manzilda bo'ladi, so'rovnoma esa keyinroq `/onboarding` da
 * to'ldiriladi — o'sha paytda manzilda UTM qolmaydi. Saqlab qo'yilmasa,
 * reklama manbasi butunlay yo'qolardi.
 *
 * Faqat BIR MARTA yoziladi: keyingi sahifalar ilk manbani almashtirmasin.
 * Ilova ishga tushganda chaqiriladi (`main.tsx`).
 */
export function captureAttributionOnce(): void {
  try {
    if (localStorage.getItem(ATTRIBUTION_KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const data: Attribution = {
      utm_source: q.get('utm_source') ?? '',
      utm_medium: q.get('utm_medium') ?? '',
      utm_campaign: q.get('utm_campaign') ?? '',
      utm_content: q.get('utm_content') ?? '',
      referrer: document.referrer ?? '',
      landing_path: window.location.pathname + window.location.search,
    };
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data));
  } catch {
    /* saqlanmasa ham so'rovnoma ishlayveradi */
  }
}

/**
 * Yig'ilgan manbani qaytaradi.
 *
 * Foydalanuvchi «qayerdan bildingiz?» degan savolga ko'pincha noto'g'ri
 * javob beradi (esidan chiqadi yoki tasodifiy tanlaydi). UTM va referrer esa
 * haqiqiy manbani ko'rsatadi — ikkalasi yonma-yon saqlanadi.
 */
export function collectAttribution(): Record<string, string> {
  const w = typeof window !== 'undefined' ? window.innerWidth : 0;
  const device_type = w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Attribution>) : {};
    return {
      utm_source: saved.utm_source ?? '',
      utm_medium: saved.utm_medium ?? '',
      utm_campaign: saved.utm_campaign ?? '',
      utm_content: saved.utm_content ?? '',
      referrer: saved.referrer ?? '',
      landing_path: saved.landing_path ?? '',
      device_type,
    };
  } catch {
    return { device_type };
  }
}

export async function saveOnboarding(
  token: string | null,
  answers: OnboardingAnswers & { skipped_count?: number },
): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(apiUrl('/api/onboarding'), {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ ...collectAttribution(), ...answers }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
