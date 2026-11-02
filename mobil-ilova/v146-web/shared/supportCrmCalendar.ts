export type PremiumCohort = 'historical' | 'current';
export type CalendarContact = { id: number; agent_id: number; agent_name: string; channel: string; channel_other: string | null; outcome: string; result: string | null; comment_text: string | null; created_at: string };
export type CrmCalendarDay = { date: string; future: boolean; coverage: 'complete' | 'partial'; visited: boolean; tasks: number; contacts: CalendarContact[] };
export type CrmStudentCalendar = { month: string; today: string; tracking_since: string; days: CrmCalendarDay[] };
export type CrmPremiumCalendar = { month: string; today: string; cohort: PremiumCohort; current_premium: number; tracking_since: string; days: Array<{ date: string; future: boolean; coverage: 'complete' | 'partial'; premium: number; active: number; percent: number | null }> };

export function crmToday(now = new Date()): string {
  const parts=new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const value=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function calendarMonth(raw: unknown, now = new Date()): string {
  if (raw == null || raw === '') return crmToday(now).slice(0,7);
  if(typeof raw!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)||Number(raw.slice(0,4))<2000||Number(raw.slice(0,4))>2100) throw new Error('Oy YYYY-MM shaklida bo‘lsin (2000–2100).');
  return raw;
}
export function shiftCalendarMonth(month: string, delta: number): string {
  calendarMonth(month);
  return new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-1+delta,1)).toISOString().slice(0,7);
}
export function calendarDates(month: string): string[] {
  calendarMonth(month);
  const count=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
  return Array.from({length:count},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`);
}
export function participationPercent(active: number, premium: number): number | null {
  return premium>0 ? Math.round(active/premium*10000)/100 : null;
}
/** One completed exercise per course day per calendar date; HTTP retries/replays do not inflate it. */
export function completedKunlikTaskKeys(day: number, patch: Record<string,unknown>): string[] {
  if(!Number.isInteger(day)||day<1||day>182)return [];
  const keys=['grammar_1','grammar_2','grammar_3','words_match','phrases_done','oqish_done','suhbat_done'].filter(k=>patch[k]===true);
  for(const field of ['speaking_level','speaking_tasks_done']) {
    const n=patch[field];
    if(typeof n==='number'&&Number.isInteger(n)&&n>0&&n<=100) keys.push(`${field}:${n}`);
  }
  return keys.map(k=>`kunlik:${day}:${k}`);
}
