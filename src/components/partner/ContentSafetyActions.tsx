import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { getHelpChats, sendHelpChatMessage } from '../../api/help';
import { readPersonalChatBlocks, savePersonalChatBlocks } from '../../utils/communitySafety';

export default function ContentSafetyActions({ authorId, reference, onBlocked }: {
  authorId: number; reference: string; onBlocked: (id: number) => void;
}) {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    dialog?.querySelector('h2')?.focus();
    return () => { dialog?.close(); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [user?.id]);
  if (!user || !Number.isSafeInteger(authorId) || authorId < 1 || authorId === user.id) return null;
  async function report() {
    if (!token || busy || !reason.trim()) return;
    setBusy(true); setStatus('');
    try {
      const chats = await getHelpChats(token);
      const chat = chats.find(c => c.status === 'open') ?? chats[0];
      if (!chat) throw new Error('Yordam yozishmasi topilmadi. Profil → Yordam orqali murojaat qiling.');
      await sendHelpChatMessage(token, chat.id, `Kontent ustidan shikoyat\n${reference.slice(0, 1200)}\nMuallif ID: ${authorId}\nSabab: ${reason.trim()}`);
      setStatus('Shikoyat administratorga yuborildi.'); setReason('');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Shikoyat yuborilmadi.'); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" className="min-h-11 rounded-xl px-3 text-xs font-semibold" aria-label="Shikoyat qilish yoki muallifni bloklash" onClick={() => { setOpen(true); setStatus(''); }}>Shikoyat / bloklash</button>
    {open ? createPortal(<dialog ref={dialogRef} aria-label="Kontent xavfsizligi" className="m-auto w-[calc(100%_-_40px)] max-w-sm rounded-2xl border-0 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/50" onCancel={event => { event.preventDefault(); if (!busy) setOpen(false); }}>
        <h2 tabIndex={-1} className="font-bold">Shikoyat qilish</h2>
        <textarea aria-label="Shikoyat sababi" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Sababini yozing" className="my-3 w-full rounded-xl border border-slate-200 p-3" />
        {status ? <p role="status" className="mb-3 text-sm">{status}</p> : null}
        <button type="button" disabled={busy || !reason.trim()} onClick={() => void report()} className="mb-2 min-h-11 w-full rounded-xl bg-blue-600 text-white disabled:opacity-50">{busy ? 'Yuborilmoqda…' : 'Shikoyatni yuborish'}</button>
        <button type="button" disabled={busy} className="mb-2 min-h-11 w-full rounded-xl bg-red-50 text-red-700" onClick={() => {
          try {
            savePersonalChatBlocks(localStorage, user.id, [...readPersonalChatBlocks(localStorage, user.id), authorId]);
            onBlocked(authorId); setOpen(false);
          } catch { setStatus('Blok saqlanmadi. Qayta urining.'); }
        }}>Muallifni bloklash</button>
        <button type="button" disabled={busy} className="min-h-11 w-full rounded-xl bg-slate-100" onClick={() => setOpen(false)}>Yopish</button>
    </dialog>, document.body) : null}
  </>;
}
