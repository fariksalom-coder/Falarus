import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import express from 'express';
import bcrypt from 'bcryptjs';
import { DEFAULT_SALES_HEAD_SETTINGS, parseSalesHeadSettings, salesHeadSalary } from '../shared/salesHead';

const settings = (patch: Partial<typeof DEFAULT_SALES_HEAD_SETTINGS> = {}) => ({
  ...DEFAULT_SALES_HEAD_SETTINGS,
  tiers: [{ sales: 5, amount: 100_000 }, { sales: 15, amount: 300_000 }, { sales: 20, amount: 500_000 }, { sales: 30, amount: 1_000_000 }],
  ...patch,
});

test('sales head salary: fixed + per operator sale + highest monthly tier', () => {
  const s = salesHeadSalary(settings(), { '2026-10-01': 10, '2026-10-02': 6 });
  assert.equal(s.countedSales, 16);
  assert.equal(s.salesAmount, 320_000);
  assert.equal(s.bonusAmount, 300_000, 'tiers do not stack');
  assert.equal(s.totalAmount, 2_000_000 + 320_000 + 300_000);
  assert.deepEqual(s.nextTier, { sales: 20, amount: 500_000 });
  assert.equal(s.remainingToNext, 4);
  assert.equal(salesHeadSalary(settings(), {}).totalAmount, 2_000_000, 'fixed salary is paid with zero sales');
});

test('sales head salary: daily bonus period sums each day separately', () => {
  const s = salesHeadSalary(settings({ bonusPeriod: 'day' }), { a: 5, b: 4, c: 15 });
  assert.equal(s.bonusAmount, 100_000 + 300_000);
  assert.equal(s.nextTier, null);
});

test('sales head settings validation sorts tiers and rejects bad input', () => {
  const parsed = parseSalesHeadSettings({ fixedSalary: '2000000', perSale: 20000, bonusPeriod: 'x', tiers: [{ sales: 15, amount: 2 }, { sales: 5, amount: 1 }] });
  assert.deepEqual(parsed.tiers.map((t) => t.sales), [5, 15]);
  assert.equal(parsed.bonusPeriod, 'month');
  assert.equal(parsed.includeRahmatClaims, false);
  assert.throws(() => parseSalesHeadSettings({ fixedSalary: -1, perSale: 0, tiers: [] }), /oylik/);
  assert.throws(() => parseSalesHeadSettings({ fixedSalary: 1, perSale: 1, tiers: [{ sales: 5, amount: 1 }, { sales: 5, amount: 2 }] }), /ikki/);
});

test('sales head panel: login, admin rules, autopay excluded from per-sale pay', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
  process.env.JWT_SECRET ||= 'test-secret-that-is-definitely-longer-than-32-chars';
  const db = await PGlite.create();
  const { pool } = await import('../server/lib/db.js');
  assert.ok(pool);
  const originalQuery = pool.query, originalConnect = pool.connect;
  const adapter = async (sql: string, args: unknown[] = []) => {
    const r = await db.query(sql, args as any[]);
    return { ...r, rowCount: r.rows.length || r.affectedRows || 0 };
  };
  (pool as any).query = adapter;
  (pool as any).connect = async () => ({ query: adapter, release() {} });
  const app = express();
  app.use(express.json());
  let server: ReturnType<typeof app.listen> | undefined;
  try {
    await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY,first_name text,last_name text,phone text,email text,plan_name text,plan_expires_at timestamptz,created_at timestamptz DEFAULT now());
      CREATE TABLE admins(id bigint PRIMARY KEY);INSERT INTO admins VALUES(1);
      CREATE TABLE payments(id bigint PRIMARY KEY,user_id bigint,amount numeric,currency text,tariff_type text,payment_channel text,status text,product_code text,payment_time timestamptz,created_at timestamptz DEFAULT now());
      INSERT INTO users(id) SELECT generate_series(1,10);`);
    await db.exec(await readFile(new URL('../server/operator/schema.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../db/migrations/204_operator_rahmat_attribution.sql', import.meta.url), 'utf8'));
    const migration = await readFile(new URL('../db/migrations/207_sales_head.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(`INSERT INTO operator_accounts(login,name,password_hash) VALUES('one','Ali','h'),('two','Vali','h');`);
    // Ali: 3 own sales on Oct 1-2 (one approved later on Oct 5) + one claimed Rahmat payment. Vali: 1 sale + 1 pending.
    const sale = async (user: number, operator: number, submitted: string, status = 'approved', currency = 'UZS', total = 530000) => {
      const c = (await db.query<any>(`INSERT INTO operator_contracts(user_id,operator_id,tariff,currency,total,source,activated_at) VALUES($1,$2,'three_month',$3,$4,'Telegram',$5) RETURNING id`,
        [user, operator, currency, total, status === 'approved' ? '2026-10-05T08:00:00Z' : null])).rows[0].id;
      await db.query(`INSERT INTO operator_receipts(contract_id,operator_id,amount,file_id,file_unique_id,mime,status,created_at,decided_at) VALUES($1,$2,$3,'f',$4,'image/png',$5,$6,$7)`,
        [c, operator, total, `u${user}`, status, submitted, status === 'approved' ? '2026-10-05T08:00:00Z' : null]);
    };
    await sale(1, 1, '2026-10-01T06:00:00Z');
    await sale(2, 1, '2026-10-01T07:00:00Z');
    await sale(3, 1, '2026-10-02T07:00:00Z', 'approved', 'RUB', 4000);
    await sale(4, 2, '2026-10-02T09:00:00Z');
    await sale(5, 2, '2026-10-03T09:00:00Z', 'pending');
    await sale(6, 2, '2026-09-05T09:00:00Z');
    await sale(8, 2, '2026-09-29T09:00:00Z');
    await db.exec(`INSERT INTO payments VALUES(1,7,400000,'UZS','month','rahmat','approved','russian','2026-10-02T10:00:00Z');
      INSERT INTO operator_rahmat_claims(payment_id,operator_id,file_id,file_unique_id,mime,status) VALUES(1,1,'f','claim','image/png','approved');`);
    await db.query(`INSERT INTO sales_head_accounts(login,name,password_hash) VALUES('rop','Rahbar',$1)`, [await bcrypt.hash('secret-pass-123', 4)]);

    const { createSalesHeadRoutes, salesHeadAdminRoutes } = await import('../server/salesHead/routes.js');
    app.use('/head', createSalesHeadRoutes());
    app.use('/admin', (req: any, _res, next) => { req.adminId = 1; next(); }, salesHeadAdminRoutes());
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    const send = (path: string, method: string, body: unknown, token?: string) => fetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
    });

    assert.equal((await fetch(base + '/head/dashboard')).status, 401);
    assert.equal((await send('/head/login', 'POST', { login: 'rop', password: 'wrong-pass-123' })).status, 401);
    assert.equal((await send('/head/login', 'POST', { login: 'nobody', password: 'wrong-pass-123' })).status, 401);
    const { token, name } = await (await send('/head/login', 'POST', { login: ' ROP ', password: 'secret-pass-123' })).json();
    assert.equal(name, 'Rahbar');

    const put = await send('/admin/settings', 'PUT', { fixedSalary: 2000000, perSale: 20000, includeRahmatClaims: false, bonusPeriod: 'month', tiers: [{ sales: 3, amount: 150000 }, { sales: 5, amount: 400000 }] });
    assert.equal(put.status, 200);
    assert.equal((await send('/admin/settings', 'PUT', { fixedSalary: 'x', perSale: 1, tiers: [] })).status, 400);

    const dash = await (await fetch(base + '/head/dashboard?month=2026-10', { headers: { Authorization: `Bearer ${token}` } })).json();
    assert.equal(dash.salary.countedSales, 4, 'own operator sales only; autopay excluded; credited on submission day');
    assert.equal(dash.salary.salesAmount, 80000);
    assert.equal(dash.salary.bonusAmount, 150000);
    assert.equal(dash.salary.totalAmount, 2000000 + 80000 + 150000);
    assert.equal(dash.totals.sales, 4);
    assert.equal(dash.totals.rahmatSales, 1);
    assert.equal(dash.totals.pendingSales, 1);
    assert.equal(dash.totals.previousMonthSales, dash.daysElapsed < dash.daysInMonth ? [5, 29].filter((d) => d <= dash.daysElapsed).length : 2, 'running month compares with the same days of the previous month');
    assert.deepEqual(dash.totals.sold, { RUB: 4000, UZS: 530000 * 3 + 400000, USD: 0 });
    assert.equal(dash.operators[0].name, 'Ali');
    assert.equal(dash.operators[0].sales, 3);
    assert.equal(dash.operators[0].rahmatSales, 1);
    assert.equal(dash.operators[0].bestDay.day, '2026-10-01');
    assert.equal(dash.days.find((d: any) => d.day === '2026-10-02').total, 3);
    assert.equal(dash.days.length, dash.daysElapsed, 'one point per elapsed day');
    assert.equal(dash.daysInMonth, 31);
    assert.equal((await fetch(base + '/head/dashboard?month=2026-13', { headers: { Authorization: `Bearer ${token}` } })).status, 400);

    await send('/admin/settings', 'PUT', { ...dash.settings, includeRahmatClaims: true, tiers: [{ sales: 3, amount: 150000 }, { sales: 5, amount: 400000 }] });
    const withRahmat = await (await fetch(base + '/admin/dashboard?month=2026-10')).json();
    assert.equal(withRahmat.salary.countedSales, 5);
    assert.equal(withRahmat.salary.bonusAmount, 400000);

    const created = await send('/admin/accounts', 'POST', { login: 'rop2', name: 'Ikkinchi', password: 'short' });
    assert.equal(created.status, 400);
    const head = (await (await fetch(base + '/admin/accounts')).json()).find((a: any) => a.login === 'rop');
    await send(`/admin/accounts/${head.id}`, 'POST', { action: 'disable' });
    assert.equal((await fetch(base + '/head/me', { headers: { Authorization: `Bearer ${token}` } })).status, 401, 'disabled account loses access at once');
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((e) => (e ? reject(e) : resolve())));
    (pool as any).query = originalQuery;
    (pool as any).connect = originalConnect;
    await db.close();
  }
});
