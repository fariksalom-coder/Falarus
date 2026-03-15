import { useState, useEffect } from 'react';
import {
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  type AdminWithdrawalRow,
} from '../../api/admin';
import { AlertCircle } from 'lucide-react';

export default function AdminReferralsPage() {
  const [list, setList] = useState<AdminWithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<number | null>(null);
  const [receiptFor, setReceiptFor] = useState<number | null>(null);
  const [receiptValue, setReceiptValue] = useState('');

  function load() {
    setLoading(true);
    getWithdrawals()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id: number, withReceipt?: string) {
    setActioning(id);
    setReceiptFor(null);
    try {
      await approveWithdrawal(id, withReceipt);
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
      await rejectWithdrawal(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActioning(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Referral Withdrawals</h1>

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
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Card</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">{w.user}</td>
                    <td className="py-3 px-4 text-right">{Number(w.amount).toLocaleString()} so'm</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{w.card_number}</td>
                    <td className="py-3 px-4">{w.phone}</td>
                    <td className="py-3 px-4">{w.full_name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          w.status === 'approved'
                            ? 'text-green-600'
                            : w.status === 'rejected'
                              ? 'text-red-600'
                              : 'text-amber-600'
                        }
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {w.status === 'pending' && (
                        <div className="flex flex-col items-end gap-1">
                          {receiptFor === w.id ? (
                            <>
                              <input
                                type="text"
                                placeholder="Receipt URL or note"
                                value={receiptValue}
                                onChange={(e) => setReceiptValue(e.target.value)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs w-48"
                              />
                              <span className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(w.id, receiptValue || undefined)}
                                  disabled={actioning !== null}
                                  className="rounded bg-green-600 px-2 py-1 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setReceiptFor(null);
                                    setReceiptValue('');
                                  }}
                                  className="rounded bg-slate-400 px-2 py-1 text-white text-xs"
                                >
                                  Cancel
                                </button>
                              </span>
                            </>
                          ) : (
                            <span className="flex gap-2">
                              <button
                                onClick={() => setReceiptFor(w.id)}
                                className="rounded bg-green-600 px-2 py-1 text-white text-xs hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(w.id)}
                                disabled={actioning !== null}
                                className="rounded bg-red-600 px-2 py-1 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-slate-500">No withdrawal requests.</div>
        )}
      </div>
    </div>
  );
}
