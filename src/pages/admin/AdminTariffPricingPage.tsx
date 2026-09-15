import { useState, useEffect } from 'react';
import { getTariffPrices, updateTariffPrice, type TariffPriceRow } from '../../api/admin';
import { RUSSIAN_TARIFF_PLANS_RUB } from '../../../shared/russianTariffs';
import { RUB_UZS_FALLBACK_RATE, rubToUzs } from '../../../shared/rubUzs';
import { AlertCircle, Pencil, X } from 'lucide-react';

const TARIFF_TYPES = ['month', 'three_month', 'six_month'] as const;
type TariffType = (typeof TARIFF_TYPES)[number];

const TARIFF_LABELS: Record<TariffType, string> = {
  month: '1 oy',
  three_month: '3 oy',
  six_month: '6 oy',
};

const CURRENCIES = ['UZS', 'RUB'] as const;

const RUB_DEFAULTS: Record<TariffType, number> = {
  month: RUSSIAN_TARIFF_PLANS_RUB.find((p) => p.code === 'month')?.priceRub ?? 3_000,
  three_month: RUSSIAN_TARIFF_PLANS_RUB.find((p) => p.code === 'three_month')?.priceRub ?? 4_000,
  six_month: RUSSIAN_TARIFF_PLANS_RUB.find((p) => p.code === 'six_month')?.priceRub ?? 6_000,
};

type PriceMatrix = Record<string, Record<string, number>>;

export default function AdminTariffPricingPage() {
  const [rows, setRows] = useState<TariffPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<{
    tariff_type: TariffType;
    uzs: number;
    rub: number;
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
      m[t] = {
        UZS: rubToUzs(RUB_DEFAULTS[t], RUB_UZS_FALLBACK_RATE),
        RUB: RUB_DEFAULTS[t],
      };
    });
    rows.forEach((r) => {
      if (m[r.tariff_type] && r.currency in m[r.tariff_type]) {
        const price = Number(r.price);
        if (Number.isFinite(price) && price > 0) {
          m[r.tariff_type][r.currency] = price;
        }
      }
    });
    return m;
  }

  const matrix = buildMatrix();

  function openEdit(tariff_type: TariffType) {
    setEditModal({
      tariff_type,
      uzs: matrix[tariff_type]?.UZS ?? 0,
      rub: matrix[tariff_type]?.RUB ?? RUB_DEFAULTS[tariff_type],
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
        currency: 'RUB',
        price: editModal.rub,
      });
      await updateTariffPrice({
        tariff_type: editModal.tariff_type,
        currency: 'UZS',
        price: editModal.uzs,
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
      <h1 className="text-2xl font-semibold text-app-text mb-2">Tarif narxlari</h1>
      <p className="mb-4 max-w-2xl text-sm text-app-text-muted">
        Asosiy narx — <strong>RUB</strong> (1 / 3 / 6 oy). Rahmat to‘lovi so‘mda yechiladi:
        RUB × Markaziy bank kursi. UZS ustuni ma’lumot / fallback uchun.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-app-text-muted">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-app-bg-muted border-b border-app-border">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Tarif</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">RUB</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">UZS (ref.)</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {TARIFF_TYPES.map((tariff_type) => (
                  <tr key={tariff_type} className="border-b border-app-border hover:bg-app-bg-muted">
                    <td className="py-3 px-4 font-medium text-app-text">
                      {TARIFF_LABELS[tariff_type]}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {Number(matrix[tariff_type]?.RUB ?? 0).toLocaleString()} ₽
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-app-text-muted">
                      {Number(matrix[tariff_type]?.UZS ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(tariff_type)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-app-text-muted hover:bg-slate-200"
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
            className="bg-app-surface rounded-2xl shadow-xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEditModal(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-app-bg-subtle text-app-text-muted"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-app-text mb-4">
              {TARIFF_LABELS[editModal.tariff_type]} — narxlarni tahrirlash
            </h2>
            <div className="space-y-4">
              {CURRENCIES.map((curr) => (
                <div key={curr}>
                  <label className="block text-sm font-medium text-app-text mb-1">
                    {curr === 'RUB' ? 'RUB (asosiy)' : 'UZS (ma’lumot)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={curr === 'UZS' ? editModal.uzs : editModal.rub}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      const num = Number.isNaN(v) ? 0 : v;
                      setEditModal({
                        ...editModal,
                        uzs: curr === 'UZS' ? num : editModal.uzs,
                        rub: curr === 'RUB' ? num : editModal.rub,
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
                className="flex-1 rounded-lg bg-app-primary py-2 text-sm font-medium text-white hover:bg-app-primary-deep disabled:opacity-50"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-app-text hover:bg-app-bg-muted"
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
