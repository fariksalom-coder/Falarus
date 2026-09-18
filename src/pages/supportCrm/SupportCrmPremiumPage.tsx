import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Foundation';
import {
  getSupportCrmPremiumUsers,
  type PremiumSort,
  type SupportCrmPremiumRow,
} from '../../api/supportCrm';
import { supportCrmPath } from '../../constants/supportCrmPath';
import {
  formatCrmDate,
  formatLastSeenAgo,
  formatTariffLabel,
} from '../../utils/supportCrmFormat';

function fullName(row: SupportCrmPremiumRow): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || `User #${row.id}`;
}

const SORTS: { id: PremiumSort; label: string }[] = [
  { id: 'purchase_desc', label: 'Xarid: yangi → eski' },
  { id: 'purchase_asc', label: 'Xarid: eski → yangi' },
  { id: 'last_seen_desc', label: 'Kirish: yaqin → uzoq' },
  { id: 'last_seen_asc', label: 'Kirish: uzoq → yaqin' },
];

export default function SupportCrmPremiumPage() {
  const [sort, setSort] = useState<PremiumSort>('purchase_desc');
  const [rows, setRows] = useState<SupportCrmPremiumRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async (s: PremiumSort) => {
    setLoading(true);
    setError('');
    try {
      const data = await getSupportCrmPremiumUsers(s);
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(sort);
  }, [sort, reload]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-app-text">Premium</h1>
        <span className="text-sm tabular-nums text-app-muted">{total}</span>
      </div>
      <p className="text-sm text-app-muted">
        Faol obunali barcha o‘quvchilar. Oxirgi kirish: 24 soatdan kam — soatlar, undan ko‘p — kunlar.
      </p>

      <div className="flex flex-wrap gap-2">
        {SORTS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSort(tab.id)}
            className={`min-h-10 rounded-2xl px-3 text-sm font-medium ${
              sort === tab.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-app-muted ring-1 ring-app-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-app-muted">Yuklanmoqda…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-app-danger">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <Card className="p-5 text-sm text-app-muted">Hozircha premium yo‘q.</Card>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={supportCrmPath(`/users/${row.id}`)}
                className="block rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-app-border transition hover:ring-[#2563EB]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-app-text">{fullName(row)}</p>
                    <p className="mt-1 text-sm font-medium text-app-text">{row.phone || 'Telefon yo‘q'}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-slate-800"
                    title={row.last_seen_at ? new Date(row.last_seen_at).toLocaleString('uz') : undefined}
                  >
                    {formatLastSeenAgo(row.last_seen_at)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
                  <span className="font-medium text-app-text">
                    {formatTariffLabel(row.tariff_type, row.plan_name)}
                  </span>
                  <span>xarid {formatCrmDate(row.purchased_at)}</span>
                  <span>gacha {formatCrmDate(row.plan_expires_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
