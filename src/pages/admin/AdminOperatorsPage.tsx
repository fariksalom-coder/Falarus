import { useCallback, useEffect, useState } from 'react';
import { adminApi, getAdminToken } from '../../lib/adminApi';
import { apiUrl } from '../../api';
const base = '/operator-bot';
const fmt = (x: any) => x ? new Date(x).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : '—';
const names: Record<string, string> = { pending: 'Tekshiruvda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' };
export default function AdminOperatorsPage() {
    const [ops, setOps] = useState<any[]>([]), [data, setData] = useState<any>({ rows: [], summary: [], debts: [], activity: [] }), [audit, setAudit] = useState<any[]>([]);
    const [tab, setTab] = useState('receipts'), [filter, setFilter] = useState({ operator: '', status: 'pending', from: '', to: '', source: '', tariff: '' }), [offset, setOffset] = useState(0);
    const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [note, setNote] = useState('');
    const [form, setForm] = useState({ login: '', name: '', password: '' }), [decision, setDecision] = useState<any>(null), [reason, setReason] = useState('');
    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [o, d] = await Promise.all([adminApi<any[]>(base + '/operators'), adminApi<any>(base + '/overview?' + new URLSearchParams({ ...filter, offset: String(offset) }))]);
            setOps(o);
            setData(d);
            if (tab === 'audit')
                setAudit(await adminApi<any[]>(base + '/audit?offset=' + offset));
        }
        catch (e: any) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }, [filter, offset, tab]);
    useEffect(() => { void load(); }, [load]);
    const run = async (fn: () => Promise<any>, message: string) => { if (busy)
        return; setBusy(true); setError(''); setNote(''); try {
        await fn();
        setNote(message);
        await load();
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } };
    const post = (path: string, body: any) => adminApi(base + path, { method: 'POST', body: JSON.stringify(body) });
    const change = (key: string, value: string) => { setOffset(0); setFilter(f => ({ ...f, [key]: value })); };
    const download = async (id: number) => {
        await run(async () => { const res = await fetch(apiUrl('/api/admin' + base + `/receipts/${id}/file`), { headers: { Authorization: `Bearer ${getAdminToken()}` } }); if (!res.ok)
            throw new Error('Chekni yuklab bo‘lmadi.'); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `chek-${id}.${blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }, 'Chek yuklandi.');
    };
    return <div className="space-y-5 p-4 md:p-6 max-w-[1500px] mx-auto">
  <div><h1 className="text-2xl font-bold">Operatorlar va to‘lovlar</h1><p className="text-sm opacity-70 mt-1">Telegramdan kelgan cheklar. To‘lovni faqat shu yerda admin tasdiqlaydi. Vaqt: Toshkent.</p></div>
  <div className="flex flex-wrap gap-2">{[['receipts', 'Cheklar'], ['reports', 'Hisobotlar'], ['accounts', 'Operator hisoblari'], ['audit', 'Amallar jurnali']].map(([key, label]) => <button className={`ui-button ${tab === key ? 'ui-button--primary' : 'ui-button--secondary'}`} key={key} onClick={() => { setTab(key); setOffset(0); }}>{label}</button>)}<button className="ui-button ui-button--secondary" disabled={busy || loading} onClick={() => void load()}>Yangilash</button></div>
  {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-300 text-red-800 p-3">{error}</p>}{note && <p role="status" className="rounded-xl bg-green-50 text-green-800 p-3">{note}</p>}
  {['receipts', 'reports'].includes(tab) && <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{[
                <select aria-label="Operator" value={filter.operator} onChange={e => change('operator', e.target.value)}><option value="">Barcha operatorlar</option>{ops.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>,
                <select aria-label="Holat" value={filter.status} onChange={e => change('status', e.target.value)}><option value="">Barcha holatlar</option>{Object.entries(names).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>,
                <input aria-label="Boshlanish sanasi" type="date" value={filter.from} onChange={e => change('from', e.target.value)}/>,
                <input aria-label="Tugash sanasi" type="date" value={filter.to} onChange={e => change('to', e.target.value)}/>,
                <input aria-label="Manba" placeholder="Manba: Instagram…" value={filter.source} onChange={e => change('source', e.target.value)}/>,
                <select aria-label="Tarif" value={filter.tariff} onChange={e => change('tariff', e.target.value)}><option value="">Barcha tariflar</option><option value="three_month">3 oy</option><option value="year">1 yil</option></select>
            ].map((el, i) => <div key={i} className="[&>*]:w-full [&>*]:p-2 [&>*]:rounded-lg [&>*]:border [&>*]:bg-white [&>*]:text-slate-900">{el}</div>)}</div>}
  {loading && <p role="status">Yuklanmoqda…</p>}
  {tab === 'receipts' && !loading && <><div className="grid lg:grid-cols-2 gap-4">{data.rows.map((r: any) => <article key={r.id} className="rounded-2xl border border-app-border bg-app-surface p-5 space-y-3">
   <div className="flex justify-between gap-3"><strong>Chek #{r.id} · {names[r.status]}</strong><span>{r.amount} {r.currency}</span></div>
   <p>#{r.user_id} {r.first_name} {r.last_name}<br /><span className="text-sm">{r.phone || '—'} · {r.email || '—'}</span></p>
   <dl className="text-sm grid grid-cols-2 gap-2"><dt>Operator</dt><dd>{r.operator_name}</dd><dt>Tarif / manba</dt><dd>{r.tariff === 'year' ? '1 yil' : '3 oy'} / {r.source}</dd><dt>Jami / tasdiqlangan</dt><dd>{r.total} / {r.paid} {r.currency}</dd><dt>Qarz / tekshiruvda</dt><dd>{r.debt} / {r.pending} {r.currency}</dd><dt>Qarz muddati</dt><dd className={r.due_at && +new Date(r.due_at) < Date.now() && Number(r.debt) > 0 ? 'text-red-600 font-bold' : ''}>{fmt(r.due_at)}</dd><dt>Chek yuklangan</dt><dd>{fmt(r.created_at)}</dd><dt>Admin qarori</dt><dd>{r.admin_id ? `#${r.admin_id} · ${fmt(r.decided_at)}` : 'Kutilmoqda'}</dd><dt>Muzlatilgan</dt><dd>{r.frozen ? 'Ha' : 'Yo‘q'}</dd></dl>
   {r.reason && <p>Sabab: {r.reason}</p>}
   <div className="flex flex-wrap gap-2"><button className="ui-button ui-button--secondary" disabled={busy} onClick={() => void download(r.id)}>Chekni yuklash</button>{r.status === 'pending' && <><button className="ui-button ui-button--primary" disabled={busy} onClick={() => { setDecision({ r, kind: 'approved' }); setReason(''); }}>Tasdiqlash</button><button className="ui-button ui-button--secondary" disabled={busy} onClick={() => { setDecision({ r, kind: 'rejected' }); setReason(''); }}>Rad etish</button></>}</div>
   <label className="block text-sm">Shartnomaga mas’ul operator<select className="ml-2 border rounded p-1" defaultValue="" disabled={busy} onChange={e => { const id = e.target.value; if (id)
                void run(() => post(`/contracts/${r.contract_id}/assign`, { operator_id: Number(id) }), 'Mas’ul operator yangilandi.'); }}><option value="">O‘zgartirish…</option>{ops.filter(o => o.active).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
  </article>)}</div>{!data.rows.length && <p>Bu filtrda cheklar yo‘q.</p>}<div className="flex gap-2"><button className="ui-button ui-button--secondary" disabled={!offset || loading} onClick={() => setOffset(Math.max(0, offset - 50))}>Oldingi</button><button className="ui-button ui-button--secondary" disabled={!data.more || loading} onClick={() => setOffset(offset + 50)}>Keyingi</button></div></>}
  {tab === 'reports' && !loading && <div className="space-y-5"><h2 className="font-bold">Cheklar va summalar — tanlangan davr va filtrlar</h2><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Operator', 'Valyuta', 'Holat', 'Mijozlar', 'Cheklar', 'Summa'].map(x => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{data.summary.map((r: any, i: number) => <tr className="border-t" key={i}>{[r.name, r.currency, names[r.status], r.clients, r.receipts, r.amount].map((x, j) => <td className="p-3" key={j}>{x}</td>)}</tr>)}</tbody></table></div>
   <h2 className="font-bold">Joriy qarzlar — mas’ul operator bo‘yicha, barcha sanalar</h2><div className="grid md:grid-cols-2 gap-3">{data.debts.map((r: any, i: number) => <div className="border rounded-xl p-4" key={i}><strong>{r.name} · {r.currency}</strong><p>Mijozlar {r.clients} · shartnomalar {r.contracts}</p><p>Qarz {r.debt} · muddati o‘tgan {r.overdue || 0}</p><p>Qoplangan {r.settled} · muzlatilgan {r.frozen}</p></div>)}</div>
   <h2 className="font-bold">Xizmat ko‘rsatish — tanlangan davr</h2>{data.activity.map((r: any) => <p key={r.operator_id}>{r.name}: {r.clients} mijoz, {r.actions} amal</p>)}
  </div>}
  {tab === 'accounts' && <><form className="border rounded-xl p-4 grid md:grid-cols-4 gap-3" onSubmit={e => { e.preventDefault(); void run(async () => { await post('/operators', form); setForm({ name: '', login: '', password: '' }); }, 'Operator yaratildi. Login va parolni operatorga shaxsiy yetkazing.'); }}>{(['name', 'login', 'password'] as const).map(k => <input className="p-2 border rounded text-slate-900 bg-white" required key={k} type={k === 'password' ? 'password' : 'text'} autoComplete="off" minLength={k === 'password' ? 12 : 3} maxLength={k === 'password' ? 72 : 100} placeholder={k === 'name' ? 'Operator ismi' : k === 'login' ? 'Login' : 'Parol (12+ belgi)'} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}/>)}<button className="ui-button ui-button--primary" disabled={busy}>Operator yaratish</button></form>
   {ops.map(o => <div key={o.id} className="border rounded-xl p-4 space-y-2"><strong>{o.name} · {o.login}</strong><p>Telegram ID: {o.telegram_id || 'Hali kirmagan'} · {o.active ? 'Faol' : 'O‘chirilgan'}</p><div className="flex flex-wrap gap-2">{[[o.active ? 'disable' : 'enable', o.active ? 'O‘chirish' : 'Faollashtirish'], ['unbind', 'Telegram bog‘lanishini uzish'], ['password', 'Parolni yangilash']].map(([action, label]) => <button className="ui-button ui-button--secondary" disabled={busy} key={action} onClick={() => { if (action === 'password') {
            const password = window.prompt('Yangi parol (12–72 belgi, harf va raqam):');
            if (password)
                void run(() => post(`/operators/${o.id}`, { action, password }), 'Parol yangilandi.');
        }
        else if (window.confirm(`${o.name}: ${label}? Ochiq operator sessiyasi tugatiladi.`))
            void run(() => post(`/operators/${o.id}`, { action }), 'Operator yangilandi.'); }}>{label}</button>)}</div></div>)}
  </>}
  {tab === 'audit' && !loading && <><div className="overflow-auto"><table className="text-sm w-full"><thead><tr>{['Vaqt', 'Operator', 'Admin', 'Mijoz', 'Amal', 'Tafsilot'].map(x => <th className="text-left p-2" key={x}>{x}</th>)}</tr></thead><tbody>{audit.map(a => <tr className="border-t" key={a.id}>{[fmt(a.created_at), a.operator_name || '—', a.admin_id || '—', a.user_id || '—', a.action, JSON.stringify(a.detail)].map((x, i) => <td className="p-2 max-w-xs break-words" key={i}>{x}</td>)}</tr>)}</tbody></table></div><button disabled={!offset} className="ui-button ui-button--secondary" onClick={() => setOffset(Math.max(0, offset - 100))}>Oldingi</button><button disabled={audit.length < 100} className="ui-button ui-button--secondary" onClick={() => setOffset(offset + 100)}>Keyingi</button></>}
  {decision && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form role="dialog" aria-modal="true" aria-label="To‘lov qarori" className="bg-white text-slate-900 rounded-2xl p-6 max-w-md w-full space-y-4" onSubmit={e => { e.preventDefault(); void run(async () => { await post(`/receipts/${decision.r.id}/decision`, { decision: decision.kind, reason }); setDecision(null); }, 'Qaror saqlandi. Operatorga xabar yuboriladi.'); }}><h2 className="font-bold">Chek #{decision.r.id} — {decision.r.amount} {decision.r.currency}</h2><p>{decision.kind === 'approved' ? 'Tasdiqlash haqiqiy to‘lovni hisobga oladi. Birinchi tasdiq tarifni faollashtiradi.' : 'Chek rad etiladi, qarz kamaymaydi.'}</p><textarea className="border rounded p-2 w-full" maxLength={500} required={decision.kind === 'rejected'} minLength={decision.kind === 'rejected' ? 3 : undefined} value={reason} onChange={e => setReason(e.target.value)} placeholder="Sabab / izoh"/><div className="flex gap-2"><button className="ui-button ui-button--primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : decision.kind === 'approved' ? 'To‘lovni tasdiqlash' : 'Rad etish'}</button><button type="button" className="ui-button ui-button--secondary" disabled={busy} onClick={() => setDecision(null)}>Bekor qilish</button></div></form></div>}
 </div>;
}
