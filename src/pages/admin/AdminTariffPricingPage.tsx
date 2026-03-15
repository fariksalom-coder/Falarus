import { useState, useEffect } from 'react';
import { getTariffPrices, updateTariffPrice, type TariffPriceRow } from '../../api/admin';
import { AlertCircle, Pencil, X } from 'lucide-react';

const TARIFF_LABELS: Record<string, string> = {
  month: '1 oy',
  three_months: '3 oy',
  year: '1 yil',
};
const CURRENCIES = ['UZS', 'RUB', 'USD'] as const;
const TARIFF_TYPES = ['month', 'three_months', 'year'] as const;

type PriceMatrix = Record<string, Record<string, number>>;

export default function AdminTariffPricingPage() {
  const [rows, setRows] = useState<TariffPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<{
    tariff_type: string;
    uzs: number;
    rub: number;
    usd: number;
  } | null>(null);

  function load() {
    setLoading(true);
    getTariffPrices()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function buildMatrix(): PriceMatrix {
    const m: PriceMatrix = {};
    TARIFF_TYPES.forEach((t) => {
      m[t] = { UZS: 0, RUB: 0, USD: 0 };
    });
    rows.forEach((r) => {
      if (m[r.tariff_type] && r.currency in m[r.tariff_type]) {
        m[r.tariff_type][r.currency] = Number(r.price);
      }
    });
    return m;
  }

  const matrix = buildMatrix();

  function openEdit(tariff_type: string) {
    setEditModal({
      tariff_type,
      uzs: matrix[tariff_type]?.UZS ?? 0,
      rub: matrix[tariff_type]?.RUB ?? 0,
      usd: matrix[tariff_type]?.USD ?? 0,
    });
    setError('');
  }

  async function handleSave() {
    if (!editModal) return;
    setSaving(true);
    setError('');
    try {
      await updateTariffPrice({
        tariff_type: editModal.tariff_type,
        currency: 'UZS',
        price: editModal.uzs,
      });
      await updateTariffPrice({
        tariff_type: editModal.tariff_type,
        currency: 'RUB',
        price: editModal.rub,
      });
      await updateTariffPrice({
        tariff_type: editModal.tariff_type,
        currency: 'USD',
        price: editModal.usd,
      });
      setEditModal(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Tarif narxlari (valyuta bo'yicha)</h1>

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
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Tarif</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">UZS</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">RUB</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">USD</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {TARIFF_TYPES.map((tariff_type) => (
                  <tr key={tariff_type} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {TARIFF_LABELS[tariff_type] ?? tariff_type}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {Number(matrix[tariff_type]?.UZS ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {Number(matrix[tariff_type]?.RUB ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {Number(matrix[tariff_type]?.USD ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(tariff_type)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-200"
                      >
                        <Pencil className="h-4 w-4" />
                        Tahrirlash
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setEditModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEditModal(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {TARIFF_LABELS[editModal.tariff_type]} — narxlarni tahrirlash
            </h2>
            <div className="space-y-4">
              {CURRENCIES.map((curr) => (
                <div key={curr}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{curr}</label>
                  <input
                    type="number"
                    min={0}
                    step={curr === 'USD' ? 0.01 : 1}
                    value={
                      curr === 'UZS' ? editModal.uzs : curr === 'RUB' ? editModal.rub : editModal.usd
                    }
                    onChange={(e) => {
                      const v = curr === 'USD' ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                      const num = Number.isNaN(v) ? 0 : v;
                      setEditModal({
                        ...editModal,
                        uzs: curr === 'UZS' ? num : editModal.uzs,
                        rub: curr === 'RUB' ? num : editModal.rub,
                        usd: curr === 'USD' ? num : editModal.usd,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
