import { useState, useEffect } from 'react';
import { getPayments, confirmPayment, rejectPayment, type AdminPaymentRow } from '../../api/admin';
import { AlertCircle } from 'lucide-react';

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
    setActioning(id);
    try {
      await confirmPayment(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(id: number) {
    setActioning(id);
    try {
      await rejectPayment(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActioning(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Payments</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Plan</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">{p.user}</td>
                    <td className="py-3 px-4">{p.plan}</td>
                    <td className="py-3 px-4 text-right">{Number(p.amount).toLocaleString()} so'm</td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.date ? new Date(p.date).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          p.status === 'confirmed'
                            ? 'text-green-600'
                            : p.status === 'rejected'
                              ? 'text-red-600'
                              : 'text-amber-600'
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'pending' && (
                        <span className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleConfirm(p.id)}
                            disabled={actioning !== null}
                            className="rounded bg-green-600 px-2 py-1 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleReject(p.id)}
                            disabled={actioning !== null}
                            className="rounded bg-red-600 px-2 py-1 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
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
          <div className="p-8 text-center text-slate-500">No payments.</div>
        )}
      </div>
    </div>
  );
}
