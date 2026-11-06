import { useState } from 'react';
import { requireAIConsent } from '../utils/aiConsent';

/** An explicit action may reopen consent; ordinary retries never override refusal. */
export default function AIConsentRecovery({ error, onAllowed }: { error: string | null; onAllowed?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!error || !/AI.*ruxsat/i.test(error)) return null;
  return <div className="mt-2 text-sm">
    <button type="button" disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 font-semibold text-white disabled:opacity-50" onClick={async () => {
      setBusy(true); setMessage('');
      try { await requireAIConsent(true); onAllowed?.(); }
      catch (e) { setMessage(e instanceof Error ? e.message : 'Ruxsat berilmadi.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Kutilmoqda…' : 'AI ruxsatini sozlash'}</button>
    {message && <p role="status" className="mt-1 text-red-700">{message}</p>}
  </div>;
}
