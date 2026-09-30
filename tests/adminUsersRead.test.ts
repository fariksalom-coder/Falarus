import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { readAdminUsers, readAdminRegistrations, readAdminUnreadCount, readAdminUserTotals, validDay } from '../server/services/adminUsersRead.service.js';

test('admin users: bounded pages, literal search, private fields, Tashkent dates and unread count', async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY,first_name text,last_name text,email text,phone text,
      created_at timestamptz,plan_name text,plan_expires_at timestamptz,total_referral_earned numeric,
      referred_by bigint,is_golden boolean,account_type text,password text);
      CREATE TABLE user_kunlik_day_progress(user_id bigint,day_number integer,grammar_1 boolean,grammar_2 boolean,grammar_3 boolean,words_match boolean,oqish_done boolean,speaking_level integer);
      CREATE TABLE support_chats(id bigint PRIMARY KEY,user_id bigint,admin_last_read_at timestamptz);
      CREATE TABLE support_chat_messages(chat_id bigint,sender_type text,created_at timestamptz);
      INSERT INTO users(id,first_name,phone,created_at,password) VALUES
        (1,'August','+998900000001','2026-08-31T18:59:59.999Z','secret'),
        (2,'September First','+998901111111','2026-08-31T19:00:00Z','secret'),
        (3,'September Last','+998900000003','2026-09-01T18:59:59.999Z','secret'),
        (4,'September Second','+998900000004','2026-09-01T19:00:00Z','secret'),
        (5,'Hidden','+998900000005','2026-09-01T15:00:00Z','secret'),
        (6,'Teacher','+998900000006','2026-09-01T15:00:00Z','secret');
      UPDATE users SET is_golden=true WHERE id=5;
      UPDATE users SET account_type='teacher' WHERE id=6;
      INSERT INTO user_kunlik_day_progress VALUES(2,1,true,false,false,false,false,1),(2,9,true,true,false,true,false,2);
      INSERT INTO support_chats VALUES(1,2,'2026-09-01T00:00:00Z'),(2,5,null);
      INSERT INTO support_chat_messages VALUES(1,'user','2026-09-01T01:00:00Z'),(1,'user','2026-08-31T23:00:00Z'),(1,'admin','2026-09-01T02:00:00Z'),(2,'user','2026-09-01T01:00:00Z');`);
    await db.exec(await readFile(new URL('../db/migrations/197_admin_users_read_indexes.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../db/migrations/197_admin_users_read_indexes.sql', import.meta.url), 'utf8'));
    const adapter = { query: (sql: string, args: any[]) => db.query(sql, args) } as any;
    const first = await readAdminUsers({ date: '2026-09-01', pageSize: 1 }, adapter);
    assert.equal(first.total, 2); assert.equal(first.items.length, 1); assert.equal(first.items[0].id, 3);
    const second = await readAdminUsers({ date: '2026-09-01', pageSize: 1, page: 2 }, adapter);
    assert.equal(second.items[0].id, 2); assert.equal(second.items[0].reached_day, 9);
    assert.equal(second.items[0].day_progress.grammar_done, 2);
    assert.equal(JSON.stringify(second).includes('secret'), false);
    assert.equal((await readAdminUsers({ q: '+998 90 111' }, adapter)).total, 1);
    assert.equal((await readAdminUsers({ q: 'September First' }, adapter)).items[0].id, 2);
    assert.equal((await readAdminUsers({ q: '%' }, adapter)).total, 0);
    assert.equal((await readAdminUsers({ pageSize: 999999 }, adapter)).pageSize, 100);
    assert.equal((await readAdminUsers({ page: 100 }, adapter)).items.length, 0);
    assert.equal((await readAdminUsers({}, adapter)).total, 4);
    const report = await readAdminRegistrations('2026-09', adapter);
    assert.equal(report.days.find(r => r.day === '2026-09-01')?.count, 2);
    assert.equal(report.days.find(r => r.day === '2026-09-02')?.count, 1);
    assert.equal(report.total, 3);
    assert.equal((await readAdminUnreadCount(adapter)).count, 1);
    assert.equal((await readAdminUserTotals(adapter)).total, 4);
    for (const date of ['2026-02-30', '2026-13-01', '2026-09-01 OR 1=1']) {
      assert.equal(validDay(date), false);
      await assert.rejects(readAdminUsers({ date }, adapter), { status: 400 });
    }
    await assert.rejects(readAdminRegistrations('2026-99', adapter), { status: 400 });
  } finally { await db.close(); }
});
