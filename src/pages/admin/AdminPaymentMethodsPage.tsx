import { useState, useEffect } from 'react';
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  togglePaymentMethod,
  deletePaymentMethod,
  type PaymentMethodRow,
} from '../../api/admin';
import { AlertCircle, Plus, Pencil, Trash2, Power, PowerOff, X } from 'lucide-react';

const CURRENCIES = ['UZS', 'RUB', 'USD'] as const;

type FormState = {
  id: number | null;
  currency: string;
  bank_name: string;
  card_number: string;
  phone_number: string;
  card_holder_name: string;
};

const emptyForm: FormState = {
  id: null,
  currency: 'UZS',
  bank_name: '',
  card_number: '',
  phone_number: '',
  card_holder_name: '',
};

export default function AdminPaymentMethodsPage() {
  const [list, setList] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  function load() {
    setLoading(true);
    getPaymentMethods()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
    setError('');
  }

  function openEdit(row: PaymentMethodRow) {
    setForm({
      id: row.id,
      currency: row.currency,
      bank_name: row.bank_name,
      card_number: row.card_number,
      phone_number: row.phone_number ?? '',
      card_holder_name: row.card_holder_name,
    });
    setModalOpen(true);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (form.id != null) {
        await updatePaymentMethod(form.id, {
          currency: form.currency,
          bank_name: form.bank_name,
          card_number: form.card_number,
          phone_number: form.phone_number || null,
          card_holder_name: form.card_holder_name,
        });
      } else {
        await createPaymentMethod({
          currency: form.currency,
          bank_name: form.bank_name,
          card_number: form.card_number,
          phone_number: form.phone_number || undefined,
          card_holder_name: form.card_holder_name,
        });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }

  async function handleToggle(id: number) {
    setActioning(id);
    try {
      await togglePaymentMethod(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setActioning(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Ushbu to\'lov usulini o\'chirmoqchimisiz?')) return;
    setActioning(id);
    try {
      await deletePaymentMethod(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setActioning(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-app-text">To'lov usullari</h1>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-app-primary px-4 py-2 text-sm font-medium text-white hover:bg-app-primary-deep"
        >
          <Plus className="h-4 w-4" />
          To'lov usulini qo'shish
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-app-text-muted">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-app-bg-muted border-b border-app-border">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Valyuta</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Bank</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Karta raqami</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Telefon</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Karta egasi</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Holat</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-app-border hover:bg-app-bg-muted">
                    <td className="py-3 px-4 font-medium">{p.currency}</td>
                    <td className="py-3 px-4">{p.bank_name}</td>
                    <td className="py-3 px-4 font-mono text-app-text">{p.card_number}</td>
                    <td className="py-3 px-4 text-app-text-muted">{p.phone_number ?? '—'}</td>
                    <td className="py-3 px-4">{p.card_holder_name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          p.status === 'active'
                            ? 'text-green-600 font-medium'
                            : 'text-app-text-muted font-medium'
                        }
                      >
                        {p.status === 'active' ? 'Faol' : 'O\'chirilgan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="rounded p-1.5 text-app-text-muted hover:bg-slate-200"
                          title="Tahrirlash"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(p.id)}
                          disabled={actioning !== null}
                          className="rounded p-1.5 text-app-text-muted hover:bg-slate-200 disabled:opacity-50"
                          title={p.status === 'active' ? "O'chirish" : "Yoqish"}
                        >
                          {p.status === 'active' ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={actioning !== null}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-app-text-muted">To'lov usullari yo'q.</div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-app-surface rounded-2xl shadow-xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-app-bg-subtle text-app-text-muted"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-app-text mb-4">
              {form.id != null ? "To'lov usulini tahrirlash" : "To'lov usulini qo'shish"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Valyuta</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Bank nomi</label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Karta raqami</label>
                <input
                  type="text"
                  value={form.card_number}
                  onChange={(e) => setForm({ ...form, card_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Telefon raqami</label>
                <input
                  type="text"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Karta egasi</label>
                <input
                  type="text"
                  value={form.card_holder_name}
                  onChange={(e) => setForm({ ...form, card_holder_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-app-primary py-2 text-sm font-medium text-white hover:bg-app-primary-deep"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-app-text hover:bg-app-bg-muted"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
