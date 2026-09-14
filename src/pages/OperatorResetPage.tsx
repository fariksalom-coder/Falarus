import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../api';
export default function OperatorResetPage(){
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
 const [password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 return <main className="min-h-[100dvh] flex items-center justify-center p-5 bg-slate-100 text-slate-900"><section className="w-full max-w-md rounded-3xl bg-white shadow-xl p-7 space-y-5"><img src="/landing/falarus-mark.svg" alt="FalaRus" className="h-10"/><h1 className="text-2xl font-bold">Parolni yangilash</h1>
 {done?<><p role="status">Parolingiz yangilandi. Yangi parol bilan platformaga kiring.</p><Link to="/login" className="ui-button ui-button--primary">Kirish</Link></>:!token?<p role="alert">Tiklash havolasi mavjud emas. Operatordan yangi havola so‘rang.</p>:<form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setError('');if(password!==repeat){setError('Parollar bir xil emas.');return;}setBusy(true);try{const r=await fetch(apiUrl('/api/operator-reset'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Parol yangilanmadi.');history.replaceState(null,'',window.location.pathname);setPassword('');setRepeat('');setDone(true);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>
 <p className="text-sm text-slate-600">Havola 30 daqiqa amal qiladi va faqat bir marta ishlatiladi. Yangi parolingizni operatorga yuborishingiz shart emas.</p>
 <label className="block">Yangi parol<input className="mt-1 w-full p-3 border rounded-xl" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <label className="block">Parolni takrorlang<input className="mt-1 w-full p-3 border rounded-xl" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={repeat} onChange={e=>setRepeat(e.target.value)}/></label>
 <p className="text-xs text-slate-500">Kamida 12 belgi, lotin harfi va raqam.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}<button className="ui-button ui-button--primary w-full" disabled={busy}>{busy?'Saqlanmoqda…':'Parolni saqlash'}</button>
 </form>}</section></main>;
}
