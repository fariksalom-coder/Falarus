import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
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
  onMove: (payload: StageMovePayload) => Promise<void>;
};

type PendingMove = {
  lead: LeadRow;
  column: SalesCrmKanbanColumn;
};

function defaultNextLocal(hoursFromNow = 2): string {
  return toDatetimeLocalValue(new Date(Date.now() + hoursFromNow * 3600_000));
}

export default function KanbanBoard({ leads, busyId, onMove }: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);

  const byColumn = useMemo(() => {
    const map = new Map<string, LeadRow[]>();
    for (const col of SALES_CRM_KANBAN_COLUMNS) map.set(col.id, []);
    for (const lead of leads) {
      const id = kanbanColumnIdForStatus(lead.status);
      (map.get(id) ?? map.get('new')!).push(lead);
    }
    return map;
  }, [leads]);

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
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 [scrollbar-width:thin]">
        {SALES_CRM_KANBAN_COLUMNS.map((col) => {
          const items = byColumn.get(col.id) ?? [];
          const tone = TONE[col.tone];
          const isOver = overCol === col.id;
          return (
            <section
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOverCol(col.id);
              }}
              onDragLeave={() => setOverCol((cur) => (cur === col.id ? null : cur))}
              onDrop={(e) => dropOnColumn(col.id, e)}
              className={`flex w-[min(82vw,260px)] shrink-0 flex-col rounded-[20px] ${tone.col} ${
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

              <div className="flex max-h-[min(70vh,720px)] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
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
                  />
                ))}
                {items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300/80 px-3 py-8 text-center text-xs text-slate-400">
                    Kartani shu yerga torting
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
}: {
  lead: LeadRow;
  dragging: boolean;
  busy: boolean;
  onDragStart: (e: DragEvent, leadId: number) => void;
  onDragEnd: () => void;
  onPickStage: (status: SalesCrmStatus) => void;
}) {
  const name =
    [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || 'Nomsiz';
  const phone = formatSalesPhone(lead.phone || lead.phone_normalized);
  const overdue =
    lead.next_contact_at &&
    new Date(lead.next_contact_at).getTime() < Date.now() &&
    !['PAID', 'ARCHIVED', 'NOT_INTERESTED'].includes(lead.status);

  return (
    <article
      draggable={!busy}
      onDragStart={(e) => onDragStart(e, Number(lead.id))}
      onDragEnd={onDragEnd}
      className={`group rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 transition ${
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
        {lead.source ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
            {lead.source}
          </span>
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

      <label className="mt-2 block md:opacity-0 md:transition md:group-hover:opacity-100">
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
    </article>
  );
}

function StageMoveModal({
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-xl ring-1 ring-slate-200"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{column.title}</p>
        <h3 className="mt-1 text-lg font-black text-slate-900">{name}</h3>
        <p className="mt-1 text-sm text-slate-500">{column.hint}</p>

        {column.requireComment ? (
          <label className="mt-4 block">
            <span className="text-xs font-bold text-slate-600">Izoh *</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={column.commentPlaceholder || 'Qisqa izoh…'}
              className="mt-1 min-h-[88px] w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              autoFocus
            />
          </label>
        ) : null}

        {column.requireNextContact ? (
          <label className="mt-3 block">
            <span className="text-xs font-bold text-slate-600">Keyingi kontakt (aniq vaqt) *</span>
            <input
              type="datetime-local"
              value={nextLocal}
              onChange={(e) => setNextLocal(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { label: '+1 soat', h: 1 },
                { label: '+3 soat', h: 3 },
                { label: 'Ertaga 18:00', h: -1 },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700"
                  onClick={() => {
                    if (q.h < 0) {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(18, 0, 0, 0);
                      setNextLocal(toDatetimeLocalValue(d));
                    } else {
                      setNextLocal(defaultNextLocal(q.h));
                    }
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </label>
        ) : null}

        {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-700"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 flex-1 rounded-2xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60"
          >
            Saqlash
          </button>
        </div>
      </form>
    </div>
  );
}
