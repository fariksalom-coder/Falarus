import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Card } from '../../components/ui/Foundation';
import CrmDayProgress from '../../components/supportCrm/CrmDayProgress';
import { searchSupportCrmUsers, type SupportCrmSearchRow } from '../../api/supportCrm';
import { supportCrmPath } from '../../constants/supportCrmPath';
import { formatCrmDate, formatLastSeenAgo } from '../../utils/supportCrmFormat';

function fullName(row: SupportCrmSearchRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || `User #${row.id}`;
}

function isPremium(row: SupportCrmSearchRow): boolean {
  return Boolean(row.plan_expires_at && new Date(row.plan_expires_at).getTime() > Date.now());
}

export default function SupportCrmSearchPage() {
  const [params, setParams] = useSearchParams();
  const submittedQuery = params.get('q') ?? '';
  const [draft, setDraft] = useState(submittedQuery);
  const [rows, setRows] = useState<SupportCrmSearchRow[]>([]);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const query = submittedQuery.trim();
    if (!query) {
      setRows([]);
      setError('');
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    searchSupportCrmUsers(query)
      .then((data) => {
        if (id !== requestId.current) return;
        setRows(data.rows);
        setLimit(data.limit);
      })
      .catch((e: unknown) => {
        if (id === requestId.current) setError(e instanceof Error ? e.message : 'Xatolik');
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [submittedQuery]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    setParams(value ? { q: value } : {}, { replace: true });
  }

  function clear() {
    setDraft('');
    setParams({}, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-app-text">Qidiruv</h1>
        <p className="mt-0.5 text-sm text-app-muted">Barcha o‘quvchilar orasidan telefon, ism yoki familiya bo‘yicha.</p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-app-border bg-white px-3 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-100">
          <Search size={18} className="shrink-0 text-app-muted" aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={160}
            aria-label="Telefon, ism yoki familiya"
            placeholder="+998 90 123 45 67 yoki ism…"
            className="min-h-12 min-w-0 flex-1 bg-transparent text-sm text-app-text outline-none"
          />
          {draft ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Tozalash"
              className="flex min-h-11 min-w-11 items-center justify-center text-app-muted hover:text-app-text"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={!draft.trim() || loading}
          className="min-h-12 shrink-0 rounded-2xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] active:scale-[0.98] disabled:opacity-50"
        >
          Qidirish
        </button>
      </form>

      {!submittedQuery.trim() ? (
        <Card className="p-5 text-sm text-app-muted">
          Telefon raqamini (to‘liq yoki bir qismini), ism yoki familiyani yozib «Qidirish»ni bosing.
        </Card>
      ) : loading ? (
        <p className="text-sm text-app-muted">Qidirilmoqda…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-app-danger">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <Card className="p-5 text-sm text-app-muted">«{submittedQuery}» bo‘yicha hech kim topilmadi.</Card>
      ) : (
        <>
          <p className="text-xs text-app-muted">
            {rows.length >= limit ? `Birinchi ${limit} ta natija — aniqroq yozing.` : `${rows.length} ta topildi`}
          </p>
          <ul className="space-y-2.5">
            {rows.map((row) => {
              const premium = isPremium(row);
              return (
                <li key={row.id}>
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
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
