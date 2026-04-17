import { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import {
  getFossilsPayments,
  updateFossilsPaymentStatus,
  type AdminFossilsPaymentRow,
} from '../../api/admin';

const STATUS_LABELS: Record<AdminFossilsPaymentRow['status'], string> = {
  pending: 'Kutilmoqda',
  confirmed: 'Tasdiqlangan',
  rejected: 'Rad etilgan',
};

export default function AdminFossilsPaymentsPage() {
  const [list, setList] = useState<AdminFossilsPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getFossilsPayments()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatus = async (id: number, status: AdminFossilsPaymentRow['status']) => {
    setError('');
    setActioningId(id);
    try {
      await updateFossilsPaymentStatus(id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status yangilanmadi');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-800">Fossils Payments</h1>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Tarif</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Chek</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Sana</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Holat</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{row.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.phone}</td>
                    <td className="px-4 py-3 text-slate-700">{row.tariff}</td>
                    <td className="px-4 py-3">
                      <a
                        href={row.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                      >
                        Ko'rish <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.status === 'confirmed'
                            ? 'font-medium text-green-600'
                            : row.status === 'rejected'
                              ? 'font-medium text-red-600'
                              : 'font-medium text-amber-600'
                        }
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={actioningId !== null}
                          onClick={() => handleStatus(row.id, 'confirmed')}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {actioningId === row.id ? '...' : 'Tasdiqlash'}
                        </button>
                        <button
                          type="button"
                          disabled={actioningId !== null}
                          onClick={() => handleStatus(row.id, 'rejected')}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {actioningId === row.id ? '...' : 'Rad etish'}
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
          <div className="p-8 text-center text-slate-500">Fossils to'lovlari yo'q.</div>
        )}
      </div>
    </div>
  );
}
