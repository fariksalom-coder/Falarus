import { useEffect, useState } from 'react';
import { getClickPaymentLogs, type AdminClickPaymentLogRow } from '../../api/admin';
import { AlertCircle } from 'lucide-react';

export default function AdminClickLogsPage() {
  const [list, setList] = useState<AdminClickPaymentLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getClickPaymentLogs()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Click API jurnali</h1>
      <p className="text-sm text-slate-600 mb-4">
        Token so‘rovi, tasdiqlash, to‘lov va cron urinishlari. Xatoliklarni tekshirish uchun.
      </p>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Vaqt</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Operatsiya</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Sub ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">payment_id</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">MTI</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">error_code</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Izoh</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium">{row.operation}</td>
                    <td className="py-3 px-4">{row.user ?? '—'}</td>
                    <td className="py-3 px-4">{row.subscription_id ?? '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs">{row.click_payment_id ?? '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs max-w-[120px] truncate" title={row.merchant_trans_id ?? ''}>
                      {row.merchant_trans_id ?? '—'}
                    </td>
                    <td className="py-3 px-4">{row.error_code ?? '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-[240px]">{row.error_note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Yozuvlar yo‘q.</div>
        ) : null}
      </div>
    </div>
  );
}
