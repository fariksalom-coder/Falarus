import type { Pool, PoolClient } from 'pg';
import { FIRST_1000_PROMO, first1000PromoPrice } from '../../shared/russianTariffs.js';

/**
 * One shared limit for every channel:
 *  - operator contracts hold a seat while approved or still waiting for an admin
 *    (a contract whose receipts were all rejected frees its seat again);
 *  - Rahmat / Click / admin payments (discount_meta.promo) count once approved,
 *    so an abandoned checkout never holds a seat. Rahmat payments claimed by an
 *    operator are payments rows, so they are not counted twice.
 */
const USED_SQL = `
  SELECT (
    (SELECT count(*) FROM operator_contracts c
     WHERE c.promo=$1 AND (c.activated_at IS NOT NULL
       OR EXISTS (SELECT 1 FROM operator_receipts r WHERE r.contract_id=c.id AND r.status IN ('pending','approved'))))
    + (SELECT count(*) FROM payments p WHERE p.status='approved' AND p.discount_meta->>'promo'=$1)
  )::int used`;

export async function first1000PromoStatus(db: Pool | PoolClient) {
  const used = Number((await db.query(USED_SQL, [FIRST_1000_PROMO.code])).rows[0]?.used ?? 0);
  return { code: FIRST_1000_PROMO.code, label: FIRST_1000_PROMO.label, limit: FIRST_1000_PROMO.limit, used, left: Math.max(0, FIRST_1000_PROMO.limit - used) };
}

const PAID_BEFORE_SQL = `
  SELECT 1 FROM payments WHERE user_id=$1 AND status='approved' AND COALESCE(product_code,'russian')='russian' AND amount>1
  UNION ALL
  SELECT 1 FROM operator_contracts WHERE user_id=$1 AND COALESCE(product_code,'russian')='russian'
    AND (activated_at IS NOT NULL OR EXISTS (SELECT 1 FROM operator_receipts r WHERE r.contract_id=operator_contracts.id AND r.status='pending'))
  LIMIT 1`;

/** A client who never paid for the Russian course, while seats are left. Used to price self-serve checkouts. */
export async function first1000PromoEligible(db: Pool | PoolClient, userId: number): Promise<boolean> {
  if (!Number.isSafeInteger(userId) || userId <= 0) return false;
  if ((await first1000PromoStatus(db)).left <= 0) return false;
  return !(await db.query(PAID_BEFORE_SQL, [userId])).rowCount;
}

/** Promo total for this tariff, or throws why the client cannot get it. Call inside the sale transaction. */
export async function claimFirst1000Promo(c: PoolClient, userId: number, tariff: string, currency: string): Promise<number> {
  const price = first1000PromoPrice(tariff, currency);
  if (!price) throw new Error('Aksiya faqat 3 va 6 oylik tarifga amal qiladi.');
  // Serialises promo sales so two operators cannot both take the last seat.
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [FIRST_1000_PROMO.code]);
  const status = await first1000PromoStatus(c);
  if (status.left <= 0) throw new Error(`Aksiya tugadi: ${status.limit} ta o‘rin band. Oddiy narxda soting.`);
  const paidBefore = (await c.query(PAID_BEFORE_SQL, [userId])).rowCount;
  if (paidBefore) throw new Error('Aksiya faqat yangi o‘quvchiga: bu o‘quvchi avval to‘lov qilgan.');
  return price;
}
