import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Columns3, List, Search, X } from 'lucide-react';
import { salesCrmApi, type LeadRow } from '../api';
import KanbanBoard, { OperatorBadge, type StageMovePayload } from '../components/KanbanBoard';
import { useSalesCrmAuth } from '../auth';
import { SALES_CRM_STATUS_LABELS, type SalesCrmStatus } from '../../../shared/salesCrm';
import RetryStatus from '../components/RetryStatus';

export default function LeadsPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 'list' : 'board';
  const flow = params.get('flow') === 'platform' ? 'platform' : 'promo';
  const [items, setItems] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const q = params.get('q') || '';
  const requestId = useRef(0);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { agent } = useSalesCrmAuth();
  const isAdmin = agent?.role === 'admin';

  const load = useCallback(async (silent = false) => {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    setErr('');
    try {
      const p = new URLSearchParams();
      const status = params.get('status');
      const nextContact = params.get('nextContact');
      p.set('flow', flow);
      if (view === 'list' && status) p.set('status', status);
      if (nextContact) p.set('nextContact', nextContact);
      if (q.trim()) p.set('q', q.trim());
      p.set('page', '1');
      p.set('pageSize', view === 'board' ? '500' : '40');
      const r = await salesCrmApi.leads(p.toString());
      if (id !== requestId.current) return;
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      if (id === requestId.current) setErr(e instanceof Error ? e.message : 'Xato');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [flow, params, q, view]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => void load(), 250);
    return () => { clearTimeout(timer); requestId.current++; };
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && busyId === null) void load(true);
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load, busyId]);

  function search(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
  }

  async function moveLead(payload: StageMovePayload) {
    const { leadId, status, comment, nextContactAt } = payload;
    setBusyId(leadId);
    setErr('');
    const prev = items;
    setItems((cur) =>
      cur.map((l) =>
        Number(l.id) === leadId
          ? {
              ...l,
              status,
              next_contact_at: nextContactAt ?? l.next_contact_at,
            }
          : l,
      ),
    );
    try {
      await salesCrmApi.setStatus(leadId, status, { comment, nextContactAt });
      await load();
    } catch (e) {
      setItems(prev);
      const msg = e instanceof Error ? e.message : 'Status o‘zgarmadi';
      if ((e as { code?: string }).code === 'CONFIRM_PAID_DOWNGRADE') {
        const ok = window.confirm('Bu lid TO‘LAGAN. Statusni o‘zgartirasizmi?');
        if (ok) {
          try {
            await salesCrmApi.setStatus(leadId, status, {
              confirmPaidDowngrade: true,
              comment,
              nextContactAt,
            });
            await load();
            return;
          } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : msg);
            return;
          }
        }
      }
      setErr(msg);
      throw e;
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSupportGroup(leadId: number, done: boolean) {
    setBusyId(leadId);
    setErr('');
    try {
      await salesCrmApi.setMilestone(leadId, 'support_group', done);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Bosqich o‘zgarmadi');
    } finally {
      setBusyId(null);
    }
  }

  function setView(next: 'board' | 'list') {
    const n = new URLSearchParams(params);
    if (next === 'list') n.set('view', 'list');
    else n.delete('view');
    setParams(n);
  }

  function setFlow(nextFlow: 'promo' | 'platform') {
    const n = new URLSearchParams(params);
    if (nextFlow === 'platform') n.set('flow', 'platform');
    else n.delete('flow');
    n.delete('status');
    n.delete('nextContact');
    n.delete('page');
    setParams(n);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex min-h-[36px] items-center justify-between gap-3">
          <h2 className="text-xl font-black">Lidlar</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black tabular-nums text-slate-700">
            {loading ? '...' : total}
          </span>
        </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(260px,360px)_auto_minmax(260px,320px)] lg:items-center">
          <div className="grid grid-cols-2 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => setFlow('promo')}
              className={`min-h-10 rounded-xl px-3 text-xs font-black transition ${
                flow === 'promo' ? 'bg-[#071B3A] text-white' : 'text-slate-600'
              }`}
            >
              Sayt lidlari
            </button>
            <button
              type="button"
              onClick={() => setFlow('platform')}
              className={`min-h-10 rounded-xl px-3 text-xs font-black transition ${
                flow === 'platform' ? 'bg-[#071B3A] text-white' : 'text-slate-600'
              }`}
            >
              Platforma lidlari
            </button>
          </div>
          <div className="grid grid-cols-2 rounded-2xl bg-white p-1 ring-1 ring-slate-200 lg:w-[184px]">
            <button
              type="button"
              onClick={() => setView('board')}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold ${
                view === 'board' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              <Columns3 size={14} />
              Doska
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold ${
                view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              <List size={14} />
              Ro‘yxat
            </button>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
            <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input type="search" value={q} onChange={e => search(e.target.value)} maxLength={160}
              aria-label="Поиск по телефону, имени или фамилии" placeholder="Telefon, ism yoki familiya…"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            {q && <button type="button" onClick={() => search('')} aria-label="Очистить поиск" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500"><X size={18}/></button>}
          </div>
        </div>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {loading ? <p role="status" className="text-sm text-slate-500">Yuklanmoqda…</p> : <p role="status" className="text-sm text-slate-500">{q.trim() ? `Topildi: ${total} ta` : `${total} ta lid`}</p>}
      {!loading && !err && q.trim() && items.length === 0 && view === 'board' && <p className="rounded-2xl bg-white p-6 text-center text-slate-500">Lid topilmadi. Ism, familiya yoki telefonni tekshiring.</p>}

      {view === 'board' ? (
        !loading ? (
          <KanbanBoard
            leads={items}
            busyId={busyId}
            flow={flow}
            onMove={moveLead}
            onSupportGroup={toggleSupportGroup}
            showOperator={isAdmin}
          />
        ) : null
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto px-0.5 py-1.5 [scrollbar-width:thin]">
            {[
              { key: '', label: 'Hammasi' },
              { key: 'NEW', label: 'Yangi' },
              { key: 'NO_ANSWER', label: 'Ko‘tarmadi' },
              { key: 'LOW_QUALITY', label: 'Sifatsiz lidlar' },
              { key: 'INVALID_PHONE', label: 'Noto‘g‘ri raqam' },
              { key: 'CALLBACK', label: 'Keyinroq' },
              { key: 'THINKING', label: 'O‘ylab' },
              { key: 'PAYMENT_PENDING', label: 'To‘laydi' },
              { key: 'FOLLOW_UP', label: 'Muammo' },
              { key: 'PAID', label: 'To‘ladi' },
              { key: 'NOT_INTERESTED', label: 'Rad' },
            ].map((f) => (
              <button
                key={f.key || 'all'}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  if (f.key) next.set('status', f.key);
                  else next.delete('status');
                  next.delete('page');
                  setParams(next);
                }}
                className={`min-h-9 shrink-0 rounded-xl px-4 text-[13px] font-black shadow-sm transition ${
                  (params.get('status') || '') === f.key
                    ? 'bg-[#071B3A] text-white ring-1 ring-[#071B3A]'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {!loading && items.map((lead) => (
              <Link
                key={lead.id}
                to={`/leads/${lead.id}`}
                className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Nomsiz'}
                    </p>
                    <RetryStatus lead={lead} />
                    <p className="mt-0.5 text-sm text-slate-500">
                      {lead.phone || lead.phone_normalized}
                    </p>
                    {isAdmin ? (
                      <div className="mt-1.5 flex">
                        <OperatorBadge lead={lead} />
                      </div>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                    {SALES_CRM_STATUS_LABELS[lead.status as SalesCrmStatus] || lead.status}
                  </span>
                </div>
              </Link>
            ))}
            {!loading && items.length === 0 ? (
              <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                Lid topilmadi
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
