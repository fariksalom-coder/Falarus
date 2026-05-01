import { useEffect, useState } from 'react';
import { getCardTokens, type AdminCardTokenRow } from '../../api/admin';
import { AlertCircle } from 'lucide-react';

export default function AdminCardTokensPage() {
  const [list, setList] = useState<AdminCardTokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCardTokens()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Click kartalar (token)</h1>
      <p className="text-sm text-slate-600 mb-4">
        Faqat maskalanishi va telefon — haqiqiy token va PAN ko‘rsatilmaydi.
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Telefon</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Karta</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Holat</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Yaratilgan</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">{row.user}</td>
                    <td className="py-3 px-4 text-slate-600">{row.user_email ?? '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs">{row.masked_phone ?? '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs">{row.masked_card ?? '—'}</td>
                    <td className="py-3 px-4">
                      {row.is_active ? (
                        <span className="text-green-700 font-medium text-xs">Faol</span>
                      ) : (
                        <span className="text-slate-400 text-xs">O‘chirilgan</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Ma’lumot yo‘q yoki migratsiya qo‘llanmagan.</div>
        ) : null}
      </div>
    </div>
  );
}
