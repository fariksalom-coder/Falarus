export type KioskLocale = 'ru' | 'uz';
export type KioskAudience = 'child' | 'teen' | 'adult';
export const KIOSK_AUDIENCE_LABELS = {
  child: { ru: 'Детский', uz: 'Bolalar' },
  teen: { ru: 'Подростковый', uz: 'O‘smirlar' },
  adult: { ru: 'Взрослый', uz: 'Kattalar' },
} as const;
export type KioskConfig = {
  enabled: boolean;
  campaignKey: string;
  courseTitle: string;
  courseTitleUz: string;
  discountPercent: number;
  minimumCorrect: number;
  validityHours: number;
  questionSeconds: number;
  originalPrice: number | null;
  currency: 'RUB' | 'UZS';
};
export type KioskQuestion = { id: string; category: string; categoryUz: string; text: string; options: string[] };
export type KioskCoupon = {
  id: string; code: string; discountPercent: number; courseTitle: string; courseTitleUz: string;
  originalPrice: number | null; finalPrice: number | null; currency: 'RUB' | 'UZS';
  expiresAt: string; redeemedAt: string | null;
};
export type KioskSession = {
  id: string; status: 'started' | 'completed'; name: string; locale: KioskLocale; audience: KioskAudience;
  index: number; total: number; correctCount: number; question: KioskQuestion | null;
  questionDeadline: string | null; serverTime: string; coupon: KioskCoupon | null;
  config: KioskConfig; feedback?: { correct: boolean; timedOut: boolean; explanation: string; explanationUz: string };
};
export type KioskParticipant = {
  id: string; name: string; phone: string; audience: KioskAudience; marketing_consent: boolean; locale: KioskLocale; source: string;
  status: 'started' | 'completed'; correct_count: number; answer_count: number;
  created_at: string; completed_at: string | null; coupon_code: string | null;
  discount_percent: number | null; expires_at: string | null; redeemed_at: string | null; coupon_id: string | null;
};
export type KioskDashboard = {
  summary: { started: number; completed: number; contacts: number; averageScore: number; issued: number; redeemed: number };
  audiences: { audience: KioskAudience; started: number; completed: number }[];
  daily: { day: string; started: number; completed: number }[];
  scores: { score: number; count: number }[];
  participants: KioskParticipant[]; total: number; page: number; pageSize: number;
};
