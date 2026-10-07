import type { ReactNode } from 'react';
import { ChevronLeft,ChevronRight } from 'lucide-react';
import { calendarDates,crmToday,shiftCalendarMonth } from '../../../shared/supportCrmCalendar';

export function CrmMonthNavigation({month,onChange,disabled=false}:{month:string;onChange:(month:string)=>void;disabled?:boolean}) {
  const label=new Date(`${month}-01T12:00:00Z`).toLocaleDateString('ru-RU',{month:'long',year:'numeric',timeZone:'Asia/Tashkent'});
  return <div className="flex items-center justify-between gap-2">
    <button type="button" aria-label="Oldingi oy" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-app-border bg-white disabled:opacity-40" disabled={disabled||month==='2000-01'} onClick={()=>onChange(shiftCalendarMonth(month,-1))}><ChevronLeft size={18}/></button>
    <div className="text-center"><p className="font-semibold capitalize text-app-text" aria-live="polite">{label}</p><button type="button" className="min-h-7 text-xs text-blue-600" disabled={disabled} onClick={()=>onChange(crmToday().slice(0,7))}>Joriy oy</button></div>
    <button type="button" aria-label="Keyingi oy" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-app-border bg-white disabled:opacity-40" disabled={disabled||month==='2100-12'} onClick={()=>onChange(shiftCalendarMonth(month,1))}><ChevronRight size={18}/></button>
  </div>;
}
export function CrmMonthGrid({month,render}:{month:string;render:(date:string)=>ReactNode}) {
  const offset=(new Date(`${month}-01T12:00:00Z`).getUTCDay()+6)%7;
  return <div>
    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-app-muted">{['Du','Se','Ch','Pa','Ju','Sh','Ya'].map(day=><span key={day}>{day}</span>)}</div>
    <div className="grid grid-cols-7 gap-1 sm:gap-1.5">{Array.from({length:offset},(_,i)=><div key={`empty-${i}`} aria-hidden="true"/>)}{calendarDates(month).map(date=><div key={date} className="min-w-0">{render(date)}</div>)}</div>
  </div>;
}
export function CrmCalendarCell({date,selected,future=false,tone='',label,onClick,children}:{date:string;selected:boolean;future?:boolean;tone?:string;label:string;onClick:()=>void;children:ReactNode}) {
  return <button type="button" disabled={future} onClick={onClick} aria-label={label} aria-pressed={selected} title={label}
    className={`flex h-[84px] w-full flex-col items-center rounded-xl border px-0.5 py-2 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:h-[92px] ${future?'border-slate-100 bg-slate-50 text-slate-400':tone||'border-slate-200 bg-white text-slate-600'} ${selected?'ring-2 ring-blue-500 ring-offset-1':''}`}>
    <span className={`text-xs font-semibold ${date===crmToday()?'rounded-full bg-blue-600 px-1.5 text-white':''}`}>{Number(date.slice(-2))}</span>{children}
  </button>;
}
