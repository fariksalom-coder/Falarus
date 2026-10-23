/**
 * O'quvchi: platforma orqali to'langan darslar. Vaqtida «Darsga kirish» (FalaRus xonasi),
 * boshlanishigacha bekor qilish (pul qaytariladi), dars bo'lmasa — muammo bildirish.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Loader2, Video, X } from 'lucide-react';
import { LESSON_STATUS_LABEL, canCancel, canDispute } from '../../../shared/teacherLessons';
import { cancelLesson, disputeLesson, fmtSum, getMyLessons, roomOpen, type TeacherLesson } from '../../api/teacherLessons';

const WD = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const when = (iso: string) => { const d = new Date(iso); return `${WD[d.getDay()]}, ${d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`; };

export default function MyLessonsPanel({ token }: { token: string | null }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TeacherLesson[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => { if (token) getMyLessons(token).then(setRows).catch(() => setRows([])); }, [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(id); }, []);

  if (!token || !rows || rows.length === 0) return null;

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusy(id); setError('');
    try { await fn(); load(); } catch (e) { setError(e instanceof Error ? e.message : 'Xatolik'); } finally { setBusy(null); }
  };

  return (
    <section className="mb-4 overflow-hidden rounded-[24px] border border-app-border bg-app-surface shadow-[0_14px_34px_rgba(148,163,184,0.12)]">
      <h2 className="border-b border-app-border px-4 py-3 text-[15px] font-black text-app-text">Darslarim</h2>
      {error && <p role="alert" className="mx-4 mt-3 rounded-xl bg-app-danger-bg px-3 py-2 text-sm font-semibold text-app-danger">{error}</p>}
      <ul className="divide-y divide-app-border">
        {rows.map((l) => {
          const open = (l.status === 'paid' || l.status === 'disputed') && roomOpen(l, now);
          return (
            <li key={l.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-app-text">{l.teacher_first_name} {l.teacher_last_name}</p>
                  <p className="flex items-center gap-1.5 text-sm text-app-text-muted"><Clock className="h-3.5 w-3.5" />{when(l.starts_at)} · {fmtSum(l.price_uzs)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black ${l.status === 'completed' ? 'bg-[#E7F6EC] text-[#177A3C]' : l.status === 'paid' ? 'bg-[#EEF4FF] text-[#1D4ED8]' : 'bg-slate-100 text-slate-700'}`}>
                  {LESSON_STATUS_LABEL[l.status].uz}{l.refund_due && !l.refunded_at ? ' · qaytariladi' : ''}
                </span>
              </div>
              {(l.status === 'paid' || l.status === 'disputed') && (
                <button type="button" disabled={!open} onClick={() => navigate(`/dars/l/${l.id}`)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-[14px] font-black text-white transition active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500">
                  <Video className="h-4 w-4" />{open ? 'Darsga kirish' : 'Xona dars boshlanishidan 10 daqiqa oldin ochiladi'}
                </button>
              )}
              <div className="flex flex-wrap gap-2">
                {canCancel(l.status, l.starts_at, now) && (
                  <button type="button" disabled={busy === l.id}
                    onClick={() => window.confirm(l.status === 'paid' ? 'Darsni bekor qilasizmi? Toʻlov qaytariladi.' : 'Bronni bekor qilasizmi?') && void act(l.id, () => cancelLesson(token, l.id, ''))}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-app-border px-3 text-[13px] font-bold text-app-text">
                    {busy === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}Bekor qilish
                  </button>
                )}
                {canDispute(l.status, l.starts_at, l.ends_at, now) && (
                  <button type="button" disabled={busy === l.id}
                    onClick={() => { const r = window.prompt('Nima boʻldi? (masalan: ustoz kelmadi)'); if (r) void act(l.id, () => disputeLesson(token, l.id, r)); }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-300 px-3 text-[13px] font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4" />Dars boʻlmadi
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
