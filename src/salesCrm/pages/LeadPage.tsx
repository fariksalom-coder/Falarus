import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { salesCrmApi, type LeadDetail, type OperatorRow } from '../api';
import { useSalesCrmAuth } from '../auth';
import {
  SALES_CRM_ANSWERED_RESULTS,
  SALES_CRM_CALL_RESULT_LABELS,
  SALES_CRM_NO_ANSWER_RESULTS,
  SALES_CRM_STATUS_LABELS,
  SALES_CRM_STATUSES,
  type SalesCrmCallResult,
  type SalesCrmStatus,
} from '../../../shared/salesCrm';

function plusHours(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function tonight(): string {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

function tomorrow18(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

export default function LeadPage() {
  const { id } = useParams();
  const leadId = Number(id);
  const { agent } = useSalesCrmAuth();
  const [data, setData] = useState<LeadDetail | null>(null);
  const [ops, setOps] = useState<OperatorRow[]>([]);
  const [err, setErr] = useState('');
  const [comment, setComment] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [result, setResult] = useState<SalesCrmCallResult>('no_answer');
  const [nextAt, setNextAt] = useState('');
  const [busy, setBusy] = useState(false);

  const tel = useMemo(() => {
    const raw = String(data?.lead.phone || data?.lead.phone_normalized || '');
    const digits = raw.replace(/\D+/g, '');
    return digits ? `tel:+${digits}` : null;
  }, [data]);

  async function reload() {
    const d = await salesCrmApi.lead(leadId);
    setData(d);
  }

  useEffect(() => {
    if (!Number.isFinite(leadId)) return;
    void reload().catch((e) => setErr(e instanceof Error ? e.message : 'Xato'));
    if (agent?.role === 'admin') {
      void salesCrmApi.operators().then((r) => setOps(r.items.filter((o) => o.role === 'operator')));
    }
  }, [leadId, agent?.role]);

  async function onCallResult(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const answered = (SALES_CRM_ANSWERED_RESULTS as readonly string[]).includes(result);
      await salesCrmApi.call(leadId, {
        answered,
        result,
        comment: comment || undefined,
        nextContactAt: nextAt || null,
      });
      setComment('');
      setNextAt('');
      await reload();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Xato');
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-slate-500">{err || 'Yuklanmoqda…'}</p>;
  }

  const lead = data.lead;
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Nomsiz';

  return (
    <div className="space-y-4">
      <Link to="/leads" className="text-sm font-semibold text-blue-600">
        ← Lidlar
      </Link>

      <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{name}</h2>
            <p className="mt-1 text-sm text-slate-500">{lead.phone || lead.phone_normalized}</p>
            <p className="mt-2 text-xs text-slate-500">
              Manba: {String(lead.source || '—')} ·{' '}
              {new Date(String(lead.created_at)).toLocaleString('uz-UZ')}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {SALES_CRM_STATUS_LABELS[lead.status as SalesCrmStatus] || String(lead.status)}
          </span>
        </div>

        {!lead.next_contact_at && !['PAID', 'ARCHIVED', 'NOT_INTERESTED'].includes(String(lead.status)) ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            ⚠ Keyingi amal yo‘q
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {tel ? (
            <a
              href={tel}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white"
            >
              <Phone size={18} /> Qo‘ng‘iroq
            </a>
          ) : (
            <span className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">
              Telefon yo‘q
            </span>
          )}
          <select
            className="min-h-12 rounded-2xl border border-slate-200 px-3 text-sm font-semibold"
            value={String(lead.status)}
            onChange={(e) => {
              const status = e.target.value;
              void (async () => {
                try {
                  await salesCrmApi.setStatus(leadId, status);
                  await reload();
                } catch (ex) {
                  const errObj = ex as Error & { code?: string };
                  if (errObj.code === 'CONFIRM_PAID_DOWNGRADE') {
                    if (window.confirm('PAID statusni o‘zgartirasizmi?')) {
                      await salesCrmApi.setStatus(leadId, status, { confirmPaidDowngrade: true });
                      await reload();
                    }
                  } else setErr(errObj.message);
                }
              })();
            }}
          >
            {SALES_CRM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SALES_CRM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {agent?.role === 'admin' ? (
          <label className="mt-3 block text-xs font-bold text-slate-600">
            Operator
            <select
              className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
              value={lead.assigned_operator_id ?? ''}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                void salesCrmApi.assign(leadId, v).then(reload);
              }}
            >
              <option value="">Tayinlanmagan</option>
              {ops.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <form onSubmit={onCallResult} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-sm font-bold">Qo‘ng‘iroq natijasi</h3>
        <select
          className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
          value={result}
          onChange={(e) => setResult(e.target.value as SalesCrmCallResult)}
        >
          <optgroup label="Javob yo‘q">
            {SALES_CRM_NO_ANSWER_RESULTS.map((r) => (
              <option key={r} value={r}>
                {SALES_CRM_CALL_RESULT_LABELS[r]}
              </option>
            ))}
          </optgroup>
          <optgroup label="Javob berdi">
            {SALES_CRM_ANSWERED_RESULTS.map((r) => (
              <option key={r} value={r}>
                {SALES_CRM_CALL_RESULT_LABELS[r]}
              </option>
            ))}
          </optgroup>
        </select>

        {(SALES_CRM_NO_ANSWER_RESULTS as readonly string[]).includes(result) ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: '2 soat', at: plusHours(2) },
              { label: 'Kechqurun', at: tonight() },
              { label: 'Ertaga', at: tomorrow18() },
              { label: '2 kun', at: plusHours(48) },
              { label: '5 kun', at: plusHours(120) },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => setNextAt(b.at)}
                className={`min-h-10 rounded-full px-3 text-xs font-bold ${
                  nextAt === b.at ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        ) : null}

        <label className="mt-3 block text-xs font-bold text-slate-600">
          Keyingi kontakt
          <input
            type="datetime-local"
            className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
            value={nextAt ? toLocalInput(nextAt) : ''}
            onChange={(e) => setNextAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-slate-600">
          Izoh
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>

        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60"
        >
          Saqlash
        </button>
      </form>

      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-sm font-bold">Tarix</h3>
        <ul className="mt-3 space-y-3">
          {data.events.map((ev) => (
            <li key={ev.id} className="border-l-2 border-slate-200 pl-3 text-sm">
              <p className="text-[11px] text-slate-400">
                {new Date(ev.created_at).toLocaleString('uz-UZ')}
                {ev.actor_name ? ` · ${ev.actor_name}` : ''}
              </p>
              <p className="font-semibold">{ev.event_type}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-sm font-bold">Izohlar</h3>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!quickNote.trim()) return;
            void salesCrmApi.comment(leadId, quickNote).then(() => {
              setQuickNote('');
              return reload();
            });
          }}
        >
          <input
            className="min-h-11 flex-1 rounded-2xl border border-slate-200 px-3 text-sm"
            placeholder="Yangi izoh…"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
          />
          <button type="submit" className="min-h-11 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white">
            +
          </button>
        </form>
        <ul className="mt-3 space-y-2">
          {data.comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <p className="text-[11px] text-slate-400">
                {new Date(c.created_at).toLocaleString('uz-UZ')} · {c.agent_name}
              </p>
              <p>{c.comment}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
