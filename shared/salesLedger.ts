/**
 * Sotuvlar jurnali (admin «Аналитика продаж»): operatorlar qo'lda kiritadigan
 * sotuvlar, bo'lib to'lovlar va qarzlar. Bot (operator_contracts) va Rahmat
 * shlyuzidan mustaqil — faqat hisobot uchun, obunaga tegmaydi.
 *
 * Asosiy hisob RUB da: qarz va status RUB qoldig'idan aniqlanadi. UZS summa
 * har yozuvda yonma-yon saqlanadi (tarif so'mdagi narxi qat'iy, kursga bog'liq emas).
 */
import { RUSSIAN_TARIFF_PLANS_RUB, type RussianTariffCode } from './russianTariffs';

export type SalesLedgerTariff = RussianTariffCode;

export const SALES_LEDGER_TARIFFS: readonly {
  code: SalesLedgerTariff;
  label: string;
  priceRub: number;
  priceUzs: number;
}[] = RUSSIAN_TARIFF_PLANS_RUB.map((plan) => ({
  code: plan.code,
  label: plan.months === 1 ? '1 месяц' : plan.months < 5 ? `${plan.months} месяца` : `${plan.months} месяцев`,
  priceRub: plan.priceRub,
  priceUzs: plan.priceUzs,
}));

export function isSalesLedgerTariff(value: unknown): value is SalesLedgerTariff {
  return SALES_LEDGER_TARIFFS.some((t) => t.code === value);
}

export function salesLedgerTariff(code: SalesLedgerTariff) {
  return SALES_LEDGER_TARIFFS.find((t) => t.code === code)!;
}

export type SalesLedgerOperator = {
  id: number;
  name: string;
  is_auto: boolean;
  active: boolean;
  sort_order: number;
};

/** Sotuv + uning hozirgi balansi (sales_ledger_balances view). */
export type SalesLedgerSale = {
  id: number;
  sale_date: string;
  client_name: string;
  phone: string;
  operator_id: number;
  operator_name: string;
  tariff: SalesLedgerTariff;
  quantity: number;
  price_rub: number;
  price_uzs: number;
  due_date: string | null;
  note: string;
  paid_rub: number;
  paid_uzs: number;
  debt_rub: number;
  debt_uzs: number;
  payments_count: number;
};

export type SalesLedgerPayment = {
  id: number;
  sale_id: number;
  paid_on: string;
  amount_rub: number;
  amount_uzs: number;
  note: string;
  client_name: string;
  tariff: SalesLedgerTariff;
  sale_date: string;
  operator_id: number;
  operator_name: string;
};

export type SalesLedgerDay = {
  date: string;
  operators: SalesLedgerOperator[];
  /** Shu kuni tuzilgan sotuvlar. */
  sales: SalesLedgerSale[];
  /** Shu kuni tushgan barcha to'lovlar (yangi sotuv + qarz undirish). */
  payments: SalesLedgerPayment[];
  /** Shu kungacha tuzilgan va hali yopilmagan sotuvlar. */
  debts: SalesLedgerSale[];
};

export type SaleStatus = 'paid' | 'partial' | 'waiting';

export function saleStatus(sale: Pick<SalesLedgerSale, 'paid_rub' | 'debt_rub'>): SaleStatus {
  if (sale.debt_rub <= 0) return 'paid';
  return sale.paid_rub > 0 ? 'partial' : 'waiting';
}

export type Money = { rub: number; uzs: number };

const zero = (): Money => ({ rub: 0, uzs: 0 });
const add = (m: Money, rub: number, uzs: number) => {
  m.rub += rub;
  m.uzs += uzs;
};

/**
 * RUB to'lovga mos so'm summasi: sotuvning o'z RUB/UZS nisbatida. Qarzni
 * to'liq yopadigan to'lov qolgan so'mni oladi — yaxlitlash qoldig'i qolmasin.
 */
export function uzsForRub(amountRub: number, sale: { price_rub: number; price_uzs: number; debt_rub: number; debt_uzs: number }): number {
  if (amountRub >= sale.debt_rub) return Math.max(0, sale.debt_uzs);
  if (sale.price_rub <= 0) return 0;
  return Math.round((amountRub / sale.price_rub) * sale.price_uzs);
}

/** Teskari yo'nalish: so'mda kiritilgan summani RUB ga. */
export function rubForUzs(amountUzs: number, sale: { price_rub: number; price_uzs: number; debt_rub: number; debt_uzs: number }): number {
  if (sale.debt_uzs > 0 && amountUzs >= sale.debt_uzs) return Math.max(0, sale.debt_rub);
  if (sale.price_uzs <= 0) return 0;
  return Math.round((amountUzs / sale.price_uzs) * sale.price_rub);
}

export type OperatorDayStats = {
  operator: SalesLedgerOperator;
  salesCount: number;
  /** Shu kungi sotuvlarning to'liq qiymati. */
  sold: Money;
  /** Shu kuni tushgan pul (yangi sotuvlardan + qarzlardan). */
  received: Money;
  /** Ulardan: oldingi kunlardagi qarzlardan undirilgani. */
  collectedDebt: Money;
  /** Hozir ochiq turgan qarz (shu kungacha tuzilgan sotuvlar bo'yicha). */
  openDebt: Money;
};

export type SalesLedgerSummary = {
  salesCount: number;
  units: number;
  byTariff: Record<SalesLedgerTariff, number>;
  sold: Money;
  received: Money;
  receivedFromNewSales: Money;
  collectedDebt: Money;
  /** Bugungi sotuvlardan qolgan qarz. */
  newDebt: Money;
  openDebt: Money;
  openDebtCount: number;
  waitingCount: number;
  partialCount: number;
  paidCount: number;
  perOperator: OperatorDayStats[];
};

export function summarizeSalesDay(day: SalesLedgerDay): SalesLedgerSummary {
  const byTariff = Object.fromEntries(SALES_LEDGER_TARIFFS.map((t) => [t.code, 0])) as Record<SalesLedgerTariff, number>;
  const summary: SalesLedgerSummary = {
    salesCount: day.sales.length,
    units: 0,
    byTariff,
    sold: zero(),
    received: zero(),
    receivedFromNewSales: zero(),
    collectedDebt: zero(),
    newDebt: zero(),
    openDebt: zero(),
    openDebtCount: day.debts.length,
    waitingCount: 0,
    partialCount: 0,
    paidCount: 0,
    perOperator: [],
  };

  const perOperator = new Map<number, OperatorDayStats>();
  const statsFor = (operatorId: number, fallbackName: string) => {
    let stats = perOperator.get(operatorId);
    if (!stats) {
      const operator = day.operators.find((o) => o.id === operatorId) ?? {
        id: operatorId,
        name: fallbackName,
        is_auto: false,
        active: false,
        sort_order: 0,
      };
      stats = { operator, salesCount: 0, sold: zero(), received: zero(), collectedDebt: zero(), openDebt: zero() };
      perOperator.set(operatorId, stats);
    }
    return stats;
  };
  for (const operator of day.operators) if (operator.active) statsFor(operator.id, operator.name);

  for (const sale of day.sales) {
    summary.units += sale.quantity;
    summary.byTariff[sale.tariff] += sale.quantity;
    add(summary.sold, sale.price_rub, sale.price_uzs);
    add(summary.newDebt, Math.max(0, sale.debt_rub), Math.max(0, sale.debt_uzs));
    const status = saleStatus(sale);
    if (status === 'paid') summary.paidCount += 1;
    else if (status === 'partial') summary.partialCount += 1;
    else summary.waitingCount += 1;
    const stats = statsFor(sale.operator_id, sale.operator_name);
    stats.salesCount += 1;
    add(stats.sold, sale.price_rub, sale.price_uzs);
  }

  for (const payment of day.payments) {
    add(summary.received, payment.amount_rub, payment.amount_uzs);
    const stats = statsFor(payment.operator_id, payment.operator_name);
    add(stats.received, payment.amount_rub, payment.amount_uzs);
    if (payment.sale_date < day.date) {
      add(summary.collectedDebt, payment.amount_rub, payment.amount_uzs);
      add(stats.collectedDebt, payment.amount_rub, payment.amount_uzs);
    } else {
      add(summary.receivedFromNewSales, payment.amount_rub, payment.amount_uzs);
    }
  }

  for (const debt of day.debts) {
    add(summary.openDebt, debt.debt_rub, debt.debt_uzs);
    add(statsFor(debt.operator_id, debt.operator_name).openDebt, debt.debt_rub, debt.debt_uzs);
  }

  summary.perOperator = [...perOperator.values()].sort(
    (a, b) =>
      Number(a.operator.is_auto) - Number(b.operator.is_auto) ||
      a.operator.sort_order - b.operator.sort_order ||
      a.operator.id - b.operator.id,
  );
  return summary;
}

/** Toshkent vaqti bo'yicha bugungi sana (YYYY-MM-DD). */
export function tashkentToday(now = new Date()): string {
  return new Date(now.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** `to` sanasi `from` dan necha kun keyin (manfiy — o'tib ketgan). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
