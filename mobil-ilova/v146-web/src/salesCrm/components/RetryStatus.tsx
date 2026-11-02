import { Clock3, PhoneMissed } from 'lucide-react';
import type { LeadRow } from '../api';

export default function RetryStatus({ lead }: { lead: LeadRow }) {
  const attempts = Number(lead.no_answer_attempts) || 0;
  if (!attempts) return null;
  const waiting = lead.status === 'NO_ANSWER' && lead.no_answer_retry_at;
  const retry = waiting ? new Date(waiting).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }) : null;
  return (
    <div className="mt-2 space-y-1 text-xs font-medium text-slate-600">
      <p className="flex items-center gap-1.5"><PhoneMissed size={14} aria-hidden="true" />{attempts}/5 javobsiz</p>
      {retry ? <p className="flex items-center gap-1.5 text-amber-800"><Clock3 size={14} aria-hidden="true" />Yangi: {retry}</p> : null}
      {lead.status === 'NEW' && attempts < 5 ? <p className="text-blue-700">{attempts + 1}-qo‘ng‘iroq</p> : null}
    </div>
  );
}
