import type { Pool, PoolClient } from 'pg';

export const SALARY_PER_COURSE_UZS = 30000;
export const SALARY_BONUSES_UZS = [
  { courses: 3, amount: 50000 },
  { courses: 5, amount: 100000 },
  { courses: 8, amount: 150000 },
] as const;

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


export type OperatorSalary = {
  operatorId: number;
  days: Array<{ day: string; soldCourses: number; baseAmount: number; bonusAmount: number; totalAmount: number }>;
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

/** Salary per operator for [from, to); bonus tiers apply per Tashkent day. */
export async function operatorSalaries(db: Pool | PoolClient, from: string, to: string, operatorId: number | null = null) {
  const rows = await creditedSales(db, from, to, operatorId);

  const byOperator = new Map<number, { days: Map<string, number>; tariffs: Map<string, number>; salary: OperatorSalary }>();
  for (const row of rows) {
    const id = Number(row.operator_id);
    let entry = byOperator.get(id);
    if (!entry) {
      entry = {
        days: new Map(),
        tariffs: new Map(),
        salary: { operatorId: id, days: [], tariffs: [], soldCourses: 0, baseAmount: 0, bonusAmount: 0, totalAmount: 0, sold: {}, pendingCourses: 0, pending: {} },
      };
      byOperator.set(id, entry);
    }
    const courses = Number(row.courses);
    const amount = Number(row.amount);
    if (row.status === 'pending') {
      entry.salary.pendingCourses += courses;
      entry.salary.pending[row.currency] = (entry.salary.pending[row.currency] ?? 0) + amount;
      continue;
    }
    entry.days.set(row.day, (entry.days.get(row.day) ?? 0) + courses);
    entry.tariffs.set(row.tariff, (entry.tariffs.get(row.tariff) ?? 0) + courses);
    entry.salary.sold[row.currency] = (entry.salary.sold[row.currency] ?? 0) + amount;
  }

  for (const { days, tariffs, salary } of byOperator.values()) {
    salary.days = [...days]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, courses]) => {
        const calc = salaryForCourses(courses);
        return { day, soldCourses: calc.soldCourses, baseAmount: calc.baseAmount, bonusAmount: calc.bonusAmount, totalAmount: calc.totalAmount };
      });
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
