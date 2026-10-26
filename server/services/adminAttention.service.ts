/**
 * Admin panelidagi belgichalar: tekshiruv yoki qaror kutayotgan ishlar soni, bo'lim bo'yicha.
 * Chap menyu har 30 soniyada bitta so'rov bilan oladi (/api/admin/attention).
 * Har bir hisob alohida: jadval hali yo'q bo'lsa (migratsiya qo'llanmagan) — 0, qolganlari ishlayveradi.
 */
import type { Pool } from 'pg';
import { pool } from '../lib/db.js';
import { readAdminUnreadCount } from './adminUsersRead.service.js';

type Db = Pick<Pool, 'query'>;

const COUNTS = {
  teacherApplications: `SELECT count(*)::int AS n FROM teacher_profiles WHERE profile_status = 'pending_review'`,
  teacherRevisions: `SELECT count(*)::int AS n FROM teacher_profile_revisions WHERE status = 'pending'`,
  teacherWithdrawals: `SELECT count(*)::int AS n FROM teacher_withdrawals WHERE status = 'requested'`,
  teacherReviews: `SELECT count(*)::int AS n FROM teacher_lesson_reviews WHERE status = 'pending'`,
  teacherLessons: `SELECT count(*)::int AS n FROM teacher_lessons WHERE status = 'disputed' OR (refund_due AND refunded_at IS NULL)`,
  operatorReceipts: `SELECT count(*)::int AS n FROM operator_receipts WHERE status = 'pending'`,
  operatorRahmat: `SELECT count(*)::int AS n FROM operator_rahmat_claims WHERE status = 'pending'`,
  operatorDeferrals: `SELECT count(*)::int AS n FROM operator_debt_deferrals WHERE status = 'pending'`,
} as const;

export type AdminAttention = {
  support: number;
  teachers: { total: number; applications: number; revisions: number; withdrawals: number; reviews: number; lessons: number };
  operators: { total: number; receipts: number; rahmat: number; deferrals: number };
  total: number;
};

export async function readAdminAttention(db: Db | null = pool): Promise<AdminAttention> {
  if (!db) throw new Error('Database is not configured');
  const one = (sql: string) => db.query(sql).then((r) => Number(r.rows[0]?.n ?? 0)).catch(() => 0);
  const keys = Object.keys(COUNTS) as (keyof typeof COUNTS)[];
  const [values, support] = await Promise.all([
    Promise.all(keys.map((k) => one(COUNTS[k]))),
    readAdminUnreadCount(db).then((r) => Number(r?.count ?? 0)).catch(() => 0),
  ]);
  const c = Object.fromEntries(keys.map((k, i) => [k, values[i]])) as Record<keyof typeof COUNTS, number>;
  const teachers = {
    applications: c.teacherApplications, revisions: c.teacherRevisions, withdrawals: c.teacherWithdrawals,
    reviews: c.teacherReviews, lessons: c.teacherLessons,
  };
  const operators = { receipts: c.operatorReceipts, rahmat: c.operatorRahmat, deferrals: c.operatorDeferrals };
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const t = { total: sum(teachers), ...teachers };
  const o = { total: sum(operators), ...operators };
  return { support, teachers: t, operators: o, total: support + t.total + o.total };
}
