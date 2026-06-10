import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { getAdminTeacherTrials, type AdminTeacherTrialRow } from '../../api/admin';

function fmt(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusTone(status: string): string {
  if (status.includes('completed')) return 'bg-emerald-100 text-emerald-700';
  if (status.includes('paid')) return 'bg-blue-100 text-blue-700';
  if (status.includes('pending')) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default function AdminTeacherTrialsPage() {
  const [rows, setRows] = useState<AdminTeacherTrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    getAdminTeacherTrials()
      .then((data) => {
        if (!cancelled) setRows(data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.id, row.teacher_user_id, row.student_user_id, row.status, row.student_phone_e164, row.student_email, row.payment_id]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [q, rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sinov darslari</h1>
          <p className="text-sm text-slate-500">O'quvchi to'lovi, kontakt ochilishi va dars yakunlanishi.</p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
          Jami: {rows.length}
        </div>
      </div>

      <label className="flex max-w-md items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ID, status yoki kontakt bo'yicha qidirish"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Dars</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Teacher / Student</th>
                <th className="px-4 py-3">To'lov</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Vaqt</th>
                <th className="px-4 py-3">Jarayon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>Yuklanmoqda...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>Ma'lumot yo'q.</td></tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">#{row.id}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>Teacher: {row.teacher_user_id}</div>
                      <div>Student: {row.student_user_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>Payment: {row.payment_id ?? '-'}</div>
                      <div>{Number(row.price_uzs_snapshot || 0).toLocaleString('ru-RU')} UZS</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.student_phone_e164 || '-'}</div>
                      <div className="text-xs text-slate-500">{row.student_email || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>So'ralgan: {fmt(row.requested_starts_at)}</div>
                      <div className="text-xs text-slate-500">Yaratilgan: {fmt(row.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>Kontakt: {fmt(row.contact_shared_at)}</div>
                      <div className="text-xs text-slate-500">Yakun: {fmt(row.completed_by_teacher_at)}</div>
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
