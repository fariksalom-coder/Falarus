import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import express from 'express';

test('operator gives a free week once, never over an active subscription or a frozen account', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
  process.env.OPERATOR_BOT_ENABLED = 'true';
  process.env.OPERATOR_BOT_TOKEN = 'synthetic-bot-token';
  const db = await PGlite.create();
  const { pool } = await import('../server/lib/db.js');
  assert.ok(pool);
  const adapter = async (sql: string, args: any[] = []) => { const r = await db.query(sql, args); return { ...r, rowCount: r.rows.length || r.affectedRows || 0 }; };
  (pool as any).query = adapter;
  (pool as any).connect = async () => ({ query: adapter, release() {} });
  const app = express();
  app.use(express.json());
  let server: ReturnType<typeof app.listen> | undefined;
  try {
    await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY,first_name text,last_name text,phone text,email text,plan_name text,plan_expires_at timestamptz,access_frozen_at timestamptz,created_at timestamptz DEFAULT now());
      CREATE TABLE admins(id bigint PRIMARY KEY);
      CREATE TABLE subscriptions(id bigserial,user_id bigint,plan_type text,started_at timestamptz,status text,expires_at timestamptz);
      CREATE TABLE payments(id bigint PRIMARY KEY,user_id bigint,amount numeric,currency text,tariff_type text,payment_channel text,status text,product_code text,payment_time timestamptz,created_at timestamptz DEFAULT now());
      INSERT INTO users(id,first_name,plan_name,plan_expires_at,access_frozen_at) VALUES
        (1,'Free',NULL,NULL,NULL),
        (2,'Paid','3 OY',now()+interval '30 days',NULL),
        (3,'Expired','1 OY',now()-interval '3 days',NULL),
        (4,'Frozen',NULL,NULL,now()),
        (5,'Sub',NULL,NULL,NULL);
      INSERT INTO subscriptions(user_id,plan_type,started_at,status,expires_at) VALUES(5,'monthly',now(),'active',now()+interval '10 days');`);
    await db.exec(await readFile(new URL('../server/operator/schema.sql', import.meta.url), 'utf8'));
    await db.exec(`INSERT INTO operator_accounts(login,name,password_hash,telegram_id) VALUES('one','One','hash',123);`);
    const { operatorMiniAppRoutes } = await import('../server/operator/miniApp.js');
    app.use('/mini', operatorMiniAppRoutes());
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 123 }) });
    const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    params.set('hash', createHmac('sha256', createHmac('sha256', 'WebAppData').update(process.env.OPERATOR_BOT_TOKEN!).digest()).update(check).digest('hex'));
    const trial = (id: number, auth = true) => fetch(`${base}/mini/customers/${id}/week-trial`, { method: 'POST', headers: auth ? { Authorization: `tma ${params}` } : {} });

    assert.equal((await trial(1, false)).status, 401);

    const ok = await trial(1);
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.plan_name, '1 HAFTA');
    const days = (+new Date(body.plan_expires_at) - Date.now()) / 86400000;
    assert.ok(days > 6.9 && days <= 7, `7 days, got ${days}`);
    const u = (await db.query<any>('SELECT plan_name FROM users WHERE id=1')).rows[0];
    assert.equal(u.plan_name, '1 HAFTA');
    assert.equal((await db.query<any>(`SELECT count(*)::int n FROM subscriptions WHERE user_id=1 AND status='active'`)).rows[0].n, 1);
    assert.equal((await db.query<any>(`SELECT count(*)::int n FROM operator_audit WHERE user_id=1 AND action='week_trial_granted' AND operator_id=1`)).rows[0].n, 1);

    // Once per client.
    const again = await trial(1);
    assert.equal(again.status, 400);
    assert.match((await again.json()).error, /oldin berilgan/);

    // Never over paid access: neither the plan date nor an active subscription row is shortened.
    for (const id of [2, 5]) {
      const r = await trial(id);
      assert.equal(r.status, 400);
      assert.match((await r.json()).error, /faol obuna/);
    }
    assert.equal((await db.query<any>('SELECT plan_name FROM users WHERE id=2')).rows[0].plan_name, '3 OY');

    // A frozen account stays frozen.
    assert.equal((await trial(4)).status, 400);

    // A client whose paid month ended can get the week.
    assert.equal((await trial(3)).status, 200);
  } finally {
    server?.close();
  }
});
