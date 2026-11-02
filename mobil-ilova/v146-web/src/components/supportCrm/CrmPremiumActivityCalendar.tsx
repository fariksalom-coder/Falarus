import { useEffect,useState } from 'react';
import { Card } from '../ui/Foundation';
import { getSupportCrmPremiumCalendar } from '../../api/supportCrm';
import { crmToday,type CrmPremiumCalendar } from '../../../shared/supportCrmCalendar';
import { CrmCalendarCell,CrmMonthGrid,CrmMonthNavigation } from './CrmMonthCalendar';

export default function CrmPremiumActivityCalendar() {
  const [month,setMonth]=useState(()=>crmToday().slice(0,7));
  const [data,setData]=useState<CrmPremiumCalendar|null>(null),[selected,setSelected]=useState(crmToday()),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setData(null);
    getSupportCrmPremiumCalendar(month,'historical',controller.signal).then(d=>{if(!controller.signal.aborted){setData(d);setSelected(d.days.find(day=>day.date===d.today)?.date??d.days.find(day=>!day.future)?.date??'');}})
      .catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[month,revision]);
  const day=data?.days.find(d=>d.date===selected);
  return <Card className="space-y-4 p-3 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-app-text">Premium faolligi</h2><p className="mt-1 text-xs text-app-muted">Kamida bitta kunlik vazifani bajargan o‘quvchilar</p></div><button type="button" disabled={loading} className="min-h-10 rounded-xl border border-app-border px-3 text-xs" onClick={()=>setRevision(v=>v+1)}>Yangilash</button></div>
    <CrmMonthNavigation month={month} onChange={setMonth}/>

    {loading?<p role="status" className="text-sm text-app-muted">Kalendar yuklanmoqda…</p>:error?<p role="alert" className="text-sm text-red-700">{error}</p>:data?.month===month&&<>
      <p className="text-xs text-app-muted">Hozirgi premium: <strong className="text-app-text">{data.current_premium}</strong>. Har bir kun o‘sha kuni premium bo‘lgan o‘quvchilarga nisbatan hisoblanadi. Eski obunalar tarixi to‘liq bo‘lmasligi mumkin.</p>
      <CrmMonthGrid month={month} render={date=>{
        const d=data.days.find(x=>x.date===date)!;
        const label=d.future?'—':`${(d.percent??0).toLocaleString('ru-RU',{maximumFractionDigits:2})}%`;
        return <CrmCalendarCell date={date} selected={selected===date} future={d.future} label={`${date}: ${d.active} / ${d.premium}, ${label}`} onClick={()=>setSelected(date)} tone={d.active>0?'border-emerald-200 bg-emerald-50 text-emerald-900':''}><strong className="mt-1 text-[11px] tabular-nums sm:text-sm">{label}</strong>{!d.future&&<span className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">{d.active}/{d.premium}</span>}</CrmCalendarCell>;
      }}/>
      {day&&<div className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-950"><p className="font-semibold">{new Date(`${day.date}T12:00:00Z`).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}</p><p className="mt-1">{day.premium>0?<>{day.active} o‘quvchi / {day.premium} premium × 100 = {(day.percent??0).toLocaleString('ru-RU')}%</>:<>0 premium · 0%</>}</p>{day.premium===0&&<p>Bu kuni premium o‘quvchi qayd etilmagan: ko‘rsatkich 0%.</p>}{day.coverage==='partial'&&<p className="mt-1 text-xs">Hisob saqlangan vazifa yozuvlari bo‘yicha. Bu kunning eski tarixi to‘liq emas.</p>}</div>}
      <p className="text-[11px] text-app-muted">Foiz = kamida bitta vazifa bajarilgan o‘quvchilar / shu kundagi premium × 100. Hisob saqlangan yozuvlar bo‘yicha; eski tarix {new Date(data.tracking_since).toLocaleString('ru-RU',{timeZone:'Asia/Tashkent'})} gacha to‘liq bo‘lmasligi mumkin. Kelgusi kunlar hisoblanmaydi. Vaqt: Toshkent.</p>
    </>}
  </Card>;
}
