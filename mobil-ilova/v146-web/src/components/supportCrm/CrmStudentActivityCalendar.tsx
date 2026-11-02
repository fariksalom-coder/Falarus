import { useEffect,useState } from 'react';
import { Card } from '../ui/Foundation';
import { getSupportCrmStudentCalendar } from '../../api/supportCrm';
import { crmToday,type CalendarContact,type CrmStudentCalendar } from '../../../shared/supportCrmCalendar';
import { CrmCalendarCell,CrmMonthGrid,CrmMonthNavigation } from './CrmMonthCalendar';

const channels:Record<string,string>={phone:'Telefon',telegram:'Telegram',whatsapp:'WhatsApp',max:'MAX',imo:'IMO',email:'Email',other:'Boshqa'};
function ContactRow({contact}:{contact:CalendarContact}) {
  return <li className="rounded-xl border border-app-border bg-white p-3 text-sm"><p className="font-semibold">{contact.agent_name} · {channels[contact.channel]??contact.channel}{contact.channel_other?` (${contact.channel_other})`:''}</p><p className="mt-1 text-app-muted">{new Date(contact.created_at).toLocaleString('ru-RU',{timeZone:'Asia/Tashkent'})}</p></li>;
}
export default function CrmStudentActivityCalendar({userId,revision=0}:{userId:number;revision?:number}) {
  const [month,setMonth]=useState(()=>crmToday().slice(0,7)),[selected,setSelected]=useState(crmToday()),[data,setData]=useState<CrmStudentCalendar|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setData(null);
    getSupportCrmStudentCalendar(userId,month,controller.signal).then(d=>{if(!controller.signal.aborted){setData(d);setSelected(prev=>d.days.some(day=>day.date===prev)?prev:d.days.find(day=>day.date===d.today)?.date??d.days.find(day=>!day.future)?.date??'');}})
      .catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[userId,month,revision,refresh]);
  const day=data?.days.find(d=>d.date===selected);
  return <Card className="space-y-4 p-3 sm:p-5">
    <div className="flex items-start justify-between gap-3"><h2 className="text-base font-semibold text-app-text">O‘quvchi faolligi va aloqalar</h2><button type="button" disabled={loading} className="min-h-10 rounded-xl border border-app-border px-3 text-xs" onClick={()=>setRefresh(v=>v+1)}>Yangilash</button></div>
    <CrmMonthNavigation month={month} onChange={setMonth}/>
    {loading?<p role="status" className="text-sm text-app-muted">Kalendar yuklanmoqda…</p>:error?<p role="alert" className="text-sm text-red-700">{error}</p>:data?.month===month&&<>
      <div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-emerald-50 p-3"><strong className="block text-xl">{data.days.filter(d=>!d.future&&d.visited).length}</strong>Kirish kunlari</div><div className="rounded-xl bg-blue-50 p-3"><strong className="block text-xl">{data.days.filter(d=>!d.future).reduce((n,d)=>n+d.tasks,0)}</strong>Vazifalar</div><div className="rounded-xl bg-violet-50 p-3"><strong className="block text-xl">{data.days.reduce((n,d)=>n+d.contacts.length,0)}</strong>Aloqalar</div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <section><h3 className="mb-3 text-sm font-semibold">O‘quvchi faoliyati</h3><CrmMonthGrid month={month} render={date=>{const d=data.days.find(x=>x.date===date)!;return <CrmCalendarCell date={date} selected={selected===date} future={d.future} label={`${date}: ${d.visited?'kirgan':'kirish qayd etilmagan'}, ${d.tasks} vazifa`} onClick={()=>setSelected(date)} tone={d.tasks>0?'border-emerald-200 bg-emerald-50 text-emerald-900':d.visited?'border-blue-200 bg-blue-50 text-blue-900':''}><strong className="mt-1 text-[11px]">{d.future?'—':d.tasks}</strong><span className="mt-0.5 text-[9px]">{d.future?'':d.tasks>0?'vazifa':d.visited?'kirgan':'—'}</span>{d.contacts.length>0&&<span className="mt-0.5 text-[9px] font-semibold text-violet-700">● aloqa</span>}</CrmCalendarCell>;}}/><p className="mt-2 text-[11px] text-app-muted">Yashil — vazifa bajarilgan · ko‘k — kirgan · ● — operator aloqasi</p></section>
        <section><h3 className="mb-3 text-sm font-semibold">Operator aloqalari</h3><CrmMonthGrid month={month} render={date=>{const d=data.days.find(x=>x.date===date)!;return <CrmCalendarCell date={date} selected={selected===date} future={d.future} label={`${date}: ${d.contacts.length} aloqa yozuvi`} onClick={()=>setSelected(date)} tone={d.contacts.length?'border-violet-200 bg-violet-50 text-violet-900':''}><strong className="mt-1 text-sm">{d.future?'—':d.contacts.length}</strong>{!!d.contacts.length&&<span className="mt-0.5 text-[9px]">aloqa</span>}</CrmCalendarCell>;}}/><p className="mt-2 text-[11px] text-app-muted">Sana tanlanganda kanal va operator ko‘rsatiladi.</p></section>
      </div>
      {day&&<section className="space-y-2 rounded-2xl bg-slate-50 p-3"><h3 className="font-semibold">{new Date(`${day.date}T12:00:00Z`).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</h3><p className="text-sm">{day.visited?'Platformaga kirgan':'Kirish qayd etilmagan'} · {day.tasks} vazifa</p>{day.coverage==='partial'&&<p className="text-xs text-amber-800">Hisob saqlangan vazifa yozuvlari bo‘yicha. Bu kunning eski tarixi to‘liq emas.</p>}<ul className="space-y-2">{day.contacts.map(c=><ContactRow key={c.id} contact={c}/>)}</ul>{!day.contacts.length&&<p className="text-xs text-app-muted">Bu kuni aloqa yozuvi yo‘q.</p>}</section>}
      <details className="text-[11px] text-app-muted"><summary className="cursor-pointer py-2">Hisob qanday yuritiladi?</summary><p>Aniq hisob {new Date(data.tracking_since).toLocaleString('ru-RU',{timeZone:'Asia/Tashkent'})} dan boshlangan. Har bir grammatika mashqi, lug‘at juftlash, iboralar testi, o‘qish, gapirish topshirig‘i va savol-javob alohida vazifa. Bir vazifa bir kunda faqat bir marta sanaladi; boshqa kun takrorlansa yana sanaladi. Eski kirishlar mavjud tarixdan olinadi. Aloqadan keyingi o‘zgarish ko‘rinadi, lekin sababni isbotlamaydi. Vaqt: Toshkent.</p></details>
    </>}
  </Card>;
}
