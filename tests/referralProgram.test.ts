import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

/*
 * Referral program on an in-process PostgreSQL (PGlite) with the real
 * migrations 009 and 209 and the real operator schema. Production is never
 * touched. PGlite has a single session, so the adapter serializes
 * transactions: concurrency tests prove idempotency of repeated and
 * overlapping calls, not row-lock behaviour under true parallelism.
 */
const LAUNCH = '2026-10-01T00:00:00Z';
const today = () => {
  const d = new Date();
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
};

let db: PGlite;
let svc: typeof import('../server/services/referralProgram.service.js');
let fx: typeof import('../server/services/referralFx.service.js');

async function setup() {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
  db = await PGlite.create();
  await db.exec(`
    CREATE TABLE users (id bigint PRIMARY KEY, first_name text, last_name text, phone text, email text,
      plan_name text, plan_expires_at timestamptz, is_golden boolean DEFAULT false, created_at timestamptz DEFAULT now());
    CREATE TABLE admins (id bigint PRIMARY KEY);
    CREATE TABLE subscriptions (id bigserial PRIMARY KEY, user_id bigint, plan_type text, expires_at timestamptz, status text);
    CREATE TABLE tariff_prices (currency text, tariff_type text, price numeric);
    CREATE TABLE payments (id bigserial PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), amount numeric(14,2) NOT NULL,
      original_amount numeric, discount_amount numeric DEFAULT 0, base_amount numeric, referral_discount_used boolean DEFAULT false,
      status text, tariff_type text, currency text, payment_proof_url text, payment_time timestamptz, admin_id bigint,
      approved_at timestamptz, payment_channel text, click_merchant_payment_id text, refunded_at timestamptz,
      discount_meta jsonb, product_code text NOT NULL DEFAULT 'russian', created_at timestamptz DEFAULT now(),
      CONSTRAINT payments_status_check CHECK (status IN ('pending','approved','rejected','refunded')),
      CONSTRAINT payments_payment_channel_check CHECK (payment_channel IS NULL OR payment_channel IN
        ('manual','click_button','click_auto_token','click_auto_cron','rahmat','google_play','app_store')),
      CONSTRAINT payments_product_code_check CHECK (product_code IN ('russian','patent','vnzh','teacher_listing','teacher_trial')));
    INSERT INTO tariff_prices VALUES ('USD','month',35);
    INSERT INTO admins VALUES (1);`);
  await db.exec(await readFile(new URL('../db/migrations/009_referral_system.sql', import.meta.url), 'utf8'));
  await db.exec('ALTER TABLE referral_withdrawals ADD COLUMN card_number text, ADD COLUMN phone text, ADD COLUMN full_name text, ADD COLUMN admin_receipt text');
  await db.exec(await readFile(new URL('../server/operator/schema.sql', import.meta.url), 'utf8'));
  const m209 = await readFile(new URL('../db/migrations/209_referral_program.sql', import.meta.url), 'utf8');
  await db.exec(m209);
  await db.exec(m209); // re-runnable

  const { pool } = await import('../server/lib/db.js');
  assert.ok(pool);
  let lock: Promise<void> = Promise.resolve();
  const adapter = async (sql: string, args: unknown[] = []) => {
    const r = await db.query(sql, args as never[]);
    return { ...r, rowCount: r.rows.length || r.affectedRows || 0 };
  };
  (pool as any).query = adapter;
  (pool as any).connect = async () => {
    let release!: () => void;
    const prev = lock;
    lock = new Promise<void>((r) => { release = r; });
    await prev;
    return { query: adapter, release };
  };
  svc = await import('../server/services/referralProgram.service.js');
  fx = await import('../server/services/referralFx.service.js');
  fx.setFxFetcherForTests(async (url) => [url.includes('/USD/')
    ? { Ccy: 'USD', Rate: '12000', Nominal: '1', Date: today() }
    : { Ccy: 'RUB', Rate: '150', Nominal: '1', Date: today() }]);
}

let nextUser = 100;
async function user(referrer?: number): Promise<number> {
  const id = nextUser++;
  await db.query('INSERT INTO users (id, first_name, referred_by) VALUES ($1, $2, $3)', [id, `U${id}`, referrer ?? null]);
  if (referrer) await db.query(`INSERT INTO referrals (referrer_id, referred_user_id, status) VALUES ($1, $2, 'registered')`, [referrer, id]);
  return id;
}
async function pay(userId: number, amount: number, currency = 'UZS', product = 'russian', at = '2026-10-10T10:00:00Z', channel = 'rahmat') {
  return Number((await db.query<{ id: number }>(
    `INSERT INTO payments (user_id, amount, currency, product_code, status, approved_at, payment_channel, tariff_type)
     VALUES ($1,$2,$3,$4,'approved',$5,$6,'month') RETURNING id`, [userId, amount, currency, product, at, channel])).rows[0].id);
}
async function balance(userId: number, currency = 'UZS') {
  const r = (await db.query<any>('SELECT * FROM referral_balances WHERE user_id = $1 AND currency = $2', [userId, currency])).rows[0];
  return r ? { available: Number(r.available), held: Number(r.held), reserved: Number(r.reserved), debt: Number(r.debt),
    earned: Number(r.earned_total), paid: Number(r.paid_out_total), spent: Number(r.spent_total) } : null;
}
async function enable(on = true) {
  await db.query('UPDATE referral_program_settings SET enabled = $1, launch_at = $2', [on, on ? LAUNCH : null]);
}
async function contract(userId: number, currency: string, total: number, product = 'russian') {
  const op = (await db.query<{ id: number }>(`INSERT INTO operator_accounts (login, name, password_hash) VALUES ($1, 'Op', 'x') RETURNING id`, [`op${nextUser++}`])).rows[0].id;
  const c = (await db.query<{ id: number }>(
    `INSERT INTO operator_contracts (user_id, operator_id, tariff, currency, total, source, product_code) VALUES ($1,$2,'three_month',$3,$4,'test',$5) RETURNING id`,
    [userId, op, currency, total, product])).rows[0].id;
  return { op, c };
}
async function receipt(k: { op: number; c: number }, amount: number, at = '2026-10-12T10:00:00Z') {
  return Number((await db.query<{ id: number }>(
    `INSERT INTO operator_receipts (contract_id, operator_id, amount, file_id, file_unique_id, mime, status, decided_at)
     VALUES ($1,$2,$3,'f',$4,'image/jpeg','approved',$5) RETURNING id`, [k.c, k.op, amount, `u${Math.random()}`, at])).rows[0].id);
}

test('referral program', async (t) => {
  await setup();

  await t.test('existing links are kept by the migration', async () => {
    const a = await user(), b = await user(a);
    assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM referrals WHERE referred_user_id = $1', [b])).rows[0].n, 1);
    const other = await user();
    await assert.rejects(db.query(`INSERT INTO referrals (referrer_id, referred_user_id) VALUES ($1, $2)`, [other, b]), /referrals_referred_user_uidx/);
  });

  await t.test('nothing is written while the program is off', async () => {
    const a = await user(), b = await user(a);
    const p = await pay(b, 500000);
    assert.deepEqual(await svc.processReferralSource('payment', p), { status: 'disabled' });
    assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM referral_source_events')).rows[0].n, 0);
    assert.equal(await balance(a), null);
  });

  await enable();

  await t.test('first purchase gives exactly 10% in the payment currency, once', async () => {
    const a = await user(), b = await user(a);
    const p = await pay(b, 500000);
    const r = await svc.processReferralSource('payment', p);
    assert.equal(r.status, 'applied'); assert.equal(r.reward, 50000);
    assert.equal((await svc.processReferralSource('payment', p)).status, 'already');
    await Promise.all([svc.processReferralSource('payment', p), svc.processReferralSource('payment', p)]);
    assert.deepEqual(await balance(a), { available: 50000, held: 0, reserved: 0, debt: 0, earned: 50000, paid: 0, spent: 0 });
  });

  await t.test('no payment, no reward; no referral, no reward; self referral rejected', async () => {
    const a = await user();
    const solo = await user();
    assert.equal((await svc.processReferralSource('payment', await pay(solo, 1000))).reason, 'no_referral');
    const self = await user();
    await db.query(`INSERT INTO referrals (referrer_id, referred_user_id) VALUES ($1, $1)`, [self]);
    assert.equal((await svc.processReferralSource('payment', await pay(self, 1000))).reason, 'self_referral');
    assert.equal(await balance(a), null);
    const pending = await user(a);
    const id = Number((await db.query<{ id: number }>(`INSERT INTO payments (user_id, amount, currency, status) VALUES ($1, 1000, 'UZS', 'pending') RETURNING id`, [pending])).rows[0].id);
    assert.equal((await svc.processReferralSource('payment', id)).reason, 'not_confirmed');
  });

  await t.test('second own purchase gives nothing; concurrent first purchases give one reward', async () => {
    const a = await user(), b = await user(a);
    const p1 = await pay(b, 100000, 'UZS', 'russian', '2026-10-05T10:00:00Z');
    const p2 = await pay(b, 300000, 'UZS', 'patent', '2026-10-05T10:00:00Z');
    const [r1, r2] = await Promise.all([svc.processReferralSource('payment', p2), svc.processReferralSource('payment', p1)]);
    assert.equal(r2.status, 'applied'); assert.equal(r2.reward, 10000); // same time → lower id wins
    assert.equal(r1.reason, 'not_first_purchase');
    const p3 = await pay(b, 900000, 'UZS', 'vnzh', '2026-11-01T10:00:00Z');
    assert.equal((await svc.processReferralSource('payment', p3)).reason, 'not_first_purchase');
    assert.equal((await balance(a))!.available, 10000);
  });

  await t.test('purchase before launch makes later purchases ineligible', async () => {
    const a = await user(), b = await user(a);
    await pay(b, 100000, 'UZS', 'russian', '2026-09-01T10:00:00Z');
    const later = await pay(b, 100000, 'UZS', 'russian', '2026-10-20T10:00:00Z');
    assert.equal((await svc.processReferralSource('payment', later)).reason, 'purchase_before_launch');
    assert.equal(await balance(a), null);
  });

  await t.test('three currencies stay separate and round correctly', async () => {
    const a = await user();
    for (const [amount, cur] of [[4990, 'RUB'], [43.55, 'USD'], [435005, 'UZS']] as const) {
      const b = await user(a);
      assert.equal((await svc.processReferralSource('payment', await pay(b, amount, cur))).status, 'applied');
    }
    assert.equal((await balance(a, 'RUB'))!.available, 499);
    assert.equal((await balance(a, 'USD'))!.available, 4.36);
    assert.equal((await balance(a, 'UZS'))!.available, 43501);
  });

  await t.test('teacher products, store rows without price and bonus purchases are excluded', async () => {
    const a = await user();
    const b1 = await user(a), b2 = await user(a);
    assert.equal((await svc.processReferralSource('payment', await pay(b1, 300000, 'UZS', 'teacher_listing'))).reason, 'product_not_in_program');
    assert.equal((await svc.processReferralSource('payment', await pay(b2, 0, 'USD', 'russian', '2026-10-10T10:00:00Z', 'app_store'))).reason, 'no_money_amount');
    assert.equal(await balance(a, 'USD'), null);
  });

  await t.test('installment: 10% of every received payment of the first contract only', async () => {
    const a = await user(), b = await user(a);
    const k = await contract(b, 'RUB', 9000);
    const r1 = await receipt(k, 3000, '2026-10-11T10:00:00Z');
    const r2 = await receipt(k, 6000, '2026-11-11T10:00:00Z');
    assert.equal((await svc.processReferralSource('operator_receipt', r1)).reward, 300);
    assert.equal((await svc.processReferralSource('operator_receipt', r2)).reward, 600);
    assert.equal((await svc.processReferralSource('operator_receipt', r2)).status, 'already');
    const k2 = await contract(b, 'RUB', 5000);
    assert.equal((await svc.processReferralSource('operator_receipt', await receipt(k2, 5000, '2026-12-01T10:00:00Z'))).reason, 'not_first_purchase');
    assert.equal((await svc.processReferralSource('payment', await pay(b, 5000, 'RUB', 'russian', '2026-12-02T10:00:00Z'))).reason, 'not_first_purchase');
    assert.equal((await balance(a, 'RUB'))!.available, 900);
  });

  await t.test('partial and full refunds reverse proportionally, never twice, never beyond the reward', async () => {
    const a = await user(), b = await user(a);
    const p = await pay(b, 200000);
    await svc.processReferralSource('payment', p);
    const r1 = await svc.registerRefund({ sourceType: 'payment', sourceId: p, refundAmount: 50000, reference: 'RF-1', origin: 'admin', adminId: 1 });
    assert.equal(r1.reversed, 5000);
    assert.equal((await svc.registerRefund({ sourceType: 'payment', sourceId: p, refundAmount: 50000, reference: 'RF-1', origin: 'admin', adminId: 1 })).duplicate, true);
    const r2 = await svc.registerRefund({ sourceType: 'payment', sourceId: p, refundAmount: 150000, reference: 'RF-2', origin: 'admin', adminId: 1 });
    assert.equal(r2.reversed, 15000);
    await assert.rejects(svc.registerRefund({ sourceType: 'payment', sourceId: p, refundAmount: 1, reference: 'RF-3', origin: 'admin', adminId: 1 }), /oshib ketadi/);
    assert.deepEqual(await balance(a), { available: 0, held: 0, reserved: 0, debt: 0, earned: 20000, paid: 0, spent: 0 });
  });

  await t.test('refund after payout becomes debt; future rewards repay it; withdrawals are blocked meanwhile', async () => {
    const a = await user(), b = await user(a), c = await user(a);
    const p = await pay(b, 4000000); // reward 400 000 UZS
    await svc.processReferralSource('payment', p);
    const w = await svc.requestWithdrawal({ userId: a, currency: 'UZS', amount: 400000, cardNumber: '8600 1234 5678 9012', fullName: 'Ali Valiyev', phone: '+998', idempotencyKey: 'key-0001' });
    await svc.approveWithdrawal(w.id, 1);
    await svc.markWithdrawalPaid(w.id, 1, 'PAYOUT-1');
    await assert.rejects(svc.markWithdrawalPaid(w.id, 1, 'PAYOUT-2'), /Faqat tasdiqlangan/);
    const r = await svc.registerRefund({ sourceType: 'payment', sourceId: p, refundAmount: 4000000, reference: 'FULL', origin: 'admin', adminId: 1 });
    assert.equal(r.debt, 400000);
    assert.deepEqual(await balance(a), { available: 0, held: 0, reserved: 0, debt: 400000, earned: 400000, paid: 400000, spent: 0 });
    const q = await pay(c, 1000000); // reward 100 000 repays debt
    await svc.processReferralSource('payment', q);
    assert.deepEqual(await balance(a), { available: 0, held: 0, reserved: 0, debt: 300000, earned: 500000, paid: 400000, spent: 0 });
    await assert.rejects(svc.requestWithdrawal({ userId: a, currency: 'UZS', amount: 300000, cardNumber: '8600123456789012', fullName: 'Ali Valiyev', phone: '', idempotencyKey: 'key-0002' }), /Qarzdorlik/);
  });

  await t.test('withdrawals: minimum per currency, balance, reserve, idempotency, one release on reject', async () => {
    const a = await user(), b = await user(a);
    await svc.processReferralSource('payment', await pay(b, 50000, 'RUB')); // 5 000 RUB
    const base = { userId: a, currency: 'RUB', cardNumber: '2200 0000 0000 0001', fullName: 'Ivan Petrov', phone: '+7' };
    await assert.rejects(svc.requestWithdrawal({ ...base, amount: 1999, idempotencyKey: 'min-check' }), /Minimal summa: 2000 RUB/);
    await assert.rejects(svc.requestWithdrawal({ ...base, amount: 6000, idempotencyKey: 'too-much1' }), /yetarli emas/);
    const w = await svc.requestWithdrawal({ ...base, amount: 3000, idempotencyKey: 'ok-000001' });
    assert.equal((await svc.requestWithdrawal({ ...base, amount: 3000, idempotencyKey: 'ok-000001' })).duplicate, true);
    assert.deepEqual(await balance(a, 'RUB'), { available: 2000, held: 0, reserved: 3000, debt: 0, earned: 5000, paid: 0, spent: 0 });
    await Promise.allSettled([svc.rejectWithdrawal(w.id, 1, 'karta xato'), svc.rejectWithdrawal(w.id, 1, 'karta xato')]);
    await assert.rejects(svc.rejectWithdrawal(w.id, 1, 'yana'), /yakunlangan/);
    assert.deepEqual(await balance(a, 'RUB'), { available: 5000, held: 0, reserved: 0, debt: 0, earned: 5000, paid: 0, spent: 0 });
    // UZS minimum is 2000 × 150 = 300 000, USD is 25.00 with the test rates.
    const { minimums } = await svc.withdrawalMinimumsNow();
    assert.deepEqual(minimums, { RUB: 2000, UZS: 300000, USD: 25 });
  });

  await t.test('rate source down: withdrawal refused, no fallback', async () => {
    const a = await user(), b = await user(a);
    await svc.processReferralSource('payment', await pay(b, 5000000));
    fx.setFxFetcherForTests(async () => { throw new Error('offline'); });
    await assert.rejects(svc.requestWithdrawal({ userId: a, currency: 'UZS', amount: 400000, cardNumber: '8600123456789099', fullName: 'Test User', phone: '', idempotencyKey: 'fx-down-1' }),
      (e: any) => e.code === 'RATE_UNAVAILABLE');
    fx.setFxFetcherForTests(async () => [{ Ccy: 'RUB', Rate: '150', Nominal: '1', Date: '01.01.2020' }]);
    await assert.rejects(svc.withdrawalMinimumsNow(), (e: any) => e.code === 'RATE_UNAVAILABLE'); // stale rate refused
    fx.setFxFetcherForTests(async (url) => [url.includes('/USD/')
      ? { Ccy: 'USD', Rate: '12000', Nominal: '1', Date: today() } : { Ccy: 'RUB', Rate: '150', Nominal: '1', Date: today() }]);
    assert.equal((await balance(a))!.reserved, 0);
  });

  await t.test('course for bonuses: atomic spend, no reward on it, no double spend, cancel returns once', async () => {
    const a = await user(), b = await user(a), friend = await user(a);
    await svc.processReferralSource('payment', await pay(b, 60000, 'RUB')); // 6 000 RUB
    const buy = { userId: a, product: 'patent', tariff: null, currency: 'RUB', idempotencyKey: 'buy-000001' };
    const [x, y] = await Promise.all([svc.purchaseWithBonus(buy), svc.purchaseWithBonus(buy)]);
    assert.equal(x.paymentId, y.paymentId);
    assert.deepEqual(await balance(a, 'RUB'), { available: 5550, held: 0, reserved: 0, debt: 0, earned: 6000, paid: 0, spent: 450 });
    const row = (await db.query<any>('SELECT amount, payment_channel, status FROM payments WHERE id = $1', [x.paymentId])).rows[0];
    assert.equal(Number(row.amount), 0); assert.equal(row.payment_channel, 'referral_bonus');
    // The buyer was invited too: a bonus purchase never rewards their referrer.
    const inviter = await user();
    await db.query(`INSERT INTO referrals (referrer_id, referred_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [inviter, friend]);
    const bonusBuy = await svc.purchaseWithBonus({ ...buy, userId: a, idempotencyKey: 'buy-000002' });
    assert.equal((await svc.processReferralSource('payment', bonusBuy.paymentId)).status, 'skipped');
    await svc.cancelBonusPurchase(x.paymentId, 1, 'bekor');
    await assert.rejects(svc.cancelBonusPurchase(x.paymentId, 1, 'bekor'), /topilmadi yoki bekor/);
    assert.equal((await balance(a, 'RUB'))!.available, 5550);
    await svc.purchaseWithBonus({ ...buy, product: 'vnzh', idempotencyKey: 'buy-000003' }); // 2 900 RUB
    await assert.rejects(svc.purchaseWithBonus({ ...buy, product: 'vnzh', idempotencyKey: 'buy-000004' }), /yetarli emas/);
    assert.equal((await balance(a, 'RUB'))!.available, 2650);
  });

  await t.test('reward burst goes to review; admin releases or cancels', async () => {
    const a = await user();
    for (let i = 0; i < 6; i++) await svc.processReferralSource('payment', await pay(await user(a), 10000));
    const bal = await balance(a);
    assert.equal(bal!.available, 5000); assert.equal(bal!.held, 1000);
    const flag = (await db.query<any>(`SELECT referral_id FROM referral_review_flags WHERE kind = 'reward_burst' AND user_id = $1`, [a])).rows[0];
    await svc.decideReferralReview(Number(flag.referral_id), 'cleared', 1, 'tekshirildi');
    assert.equal((await balance(a))!.available, 6000);
    await assert.rejects(svc.decideReferralReview(Number(flag.referral_id), 'cleared', 1, 'yana'), /tekshiruvda emas/);
  });

  await t.test('shared payout card is flagged for review, not rejected', async () => {
    const [a1, a2] = [await user(), await user()];
    for (const a of [a1, a2]) await svc.processReferralSource('payment', await pay(await user(a), 50000, 'RUB'));
    await svc.requestWithdrawal({ userId: a1, currency: 'RUB', amount: 2000, cardNumber: '2200 1111 2222 3333', fullName: 'Same Card', phone: '', idempotencyKey: 'card-0001' });
    const w2 = await svc.requestWithdrawal({ userId: a2, currency: 'RUB', amount: 2000, cardNumber: '2200111122223333', fullName: 'Same Card', phone: '', idempotencyKey: 'card-0002' });
    assert.equal(w2.status, 'pending');
    assert.equal((await db.query<any>(`SELECT count(*)::int AS n FROM referral_review_flags WHERE kind = 'shared_payout_card' AND withdrawal_id = $1`, [w2.id])).rows[0].n, 1);
  });

  await t.test('failure after payment confirmation is recovered by reconciliation without a double reward', async () => {
    const a = await user(), b = await user(a);
    const p = await pay(b, 70000);
    await db.query('ALTER TABLE referral_balances RENAME TO referral_balances_off');
    await assert.rejects(svc.processReferralSource('payment', p));
    await db.query('ALTER TABLE referral_balances_off RENAME TO referral_balances');
    assert.equal((await db.query<any>(`SELECT status FROM referral_source_events WHERE source_type = 'payment' AND source_id = $1`, [p])).rows[0].status, 'failed');
    assert.equal((await db.query<any>(`SELECT status FROM payments WHERE id = $1`, [p])).rows[0].status, 'approved');
    await svc.reconcileReferralRewards();
    await svc.reconcileReferralRewards();
    assert.equal((await balance(a))!.available, 7000);
  });

  await t.test('operator receipts: patent contract never activates the Russian course; approval is rewarded once', async () => {
    const { decideReceipt } = await import('../server/operator/admin.js');
    const a = await user(), b = await user(a);
    const k = await contract(b, 'UZS', 300000, 'patent');
    const rid = Number((await db.query<any>(
      `INSERT INTO operator_receipts (contract_id, operator_id, amount, file_id, file_unique_id, mime) VALUES ($1,$2,300000,'f','uniq-patent','image/jpeg') RETURNING id`,
      [k.c, k.op])).rows[0].id);
    const decided = await decideReceipt(rid, 1, 'approved', '');
    assert.deepEqual(decided, { userId: b, receiptId: rid, approved: true });
    assert.equal((await db.query<any>('SELECT plan_expires_at FROM users WHERE id = $1', [b])).rows[0].plan_expires_at, null);
    assert.equal((await svc.processReferralSource('operator_receipt', rid)).reward, 30000);
    assert.equal((await svc.processReferralSource('operator_receipt', rid)).status, 'already');
    const c = await user();
    const kr = await contract(c, 'RUB', 3000, 'russian');
    const rr = Number((await db.query<any>(
      `INSERT INTO operator_receipts (contract_id, operator_id, amount, file_id, file_unique_id, mime) VALUES ($1,$2,3000,'f','uniq-russian','image/jpeg') RETURNING id`,
      [kr.c, kr.op])).rows[0].id);
    await decideReceipt(rr, 1, 'approved', '');
    assert.ok((await db.query<any>('SELECT plan_expires_at FROM users WHERE id = $1', [c])).rows[0].plan_expires_at);
  });

  await t.test('HTTP: the user id comes from the token, not from the request body', async () => {
    const express = (await import('express')).default;
    const { createReferralRoutes } = await import('../server/routes/referralRoutes.js');
    const { supabase } = await import('../server/lib/dbFacadeClient.js');
    const app = express();
    app.use(express.json());
    app.use('/api', createReferralRoutes(supabase as never, (req: any, _res: any, next: any) => { req.userId = Number(req.headers['x-test-user']); next(); }));
    const server = app.listen(0);
    try {
      const port = (server.address() as { port: number }).port;
      const a = await user(), b = await user(a), stranger = await user();
      await svc.processReferralSource('payment', await pay(b, 50000, 'RUB'));
      const call = (u: number, path: string, body?: unknown) => fetch(`http://127.0.0.1:${port}/api${path}`, {
        method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-test-user': String(u) }, body: body ? JSON.stringify(body) : undefined });
      const res = await call(stranger, '/referral/withdraw', { user_id: a, userId: a, currency: 'RUB', amount: 2000, card_number: '2200999988887777', full_name: 'Stranger Name', idempotency_key: 'http-0001' });
      assert.equal(res.status, 409); // the stranger has no balance; A's balance is untouched
      assert.equal((await balance(a, 'RUB'))!.available, 5000);
      const page = await (await call(stranger, '/referral?action=page')).json();
      assert.equal(page.invited.length, 0);
      assert.ok(page.balances.every((x: { available: number }) => x.available === 0));
      const own = await (await call(a, '/referral?action=page')).json();
      assert.equal(own.balances.find((x: { currency: string }) => x.currency === 'RUB').available, 5000);
      assert.equal(own.invited[0].status, 'purchased');
      assert.equal(JSON.stringify(own).includes('2200999988887777'), false);
    } finally {
      server.close();
    }
  });

  await t.test('ledger is append-only and balances always match it', async () => {
    await assert.rejects(db.query(`UPDATE referral_ledger SET amount = 1 WHERE id = (SELECT min(id) FROM referral_ledger)`), /append-only/);
    await assert.rejects(db.query(`DELETE FROM referral_ledger`), /append-only/);
    assert.deepEqual(await svc.ledgerMismatches(), []);
  });

  await t.test('payment history is never rewritten by rewards or refunds', async () => {
    const n = (await db.query<any>(`SELECT count(*)::int AS n FROM payments WHERE status = 'refunded' AND payment_channel <> 'referral_bonus'`)).rows[0].n;
    assert.equal(n, 0);
  });
});
