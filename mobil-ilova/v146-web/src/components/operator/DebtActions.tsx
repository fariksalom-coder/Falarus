import { useEffect, useId, useRef, useState } from 'react';
import { apiUrl } from '../../api';
import type { DebtDeferral } from '../../../shared/operatorDebt';

export type DebtActionItem = {
  contract_id: number;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  currency: string;
  debt: string;
  pending: string;
  due_at: string | null;
  deferral?: DebtDeferral | null;
};
const dateText = (value: string) => new Date(value).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });

export default function DebtActions({ debt, onSubmitted }: { debt: DebtActionItem; onSubmitted: (message: string) => void }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const [mode, setMode] = useState<'payment' | 'defer' | null>(null);
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [dueAt, setDueAt] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const earliestDue = new Date(Math.max(Date.now(), debt.due_at ? +new Date(debt.due_at) : 0) + 60000 + 5 * 3600000).toISOString().slice(0,16);
  const available = Math.max(0, Number(debt.debt) - Number(debt.pending));

  useEffect(() => {
    if (mode) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mode]);

  function open(next: 'payment' | 'defer') {
    setAmount(available.toFixed(2));
    setReceipt(null);
    setDueAt('');
    setReason('');
    setError('');
    setMode(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      let body: BodyInit;
      const headers = new Headers({ 'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '' });
      if (mode === 'payment') {
        if (!receipt || receipt.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(receipt.type)) {
          throw new Error('Chekni JPG, PNG, WEBP yoki PDF qilib yuklang (8 MB gacha).');
        }
        const form = new FormData();
        form.set('amount', amount);
        form.set('receipt', receipt);
        body = form;
      } else {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify({ dueAt: dueAt.replace('T', ' '), reason });
      }
      const res = await fetch(apiUrl(`/api/operator-mini/contracts/${debt.contract_id}/${mode === 'payment' ? 'payments' : 'deferrals'}`), { method: 'POST', headers, body });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'So‘rov yuborilmadi.');
      setMode(null);
      onSubmitted(mode === 'payment' ? 'Chek administratorga yuborildi. Tasdiqlash kutilmoqda.' : 'Muddatni ko‘chirish so‘rovi administratorga yuborildi. Tasdiqlanmaguncha eski muddat amal qiladi.');
    } catch (e: any) {
      setError(e.message || 'So‘rov yuborilmadi.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return <div className="mt-3 space-y-2">
    {debt.deferral && <p className="rounded-lg bg-slate-50 p-2 text-xs font-semibold text-slate-700">
      {debt.deferral.status === 'pending' ? 'Muddatni ko‘chirish tekshiruvda' : debt.deferral.status === 'approved' ? 'Muddat ko‘chirildi' : 'Muddatni ko‘chirish rad etildi'}: {dateText(debt.deferral.requested_due_at)}
      {debt.deferral.decision_reason && <span className="block">Sabab: {debt.deferral.decision_reason}</span>}
    </p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy || available <= 0} className="min-h-11 rounded-lg bg-[#071B3A] px-3 text-xs font-bold text-white disabled:opacity-50" onClick={() => open('payment')}>To‘lash · chek yuklash</button>
      <button type="button" disabled={busy || debt.deferral?.status === 'pending'} className="min-h-11 rounded-lg border border-slate-300 px-3 text-xs font-bold disabled:opacity-50" onClick={() => open('defer')}>Muddatni ko‘chirish</button>
    </div>
    {available <= 0 && <p className="text-xs text-amber-700">Qarz uchun to‘lov allaqachon tekshiruvda.</p>}
    <dialog ref={dialog} onCancel={event => { if (busy) event.preventDefault(); else setMode(null); }} aria-labelledby={titleId}
      className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-32px)] max-w-sm overflow-auto rounded-2xl bg-white p-5 text-slate-950 shadow-xl backdrop:bg-black/50">
      <form onSubmit={submit} className="space-y-4">
        <h2 id={titleId} className="text-lg font-black">{mode === 'payment' ? 'Qarzga to‘lov' : 'Muddatni ko‘chirish'}</h2>
        <p className="text-sm">#{debt.user_id} · {debt.first_name} {debt.last_name}<br />Shartnoma #{debt.contract_id} · Qarz: {debt.debt} {debt.currency}</p>
        <p className="text-xs text-slate-600">Joriy muddat: {debt.due_at ? dateText(debt.due_at) : '—'}</p>
        {mode === 'payment' ? <>
          <label className="block text-sm font-bold">To‘langan summa ({debt.currency})
            <input required type="number" min="0.01" step="0.01" max={available} value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-bold">Chek (8 MB gacha)
            <input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setReceipt(e.target.files?.[0] || null)} disabled={busy} className="mt-1 block w-full text-xs" />
          </label>
          <p className="text-xs text-slate-600">Qarz faqat admin chekni tasdiqlagandan so‘ng kamayadi.</p>
        </> : <>
          <label className="block text-sm font-bold">Yangi sana va vaqt (Toshkent)
            <input required type="datetime-local" min={earliestDue} value={dueAt} onChange={e => setDueAt(e.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-bold">Mijoz bilan kelishuv / sabab
            <textarea required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <p className="text-xs text-amber-800">Yangi muddat faqat admin tasdiqlagandan so‘ng amal qiladi.</p>
        </>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="min-h-11 w-full rounded-lg bg-[#071B3A] p-3 text-sm font-bold text-white">{busy ? 'Yuborilmoqda…' : 'Adminga yuborish'}</button>
        <button type="button" disabled={busy} onClick={() => setMode(null)} className="min-h-11 w-full rounded-lg border p-3 text-sm">Bekor qilish</button>
      </form>
    </dialog>
  </div>;
}
