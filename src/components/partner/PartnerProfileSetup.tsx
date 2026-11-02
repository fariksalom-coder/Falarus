import { useEffect, useState } from 'react';
import { getPartnerProfile, type PartnerProfile } from '../../api/partner';
import { useAuth } from '../../context/AuthContext';
import PartnerProfileForm from './PartnerProfileForm';

/** iOS ilovasi fonga o'tsa so'rov javobsiz qolishi mumkin — cheksiz «yuklanmoqda» bo'lmasin. */
const LOAD_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Internet sekin. Qayta urinib ko‘ring.')), LOAD_TIMEOUT_MS);
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

/** Load saved answers before allowing edits; failed reads never show an empty form. */
export default function PartnerProfileSetup({ onSaved, onBusyChange }: { onSaved: () => void | Promise<void>; onBusyChange?: (busy: boolean) => void }) {
  const { token } = useAuth();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    if (!token) { setLoading(false); setError('Hisobingizga qayta kiring.'); return; }
    withTimeout(getPartnerProfile(token)).then(p => { if (live) setProfile(p); })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : 'Anketa yuklanmadi'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token, retry]);
  if (loading) return <p role="status" className="py-8 text-center text-app-text-muted">Anketa yuklanmoqda…</p>;
  if (error) return <div role="alert" className="space-y-3 p-4 text-app-text"><p>{error}</p><button className="rounded-xl bg-app-primary px-5 py-3 text-white" onClick={()=>setRetry(n=>n+1)}>Qayta urinish</button></div>;
  return <PartnerProfileForm existing={profile} onSaved={onSaved} onBusyChange={onBusyChange}/>;
}
