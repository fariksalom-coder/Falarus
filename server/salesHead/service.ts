import type { Pool, PoolClient } from 'pg';
import { creditedSales } from '../operator/salary.js';
import { zeroMoney, isCurrency, type Money } from '../../shared/salesLedger.js';
import {
  DEFAULT_SALES_HEAD_SETTINGS,
  parseSalesHeadSettings,
  salesHeadSalary,
  type SalesHeadDashboard,
  type SalesHeadOperatorStats,
  type SalesHeadSettings,
} from '../../shared/salesHead.js';

type Db = Pool | PoolClient;

export async function loadSalesHeadSettings(db: Db): Promise<SalesHeadSettings> {
  const row = (await db.query('SELECT settings FROM sales_head_settings WHERE id=true')).rows[0];
  if (!row) return DEFAULT_SALES_HEAD_SETTINGS;
  try {
    return parseSalesHeadSettings(row.settings);
  } catch {
    return DEFAULT_SALES_HEAD_SETTINGS;
  }
}

export async function saveSalesHeadSettings(db: Db, raw: unknown, adminId: number | null): Promise<SalesHeadSettings> {
  const settings = parseSalesHeadSettings(raw);
  await db.query(
    `INSERT INTO sales_head_settings(id,settings,updated_by,updated_at) VALUES(true,$1,$2,now())
     ON CONFLICT(id) DO UPDATE SET settings=EXCLUDED.settings,updated_by=EXCLUDED.updated_by,updated_at=now()`,
    [JSON.stringify(settings), adminId],
  );
  return settings;
}

/** Tashkent is UTC+5 all year, so month borders are fixed offsets. */
const tashkentMidnight = (date: string) => new Date(`${date}T00:00:00+05:00`).toISOString();
const tashkentToday = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, nextFrom: `${next}-01`, prevFrom: `${prev}-01`, daysInMonth };
}

const addMoney = (target: Money, currency: unknown, amount: unknown) => {
  if (isCurrency(currency)) target[currency] += Number(amount) || 0;
};

export async function salesHeadDashboard(db: Db, month: string): Promise<SalesHeadDashboard> {
  const { from, nextFrom, prevFrom, daysInMonth } = monthBounds(month);
  const today = tashkentToday();
  const isCurrent = today.slice(0, 7) === month;
  const daysElapsed = isCurrent ? Number(today.slice(8, 10)) : today < from ? 0 : daysInMonth;
  const range: [string, string] = [tashkentMidnight(from), tashkentMidnight(nextFrom)];

  const [settings, sales, previous, operators, received, debts] = await Promise.all([
    loadSalesHeadSettings(db),
    creditedSales(db, range[0], range[1]),
    creditedSales(db, tashkentMidnight(prevFrom), range[0]),
    db.query('SELECT id,name,active FROM operator_accounts ORDER BY id'),
    // Money that actually arrived in the month: approved operator receipts (by approval) and claimed Rahmat payments.
    db.query(
      `SELECT operator_id::text,currency,COALESCE(sum(amount),0)::text amount FROM (
         SELECT r.operator_id,c.currency,r.amount,r.decided_at at FROM operator_receipts r
         JOIN operator_contracts c ON c.id=r.contract_id WHERE r.status='approved'
         UNION ALL SELECT operator_id,currency,amount,paid_at FROM operator_rahmat_sales
       ) money WHERE at>=$1 AND at<$2 GROUP BY operator_id,currency`,
      range,
    ),
    // Current open debt, not tied to the month.
    db.query(
      `SELECT operator_id::text,currency,COALESCE(sum(debt),0)::text debt,
              COALESCE(sum(debt) FILTER (WHERE due_at<now()),0)::text overdue
       FROM operator_balances WHERE debt>0 AND (paid>0 OR pending>0) GROUP BY operator_id,currency`,
    ),
  ]);

  const counts = (kind: string) => kind === 'contract' || settings.includeRahmatClaims;
  const stats = new Map<string, SalesHeadOperatorStats & { perDay: Map<string, number> }>();
  const operatorStats = (id: string) => {
    let entry = stats.get(id);
    if (!entry) {
      const op = operators.rows.find((o: { id: string | number }) => String(o.id) === id);
      entry = {
        id: Number(id),
        name: op?.name ?? `Operator #${id}`,
        active: op?.active === true,
        sales: 0,
        rahmatSales: 0,
        pendingSales: 0,
        sold: zeroMoney(),
        received: zeroMoney(),
        openDebt: zeroMoney(),
        overdueDebt: zeroMoney(),
        activeDays: 0,
        bestDay: null,
        tariffs: {},
        perDay: new Map(),
      };
      stats.set(id, entry);
    }
    return entry;
  };
  for (const op of operators.rows) if (op.active) operatorStats(String(op.id));

  const counted: Record<string, number> = {};
  const dayTotals = new Map<string, Record<string, number>>();
  const tariffs: Record<string, number> = {};
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  let pendingSales = 0;
  for (const row of sales) {
    const op = operatorStats(row.operator_id);
    if (row.status === 'pending') {
      op.pendingSales += row.courses;
      pendingSales += row.courses;
      continue;
    }
    if (row.kind === 'rahmat') op.rahmatSales += row.courses;
    else op.sales += row.courses;
    addMoney(op.sold, row.currency, row.amount);
    op.tariffs[row.tariff] = (op.tariffs[row.tariff] ?? 0) + row.courses;
    op.perDay.set(row.day, (op.perDay.get(row.day) ?? 0) + row.courses);
    tariffs[row.tariff] = (tariffs[row.tariff] ?? 0) + row.courses;
    const byOperator = dayTotals.get(row.day) ?? {};
    byOperator[row.operator_id] = (byOperator[row.operator_id] ?? 0) + row.courses;
    dayTotals.set(row.day, byOperator);
    weekdays[(new Date(`${row.day}T00:00:00Z`).getUTCDay() + 6) % 7] += row.courses;
    if (counts(row.kind)) counted[row.day] = (counted[row.day] ?? 0) + row.courses;
  }
  for (const row of received.rows) addMoney(operatorStats(row.operator_id).received, row.currency, row.amount);
  for (const row of debts.rows) {
    const op = operatorStats(row.operator_id);
    addMoney(op.openDebt, row.currency, row.debt);
    addMoney(op.overdueDebt, row.currency, row.overdue);
  }

  const days = Array.from({ length: daysElapsed }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, '0')}`;
    const byOperator = dayTotals.get(day) ?? {};
    return { day, total: Object.values(byOperator).reduce((sum, n) => sum + n, 0), byOperator };
  });
  const best = (entries: Array<[string, number]>) =>
    [...entries].sort(([a], [b]) => a.localeCompare(b)).reduce<{ day: string; sales: number } | null>((top, [day, n]) => (n > 0 && (!top || n > top.sales) ? { day, sales: n } : top), null);

  const operatorsOut = [...stats.values()].map(({ perDay, ...op }) => ({
    ...op,
    activeDays: [...perDay.values()].filter((n) => n > 0).length,
    bestDay: best([...perDay]),
  }));
  operatorsOut.sort((a, b) => b.sales + b.rahmatSales - (a.sales + a.rahmatSales) || a.name.localeCompare(b.name, 'ru'));

  const sumMoney = (pick: (op: SalesHeadOperatorStats) => Money) => {
    const total = zeroMoney();
    for (const op of operatorsOut) for (const [currency, amount] of Object.entries(pick(op))) addMoney(total, currency, amount);
    return total;
  };
  const totalSales = operatorsOut.reduce((sum, op) => sum + op.sales, 0);
  const totalRahmat = operatorsOut.reduce((sum, op) => sum + op.rahmatSales, 0);
  const salary = salesHeadSalary(settings, counted);

  let forecast: SalesHeadDashboard['forecast'] = null;
  if (isCurrent && daysElapsed > 0) {
    const scale = daysInMonth / daysElapsed;
    const forecastSales = Math.round(salary.countedSales * scale);
    const monthly = salesHeadSalary({ ...settings, bonusPeriod: 'month' }, { all: forecastSales });
    const bonus = settings.bonusPeriod === 'month' ? monthly.bonusAmount : Math.round(salary.bonusAmount * scale);
    forecast = { sales: forecastSales, totalAmount: settings.fixedSalary + forecastSales * settings.perSale + bonus };
  }

  return {
    month,
    from,
    to: `${month}-${String(daysInMonth).padStart(2, '0')}`,
    daysElapsed,
    daysInMonth,
    settings,
    salary,
    forecast,
    totals: {
      sales: totalSales,
      rahmatSales: totalRahmat,
      pendingSales,
      sold: sumMoney((op) => op.sold),
      received: sumMoney((op) => op.received),
      openDebt: sumMoney((op) => op.openDebt),
      overdueDebt: sumMoney((op) => op.overdueDebt),
      avgPerDay: daysElapsed ? Math.round(((totalSales + totalRahmat) / daysElapsed) * 10) / 10 : 0,
      bestDay: best(days.map((d) => [d.day, d.total])),
      // For the running month compare with the same days of the previous month, not the whole month.
      previousMonthSales: previous
        .filter((r) => r.status === 'approved' && (!isCurrent || Number(r.day.slice(8, 10)) <= daysElapsed))
        .reduce((sum, r) => sum + r.courses, 0),
    },
    operators: operatorsOut,
    days,
    tariffs,
    weekdays,
  };
}
