import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, type AdminUserRow } from '../../api/admin';
import { AlertCircle, UserPlus, MessageSquareText, KeyRound, Check, Copy, X } from 'lucide-react';
import { adminParolTiklashById } from '../../api/parolTiklash';
import { adminPath } from '../../constants/adminPath';

export default function AdminUsersPage() {
  const [list, setList] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    setLoading(true);
    getUsers({
      registered: registered || undefined,
      subscription: subscription || undefined,
      referral: referralOnly || undefined,
    })
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [registered, subscription, referralOnly]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold text-app-text">Users</h1>
        <Link
          to={adminPath('/users/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-app-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-app-primary-deep"
        >
          <UserPlus className="h-4 w-4" />
          Yangi foydalanuvchi
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={registered}
          onChange={(e) => setRegistered(e.target.value)}
          className="rounded-lg border border-slate-300 bg-app-surface px-3 py-2 text-sm"
        >
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select
          value={subscription}
          onChange={(e) => setSubscription(e.target.value)}
          className="rounded-lg border border-slate-300 bg-app-surface px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="none">No subscription</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={referralOnly}
            onChange={(e) => setReferralOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Referral users only
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
          <div className="p-8 text-center text-app-text-muted">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-app-bg-muted border-b border-app-border">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">User ID</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Registration date</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Subscription</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-app-text-muted">Kunlik progress</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Xabar</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Parol</th>
                  <th className="text-right py-3 px-4 font-medium text-app-text-muted">Referral earnings</th>
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
                      {u.registration_date ? new Date(u.registration_date).toLocaleDateString() : '—'}
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
                        {u.subscription_status}
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
          <div className="p-8 text-center text-app-text-muted">No users found.</div>
        )}
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
