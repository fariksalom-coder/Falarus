import { crmVisibilitySql } from './supportCrmScope.js';
import type { Pool } from 'pg';
import { pool } from '../lib/db.js';
import { calendarMonth, calendarDates, crmToday, participationPercent, shiftCalendarMonth, type CalendarContact, type CrmStudentCalendar, type CrmPremiumCalendar, type PremiumCohort } from '../../shared/supportCrmCalendar.js';

type Database = Pick<Pool,'query'>;
const bounds = (month:string) => [`${month}-01`,`${shiftCalendarMonth(month,1)}-01`];
const taskEvents = `SELECT user_id,activity_date,task_key FROM learning_task_completions
  WHERE activity_date >= $1::date AND activity_date < $2::date
  UNION SELECT user_id,(completed_at AT TIME ZONE 'Asia/Tashkent')::date,'legacy:'||task_id
  FROM user_tasks WHERE status='PASSED' AND completed_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Tashkent')
    AND completed_at < ($2::date::timestamp AT TIME ZONE 'Asia/Tashkent')`;
const visitEvents = `SELECT user_id,activity_date FROM user_activity_dates WHERE activity_date >= $1::date AND activity_date < $2::date
  UNION SELECT user_id,activity_date FROM user_daily_time WHERE seconds>0 AND activity_date >= $1::date AND activity_date < $2::date
  UNION SELECT user_id,activity_date FROM support_crm_user_visits WHERE activity_date >= $1::date AND activity_date < $2::date`;

function requireDb(db:Database|null):Database { if(!db)throw new Error('Baza mavjud emas.'); return db; }
async function trackingSince(db:Database):Promise<string> {
  const r=await db.query('SELECT tracking_since FROM support_crm_calendar_meta WHERE id=true');
  if(!r.rows[0])throw new Error('Kalendar migratsiyasi o‘rnatilmagan.');
  return new Date(r.rows[0].tracking_since).toISOString();
}

export async function getPremiumActivityCalendar(rawMonth:unknown,cohort:PremiumCohort='historical',database:Database|null=pool,now=new Date()):Promise<CrmPremiumCalendar> {
  const db=requireDb(database),month=calendarMonth(rawMonth,now),today=crmToday(now),[from,to]=bounds(month);
  const since=await trackingSince(db);
  const current=(await db.query(`SELECT count(*)::int total FROM users WHERE plan_expires_at>$1 AND ${crmVisibilitySql('users.id')}`,[now.toISOString()])).rows[0].total;
  const rows=(await db.query(`WITH days AS (SELECT generate_series($1::date,$2::date-1,interval '1 day')::date AS day_date),
    tasks AS (${taskEvents}),
    spans AS (SELECT user_id,started_at,expires_at FROM support_crm_premium_periods p
      WHERE ${crmVisibilitySql('p.user_id')} AND started_at < ($2::date::timestamp AT TIME ZONE 'Asia/Tashkent') AND expires_at > ($1::date::timestamp AT TIME ZONE 'Asia/Tashkent')
    ),members AS (
      SELECT DISTINCT d.day_date,s.user_id FROM days d JOIN spans s
        ON s.started_at<((d.day_date+1)::timestamp AT TIME ZONE 'Asia/Tashkent') AND s.expires_at>(d.day_date::timestamp AT TIME ZONE 'Asia/Tashkent')
      WHERE $4='historical'
      UNION ALL SELECT d.day_date,u.id FROM days d CROSS JOIN users u WHERE $4='current' AND u.plan_expires_at>$3::timestamptz AND ${crmVisibilitySql('u.id')}
    ),counts AS (
      SELECT m.day_date,count(*)::int premium,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM tasks t WHERE t.user_id=m.user_id AND t.activity_date=m.day_date))::int active
      FROM members m GROUP BY m.day_date
    ) SELECT d.day_date::text date,COALESCE(c.premium,0)::int premium,COALESCE(c.active,0)::int active
    FROM days d LEFT JOIN counts c ON c.day_date=d.day_date ORDER BY d.day_date`,[from,to,now.toISOString(),cohort])).rows;
  return {month,today,cohort,current_premium:Number(current),tracking_since:since,days:rows.map(r=>({date:r.date,future:r.date>today,
    coverage:r.date>crmToday(new Date(since))?'complete':'partial',premium:Number(r.premium),active:Number(r.active),
    percent:r.date>today?null:(participationPercent(Number(r.active),Number(r.premium))??0)}))};
}

export async function getStudentActivityCalendar(userId:number,rawMonth:unknown,database:Database|null=pool,now=new Date()):Promise<CrmStudentCalendar|null> {
  const db=requireDb(database),month=calendarMonth(rawMonth,now),today=crmToday(now),[from,to]=bounds(month);
  if(!(await db.query(`SELECT id FROM users WHERE id=$1 AND ${crmVisibilitySql('users.id')}`,[userId])).rows.length)return null;
  const since=await trackingSince(db);
  const [tasks,visits,contacts]=await Promise.all([
    db.query(`WITH tasks AS (${taskEvents}) SELECT activity_date::text date,count(*)::int tasks FROM tasks WHERE user_id=$3 GROUP BY activity_date`,[from,to,userId]),
    db.query(`WITH visits AS (${visitEvents}) SELECT activity_date::text date FROM visits WHERE user_id=$3`,[from,to,userId]),
    db.query(`SELECT c.id,c.agent_id,COALESCE(NULLIF(a.name,''),'Operator #'||c.agent_id) agent_name,c.channel,c.channel_other,c.outcome,c.result,c.comment_text,c.created_at
      FROM support_crm_contacts c LEFT JOIN support_crm_agents a ON a.id=c.agent_id
      WHERE c.user_id=$3 AND c.created_at>=($1::date::timestamp AT TIME ZONE 'Asia/Tashkent')
        AND c.created_at<($2::date::timestamp AT TIME ZONE 'Asia/Tashkent') ORDER BY c.created_at,c.id`,[from,to,userId]),
  ]);
  const byDate=new Map(tasks.rows.map(r=>[r.date,Number(r.tasks)]));
  const visited=new Set(visits.rows.map(r=>r.date));
  const log=new Map<string,CalendarContact[]>();
  for(const row of contacts.rows){
    const contact={...row,id:Number(row.id),agent_id:Number(row.agent_id),created_at:new Date(row.created_at).toISOString()} as CalendarContact;
    const date=crmToday(new Date(contact.created_at));log.set(date,[...(log.get(date)??[]),contact]);
  }
  return {month,today,tracking_since:since,days:calendarDates(month).map(date=>({date,future:date>today,
    coverage:date>crmToday(new Date(since))?'complete':'partial',visited:visited.has(date)||(byDate.get(date)??0)>0,tasks:byDate.get(date)??0,contacts:log.get(date)??[]}))};
}
