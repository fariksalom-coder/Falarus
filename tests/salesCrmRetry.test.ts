import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { isSalesCrmStatus, kanbanColumnIdForStatus } from '../shared/salesCrm.js';

test('no-answer retries: persistent 2/4/12/24h cycle, fifth failure, scope and atomic rollback', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
  const db = await PGlite.create();
  const { pool } = await import('../server/lib/db.js');
  assert.ok(pool);
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const query = async (sql: string, args: any[] = []) => {
    const r = await db.query(sql, args);
    return { ...r, rowCount: r.affectedRows || r.rows.length };
  };
  (pool as any).query = query;
  (pool as any).connect = async () => ({ query, release() {} });
  const migration = await readFile(new URL('../db/migrations/196_sales_crm_no_answer_retry.sql', import.meta.url), 'utf8');
  try {
    await db.exec('CREATE TABLE users(id bigint PRIMARY KEY); INSERT INTO users SELECT generate_series(1,20)');
    await db.exec(await readFile(new URL('../db/migrations/182_sales_crm.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../db/migrations/189_sales_crm_funnel.sql', import.meta.url), 'utf8'));
    await db.exec(`INSERT INTO sales_crm_agents(login,password_hash,name) VALUES ('first','hash','First'),('second','hash','Second');
      INSERT INTO sales_crm_leads(user_id,status,assigned_operator_id) VALUES (1,'NO_ANSWER',1),(2,'NEW',2),(3,'PAID',2),(4,'NEW',2);
      INSERT INTO sales_crm_tasks(lead_id,operator_id,scheduled_at) VALUES(1,1,now())`);
    await db.exec(migration);
    const lead = async (id: number) => (await db.query<any>('SELECT * FROM sales_crm_leads WHERE id=$1', [id])).rows[0];
    const openTasks = async (id: number) => (await db.query<any>("SELECT * FROM sales_crm_tasks WHERE lead_id=$1 AND status='open'", [id])).rows;
    const existing = await lead(1);
    assert.equal(existing.no_answer_attempts, 1);
    assert.ok(Math.abs(new Date(existing.no_answer_retry_at).getTime() - Date.now() - 2 * 3600_000) < 5000);
    assert.equal((await openTasks(1)).length, 0);
    await db.exec(migration);
    assert.deepEqual((await lead(1)).no_answer_retry_at, existing.no_answer_retry_at, 'rerun never postpones timers');
    assert.equal((await lead(3)).status, 'PAID');
    assert.equal(isSalesCrmStatus('LOW_QUALITY'), true);
    assert.equal(kanbanColumnIdForStatus('LOW_QUALITY'), 'low_quality');

    const { changeLeadStatus, logCall, scheduleTask } = await import('../server/services/salesCrm.service.js');
    const { returnDueNoAnswerLeads, startSalesCrmRetryWorker } = await import('../server/services/salesCrmRetry.service.js');
    assert.equal(startSalesCrmRetryWorker(), false, 'no implicit worker against a developer DB');
    const expire = async (id: number) => {
      // Only this isolated fixture travels in time; production timers cannot be edited by clients.
      await db.exec('ALTER TABLE sales_crm_leads DISABLE TRIGGER sales_crm_no_answer_transition_trg');
      await db.query("UPDATE sales_crm_leads SET no_answer_retry_at=now()-interval '1 second',next_contact_at=now()-interval '1 second' WHERE id=$1", [id]);
      await db.exec('ALTER TABLE sales_crm_leads ENABLE TRIGGER sales_crm_no_answer_transition_trg');
    };
    await assert.rejects(changeLeadStatus({ leadId: 2, status: 'NO_ANSWER', actorId: 1, scopeOperatorId: 1 }), { status: 404 });
    await assert.rejects(logCall({ leadId: 2, operatorId: 1, scopeOperatorId: 1, answered: false, result: 'no_answer' }), { status: 404 });
    assert.equal((await lead(2)).no_answer_attempts, 0);
    await assert.rejects(logCall({ leadId: 3, operatorId: 2, answered: false, result: 'no_answer' }), { status: 409 });

    const createdAt = (await lead(2)).created_at;
    for (const [index, hours] of [2, 4, 12, 24].entries()) {
      if (index % 2 === 0) {
        await changeLeadStatus({ leadId: 2, status: 'NO_ANSWER', actorId: 2, scopeOperatorId: 2,
          comment: 'Synthetic unanswered call', nextContactAt: '2030-01-01T00:00:00Z' });
      } else {
        const result = await logCall({ leadId: 2, operatorId: 2, scopeOperatorId: 2, answered: false, result: 'no_answer',
          nextContactAt: '2030-01-01T00:00:00Z' });
        assert.equal(result.status, 'NO_ANSWER');
      }
      const waiting = await lead(2);
      assert.equal(waiting.status, 'NO_ANSWER');
      assert.equal(waiting.no_answer_attempts, index + 1);
      assert.ok(Math.abs(new Date(waiting.no_answer_retry_at).getTime() - Date.now() - hours * 3600_000) < 5000);
      assert.deepEqual(waiting.next_contact_at, waiting.no_answer_retry_at);
      assert.equal(await returnDueNoAnswerLeads(), 0, 'not before the due time');
      assert.equal((await openTasks(2)).length, 0, 'waiting is not an overdue call task');
      const callsBefore = (await db.query<any>('SELECT count(*) n FROM sales_crm_calls')).rows[0].n;
      await changeLeadStatus({ leadId: 2, status: 'NO_ANSWER', actorId: 2 });
      await logCall({ leadId: 2, operatorId: 2, answered: false, result: 'no_answer' });
      assert.deepEqual((await lead(2)).no_answer_retry_at, waiting.no_answer_retry_at);
      assert.equal((await lead(2)).no_answer_attempts, index + 1, 'double submission is idempotent');
      assert.equal((await db.query<any>('SELECT count(*) n FROM sales_crm_calls')).rows[0].n, callsBefore);
      await assert.rejects(scheduleTask({ leadId: 2, operatorId: 2, actorId: 2, scheduledAt: '2030-01-01' }), { status: 400 });
      await expire(2);
      assert.equal(await returnDueNoAnswerLeads(), 1);
      assert.equal(await returnDueNoAnswerLeads(), 0, 'second worker run does not duplicate');
      const returned = await lead(2);
      assert.equal(returned.status, 'NEW');
      assert.equal(returned.no_answer_retry_at, null);
      assert.deepEqual(returned.created_at, createdAt, 'not counted as a new acquisition');
      assert.equal(returned.assigned_operator_id, 2);
      assert.equal((await openTasks(2)).length, 1);
      assert.equal((await openTasks(2))[0].operator_id, 2);
    }
    const fifth = await logCall({ leadId: 2, operatorId: 2, answered: false, result: 'no_answer' });
    assert.equal(fifth.status, 'LOW_QUALITY');
    assert.equal(fifth.nextContactAt, null);
    assert.equal((await lead(2)).no_answer_attempts, 5);
    assert.equal((await openTasks(2)).length, 0);
    assert.equal(await returnDueNoAnswerLeads(), 0);
    await changeLeadStatus({ leadId: 2, status: 'NO_ANSWER', actorId: 2 });
    assert.equal((await lead(2)).status, 'LOW_QUALITY');
    assert.equal((await lead(2)).no_answer_attempts, 5);
    const history = (await db.query<any>("SELECT payload FROM sales_crm_events WHERE lead_id=2 AND event_type='call_logged' ORDER BY id DESC LIMIT 1")).rows[0];
    assert.equal(history.payload.status, 'LOW_QUALITY');
    assert.equal((await db.query<any>("SELECT count(*) n FROM sales_crm_events WHERE lead_id=2 AND event_type='no_answer_returned'")).rows[0].n, 4);

    // A successful callback cancels the automatic return, but keeps the agreed appointment.
    await changeLeadStatus({ leadId: 4, status: 'NO_ANSWER', actorId: 2 });
    const appointment = '2030-01-01T10:00:00.000Z';
    await changeLeadStatus({ leadId: 4, status: 'CALLBACK', actorId: 2, comment: 'Call later', nextContactAt: appointment });
    assert.equal((await lead(4)).no_answer_retry_at, null);
    assert.equal(new Date((await lead(4)).next_contact_at).toISOString(), appointment);
    assert.equal((await openTasks(4)).length, 1);
    assert.equal(await returnDueNoAnswerLeads(), 0);

    // Failed call persistence rolls back the status, timer, task changes and audit together.
    await db.exec(`CREATE FUNCTION fail_test_call() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$;
      CREATE TRIGGER fail_test_call BEFORE INSERT ON sales_crm_calls FOR EACH ROW EXECUTE FUNCTION fail_test_call()`);
    await assert.rejects(logCall({ leadId: 4, operatorId: 2, answered: false, result: 'no_answer' }), /synthetic failure/);
    assert.equal((await lead(4)).status, 'CALLBACK');
    assert.equal((await lead(4)).no_answer_attempts, 1);
    assert.equal((await openTasks(4)).length, 1);
    await db.exec('DROP TRIGGER fail_test_call ON sales_crm_calls');
    // Leaving the wait for an answered conversation must not resurrect the lead later.
    await logCall({ leadId: 4, operatorId: 2, answered: false, result: 'no_answer' });
    await logCall({ leadId: 4, operatorId: 2, answered: true, result: 'interested' });
    assert.equal((await lead(4)).status, 'THINKING');
    assert.equal((await lead(4)).no_answer_retry_at, null);
    assert.equal((await lead(4)).next_contact_at, null);
    assert.ok((await lead(4)).presentation_at);

    await db.exec(`INSERT INTO sales_crm_leads(user_id,status,assigned_operator_id,no_answer_attempts)
      VALUES (5,'NEW',2,4)`);
    const boardFifth = await changeLeadStatus({ leadId: 5, status: 'NO_ANSWER', actorId: 2, scopeOperatorId: 2 });
    assert.equal(boardFifth.status, 'LOW_QUALITY', 'fifth board move returns the effective status');
    assert.equal((await lead(5)).no_answer_retry_at, null);
    await changeLeadStatus({ leadId: 1, status: 'PAID', actorId: 1 });
    assert.equal((await lead(1)).no_answer_retry_at, null, 'payment cancels a waiting retry');
    assert.equal((await lead(1)).next_contact_at, null);
    assert.equal(await returnDueNoAnswerLeads(), 0);
  } finally {
    (pool as any).query = originalQuery;
    (pool as any).connect = originalConnect;
    await db.close();
  }
});
