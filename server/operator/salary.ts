import type { Pool, PoolClient } from 'pg';

export const SALARY_PER_COURSE_UZS = 30000;
export const SALARY_BONUSES_UZS = [
  { courses: 3, amount: 50000 },
  { courses: 5, amount: 100000 },
  { courses: 8, amount: 150000 },
] as const;

/**
 * From November 2026 the team is paid from every sale of the company, whatever
 * the channel (operator receipt, Rahmat, manual or admin payment): each team
 * operator gets the same rate per sale. Daily bonuses go to one shared fund
 * that is not split between operators yet.
 */
export const TEAM_SCHEME_FROM_DAY = '2026-11-01';
/** Laziz, Sarvinoz Ibragimova, Raksana Ulmasova (operator_accounts.id). */
export const TEAM_OPERATOR_IDS: readonly number[] = [1, 2, 4];
export const TEAM_PER_SALE_UZS = 15000;
export const TEAM_FUND_TIERS_UZS = [
  { courses: 7, amount: 150000 },
  { courses: 10, amount: 250000 },
  { courses: 15, amount: 500000 },
  { courses: 20, amount: 750000 },
] as const;

export const isTeamDay = (day: string) => day >= TEAM_SCHEME_FROM_DAY;
export const isTeamOperator = (operatorId: number) => TEAM_OPERATOR_IDS.includes(operatorId);

/** Shared fund for one day: the highest tier reached, tiers do not add up. */
export function teamFundForSales(sales: number) {
  const count = Math.max(0, Math.floor(Number(sales) || 0));
  const tier = [...TEAM_FUND_TIERS_UZS].reverse().find((t) => count >= t.courses) ?? null;
  const next = TEAM_FUND_TIERS_UZS.find((t) => count < t.courses) ?? null;
  return {
    sales: count,
    amount: tier?.amount ?? 0,
    nextTarget: next?.courses ?? null,
    nextAmount: next?.amount ?? null,
    remainingToNext: next ? next.courses - count : 0,
  };
}

export function salaryForCourses(courses: number) {
  const soldCourses = Math.max(0, Math.floor(Number(courses) || 0));
  const bonus = [...SALARY_BONUSES_UZS].reverse().find((tier) => soldCourses >= tier.courses) ?? null;
  const next = SALARY_BONUSES_UZS.find((tier) => soldCourses < tier.courses) ?? null;
  const baseAmount = soldCourses * SALARY_PER_COURSE_UZS;
  const bonusAmount = bonus?.amount ?? 0;
  return {
    currency: 'UZS',
    soldCourses,
    perCourseAmount: SALARY_PER_COURSE_UZS,
    baseAmount,
    bonusAmount,
    totalAmount: baseAmount + bonusAmount,
    bonusTier: bonus,
    nextTarget: next?.courses ?? null,
    nextBonusAmount: next?.amount ?? null,
    remainingToNext: next ? Math.max(0, next.courses - soldCourses) : 0,
    tiers: SALARY_BONUSES_UZS,
  };
}

/**
 * One row per credited course. A course is credited once, to the operator who
 * submitted its first approved receipt, on the day that receipt was SUBMITTED
 * (not the day an admin approved it). Rahmat claims count on the day the
 * customer paid, so old payments cannot be bundled into one bonus day.
 * Pending rows are courses still waiting for an admin.
 */
const CREDITED_SALES_SQL = `
  SELECT sale.operator_id,c.tariff,c.currency,c.total amount,sale.created_at sold_at,'approved' status,'contract' kind
  FROM operator_contracts c JOIN LATERAL (
    SELECT r.operator_id,r.created_at FROM operator_receipts r WHERE r.contract_id=c.id AND r.status='approved'
    ORDER BY r.created_at ASC,r.id ASC LIMIT 1
  ) sale ON true WHERE c.activated_at IS NOT NULL
  UNION ALL
  SELECT sale.operator_id,c.tariff,c.currency,c.total,sale.created_at,'pending','contract'
  FROM operator_contracts c JOIN LATERAL (
    SELECT r.operator_id,r.created_at FROM operator_receipts r WHERE r.contract_id=c.id AND r.status='pending'
    ORDER BY r.created_at ASC,r.id ASC LIMIT 1
  ) sale ON true WHERE c.activated_at IS NULL
  UNION ALL
  SELECT operator_id,tariff,currency,amount,paid_at,'approved','rahmat' FROM operator_rahmat_sales
  UNION ALL
  SELECT a.operator_id,p.tariff_type,p.currency,p.amount,COALESCE(p.payment_time,p.created_at),'pending','rahmat'
  FROM operator_rahmat_claims a JOIN payments p ON p.id=a.payment_id WHERE a.status='pending'`;

export type CreditedSaleRow = {
  operator_id: string;
  day: string;
  status: 'approved' | 'pending';
  /** contract: operator's own receipt; rahmat: Rahmat autopayment claimed by the operator. */
  kind: 'contract' | 'rahmat';
  tariff: string;
  currency: string;
  courses: number;
  amount: string;
};

/** Credited courses in [from, to) grouped by operator, Tashkent day, status, kind, tariff and currency. */
export async function creditedSales(db: Pool | PoolClient, from: string, to: string, operatorId: number | null = null) {
  return (await db.query(
    `SELECT operator_id::text,status,kind,tariff,currency,
            to_char((sold_at AT TIME ZONE 'Asia/Tashkent'),'YYYY-MM-DD') AS "day",
            count(*)::int courses,COALESCE(sum(amount),0)::text amount
     FROM (${CREDITED_SALES_SQL}) credited
     WHERE ($3::bigint IS NULL OR operator_id=$3) AND sold_at>=$1 AND sold_at<$2
     GROUP BY operator_id,status,kind,tariff,currency,"day"`,
    [from, to, operatorId],
  )).rows as CreditedSaleRow[];
}


/**
 * Every sale of the company in [from, to), by Tashkent day. Operator contracts
 * count like creditedSales (day the first approved receipt was sent); approved
 * gateway and admin payments count on the payment day. Rahmat payments claimed
 * by an operator are payments rows already, so nothing is counted twice.
 */
export async function teamSalesByDay(db: Pool | PoolClient, from: string, to: string) {
  const rows = (await db.query(
    `SELECT to_char((sold_at AT TIME ZONE 'Asia/Tashkent'),'YYYY-MM-DD') AS "day",
            count(*) FILTER (WHERE status='approved')::int sales,
            count(*) FILTER (WHERE status='pending')::int pending
     FROM (
       SELECT sold_at,status FROM (${CREDITED_SALES_SQL}) credited WHERE kind='contract'
       UNION ALL
       SELECT COALESCE(p.payment_time,p.created_at),'approved' FROM payments p
       WHERE p.status='approved' AND COALESCE(p.product_code,'russian')='russian' AND p.amount>1
     ) sale
     WHERE sold_at>=$1 AND sold_at<$2
     GROUP BY "day"`,
    [from, to],
  )).rows as Array<{ day: string; sales: number; pending: number }>;
  return new Map(rows.map((r) => [r.day, { sales: Number(r.sales), pending: Number(r.pending) }]));
}

/** Shared bonus fund over [from, to): days of the team scheme only. */
export async function teamFund(db: Pool | PoolClient, from: string, to: string) {
  const byDay = await teamSalesByDay(db, from, to);
  const days = [...byDay]
    .filter(([day]) => isTeamDay(day))
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, { sales, pending }]) => ({ day, sales, pending, fund: teamFundForSales(sales).amount }));
  return {
    perSale: TEAM_PER_SALE_UZS,
    tiers: TEAM_FUND_TIERS_UZS,
    sales: days.reduce((sum, d) => sum + d.sales, 0),
    pending: days.reduce((sum, d) => sum + d.pending, 0),
    amount: days.reduce((sum, d) => sum + d.fund, 0),
    days,
  };
}

export type OperatorSalary = {
  operatorId: number;
  /** team: the day is paid from all company sales; personal: from the operator's own courses with personal bonuses. */
  days: Array<{ day: string; soldCourses: number; baseAmount: number; bonusAmount: number; totalAmount: number; scheme: 'team' | 'personal' }>;
  tariffs: Array<{ tariff: string; sold_courses: number }>;
  soldCourses: number;
  baseAmount: number;
  bonusAmount: number;
  totalAmount: number;
  /** Credited sale amounts per currency (contract price or Rahmat payment). */
  sold: Record<string, number>;
  pendingCourses: number;
  pending: Record<string, number>;
};

/**
 * Salary per operator for [from, to). Before TEAM_SCHEME_FROM_DAY, and for
 * operators outside the team, a day pays for the operator's own courses with
 * personal bonus tiers; on team days a team operator is paid for every sale of
 * the company and the bonus goes to the shared fund (see teamFund).
 */
export async function operatorSalaries(db: Pool | PoolClient, from: string, to: string, operatorId: number | null = null) {
  const [rows, teamDays] = await Promise.all([creditedSales(db, from, to, operatorId), teamSalesByDay(db, from, to)]);

  const byOperator = new Map<number, { days: Map<string, number>; tariffs: Map<string, number>; salary: OperatorSalary }>();
  const entryFor = (id: number) => {
    let entry = byOperator.get(id);
    if (!entry) {
      entry = {
        days: new Map(),
        tariffs: new Map(),
        salary: { operatorId: id, days: [], tariffs: [], soldCourses: 0, baseAmount: 0, bonusAmount: 0, totalAmount: 0, sold: {}, pendingCourses: 0, pending: {} },
      };
      byOperator.set(id, entry);
    }
    return entry;
  };
  const teamIds = TEAM_OPERATOR_IDS.filter((id) => operatorId == null || id === operatorId);
  if ([...teamDays].some(([day, d]) => isTeamDay(day) && d.sales > 0)) for (const id of teamIds) entryFor(id);
  for (const row of rows) {
    const id = Number(row.operator_id);
    const entry = entryFor(id);
    const courses = Number(row.courses);
    const amount = Number(row.amount);
    if (row.status === 'pending') {
      entry.salary.pendingCourses += courses;
      entry.salary.pending[row.currency] = (entry.salary.pending[row.currency] ?? 0) + amount;
      continue;
    }
    // Team days are paid from company sales below; own courses still show in tariffs and amounts.
    if (!(isTeamOperator(id) && isTeamDay(row.day))) entry.days.set(row.day, (entry.days.get(row.day) ?? 0) + courses);
    entry.tariffs.set(row.tariff, (entry.tariffs.get(row.tariff) ?? 0) + courses);
    entry.salary.sold[row.currency] = (entry.salary.sold[row.currency] ?? 0) + amount;
  }

  for (const { days, tariffs, salary } of byOperator.values()) {
    const personal = [...days].map(([day, courses]) => {
      const calc = salaryForCourses(courses);
      return { day, soldCourses: calc.soldCourses, baseAmount: calc.baseAmount, bonusAmount: calc.bonusAmount, totalAmount: calc.totalAmount, scheme: 'personal' as const };
    });
    const team = isTeamOperator(salary.operatorId)
      ? [...teamDays].filter(([day, d]) => isTeamDay(day) && d.sales > 0).map(([day, d]) => {
        const baseAmount = d.sales * TEAM_PER_SALE_UZS;
        return { day, soldCourses: d.sales, baseAmount, bonusAmount: 0, totalAmount: baseAmount, scheme: 'team' as const };
      })
      : [];
    salary.days = [...personal, ...team].sort((a, b) => b.day.localeCompare(a.day));
    salary.tariffs = [...tariffs].map(([tariff, sold_courses]) => ({ tariff, sold_courses }));
    for (const day of salary.days) {
      salary.soldCourses += day.soldCourses;
      salary.baseAmount += day.baseAmount;
      salary.bonusAmount += day.bonusAmount;
      salary.totalAmount += day.totalAmount;
    }
  }
  return new Map([...byOperator].map(([id, entry]) => [id, entry.salary]));
}
