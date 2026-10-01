import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion';

export default function TrialDayFeedback() {
  const { user } = useAuth();
  const { rows, loaded, practicePromptCountByDay } = useKunlikProgress();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const key = `trial-feedback:${user?.id}`;
  const row = rows.get(0);
  const complete = loaded && row && isKunlikDayRowFullyComplete(row, practicePromptCountByDay);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(key) === 'seen'; } catch { /* Storage can be disabled. */ }
    if (complete && !dismissed && !seen && !dialog.current?.open) dialog.current?.showModal();
  }, [complete, dismissed, key]);
  const close = () => {
    try { localStorage.setItem(key, 'seen'); } catch { /* Keep the in-memory state. */ }
    setDismissed(true); dialog.current?.close();
  };
  return <dialog ref={dialog} onCancel={close} aria-labelledby="trial-feedback-title" className="fixed inset-0 m-auto w-[calc(100%_-_32px)] max-w-sm rounded-lg border border-app-border bg-app-surface p-6 text-app-text shadow-xl backdrop:bg-black/60">
    <button type="button" aria-label="Yopish" onClick={close} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500"><X size={22} /></button>
    <h2 id="trial-feedback-title" className="pr-8 text-xl font-bold">Sinov darsi sizga yoqdimi?</h2>
    <div className="mt-5 flex flex-col gap-3"><button onClick={() => { close(); navigate('/kurs-haqida'); }} className="min-h-12 rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white">Ha, yoqdi</button></div>
  </dialog>;
}
