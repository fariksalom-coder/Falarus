import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  SALES_CRM_KANBAN_COLUMNS,
  SALES_CRM_STATUS_LABELS,
  formatSalesPhone,
  kanbanColumnById,
  kanbanColumnIdForStatus,
  toDatetimeLocalValue,
  type SalesCrmKanbanColumn,
  type SalesCrmStatus,
} from '../../../shared/salesCrm';
import type { LeadRow } from '../api';

type SiteMilestoneColumn = {
  id: 'access' | 'first_login' | 'support_group';
  title: string;
  hint: string;
  tone: SalesCrmKanbanColumn['tone'];
};

const SITE_MILESTONE_COLUMNS: SiteMilestoneColumn[] = [
  {
    id: 'access',
    title: 'Kirish berildi',
    hint: 'To‘lovdan keyin platformaga kirish ochildi',
    tone: 'emerald',
  },
  {
    id: 'first_login',
    title: 'Birinchi kirish',
    hint: 'O‘quvchi platformaga birinchi marta kirdi',
    tone: 'sky',
  },
  {
    id: 'support_group',
    title: 'Guruhga qo‘shildi',
    hint: 'Premium qo‘llab-quvvatlash guruhida',
    tone: 'violet',
  },
];

type BoardColumn = SalesCrmKanbanColumn | SiteMilestoneColumn;

const TONE: Record<
  SalesCrmKanbanColumn['tone'],
  { col: string; head: string; badge: string; drop: string }
> = {
  slate: {
    col: 'bg-slate-100/80',
    head: 'text-slate-700',
    badge: 'bg-slate-200 text-slate-700',
    drop: 'ring-2 ring-slate-400 bg-slate-50',
  },
  blue: {
    col: 'bg-blue-50/90',
    head: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-800',
    drop: 'ring-2 ring-blue-400 bg-blue-50',
  },
  sky: {
    col: 'bg-sky-50/90',
    head: 'text-sky-800',
    badge: 'bg-sky-100 text-sky-800',
    drop: 'ring-2 ring-sky-400 bg-sky-50',
  },
  amber: {
    col: 'bg-amber-50/90',
    head: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-900',
    drop: 'ring-2 ring-amber-400 bg-amber-50',
  },
  violet: {
    col: 'bg-violet-50/90',
    head: 'text-violet-900',
    badge: 'bg-violet-100 text-violet-900',
    drop: 'ring-2 ring-violet-400 bg-violet-50',
  },
  emerald: {
    col: 'bg-emerald-50/90',
    head: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-900',
    drop: 'ring-2 ring-emerald-400 bg-emerald-50',
  },
  rose: {
    col: 'bg-rose-50/80',
    head: 'text-rose-900',
    badge: 'bg-rose-100 text-rose-900',
    drop: 'ring-2 ring-rose-400 bg-rose-50',
  },
  orange: {
    col: 'bg-orange-50/90',
    head: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-900',
    drop: 'ring-2 ring-orange-400 bg-orange-50',
  },
};

export type StageMovePayload = {
  leadId: number;
  status: SalesCrmStatus;
  comment?: string;
  nextContactAt?: string | null;
};

type Props = {
  leads: LeadRow[];
  busyId: number | null;
  flow?: 'promo' | 'platform';
  onMove: (payload: StageMovePayload) => Promise<void>;
  onSupportGroup?: (leadId: number, done: boolean) => Promise<void>;
};

export type PendingMove = {
  lead: LeadRow;
  column: SalesCrmKanbanColumn;
};

function defaultNextLocal(hoursFromNow = 2): string {
  return toDatetimeLocalValue(new Date(Date.now() + hoursFromNow * 3600_000));
}

export default function KanbanBoard({ leads, busyId, flow = 'platform', onMove, onSupportGroup }: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);

  const byColumn = useMemo(() => {
    const map = new Map<string, LeadRow[]>();
    const columns = flow === 'promo'
      ? [...SALES_CRM_KANBAN_COLUMNS, ...SITE_MILESTONE_COLUMNS]
      : SALES_CRM_KANBAN_COLUMNS;
    for (const col of columns) map.set(col.id, []);
    for (const lead of leads) {
      const id =
        flow === 'promo' && lead.support_group_at
          ? 'support_group'
          : flow === 'promo' && lead.first_login_at
            ? 'first_login'
            : flow === 'promo' && lead.access_at
              ? 'access'
              : kanbanColumnIdForStatus(lead.status);
      (map.get(id) ?? map.get('new')!).push(lead);
    }
    return map;
  }, [flow, leads]);

  function requestMove(lead: LeadRow, column: SalesCrmKanbanColumn) {
    if (column.group.includes(lead.status as SalesCrmStatus) && lead.status === column.dropStatus) {
      return;
    }
    if (column.requireComment || column.requireNextContact) {
      setPending({ lead, column });
      return;
    }
    void onMove({ leadId: Number(lead.id), status: column.dropStatus });
  }

  function onDragStart(e: DragEvent, leadId: number) {
    setDraggingId(leadId);
    e.dataTransfer.setData('text/plain', String(leadId));
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragEnd() {
    setDraggingId(null);
    setOverCol(null);
  }

  function dropOnColumn(columnId: string, e: DragEvent) {
    e.preventDefault();
    const leadId = Number(e.dataTransfer.getData('text/plain'));
    setOverCol(null);
    setDraggingId(null);
    if (!Number.isFinite(leadId)) return;
    const col = kanbanColumnById(columnId);
    const lead = leads.find((l) => Number(l.id) === leadId);
    if (!col || !lead) return;
    requestMove(lead, col);
  }

  return (
    <>
      <div className="relative flex h-[calc(100svh-250px)] min-h-[360px] max-h-[680px] gap-3 overflow-x-auto pb-3 pt-1 [scrollbar-width:thin] md:h-[calc(100vh-245px)] md:min-h-[520px] md:max-h-[760px]">
        {(flow === 'promo' ? [...SALES_CRM_KANBAN_COLUMNS, ...SITE_MILESTONE_COLUMNS] : SALES_CRM_KANBAN_COLUMNS).map((col) => {
          const items = byColumn.get(col.id) ?? [];
          const tone = TONE[col.tone];
          const isOver = overCol === col.id;
          const canDrop = 'dropStatus' in col;
          return (
            <section
              key={col.id}
              onDragOver={(e) => {
                if (!canDrop) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOverCol(col.id);
              }}
              onDragLeave={() => setOverCol((cur) => (cur === col.id ? null : cur))}
              onDrop={(e) => {
                if (canDrop) dropOnColumn(col.id, e);
              }}
              className={`flex h-full w-[min(78vw,250px)] shrink-0 flex-col rounded-2xl md:w-[260px] ${tone.col} ${
                isOver ? tone.drop : 'ring-1 ring-black/5'
              } transition`}
            >
              <header className="px-3 pb-2 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm font-black ${tone.head}`}>{col.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${tone.badge}`}>
                    {items.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{col.hint}</p>
              </header>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
                {items.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    dragging={draggingId === Number(lead.id)}
                    busy={busyId === Number(lead.id)}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onPickStage={(status) => {
                      const target =
                        SALES_CRM_KANBAN_COLUMNS.find((c) => c.dropStatus === status) ||
                        SALES_CRM_KANBAN_COLUMNS.find((c) => c.group.includes(status));
                      if (target) requestMove(lead, { ...target, dropStatus: status });
                    }}
                    onSupportGroup={
                      flow === 'promo' && onSupportGroup
                        ? (done) => onSupportGroup(Number(lead.id), done)
                        : undefined
                    }
                  />
                ))}
                {items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300/80 px-3 py-8 text-center text-xs text-slate-400">
                    {canDrop ? 'Kartani shu yerga torting' : 'Avtomatik bosqich'}
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {pending ? (
        <StageMoveModal
          pending={pending}
          busy={busyId === Number(pending.lead.id)}
          onClose={() => setPending(null)}
          onSubmit={async (payload) => {
            await onMove(payload);
            setPending(null);
          }}
        />
      ) : null}
    </>
  );
}

function KanbanCard({
  lead,
  dragging,
  busy,
  onDragStart,
  onDragEnd,
  onPickStage,
  onSupportGroup,
}: {
  lead: LeadRow;
  dragging: boolean;
  busy: boolean;
  onDragStart: (e: DragEvent, leadId: number) => void;
  onDragEnd: () => void;
  onPickStage: (status: SalesCrmStatus) => void;
  onSupportGroup?: (done: boolean) => Promise<void>;
}) {
  const name =
    [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || 'Nomsiz';
  const phone = formatSalesPhone(lead.phone || lead.phone_normalized);
  const sourceParts = [lead.source, lead.utm_source, lead.campaign || lead.utm_content || lead.ad].filter(Boolean);
  const sourceLabel = sourceParts.join(' · ');
  const created = lead.created_at
    ? new Date(lead.created_at).toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const overdue =
    lead.next_contact_at &&
    new Date(lead.next_contact_at).getTime() < Date.now() &&
    !['PAID', 'ARCHIVED', 'NOT_INTERESTED', 'INVALID_PHONE'].includes(lead.status);

  return (
    <article
      draggable={!busy}
      onDragStart={(e) => onDragStart(e, Number(lead.id))}
      onDragEnd={onDragEnd}
      className={`group relative rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 transition ${
        dragging ? 'scale-[0.98] opacity-40' : 'hover:shadow-md active:scale-[0.99]'
      } ${busy ? 'opacity-60' : ''} cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link to={`/leads/${lead.id}`} className="min-w-0 flex-1" draggable={false}>
          <p className="truncate text-sm font-bold text-slate-900">{name}</p>
          <p className="mt-0.5 font-mono text-[12px] tabular-nums text-slate-600">{phone}</p>
        </Link>
        <a
          href={`tel:${lead.phone_normalized || lead.phone || ''}`}
          draggable={false}
          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white"
        >
          ☎
        </a>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        {sourceLabel ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
            {sourceLabel}
          </span>
        ) : null}
        {created ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">{created}</span>
        ) : null}
        {overdue ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">Muddati o‘tgan</span>
        ) : lead.next_contact_at ? (
          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-600">
            {new Date(lead.next_contact_at).toLocaleString('uz-UZ', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ) : null}
      </div>

      <label className="mt-2 block md:opacity-0 md:transition md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:pointer-coarse:opacity-100">
        <span className="sr-only">Bosqich</span>
        <select
          value={lead.status}
          disabled={busy}
          onChange={(e) => onPickStage(e.target.value as SalesCrmStatus)}
          className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700"
        >
          {SALES_CRM_KANBAN_COLUMNS.map((c) => (
            <option key={c.id} value={c.dropStatus}>
              {c.title}
            </option>
          ))}
          {/* keep exact current status visible if not a dropStatus */}
          {!SALES_CRM_KANBAN_COLUMNS.some((c) => c.dropStatus === lead.status) ? (
            <option value={lead.status}>
              {SALES_CRM_STATUS_LABELS[lead.status as SalesCrmStatus] || lead.status}
            </option>
          ) : null}
        </select>
      </label>

      {onSupportGroup && lead.first_login_at ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSupportGroup(!lead.support_group_at)}
          className={`mt-2 min-h-9 w-full rounded-xl px-3 text-xs font-black transition disabled:opacity-60 ${
            lead.support_group_at
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-[#071B3A] text-white hover:bg-[#0B2550]'
          }`}
        >
          {lead.support_group_at ? 'Guruhdan chiqarish' : 'Guruhga qo‘shildi'}
        </button>
      ) : null}
    </article>
  );
}

const QUICK_TIMES: { label: string; at: () => Date }[] = [
  { label: '+1 soat', at: () => new Date(Date.now() + 3600_000) },
  { label: '+3 soat', at: () => new Date(Date.now() + 3 * 3600_000) },
  { label: 'Ertaga 10:00', at: () => tomorrowAt(10) },
  { label: 'Ertaga 18:00', at: () => tomorrowAt(18) },
];

function tomorrowAt(hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function StageMoveModal({
  pending,
  busy,
  onClose,
  onSubmit,
}: {
  pending: PendingMove;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: StageMovePayload) => Promise<void>;
}) {
  const { lead, column } = pending;
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Lid';
  const [comment, setComment] = useState('');
  const [nextLocal, setNextLocal] = useState(defaultNextLocal(column.id === 'later' ? 2 : 24));
  const [err, setErr] = useState('');
  // On phones autofocus pops the keyboard over the whole sheet before the operator reads it.
  const [focusComment] = useState(() => {
    try {
      return window.matchMedia('(pointer: fine)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [busy, onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (column.requireComment && comment.trim().length < 2) {
      setErr('Izoh yozing');
      return;
    }
    if (column.requireNextContact && !nextLocal) {
      setErr('Aniq sana/vaqt tanlang');
      return;
    }
    try {
      await onSubmit({
        leadId: Number(lead.id),
        status: column.dropStatus,
        comment: comment.trim() || undefined,
        nextContactAt: column.requireNextContact ? new Date(nextLocal).toISOString() : null,
      });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Xato');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={(e) => void submit(e)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-move-title"
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[24px] bg-white shadow-xl ring-1 ring-slate-200 sm:rounded-[24px]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3 sm:pt-5">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{column.title}</p>
          <h3 id="stage-move-title" className="mt-1 break-words text-lg font-black text-slate-900">
            {name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{column.hint}</p>

          {column.requireComment ? (
            <label className="mt-4 block">
              <span className="text-xs font-bold text-slate-600">Izoh *</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={column.commentPlaceholder || 'Qisqa izoh…'}
                className="mt-1 min-h-[96px] w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                autoFocus={focusComment}
              />
            </label>
          ) : null}

          {column.requireNextContact ? (
            <div className="mt-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Keyingi kontakt (aniq vaqt) *</span>
                <input
                  type="datetime-local"
                  value={nextLocal}
                  onChange={(e) => setNextLocal(e.target.value)}
                  className="mt-1 block min-h-12 w-full min-w-0 appearance-none rounded-2xl border border-slate-200 bg-white px-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                />
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {QUICK_TIMES.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    className="min-h-11 rounded-xl bg-slate-100 px-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 active:scale-[0.97]"
                    onClick={() => setNextLocal(toDatetimeLocalValue(q.at()))}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {err ? <p className="mt-3 text-sm font-semibold text-red-600">{err}</p> : null}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-12 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-700 transition active:scale-[0.98] disabled:opacity-60"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 flex-1 rounded-2xl bg-blue-600 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}
