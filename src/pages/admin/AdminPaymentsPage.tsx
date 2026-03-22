import { useState, useEffect } from 'react';
import { getPayments, confirmPayment, rejectPayment, type AdminPaymentRow } from '../../api/admin';
import { AlertCircle, ExternalLink } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
};

export default function AdminPaymentsPage() {
  const [list, setList] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<number | null>(null);

  function load() {
    setLoading(true);
    getPayments()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirm(id: number) {
    setError('');
    setActioning(id);
    try {
      await confirmPayment(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tasdiqlash amalga oshmadi');
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(id: number) {
    setError('');
    setActioning(id);
    try {
      await rejectPayment(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rad etish amalga oshmadi');
    } finally {
      setActioning(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">To'lovlarni tekshirish</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Foydalanuvchi</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Tarif</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Valyuta</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">To'lov vaqti</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Chek</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Holat</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{p.user}</td>
                    <td className="py-3 px-4 text-slate-600">{p.user_email}</td>
                    <td className="py-3 px-4 text-slate-600">{p.user_phone ?? '—'}</td>
                    <td className="py-3 px-4">{p.plan}</td>
                    <td className="py-3 px-4">{p.currency}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.payment_time ? new Date(p.payment_time).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {p.payment_proof_url ? (
                        <a
                          href={p.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                          Ko'rish <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          p.status === 'approved'
                            ? 'text-green-600 font-medium'
                            : p.status === 'rejected'
                              ? 'text-red-600 font-medium'
                              : 'text-amber-600 font-medium'
                        }
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'pending' && (
                        <span className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirm(p.id)}
                            disabled={actioning !== null}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            {actioning === p.id ? '...' : 'Tasdiqlash'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(p.id)}
                            disabled={actioning !== null}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            {actioning === p.id ? '...' : 'Rad etish'}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-slate-500">To'lovlar yo'q.</div>
        )}
      </div>
    </div>
  );
}
