import { useState, useEffect } from 'react';
import { getPricing, updatePricing, type PricingPlan } from '../../api/admin';
import { AlertCircle } from 'lucide-react';

export default function AdminPricingPage() {
  const [list, setList] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<number, Partial<PricingPlan>>>({});

  function load() {
    setLoading(true);
    getPricing()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function edit(id: number, field: keyof PricingPlan, value: string | number | boolean) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSave() {
    const payload = Object.entries(editing)
      .filter(([, v]) => v && Object.keys(v).length > 0)
      .map(([id, v]) => ({ id: Number(id), ...v }));
    if (payload.length === 0) return;
    setSaving(true);
    try {
      await updatePricing(payload);
      setEditing({});
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Pricing Settings</h1>

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
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Plan</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Duration (days)</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Price</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Discount %</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Active</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={editing[p.id]?.plan_name ?? p.plan_name}
                        onChange={(e) => edit(p.id, 'plan_name', e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1 w-32"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={editing[p.id]?.duration_days ?? p.duration_days}
                        onChange={(e) => edit(p.id, 'duration_days', parseInt(e.target.value, 10) || 0)}
                        className="rounded border border-slate-300 px-2 py-1 w-20"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        value={editing[p.id]?.price ?? p.price}
                        onChange={(e) => edit(p.id, 'price', parseFloat(e.target.value) || 0)}
                        className="rounded border border-slate-300 px-2 py-1 w-28 text-right"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={editing[p.id]?.discount_percent ?? p.discount_percent}
                        onChange={(e) => edit(p.id, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="rounded border border-slate-300 px-2 py-1 w-16 text-right"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editing[p.id]?.active ?? p.active}
                          onChange={(e) => edit(p.id, 'active', e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Active
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length > 0 && (
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(editing).length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No pricing plans. Run seed script or add via SQL.
          </div>
        )}
      </div>
    </div>
  );
}
