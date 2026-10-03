/**
 * Sotuvlar tahlili (admin «Аналитика продаж») — bazadagi haqiqiy ma'lumotdan:
 *   • operatorlar: operator boti / mini ilova (operator_contracts + operator_receipts);
 *   • avtoto'lov: Rahmat shlyuzi (payments, payment_channel='rahmat');
 *   • qo'lda: admin tasdiqlagan to'lovlar (payments, boshqa kanallar).
 *
 * Summalar KONVERTATSIYA QILINMAYDI — har biri o'z valyutasida yig'iladi
 * (operator so'mda ham, rublda ham sotishi mumkin; uydirma kurs ishlatmaymiz).
 */
import { RUSSIAN_TARIFF_PLANS_RUB } from './russianTariffs';

export const CURRENCIES = ['RUB', 'UZS', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];
export type Money = Record<Currency, number>;

export const zeroMoney = (): Money => ({ RUB: 0, UZS: 0, USD: 0 });

export function isCurrency(value: unknown): value is Currency {
  return CURRENCIES.includes(value as Currency);
}

export type SaleSource = 'operator' | 'rahmat' | 'manual';

export const SOURCE_LABELS: Record<SaleSource, string> = {
  operator: 'Оператор',
  rahmat: 'Автоплатёж (Rahmat)',
  manual: 'Вручную (админ)',
};

export type TariffInfo = { code: string; label: string; priceRub: number | null; priceUzs: number | null };

const TARIFF_LABELS: Record<string, string> = {
  month: '1 месяц',
  three_month: '3 месяца',
  six_month: '6 месяцев',
  year: '1 год',
};

/** Asosiy uchta tarif — jadvalda doim ko'rinadi; «1 год» faqat uchrasa. */
export const MAIN_TARIFFS: readonly TariffInfo[] = RUSSIAN_TARIFF_PLANS_RUB.map((plan) => ({
  code: plan.code,
  label: TARIFF_LABELS[plan.code],
  priceRub: plan.priceRub,
  priceUzs: plan.priceUzs,
}));

export function tariffLabel(code: string | null): string {
  if (!code) return 'Без тарифа';
  return TARIFF_LABELS[code] ?? code;
}

export type AnalyticsOperator = { id: number; name: string; active: boolean };

/**
 * Bitta sotuv: operator shartnomasi yoki shlyuz/admin to'lovi (u to'liq sotuv).
 * `paid` — tasdiqlangan, `pending` — tekshiruvdagi cheklar, `debt` = total − paid.
 */
export type AnalyticsSale = {
  key: string;
  source: SaleSource;
  sale_at: string;
  user_id: number;
  client_name: string;
  phone: string;
  operator_id: number | null;
  operator_name: string;
  tariff: string | null;
  currency: Currency;
  total: number;
  paid: number;
  pending: number;
  debt: number;
  due_at: string | null;
  /** Mijoz qayerdan kelgan (operator tanlagan manba). */
  lead_source: string;
};

/** Kun ichida tushgan pul: operator cheki yoki shlyuz/admin to'lovi. */
export type AnalyticsPayment = {
  key: string;
  source: SaleSource;
  status: 'approved' | 'pending';
  paid_at: string;
  user_id: number;
  client_name: string;
  operator_id: number | null;
  operator_name: string;
  tariff: string | null;
  currency: Currency;
  amount: number;
  /** Sotuv tuzilgan kun (Toshkent) — davr boshidan oldin bo'lsa, bu eski qarzni undirish. */
  sale_date: string;
};

/** Davr — bir kun (from === to), oy yoki ixtiyoriy oraliq; ikkala chegara ham kiradi. */
export type AnalyticsPeriod = {
  from: string;
  to: string;
  /** Markaziy bank kursi (1 ₽ = N so'm) — faqat kanallar ulushini hisoblash uchun. */
  rub_uzs_rate: number | null;
  operators: AnalyticsOperator[];
  sales: AnalyticsSale[];
  payments: AnalyticsPayment[];
  /** Davr oxirigacha tuzilgan va hozir ham yopilmagan operator shartnomalari (joriy qoldiq). */
  debts: AnalyticsSale[];
};

export type SaleStatus = 'paid' | 'partial' | 'checking';

export function saleStatus(sale: Pick<AnalyticsSale, 'paid' | 'debt'>): SaleStatus {
  if (sale.debt <= 0) return 'paid';
  return sale.paid > 0 ? 'partial' : 'checking';
}

export type ChannelStats = {
  key: string;
  label: string;
  source: SaleSource;
  operatorId: number | null;
  active: boolean;
  salesCount: number;
  /** Shu kanal sotgan tariflar soni. */
  byTariff: Record<string, number>;
  sold: Money;
  received: Money;
  collectedDebt: Money;
  pendingReview: Money;
  openDebt: Money;
};

export type AnalyticsSummary = {
  salesCount: number;
  byTariff: Record<string, number>;
  sold: Money;
  received: Money;
  receivedBySource: Record<SaleSource, Money>;
  receivedFromNewSales: Money;
  collectedDebt: Money;
  pendingReview: Money;
  pendingReviewCount: number;
  newDebt: Money;
  openDebt: Money;
  openDebtCount: number;
  overdueDebt: Money;
  paidCount: number;
  partialCount: number;
  checkingCount: number;
  channels: ChannelStats[];
};

const add = (target: Money, currency: Currency, amount: number) => {
  target[currency] += amount;
};

export const channelKey = (source: SaleSource, operatorId: number | null) =>
  source === 'operator' ? `op:${operatorId}` : source;

/** Toshkent vaqti bo'yicha sana (YYYY-MM-DD). */
export function tashkentDate(iso: string | Date): string {
  const time = typeof iso === 'string' ? Date.parse(iso) : iso.getTime();
  return new Date(time + 5 * 3_600_000).toISOString().slice(0, 10);
}

export function tashkentToday(now = new Date()): string {
  return tashkentDate(now);
}

export function summarizeAnalytics(day: AnalyticsPeriod, now = new Date()): AnalyticsSummary {
  const summary: AnalyticsSummary = {
    salesCount: day.sales.length,
    byTariff: Object.fromEntries(MAIN_TARIFFS.map((t) => [t.code, 0])),
    sold: zeroMoney(),
    received: zeroMoney(),
    receivedBySource: { operator: zeroMoney(), rahmat: zeroMoney(), manual: zeroMoney() },
    receivedFromNewSales: zeroMoney(),
    collectedDebt: zeroMoney(),
    pendingReview: zeroMoney(),
    pendingReviewCount: 0,
    newDebt: zeroMoney(),
    openDebt: zeroMoney(),
    openDebtCount: day.debts.length,
    overdueDebt: zeroMoney(),
    paidCount: 0,
    partialCount: 0,
    checkingCount: 0,
    channels: [],
  };

  const channels = new Map<string, ChannelStats>();
  const channel = (source: SaleSource, operatorId: number | null, name: string) => {
    const key = channelKey(source, operatorId);
    let stats = channels.get(key);
    if (!stats) {
      const operator = day.operators.find((o) => o.id === operatorId);
      stats = {
        key,
        label: source === 'operator' ? (operator?.name ?? name) : SOURCE_LABELS[source],
        source,
        operatorId: source === 'operator' ? operatorId : null,
        active: source !== 'operator' || (operator?.active ?? false),
        salesCount: 0,
        byTariff: {},
        sold: zeroMoney(),
        received: zeroMoney(),
        collectedDebt: zeroMoney(),
        pendingReview: zeroMoney(),
        openDebt: zeroMoney(),
      };
      channels.set(key, stats);
    }
    return stats;
  };
  for (const operator of day.operators) if (operator.active) channel('operator', operator.id, operator.name);
  channel('rahmat', null, '');

  for (const sale of day.sales) {
    const tariff = sale.tariff ?? 'none';
    summary.byTariff[tariff] = (summary.byTariff[tariff] ?? 0) + 1;
    add(summary.sold, sale.currency, sale.total);
    add(summary.newDebt, sale.currency, Math.max(0, sale.debt));
    const status = saleStatus(sale);
    if (status === 'paid') summary.paidCount += 1;
    else if (status === 'partial') summary.partialCount += 1;
    else summary.checkingCount += 1;
    const stats = channel(sale.source, sale.operator_id, sale.operator_name);
    stats.salesCount += 1;
    stats.byTariff[tariff] = (stats.byTariff[tariff] ?? 0) + 1;
    add(stats.sold, sale.currency, sale.total);
  }

  for (const payment of day.payments) {
    const stats = channel(payment.source, payment.operator_id, payment.operator_name);
    if (payment.status === 'pending') {
      summary.pendingReviewCount += 1;
      add(summary.pendingReview, payment.currency, payment.amount);
      add(stats.pendingReview, payment.currency, payment.amount);
      continue;
    }
    add(summary.received, payment.currency, payment.amount);
    add(summary.receivedBySource[payment.source], payment.currency, payment.amount);
    add(stats.received, payment.currency, payment.amount);
    if (payment.sale_date < day.from) {
      add(summary.collectedDebt, payment.currency, payment.amount);
      add(stats.collectedDebt, payment.currency, payment.amount);
    } else {
      add(summary.receivedFromNewSales, payment.currency, payment.amount);
    }
  }

  for (const debt of day.debts) {
    add(summary.openDebt, debt.currency, debt.debt);
    if (debt.due_at && Date.parse(debt.due_at) < now.getTime()) add(summary.overdueDebt, debt.currency, debt.debt);
    add(channel(debt.source, debt.operator_id, debt.operator_name).openDebt, debt.currency, debt.debt);
  }

  const order: Record<SaleSource, number> = { operator: 0, rahmat: 1, manual: 2 };
  summary.channels = [...channels.values()].sort(
    (a, b) => order[a.source] - order[b.source] || a.label.localeCompare(b.label, 'ru'),
  );
  return summary;
}

/**
 * Ko'p valyutali summa so'm ekvivalentida — faqat ulush (%) uchun. Kurs yo'q
 * bo'lsa RUB hisobga olinmaydi; USD kursi saqlanmagani uchun hech qachon qo'shilmaydi.
 */
export function moneyInUzs(value: Money, rubUzsRate: number | null): number {
  return value.UZS + (rubUzsRate && rubUzsRate > 0 ? value.RUB * rubUzsRate : 0);
}

/** Bitta so'rovda ko'pi bilan shuncha kun (yil + kabisa). */
export const MAX_PERIOD_DAYS = 366;

/** Sana tushgan oyning birinchi va oxirgi kuni. */
export function monthRange(date: string): { from: string; to: string } {
  const from = `${date.slice(0, 7)}-01`;
  const next = new Date(`${from}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { from, to: addDays(next.toISOString().slice(0, 10), -1) };
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
