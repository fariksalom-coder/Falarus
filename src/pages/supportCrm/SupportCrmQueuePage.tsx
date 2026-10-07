import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Search,X} from 'lucide-react';
import {Card} from '../../components/ui/Foundation';
import CrmDayProgress from '../../components/supportCrm/CrmDayProgress';
import {getSupportCrmQueue,type SupportCrmQueueFilter,type SupportCrmQueueRow,type SupportCrmStats} from '../../api/supportCrm';
import {supportCrmPath} from '../../constants/supportCrmPath';
import {formatCrmDate,formatLastSeenAgo} from '../../utils/supportCrmFormat';

const tabs:{id:SupportCrmQueueFilter;label:string;count:keyof SupportCrmStats}[]=[
 {id:'needs_contact',label:'Bog‘lanish kerak',count:'needs_contact_count'},
 {id:'contacted',label:'Bog‘langanlar',count:'contacted_count'},
 {id:'no_contact_needed',label:'Bog‘lanish shart emas',count:'no_contact_needed_count'},
];
const channels:Record<string,string>={phone:'Telefon',telegram:'Telegram',whatsapp:'WhatsApp',max:'MAX',imo:'IMO',email:'Email',other:'Boshqa'};
export default function SupportCrmQueuePage(){
 const [params,setParams]=useSearchParams(),query=params.get('q')??'';
 const rawTab=params.get('tab'),tab:SupportCrmQueueFilter=rawTab==='contacted'||rawTab==='no_contact_needed'?rawTab:'needs_contact';
 const [rows,setRows]=useState<SupportCrmQueueRow[]>([]),[counts,setCounts]=useState<SupportCrmStats|null>(null),[total,setTotal]=useState(0),[offset,setOffset]=useState(0);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const request=useRef(0);
 useEffect(()=>{
  const id=++request.current;setLoading(true);setError('');
  const timer=window.setTimeout(()=>{
   getSupportCrmQueue(tab,query,offset).then(data=>{if(id!==request.current)return;setRows(previous=>offset?previous.concat(data.rows):data.rows);setTotal(data.total);setCounts(data.counts);})
    .catch(e=>{if(id===request.current)setError(e instanceof Error?e.message:'Xatolik');})
    .finally(()=>{if(id===request.current)setLoading(false);});
  },250);
  return()=>{clearTimeout(timer);request.current++;};
 },[tab,query,offset,revision]);
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==='visible'){setOffset(0);setRevision(value=>value+1);}};
  const timer=window.setInterval(refresh,60000);window.addEventListener('focus',refresh);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[]);
 function update(key:string,value:string){setOffset(0);setRows([]);const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);setParams(next,{replace:true});}
 return <div className="space-y-4">
  <div className="flex items-center justify-between gap-3"><h1 className="text-lg font-semibold">Navbat</h1><span className="text-sm text-app-muted">Jami premium: <strong>{counts?.total_premium??'—'}</strong></span></div>
  <div role="tablist" aria-label="O‘quvchilar guruhlari" className="grid grid-cols-3 gap-2">
   {tabs.map(item=><button key={item.id} type="button" role="tab" aria-selected={tab===item.id} onClick={()=>update('tab',item.id)} className={`min-h-20 rounded-2xl px-2 py-3 text-xs font-medium sm:text-sm ${tab===item.id?'bg-blue-600 text-white':'bg-white text-app-muted ring-1 ring-app-border'}`}><strong className="mb-1 block text-xl tabular-nums">{counts?.[item.count]??'—'}</strong>{item.label}</button>)}
  </div>
  <p className="text-xs text-app-muted">Bog‘langanlar — oxirgi 24 soat. Bog‘lanish kerak — 3 kundan beri faol bo‘lmagan yoki faollik sanasi noma’lum. Eng uzoq faol bo‘lmaganlar birinchi turadi.</p>
  <div className="flex items-center gap-2 rounded-2xl border border-app-border bg-white px-3"><Search size={18} aria-hidden="true"/><input type="search" aria-label="Telefon, ism yoki familiya" placeholder="Telefon, ism yoki familiya…" maxLength={160} value={query} onChange={event=>update('q',event.target.value)} className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"/>{query&&<button type="button" aria-label="Qidiruvni tozalash" onClick={()=>update('q','')} className="min-h-11 min-w-11"><X size={18}/></button>}</div>
  {error?<p role="alert" className="text-sm text-app-danger">{error}</p>:loading&&offset===0?<p role="status" className="text-sm text-app-muted">Yuklanmoqda…</p>:<>
   <p className="text-xs text-app-muted">{query?'Qidiruv natijalari: ':'Ro‘yxatda: '}{total}</p>
   {!rows.length?<Card className="p-5 text-sm text-app-muted">{query?'Topilmadi.':'Bu guruh hozircha bo‘sh.'}</Card>:<ul className="space-y-3">
    {rows.map(row=><li key={row.id}><Link to={supportCrmPath(`/users/${row.id}`)} className="block rounded-2xl bg-white p-4 ring-1 ring-app-border hover:ring-blue-500">
     <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{[row.first_name,row.last_name].filter(Boolean).join(' ')||`User #${row.id}`}</p><p className="mt-1 text-sm">{row.phone||'—'}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${tab==='needs_contact'?'bg-amber-50 text-amber-900':'bg-blue-50 text-blue-900'}`}>{formatLastSeenAgo(row.last_activity_at)}</span></div>
     <div className="mt-3"><CrmDayProgress current_day={row.current_day} completed_days={row.completed_days}/></div>
     <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted"><span>{row.plan_name||'—'}</span>{row.last_contact_at&&<span>{formatCrmDate(row.last_contact_at)} · {channels[row.last_contact_channel??'']??row.last_contact_channel}{row.last_contact_channel_other?` (${row.last_contact_channel_other})`:''}</span>}</div>
     {row.last_contact_at&&<p className={`mt-2 text-xs ${row.contact_activity==='after_contact'?'text-emerald-700':'text-amber-800'}`}>{row.contact_activity==='after_contact'?'Oxirgi aloqadan keyin faollik qayd etilgan':'Oxirgi aloqadan keyin faollik hali qayd etilmagan'}</p>}
    </Link></li>)}
   </ul>}
  </>}
  {!error&&rows.length<total&&<button type="button" disabled={loading} className="min-h-11 w-full rounded-xl bg-white text-sm ring-1 ring-app-border" onClick={()=>setOffset(rows.length)}>{loading?'Yuklanmoqda…':'Yana ko‘rsatish'}</button>}
 </div>;
}
