import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getRegistrations } from '../../api/admin';
import { adminPath } from '../../constants/adminPath';

const months = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];

export default function RegistrationReport() {
  const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<Awaited<ReturnType<typeof getRegistrations>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    setData(null); setError('');
    const load = async () => {
      try {
        const result = await getRegistrations(month, controller.signal);
        if (!controller.signal.aborted) { setData(result); setError(''); }
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Xatolik');
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(() => void load(), 60_000);
      }
    };
    void load();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [month]);
  return <section className="border-y border-app-border py-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Kunlik ro‘yxatdan o‘tishlar</h2><p className="mt-1 text-xs text-app-text-muted">00:00–23:59 · Toshkent (UTC+5)</p></div>
      <label className="flex items-center gap-3 text-sm">Oy<input type="month" aria-label="Hisobot oyi" required max={currentMonth} value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} className="min-h-11 rounded-lg border border-app-border bg-white px-3" /></label>
    </div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    {!data && !error ? <p role="status" className="py-6 text-sm text-app-text-muted">Yuklanmoqda…</p> : null}
    {data ? <>
      <p className="mb-3 text-sm text-app-text-muted">Oy bo‘yicha jami <strong className="ml-2 text-xl tabular-nums text-app-text">{data.total.toLocaleString()}</strong></p>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-sm"><thead className="sticky top-0 bg-app-bg-muted text-left"><tr><th className="py-2 font-medium">Sana</th><th className="py-2 text-right font-medium">Foydalanuvchilar</th><th className="w-16"><span className="sr-only">Ochish</span></th></tr></thead>
          <tbody>{data.days.map(row => <tr key={row.day} className="border-t border-app-border">
            <td className="py-2.5">{Number(row.day.slice(8))} {months[Number(row.day.slice(5, 7)) - 1]}</td>
            <td className="py-2.5 text-right font-semibold tabular-nums">{row.count || '—'}</td>
            <td className="text-right"><Link to={`${adminPath('/users')}?date=${row.day}`} title={`${row.day}: foydalanuvchilar`} aria-label={`${row.day}: foydalanuvchilar`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-app-primary hover:bg-white"><ArrowRight size={18} /></Link></td>
          </tr>)}</tbody>
        </table>
        {!data.days.length ? <p className="py-5 text-sm text-app-text-muted">Ma’lumot yo‘q</p> : null}
      </div>
    </> : null}
  </section>;
}
