import { useEffect, useRef, useState } from 'react';

type Customer={id:number;first_name:string|null;last_name:string|null;phone:string|null;email:string|null;plan_expires_at?:string|null};
type Payment={id:number;amount:string;currency:string;tariff_type:string;paid_at:string;claim_status:string|null};
export default function RahmatClaimForm({api,onSubmitted}:{api:(path:string,options?:RequestInit)=>Promise<any>;onSubmitted:()=>void}) {
  const [query,setQuery]=useState(''),[users,setUsers]=useState<Customer[]>([]),[selected,setSelected]=useState<Customer|null>(null);
  const [payments,setPayments]=useState<Payment[]>([]),[paymentId,setPaymentId]=useState(''),[file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
  const input=useRef<HTMLInputElement>(null), submitting=useRef(false);
  useEffect(()=>{
    setPayments([]);setPaymentId('');setFile(null);if(input.current)input.current.value='';
    if(!selected)return;
    let live=true;setLoading(true);setError('');
    api(`/customers/${selected.id}/rahmat-payments`).then(r=>{if(live)setPayments(r.items);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[selected,api]);
  async function search(){
    if(busy||query.trim().length<2)return;
    setBusy(true);setError('');setNote('');
    try{const r=await api(`/customers?q=${encodeURIComponent(query.trim())}`);setUsers(r.items.filter((u:Customer)=>u.plan_expires_at&&Date.parse(u.plan_expires_at)>Date.now()));setSelected(null);}
    catch(e:any){setError(e.message);}finally{setBusy(false);}
  }
  async function submit(){
    if(submitting.current||!selected||!file||!paymentId)return;
    submitting.current=true;setBusy(true);setError('');setNote('');
    try{
      const form=new FormData();form.set('userId',String(selected.id));form.set('paymentId',paymentId);form.set('receipt',file);
      const r=await api('/rahmat-claims',{method:'POST',body:form});
      setNote(`Rahmat so‘rovi #${r.claimId} adminga yuborildi. Tasdiqlash kutilmoqda.`);
      setPayments(prev=>prev.map(p=>String(p.id)===paymentId?{...p,claim_status:'pending'}:p));setPaymentId('');setFile(null);if(input.current)input.current.value='';onSubmitted();
    }catch(e:any){setError(e.message);}finally{submitting.current=false;setBusy(false);}
  }
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="font-black text-[#071B3A]">Rahmat orqali sotilgan kurs</h2>
    <p className="text-sm text-slate-600">Premium o‘quvchini toping, uning to‘langan Rahmat to‘lovini tanlang va chekni yuklang. Admin tasdiqlagach sotuv sizga biriktiriladi va maoshga kiradi. Premium qayta berilmaydi, summa takroran qo‘shilmaydi.</p>
    <p className="text-xs text-slate-500">Savdo va maosh asl to‘lov sanasi bo‘yicha hisoblanadi. Keyingi avtomatik to‘lovlar alohida qoladi.</p>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {note&&<p role="status" className="rounded-xl bg-green-50 p-3 text-green-700">{note}</p>}
    <form className="flex gap-2" onSubmit={e=>{e.preventDefault();void search();}}>
      <input aria-label="Premium o‘quvchini qidirish" className="min-w-0 flex-1 rounded-xl border p-3" placeholder="Ism, telefon, email yoki ID" value={query} disabled={busy} onChange={e=>setQuery(e.target.value)}/>
      <button className="rounded-xl bg-[#071B3A] px-4 text-white" disabled={busy||query.trim().length<2}>Topish</button>
    </form>
    <div className="max-h-64 space-y-2 overflow-auto">{users.map(u=><button type="button" disabled={busy} key={u.id} className={`w-full rounded-xl border p-3 text-left ${selected?.id===u.id?'bg-blue-50 border-blue-300':'bg-slate-50'}`} onClick={()=>{setSelected(u);setNote('');}}>
      <strong>#{u.id} · {u.first_name} {u.last_name}</strong><span className="block text-sm">{u.phone||u.email} · Premium</span>
    </button>)}</div>
    {selected&&<>
      <label className="block text-sm font-bold">Rahmat to‘lovi
        <select className="mt-2 w-full rounded-xl border p-3" value={paymentId} disabled={busy||loading} onChange={e=>setPaymentId(e.target.value)}>
          <option value="">{loading?'Yuklanmoqda…':'To‘lovni tanlang'}</option>
          {payments.map(p=><option key={p.id} value={p.id} disabled={!!p.claim_status}>#{p.id} · {p.amount} {p.currency} · {p.tariff_type} · {new Date(p.paid_at).toLocaleDateString('uz-UZ',{timeZone:'Asia/Tashkent'})}{p.claim_status==='pending'?' · Tekshiruvda':p.claim_status?' · Biriktirilgan':''}</option>)}
        </select>
      </label>
      {!loading&&!payments.length&&<p className="text-sm text-slate-500">Tasdiqlangan Rahmat to‘lovi topilmadi.</p>}
      <label className="block text-sm font-bold">Chek (8 MB gacha)
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} className="mt-2 block w-full rounded-xl border p-3" onChange={e=>setFile(e.target.files?.[0]??null)}/>
      </label>
      <button type="button" disabled={busy||!paymentId||!file||loading} className="w-full rounded-xl bg-[#1E5BFF] p-4 font-bold text-white disabled:opacity-50" onClick={()=>void submit()}>{busy?'Yuborilmoqda…':'Adminga yuborish'}</button>
    </>}
  </section>;
}
