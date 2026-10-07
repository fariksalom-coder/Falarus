import type { PoolClient } from 'pg';

/** Caller owns a transaction. Never resets existing passwords or historical ownership. */
export async function provisionSupportCrmOperators(db:Pick<PoolClient,'query'>,operators:{login:string;name:string;passwordHash:string}[]) {
  await db.query('SELECT id FROM support_crm_assignment_cursor WHERE id=true FOR UPDATE');
  for(const operator of operators){
    const existing=await db.query('SELECT id,is_manager,receives_assignments FROM support_crm_agents WHERE lower(login)=$1',[operator.login]);
    if(existing.rows[0]){
      if(existing.rows[0].is_manager||!existing.rows[0].receives_assignments)throw new Error(`Login ${operator.login} already belongs to a different CRM account`);
      continue;
    }
    await db.query('INSERT INTO support_crm_agents(login,name,password_hash,is_manager,receives_assignments) VALUES($1,$2,$3,false,true)',[operator.login,operator.name,operator.passwordHash]);
  }
  // Only initially unassigned active students are distributed. Renewals keep their operator.
  await db.query(`SELECT support_crm_assign_student(u.id) FROM users u
    WHERE u.plan_expires_at>now() AND NOT COALESCE(u.is_golden,false) AND COALESCE(u.account_type,'student')<>'teacher'
      AND NOT EXISTS(SELECT 1 FROM support_crm_assignments a WHERE a.user_id=u.id)
    ORDER BY u.id`);
  return (await db.query(`SELECT a.login,a.name,count(s.user_id)::int assigned,count(s.user_id) FILTER(WHERE u.plan_expires_at>now())::int active_premium
    FROM support_crm_agents a LEFT JOIN support_crm_assignments s ON s.agent_id=a.id LEFT JOIN users u ON u.id=s.user_id
    WHERE a.receives_assignments AND NOT a.is_manager GROUP BY a.id ORDER BY a.id`)).rows;
}
