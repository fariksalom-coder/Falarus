import test from 'node:test';
import assert from 'node:assert/strict';
import { first1000PromoPrice, FIRST_1000_PROMO } from '../shared/russianTariffs.ts';
import { operatorTariffCatalog } from '../shared/operatorTariffs.ts';

test('promo prices: 3 months 1990 RUB / 290k UZS, 6 months 2990 RUB / 435k UZS', () => {
  assert.equal(first1000PromoPrice('three_month', 'RUB'), 1990);
  assert.equal(first1000PromoPrice('three_month', 'UZS'), 290000);
  assert.equal(first1000PromoPrice('six_month', 'RUB'), 2990);
  assert.equal(first1000PromoPrice('six_month', 'UZS'), 435000);
  assert.equal(FIRST_1000_PROMO.limit, 1000);
});

test('promo does not exist for 1 month or other currencies', () => {
  assert.equal(first1000PromoPrice('month', 'RUB'), null);
  assert.equal(first1000PromoPrice('six_month', 'USD'), null);
});

test('operator catalog: promo prices only on 3 and 6 months, regular prices untouched', () => {
  const catalog = operatorTariffCatalog();
  const byCode = Object.fromEntries(catalog.map((t) => [t.code, t]));
  assert.deepEqual(byCode.month.promoPrices, []);
  assert.equal(byCode.six_month.prices.find((p) => p.currency === 'RUB')?.amount, 6000);
  assert.equal(byCode.six_month.promoPrices.find((p) => p.currency === 'RUB')?.amount, 2990);
  assert.equal(byCode.three_month.promoPrices.find((p) => p.currency === 'UZS')?.display, '290 000 so‘m');
});

test('promo seat: only new students, limit counts pending + approved, rejected frees the seat', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { readFile } = await import('node:fs/promises');
  const { claimFirst1000Promo, first1000PromoStatus } = await import('../server/operator/promo.ts');
  const db = await PGlite.create();
  const c: any = { query: async (sql: string, args: unknown[] = []) => { const r = await db.query(sql, args); return { ...r, rowCount: r.rows.length || r.affectedRows || 0 }; } };
  await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY);CREATE TABLE admins(id bigint PRIMARY KEY);
    CREATE TABLE payments(id bigint PRIMARY KEY,user_id bigint,amount numeric,status text,product_code text,discount_meta jsonb);
    INSERT INTO users VALUES(1),(2),(3),(4);INSERT INTO payments VALUES(1,2,400000,'approved','russian'),(2,3,1,'approved','russian');`);
  await db.exec(await readFile(new URL('../server/operator/schema.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../db/migrations/209_referral_program.sql', import.meta.url), 'utf8').then((sql) => sql.slice(sql.indexOf('ALTER TABLE operator_contracts')).replace('COMMIT;', '')));
  await db.exec(await readFile(new URL('../db/migrations/228_first1000_promo.sql', import.meta.url), 'utf8'));
  await db.exec(`INSERT INTO operator_accounts(login,name,password_hash) VALUES('op','Op','x');`);

  assert.equal(await claimFirst1000Promo(c, 1, 'six_month', 'RUB'), 2990);
  await assert.rejects(claimFirst1000Promo(c, 1, 'month', 'RUB'), /3 va 6 oylik/);
  await assert.rejects(claimFirst1000Promo(c, 2, 'three_month', 'UZS'), /yangi o‘quvchi/);
  // A 1-unit test payment does not make a client "old".
  assert.equal(await claimFirst1000Promo(c, 3, 'three_month', 'UZS'), 290000);

  await db.exec(`INSERT INTO operator_contracts(id,user_id,operator_id,tariff,currency,total,source,promo) VALUES
    (1,1,1,'six_month','RUB',2990,'x','first1000'),(2,4,1,'three_month','RUB',1990,'x','first1000');
    INSERT INTO operator_receipts(contract_id,operator_id,amount,file_id,file_unique_id,mime,status) VALUES
    (1,1,2990,'f1','u1','image/jpeg','pending'),(2,1,1990,'f2','u2','image/jpeg','rejected');
    SELECT setval('operator_contracts_id_seq',2);`);
  assert.equal((await first1000PromoStatus(c)).used, 1, 'pending counts, rejected does not');
  await assert.rejects(claimFirst1000Promo(c, 1, 'six_month', 'RUB'), /yangi o‘quvchi/, 'one promo per client');

  await db.exec(`INSERT INTO operator_contracts(user_id,operator_id,tariff,currency,total,source,promo,activated_at)
    SELECT 4,1,'three_month','RUB',1990,'x','first1000',now() FROM generate_series(1,998);`);
  await db.exec(`INSERT INTO payments VALUES(10,4,290000,'approved','russian','{"promo":"first1000"}'),(11,4,290000,'pending','russian','{"promo":"first1000"}');`);
  assert.equal((await first1000PromoStatus(c)).used, 1000, 'approved Rahmat/admin promo payment counts, pending checkout does not');
  await db.exec(`DELETE FROM payments WHERE id=10`);
  await db.exec(`INSERT INTO operator_contracts(user_id,operator_id,tariff,currency,total,source,promo,activated_at) VALUES(4,1,'three_month','RUB',1990,'x','first1000',now())`);
  const full = await first1000PromoStatus(c);
  assert.equal(full.left, 0);
  await assert.rejects(claimFirst1000Promo(c, 3, 'three_month', 'RUB'), /Aksiya tugadi/);
});

test('site plans: promo price shown, regular price crossed out, month untouched; ended promo = regular', async () => {
  const { applyFirst1000Promo } = await import('../src/hooks/usePricedPlans.ts');
  const { buildAppConfig, normalizeFirst1000Promo } = await import('../shared/appConfig.ts');
  const config = buildAppConfig({});
  const plans = applyFirst1000Promo(config.plans, config.promo);
  const six = plans.find((p) => p.code === 'six_month')!;
  assert.deepEqual([six.priceRub, six.priceUzs, six.wasRub, six.discountPercent], [2990, 435000, 6000, 50]);
  assert.equal(plans.find((p) => p.code === 'month')!.priceRub, 3000);
  assert.equal(buildAppConfig({ promo: null }).promo, null, 'server sends null when the 1000 seats are gone');
  assert.deepEqual(applyFirst1000Promo(config.plans, null), config.plans);
  assert.equal(normalizeFirst1000Promo({ left: 12, limit: 1000 })?.left, 12);
});
