/**
 * Sotuv bo'limi rahbari: maosh qoidalari va panel ma'lumotlari turi.
 * Maosh = qat'iy oylik + operatorlar sotgan har bir kurs uchun stavka + bonus.
 * Qoidalarni admin paneldan bosh admin to'ldiradi (sales_head_settings).
 */
import type { Money } from './salesLedger';

export type SalesHeadBonusTier = { sales: number; amount: number };
export type SalesHeadBonusPeriod = 'month' | 'day';

export type SalesHeadSettings = {
  fixedSalary: number;
  perSale: number;
  /** Operator o'ziniki deb biriktirgan Rahmat avtoto'lovlari ham stavkaga kirsinmi. */
  includeRahmatClaims: boolean;
  /** Bonus pog'onasi oylik jami sotuvga yoki har kungi sotuvga qarab. */
  bonusPeriod: SalesHeadBonusPeriod;
  tiers: SalesHeadBonusTier[];
};

export const DEFAULT_SALES_HEAD_SETTINGS: SalesHeadSettings = {
  fixedSalary: 2_000_000,
  perSale: 20_000,
  includeRahmatClaims: false,
  bonusPeriod: 'month',
  tiers: [5, 15, 20, 30].map((sales) => ({ sales, amount: 0 })),
};

const MAX_MONEY = 1_000_000_000;

/** Admin formasidan kelgan qiymatni tekshiradi; xato bo'lsa o'zbekcha xabar bilan Error. */
export function parseSalesHeadSettings(raw: unknown): SalesHeadSettings {
  const body = (raw ?? {}) as Record<string, unknown>;
  const money = (value: unknown, label: string) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) throw new Error(`${label} 0 dan ${MAX_MONEY.toLocaleString('ru-RU')} gacha bo‘lsin.`);
    return Math.round(n);
  };
  const rawTiers = Array.isArray(body.tiers) ? body.tiers : [];
  if (rawTiers.length > 20) throw new Error('Bonus pog‘onalari 20 tadan oshmasin.');
  const tiers = rawTiers.map((tier, i) => {
    const t = (tier ?? {}) as Record<string, unknown>;
    const sales = Number(t.sales);
    if (!Number.isInteger(sales) || sales < 1 || sales > 100_000) throw new Error(`${i + 1}-pog‘ona: sotuvlar soni butun musbat son bo‘lsin.`);
    return { sales, amount: money(t.amount, `${i + 1}-pog‘ona bonusi`) };
  });
  tiers.sort((a, b) => a.sales - b.sales);
  if (new Set(tiers.map((t) => t.sales)).size !== tiers.length) throw new Error('Bir xil sotuvlar soni uchun ikki pog‘ona bo‘lmasin.');
  return {
    fixedSalary: money(body.fixedSalary, 'Qat’iy oylik'),
    perSale: money(body.perSale, 'Har bir sotuv stavkasi'),
    includeRahmatClaims: body.includeRahmatClaims === true,
    bonusPeriod: body.bonusPeriod === 'day' ? 'day' : 'month',
    tiers,
  };
}

/** Eng yuqori erishilgan pog'ona (pog'onalar yig'ilmaydi). */
export function reachedTier(tiers: SalesHeadBonusTier[], sales: number): SalesHeadBonusTier | null {
  return [...tiers].sort((a, b) => b.sales - a.sales).find((t) => sales >= t.sales) ?? null;
}

export type SalesHeadSalary = {
  fixedSalary: number;
  perSale: number;
  countedSales: number;
  salesAmount: number;
  bonusAmount: number;
  totalAmount: number;
  bonusPeriod: SalesHeadBonusPeriod;
  tiers: SalesHeadBonusTier[];
  /** Oylik rejimda: erishilgan va keyingi pog'ona. */
  currentTier: SalesHeadBonusTier | null;
  nextTier: SalesHeadBonusTier | null;
  remainingToNext: number;
};

/** `dailyCounts` — kun → stavkaga kiradigan sotuvlar soni (Toshkent kuni). */
export function salesHeadSalary(settings: SalesHeadSettings, dailyCounts: Record<string, number>): SalesHeadSalary {
  const countedSales = Object.values(dailyCounts).reduce((sum, n) => sum + n, 0);
  const tiers = [...settings.tiers].sort((a, b) => a.sales - b.sales);
  const bonusAmount = settings.bonusPeriod === 'day'
    ? Object.values(dailyCounts).reduce((sum, n) => sum + (reachedTier(tiers, n)?.amount ?? 0), 0)
    : reachedTier(tiers, countedSales)?.amount ?? 0;
  const currentTier = settings.bonusPeriod === 'month' ? reachedTier(tiers, countedSales) : null;
  const nextTier = settings.bonusPeriod === 'month' ? tiers.find((t) => countedSales < t.sales) ?? null : null;
  const salesAmount = countedSales * settings.perSale;
  return {
    fixedSalary: settings.fixedSalary,
    perSale: settings.perSale,
    countedSales,
    salesAmount,
    bonusAmount,
    totalAmount: settings.fixedSalary + salesAmount + bonusAmount,
    bonusPeriod: settings.bonusPeriod,
    tiers,
    currentTier,
    nextTier,
    remainingToNext: nextTier ? nextTier.sales - countedSales : 0,
  };
}

export type SalesHeadOperatorStats = {
  id: number;
  name: string;
  active: boolean;
  /** Operatorning o'z cheki bilan sotilgan kurslar (tasdiqlangan). */
  sales: number;
  /** Operator biriktirgan Rahmat avtoto'lovlari (tasdiqlangan). */
  rahmatSales: number;
  pendingSales: number;
  sold: Money;
  received: Money;
  openDebt: Money;
  overdueDebt: Money;
  activeDays: number;
  bestDay: { day: string; sales: number } | null;
  tariffs: Record<string, number>;
};

export type SalesHeadDay = { day: string; total: number; byOperator: Record<string, number> };

export type SalesHeadDashboard = {
  month: string;
  from: string;
  to: string;
  /** Davrdagi o'tgan kunlar (joriy oy uchun bugungacha). */
  daysElapsed: number;
  daysInMonth: number;
  settings: SalesHeadSettings;
  salary: SalesHeadSalary;
  /** Joriy sur'atda oy oxirigacha taxminiy sotuv va maosh (faqat joriy oy uchun). */
  forecast: { sales: number; totalAmount: number } | null;
  totals: {
    sales: number;
    rahmatSales: number;
    pendingSales: number;
    sold: Money;
    received: Money;
    openDebt: Money;
    overdueDebt: Money;
    avgPerDay: number;
    bestDay: { day: string; sales: number } | null;
    /** Joriy oy uchun — o'tgan oyning xuddi shu kunlari; yopilgan oy uchun — butun o'tgan oy. */
    previousMonthSales: number;
  };
  operators: SalesHeadOperatorStats[];
  days: SalesHeadDay[];
  tariffs: Record<string, number>;
  /** Hafta kunlari bo'yicha sotuv: 0 — dushanba ... 6 — yakshanba. */
  weekdays: number[];
};

export function isMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
