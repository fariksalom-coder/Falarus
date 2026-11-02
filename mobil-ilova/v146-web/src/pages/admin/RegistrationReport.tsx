import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getRegistrations } from '../../api/admin';
import { adminPath } from '../../constants/adminPath';

import './registration-report.css';

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
  const days = [...(data?.days ?? [])].sort((a, b) => a.day.localeCompare(b.day));
  const peak = days.reduce<{ day: string; count: number } | null>((best, row) => !best || row.count > best.count ? row : best, null);
  const ceiling = Math.max(1, ...days.map(row => row.count));
  const dateLabel = (day: string) => Number(day.slice(8)) + ' ' + months[Number(day.slice(5, 7)) - 1];
  const usersLink = (day: string) => adminPath('/users') + '?date=' + day;
  return <section className="registration-report" aria-labelledby="registration-heading">
    <header className="registration-header">
      <div><h2 id="registration-heading">Ro‘yxatdan o‘tishlar</h2><p>Toshkent vaqti · 00:00–23:59</p></div>
      <input type="month" aria-label="Hisobot oyi" required max={currentMonth} value={month} onChange={e => { if (e.target.value && e.target.value <= currentMonth) setMonth(e.target.value); }} />
    </header>
    {error && <p role="alert" className="registration-error">{error}</p>}
    {!data && !error && <div role="status" className="registration-loading">Yuklanmoqda…</div>}
    {data && <>
      <dl className="registration-totals">
        <div><dt>Oy bo‘yicha jami</dt><dd>{data.total.toLocaleString()}</dd></div>
        <div><dt>Kunlik o‘rtacha</dt><dd>{days.length ? Math.round(data.total / days.length).toLocaleString() : '—'}</dd></div>
        <div><dt>Eng faol kun{peak && peak.count > 0 ? ' · ' + dateLabel(peak.day) : ''}</dt><dd>{peak && peak.count > 0 ? peak.count.toLocaleString() : '—'}</dd></div>
      </dl>
      {days.length ? <div className="registration-body">
        <div className="registration-chart" aria-label="Kunlik ro‘yxatdan o‘tishlar grafigi">
          <div className="registration-axis" aria-hidden="true"><span>{ceiling.toLocaleString()}</span><span>{Math.round(ceiling / 2).toLocaleString()}</span><span>0</span></div>
          <div className="registration-plot">
            <div className="registration-grid" aria-hidden="true" />
            <div className="registration-bars" style={{ gridTemplateColumns: 'repeat(' + days.length + ', minmax(0, 1fr))' }}>
              {days.map((row, index) => <Link key={row.day} to={usersLink(row.day)} className={'registration-bar-link' + (row.day === peak?.day && row.count > 0 ? ' is-peak' : '')} aria-label={dateLabel(row.day) + ': ' + row.count + ' foydalanuvchi'}>
                <span className="registration-bar-space"><span className="registration-bar" style={{ height: Math.max(row.count > 0 ? 2 : 0, row.count / ceiling * 100) + '%' }} /><span className="registration-tooltip">{dateLabel(row.day)} · {row.count}</span></span>
                <span className="registration-day" aria-hidden="true">{index === 0 || index === days.length - 1 || Number(row.day.slice(8)) % 5 === 0 ? Number(row.day.slice(8)) : ''}</span>
              </Link>)}
            </div>
          </div>
        </div>
        <div className="registration-list" tabIndex={0} aria-label="Kunlar bo‘yicha ro‘yxat">
          <table><thead><tr><th>Sana</th><th>Ro‘yxatdan o‘tdi</th><th><span className="sr-only">Ochish</span></th></tr></thead>
            <tbody>{[...days].reverse().map(row => <tr key={row.day}>
              <td>{dateLabel(row.day)}</td><td>{row.count.toLocaleString()}</td>
              <td><Link to={usersLink(row.day)} title={dateLabel(row.day) + ': foydalanuvchilar'} aria-label={dateLabel(row.day) + ': foydalanuvchilar'}><ArrowRight size={16} /></Link></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div> : <p className="registration-loading">Ma’lumot yo‘q</p>}
    </>}
  </section>;
}
