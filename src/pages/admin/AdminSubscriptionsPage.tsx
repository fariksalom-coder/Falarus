import { useState, useEffect } from 'react';
import { getSubscriptions, type AdminSubscriptionRow } from '../../api/admin';
import { AlertCircle } from 'lucide-react';

export default function AdminSubscriptionsPage() {
  const [list, setList] = useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSubscriptions()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Subscriptions</h1>

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
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Started</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Expires</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">{s.user}</td>
                    <td className="py-3 px-4">{s.plan_type}</td>
                    <td className="py-3 px-4">
                      <span className={s.status === 'active' ? 'text-green-600' : 'text-slate-500'}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-slate-500">No subscriptions.</div>
        )}
      </div>
    </div>
  );
}
