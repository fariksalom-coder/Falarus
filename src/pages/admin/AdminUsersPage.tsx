import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, type AdminUserRow } from '../../api/admin';
import { AlertCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const [list, setList] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState('');
  const [subscription, setSubscription] = useState('');
  const [referralOnly, setReferralOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    getUsers({
      registered: registered || undefined,
      subscription: subscription || undefined,
      referral: referralOnly || undefined,
    })
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [registered, subscription, referralOnly]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Users</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={registered}
          onChange={(e) => setRegistered(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select
          value={subscription}
          onChange={(e) => setSubscription(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="none">No subscription</option>
          <option value="monthly">Monthly</option>
          <option value="three_months">3 months</option>
          <option value="yearly">Yearly</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={referralOnly}
            onChange={(e) => setReferralOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Referral users only
        </label>
      </div>

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
                  <th className="text-left py-3 px-4 font-medium text-slate-600">User ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Registration date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Subscription</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Points</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Referral earnings</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link to={`/admin/users/${u.id}`} className="text-indigo-600 hover:underline">
                        {u.id}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{u.name}</td>
                    <td className="py-3 px-4 text-slate-700">{u.email ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{u.phone ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.registration_date ? new Date(u.registration_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">{u.subscription_type}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          u.subscription_status === 'active'
                            ? 'text-green-600'
                            : 'text-slate-500'
                        }
                      >
                        {u.subscription_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{u.total_points.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{u.referral_earnings.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-slate-500">No users found.</div>
        )}
      </div>
    </div>
  );
}
