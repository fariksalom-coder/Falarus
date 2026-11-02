import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, RotateCcw, Save, Trash2, UserRoundCheck } from 'lucide-react';
import { salesCrmApi, type OperatorRow } from '../api';
import { useSalesCrmAuth } from '../auth';

type Form = {
  login: string;
  name: string;
  password: string;
};

const emptyForm: Form = { login: '', name: '', password: '' };

export default function OperatorsPage() {
  const { agent } = useSalesCrmAuth();
  const [items, setItems] = useState<OperatorRow[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await salesCrmApi.operators();
      setItems(res.items.filter((op) => op.role === 'operator'));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Xato');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<void>, message: string) {
    if (busy) return;
    setBusy(true);
    setErr('');
    setNote('');
    try {
      await action();
      setNote(message);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Xato');
    } finally {
      setBusy(false);
    }
  }

  if (agent?.role !== 'admin') {
    return (
      <div className="rounded-[24px] bg-white p-6 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
        Operatorlarni boshqarish faqat admin uchun.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">CRM Admin</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Operatorlar</h2>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700"
          onClick={() => void load()}
          disabled={busy || loading}
        >
          <RotateCcw size={16} />
          Yangilash
        </button>
      </div>

      {err ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{err}</p> : null}
      {note ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{note}</p> : null}

      <form
        className="grid gap-3 rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await salesCrmApi.createOperator(form);
            setForm(emptyForm);
          }, 'Operator yaratildi');
        }}
      >
        <Field label="Ism">
          <input
            required
            value={form.name}
            maxLength={100}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Operator ismi"
          />
        </Field>
        <Field label="Login">
          <input
            required
            value={form.login}
            minLength={3}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => setForm((f) => ({ ...f, login: e.target.value.toLowerCase() }))}
            className="min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="login"
          />
        </Field>
        <Field label="Parol">
          <input
            required
            type="password"
            value={form.password}
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="12+ belgi"
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#071B3A] px-4 text-sm font-black text-white disabled:opacity-50 md:self-end"
        >
          <Plus size={16} />
          Yaratish
        </button>
      </form>

      <section className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-black text-slate-950">Operatorlar ro‘yxati</h3>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Yuklanmoqda…</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((op) => (
              <OperatorRowView key={op.id} op={op} busy={busy} run={run} />
            ))}
            {!items.length ? (
              <p className="p-6 text-center text-sm font-semibold text-slate-500">Operatorlar yo‘q</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function OperatorRowView({
  op,
  busy,
  run,
}: {
  op: OperatorRow;
  busy: boolean;
  run: (action: () => Promise<void>, message: string) => Promise<void>;
}) {
  const [name, setName] = useState(op.name);
  const [login, setLogin] = useState(op.login);

  useEffect(() => {
    setName(op.name);
    setLogin(op.login);
  }, [op.name, op.login]);

  const changed = name.trim() !== op.name || login.trim().toLowerCase() !== op.login;

  return (
    <article className="grid gap-3 p-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${op.active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
          <UserRoundCheck size={19} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{op.name}</p>
          <p className="truncate text-xs font-semibold text-slate-500">{op.login}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${op.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {op.active ? 'Faol' : 'O‘chirilgan'}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-10 rounded-2xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value.toLowerCase())}
          className="min-h-10 rounded-2xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button
          type="button"
          disabled={busy || !changed}
          className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-40"
          onClick={() =>
            void run(
              () => salesCrmApi.updateOperator(op.id, { name: name.trim(), login: login.trim().toLowerCase() }).then(() => undefined),
              'Operator yangilandi',
            )
          }
        >
          <Save size={14} />
          Saqlash
        </button>
        <button
          type="button"
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-slate-100 px-3 text-xs font-black text-slate-700"
          onClick={() => {
            const password = window.prompt('Yangi parol (12–72 belgi, harf va raqam):');
            if (!password) return;
            void run(
              () => salesCrmApi.updateOperator(op.id, { password }).then(() => undefined),
              'Parol yangilandi',
            );
          }}
        >
          <KeyRound size={14} />
          Parol
        </button>
        <button
          type="button"
          disabled={busy}
          className={`inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-xs font-black ${
            op.active ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
          onClick={() => {
            const message = op.active ? 'Operatorni o‘chirish?' : 'Operatorni qayta faollashtirish?';
            if (!window.confirm(message)) return;
            void run(
              () =>
                (op.active
                  ? salesCrmApi.deleteOperator(op.id)
                  : salesCrmApi.updateOperator(op.id, { active: true })
                ).then(() => undefined),
              op.active ? 'Operator o‘chirildi' : 'Operator faollashtirildi',
            );
          }}
        >
          <Trash2 size={14} />
          {op.active ? 'O‘chirish' : 'Faollashtirish'}
        </button>
      </div>
    </article>
  );
}
