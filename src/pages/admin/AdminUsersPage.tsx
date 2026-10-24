import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getUsers, type AdminUserRow } from '../../api/admin';
import { AlertCircle, MessageSquareText, KeyRound, Check, Copy, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminParolTiklashById } from '../../api/parolTiklash';
import { adminPath } from '../../constants/adminPath';

const DAY_CHIPS = [
  { value: '', label: 'Hammasi' },
  { value: 'none', label: 'Boshlamagan' },
  { value: '1-30', label: '1–30 kun' },
  { value: '31-100', label: '31–100 kun' },
  { value: '101-130', label: '101–130 kun' },
  { value: '131-181', label: '131–181 kun' },
  { value: '182', label: 'Kursni tugatgan' },
];

/** «5 soat oldin», «3 kun oldin» — support uchun aniq sanadan ko'ra tezroq o'qiladi. */
function lastSeen(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - Date.parse(iso);
  if (diff < 60_000) return 'hozir';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} daqiqa oldin`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} soat oldin`;
  const daysAgo = Math.floor(diff / 86_400_000);
  return daysAgo < 31 ? `${daysAgo} kun oldin` : new Date(iso).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' });
}

export default function AdminUsersPage() {
  const [list, setList] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const date = params.get('date') || '';
  const query = params.get('q') || '';
  const sort = params.get('sort') || '';
  const days = params.get('days') || '';
  const active = params.get('active') || '';
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page'); setParams(next, { replace: true });
  }
  const [registered, setRegistered] = useState('');
  const [subscription, setSubscription] = useState('');
  const [referralOnly, setReferralOnly] = useState(false);
  /*
   * Parol tiklash — ro'yxatning o'zidan. Har bir foydalanuvchi sahifasiga
   * kirmasdan: support qo'ng'iroq paytida odamni qidiradi va shu yerdan
   * yangi parol yaratadi. `parolNishon` — tasdiq oynasidagi foydalanuvchi.
   */
  const [parolNishon, setParolNishon] = useState<AdminUserRow | null>(null);
  const [parolYuklanmoqda, setParolYuklanmoqda] = useState(false);
  const [parolXato, setParolXato] = useState('');
  const [yangiParol, setYangiParol] = useState<string | null>(null);
  const [nusxa, setNusxa] = useState(false);

  const parolniTikla = async () => {
    if (!parolNishon) return;
    setParolYuklanmoqda(true);
    setParolXato('');
    try {
      const r = await adminParolTiklashById(parolNishon.id);
      setYangiParol(r.parol);
    } catch (e) {
      setParolXato(e instanceof Error ? e.message : 'Parol tiklanmadi');
    } finally {
      setParolYuklanmoqda(false);
    }
  };

  const oynaniYop = () => {
    setParolNishon(null);
    setYangiParol(null);
    setParolXato('');
    setNusxa(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setList([]);
    setTotal(0);
    setError('');
    const timer = window.setTimeout(() => getUsers({
      page, date, q: query,
      registered: registered || undefined,
      subscription: subscription || undefined,
      referral: referralOnly || undefined,
      sort: sort || undefined,
      days: days || undefined,
      active: active || undefined,
    }, controller.signal)
      .then(r => { if (!controller.signal.aborted) { setList(r.items); setTotal(r.total); setPageSize(r.pageSize); } })
      .catch((e) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); }), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [registered, subscription, referralOnly, page, date, query, sort, days, active]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-app-text">Foydalanuvchilar</h1>

      {/* Kurs bosqichi — bir bosishda: kim qayergacha yetgan. */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Kurs bosqichi">
        {DAY_CHIPS.map((c) => (
          <button key={c.value} type="button" aria-pressed={days === c.value} onClick={() => filter('days', c.value)}
            className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm font-semibold transition active:scale-[0.97] ${days === c.value ? 'bg-blue-600 text-white' : 'border border-app-border bg-app-surface text-app-text hover:border-blue-200 hover:bg-blue-50'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select aria-label="Tartib" value={sort} onChange={(e) => filter('sort', e.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-app-surface px-3 text-sm">
          <option value="">Avval yangilar</option>
          <option value="old">Avval eskilar</option>
          <option value="day_desc">Eng ko‘p kun o‘tganlar</option>
          <option value="day_asc">Eng kam kun o‘tganlar</option>
          <option value="seen">Yaqinda kirganlar</option>
        </select>
        <select aria-label="Faollik" value={active} onChange={(e) => filter('active', e.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-app-surface px-3 text-sm">
          <option value="">Faollik: hammasi</option>
          <option value="today">Bugun kirgan</option>
          <option value="week">7 kunda kirgan</option>
          <option value="idle">14+ kun kirmagan</option>
        </select>
        <input type="search" aria-label="Ism, telefon yoki email" placeholder="Ism, telefon yoki email" value={query} onChange={e => filter('q', e.target.value)} className="min-h-11 min-w-0 rounded-lg border border-slate-300 px-3 text-sm" />
        <label className="text-xs text-app-text-muted">Ro‘yxatdan o‘tgan sana
          <input type="date" value={date} onChange={e => filter('date', e.target.value)} className="ml-2 min-h-11 rounded-lg border border-slate-300 px-2 text-sm" />
        </label>
        <select
          value={registered}
          onChange={(e) => { setRegistered(e.target.value); filter('date', ''); }}
          className="min-h-11 rounded-lg border border-slate-300 bg-app-surface px-3 text-sm"
        >
          <option value="">Barcha vaqt</option>
          <option value="today">Bugun</option>
          <option value="week">Shu hafta</option>
          <option value="month">Shu oy</option>
        </select>
        <select
          value={subscription}
          onChange={(e) => { setSubscription(e.target.value); filter('page', ''); }}
          className="min-h-11 rounded-lg border border-slate-300 bg-app-surface px-3 text-sm"
        >
          <option value="">Obuna: hammasi</option>
          <option value="none">Obunasiz</option>
          <option value="monthly">1 oylik</option>
          <option value="yearly">1 yillik</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={referralOnly}
            onChange={(e) => { setReferralOnly(e.target.checked); filter('page', ''); }}
            className="rounded border-slate-300"
          />
          Faqat taklif bilan kelganlar
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-app-text-muted">Yuklanmoqda…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-app-bg-muted border-b border-app-border">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Ism</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Telefon</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Ro‘yxatdan o‘tgan</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Tarif</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Obuna</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Kunlik progress</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Oxirgi kirish</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Xabar</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Parol</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Referal daromadi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b border-app-border hover:bg-app-bg-muted">
                    <td className="py-3 px-4">
                      <Link to={adminPath(`/users/${u.id}`)} className="text-app-brand hover:underline">
                        {u.id}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{u.name}</td>
                    <td className="py-3 px-4 text-app-text">{u.email ?? '—'}</td>
                    <td className="py-3 px-4 text-app-text-muted">{u.phone ?? '—'}</td>
                    <td className="py-3 px-4 text-app-text-muted">
                      {u.registration_date ? new Date(u.registration_date).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '—'}
                    </td>
                    <td className="py-3 px-4">{u.subscription_type}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          u.subscription_status === 'active'
                            ? 'text-green-600'
                            : 'text-app-text-muted'
                        }
                      >
                        {u.subscription_status === 'active' ? 'Faol' : 'Yo‘q'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-app-text">
                      {u.reached_day > 0 ? (
                        <div className="space-y-0.5">
                          <div className="font-medium">{u.reached_day}-kun</div>
                          {u.day_progress ? (
                            <div className="text-xs text-app-text-muted">
                              Grammatika {u.day_progress.grammar_done}/{u.day_progress.grammar_total} ·{' '}
                              Lug'at {u.day_progress.vocabulary_done ? '✓' : '✗'} ·{' '}
                              O'qish {u.day_progress.reading_done ? '✓' : '✗'} ·{' '}
                              Gapirish {u.day_progress.speaking_level}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400">Boshlamagan</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-app-text-muted">{lastSeen(u.last_seen_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`${adminPath('/support')}?userId=${u.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-app-surface px-2.5 py-1.5 text-xs font-medium text-app-brand hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        <MessageSquareText className="h-3.5 w-3.5" />
                        Xabar
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setParolNishon(u)}
                        className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-app-surface px-2.5 py-1.5 text-xs font-medium text-app-text hover:border-amber-200 hover:bg-amber-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Tiklash
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">{u.referral_earnings.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="p-8 text-center text-app-text-muted">Foydalanuvchi topilmadi.</div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>{total.toLocaleString()} ta · Toshkent vaqti (UTC+5)</span>
        <div className="flex items-center gap-3">
          <button type="button" title="Oldingi sahifa" aria-label="Oldingi sahifa" disabled={loading || page <= 1} onClick={() => { const p = new URLSearchParams(params); p.set('page', String(page - 1)); setParams(p); }} className="min-h-11 min-w-11 rounded-lg border bg-white disabled:opacity-40"><ChevronLeft className="mx-auto" size={18} /></button>
          <span>{page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
          <button type="button" title="Keyingi sahifa" aria-label="Keyingi sahifa" disabled={loading || page * pageSize >= total} onClick={() => { const p = new URLSearchParams(params); p.set('page', String(page + 1)); setParams(p); }} className="min-h-11 min-w-11 rounded-lg border bg-white disabled:opacity-40"><ChevronRight className="mx-auto" size={18} /></button>
        </div>
      </div>

      {/* Parol tiklash oynasi. Amal qaytmaydi, shuning uchun tasdiq so'raladi. */}
      {parolNishon ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={oynaniYop}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-app-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-app-text">Parolni tiklash</h3>
                <p className="mt-0.5 text-xs text-app-text-muted">
                  {parolNishon.name} — {parolNishon.phone ?? parolNishon.email ?? `#${parolNishon.id}`}
                </p>
              </div>
              <button type="button" onClick={oynaniYop} className="text-slate-400 hover:text-app-text-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            {yangiParol ? (
              <>
                <div className="mt-4 flex items-center gap-2">
                  <code className="flex-1 select-all rounded-xl bg-emerald-50 px-3 py-2.5 text-[17px] font-bold tracking-wider text-app-text ring-1 ring-emerald-200">
                    {yangiParol}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(yangiParol);
                        setNusxa(true);
                        setTimeout(() => setNusxa(false), 2000);
                      } catch {
                        /* clipboard ruxsati yo'q — parol baribir ekranda */
                      }
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"
                    aria-label="Nusxa olish"
                  >
                    {nusxa ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-app-text-muted">
                  Parolni foydalanuvchiga ayting. Oyna yopilgach u boshqa ko'rinmaydi.
                </p>
                <button
                  type="button"
                  onClick={oynaniYop}
                  className="mt-4 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white"
                >
                  Yopish
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900">
                  Eski parol o'chadi va foydalanuvchi faqat yangi parol bilan kira oladi.
                </p>
                {parolXato ? (
                  <p className="mt-2 text-xs font-medium text-red-600">{parolXato}</p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={parolniTikla}
                    disabled={parolYuklanmoqda}
                    className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {parolYuklanmoqda ? 'Tiklanmoqda…' : 'Ha, tiklansin'}
                  </button>
                  <button
                    type="button"
                    onClick={oynaniYop}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-app-text-muted"
                  >
                    Bekor
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
