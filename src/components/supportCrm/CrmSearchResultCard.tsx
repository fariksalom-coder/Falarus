import { Link } from 'react-router-dom';
import CrmDayProgress from './CrmDayProgress';
import type { SupportCrmSearchRow } from '../../api/supportCrm';
import { supportCrmPath } from '../../constants/supportCrmPath';
import { formatCrmDate, formatLastSeenAgo } from '../../utils/supportCrmFormat';

function fullName(row: SupportCrmSearchRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || `User #${row.id}`;
}

function isPremium(row: SupportCrmSearchRow): boolean {
  return Boolean(row.plan_expires_at && new Date(row.plan_expires_at).getTime() > Date.now());
}

/** One student from the global Support CRM search (any user, not only the queue). */
export default function CrmSearchResultCard({ row }: { row: SupportCrmSearchRow }) {
  const premium = isPremium(row);
  return (
    <Link
      to={supportCrmPath(`/users/${row.id}`)}
      className="block rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-app-border transition hover:ring-[#2563EB]/40 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-app-text">{fullName(row)}</p>
          <p className="mt-1 text-sm font-medium text-app-text">{row.phone || 'Telefon yo‘q'}</p>
        </div>
        <span
          className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-slate-800"
          title={row.last_seen_at ? `Oxirgi kirish: ${new Date(row.last_seen_at).toLocaleString('uz')}` : undefined}
        >
          {formatLastSeenAgo(row.last_seen_at)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CrmDayProgress current_day={row.current_day} completed_days={row.completed_days} />
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
            premium
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
              : 'bg-slate-50 text-app-muted ring-app-border'
          }`}
        >
          {premium ? 'Premium' : 'Obunasiz'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
        <span>ro‘yxatdan o‘tgan {formatCrmDate(row.created_at)}</span>
        {premium ? <span>obuna {formatCrmDate(row.plan_expires_at)} gacha</span> : null}
        {row.email ? <span className="break-all">{row.email}</span> : null}
      </div>
    </Link>
  );
}
