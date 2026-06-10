import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { getAdminTeachers, updateTeacherStatus, type AdminTeacherRow } from '../../api/admin';

function fmtDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isActive(value: string | null): boolean {
  return !!value && new Date(value) > new Date();
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Qoralama',
  pending_review: 'Tekshiruvda',
  active: 'Faol',
  paused: "To'xtatilgan",
  rejected: 'Rad etilgan',
};

export default function AdminTeachersPage() {
  const [rows, setRows] = useState<AdminTeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<number | null>(null);

  function load() {
    setLoading(true);
    getAdminTeachers()
      .then((data) => setRows(data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Yuklash xatosi'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatus(userId: number, status: 'active' | 'paused' | 'rejected') {
    setError('');
    setActioning(userId);
    try {
      await updateTeacherStatus(userId, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Amal bajarilmadi');
    } finally {
      setActioning(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.display_name, row.region, row.city, row.profile_status, row.public_phone_e164, row.public_email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [q, rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">O'qituvchilar</h1>
          <p className="text-sm text-slate-500">Anketalar, to'lov muddati va kontaktlar.</p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
          Jami: {rows.length}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <label className="flex max-w-md items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ism, status yoki kontakt bo'yicha qidirish"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">O'qituvchi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tajriba</th>
                <th className="px-4 py-3">Narx</th>
                <th className="px-4 py-3">Joylashuv</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Ro'yxat muddati</th>
                <th className="px-4 py-3">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={8}>Yuklanmoqda...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={8}>Ma'lumot yo'q.</td></tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.user_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{row.display_name}</div>
                      <div className="text-xs text-slate-500">ID: {row.user_id} · {row.age} yosh</div>
                      {row.headline ? <div className="mt-1 max-w-xs truncate text-xs text-slate-500">{row.headline}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.profile_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {STATUS_LABELS[row.profile_status] ?? row.profile_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.experience_years} yil {row.experience_months} oy</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {Number(row.monthly_course_price_amount || 0).toLocaleString('ru-RU')} {row.monthly_course_price_currency}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{[row.region, row.city].filter(Boolean).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.telegram_username || row.whatsapp_phone_e164 || row.public_phone_e164 || '-'}</div>
                      {row.telegram_url ? (
                        <a className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-700" href={row.telegram_url} target="_blank" rel="noreferrer">
                          Telegram <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className={isActive(row.listing_paid_until) ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
                        {fmtDate(row.listing_paid_until)}
                      </div>
                      <div className="text-xs text-slate-500">{row.first_listing_discount_used ? 'Intro ishlatilgan' : 'Intro mavjud'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.profile_status !== 'active' ? (
                          <button
                            type="button"
                            disabled={actioning === row.user_id}
                            onClick={() => handleStatus(row.user_id, 'active')}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Tasdiqlash
                          </button>
                        ) : null}
                        {row.profile_status === 'active' ? (
                          <button
                            type="button"
                            disabled={actioning === row.user_id}
                            onClick={() => handleStatus(row.user_id, 'paused')}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                          >
                            To'xtatish
                          </button>
                        ) : null}
                        {row.profile_status !== 'rejected' ? (
                          <button
                            type="button"
                            disabled={actioning === row.user_id}
                            onClick={() => handleStatus(row.user_id, 'rejected')}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Rad etish
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
