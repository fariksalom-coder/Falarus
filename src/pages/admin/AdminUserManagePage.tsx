import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Ban, Search, Snowflake, Sun, Undo2 } from 'lucide-react';
import {
  freezeAdminUser,
  lookupAdminUserByPhone,
  revokeAdminUserAccess,
  unfreezeAdminUser,
  type AdminUserManageSnapshot,
} from '../../api/admin';
import { adminPath } from '../../constants/adminPath';

function fmt(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('uz');
}

export default function AdminUserManagePage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [user, setUser] = useState<AdminUserManageSnapshot | null>(null);
  const [freezeReason, setFreezeReason] = useState('');

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = phone.trim();
    if (q.length < 7) {
      setError('Telefon raqamini kiriting (kamida 7 raqam)');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const snap = await lookupAdminUserByPhone(q);
      setUser(snap);
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : 'Qidiruv xatosi');
    } finally {
      setLoading(false);
    }
  }

  async function runAction(kind: 'freeze' | 'unfreeze' | 'revoke') {
    if (!user) return;
    if (kind === 'revoke') {
      const ok = window.confirm(
        'To‘lovni bekor qilasizmi? Obuna o‘chadi va foydalanuvchi to‘lamagandek bo‘ladi. Click orqali pul qaytmaydi — faqat kirish yopiladi.',
      );
      if (!ok) return;
    }
    if (kind === 'freeze') {
      const ok = window.confirm(
        'Foydalanuvchini muzlatasizmi? Kurs / premium ishlamaydi (to‘lamagandek), lekin to‘lov yozuvi saqlanadi.',
      );
      if (!ok) return;
    }
    setActing(true);
    setError('');
    setInfo('');
    try {
      let snap: AdminUserManageSnapshot;
      if (kind === 'freeze') snap = await freezeAdminUser(user.id, freezeReason.trim() || undefined);
      else if (kind === 'unfreeze') snap = await unfreezeAdminUser(user.id);
      else snap = await revokeAdminUserAccess(user.id);
      setUser(snap);
      if (kind === 'freeze') setInfo('Muzlatildi — premium yopildi.');
      else if (kind === 'unfreeze') setInfo('Muzlatish olib tashlandi.');
      else setInfo(`To‘lov bekor qilindi${snap.revoked_payments != null ? ` (${snap.revoked_payments} ta)` : ''}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Amal bajarilmadi');
    } finally {
      setActing(false);
    }
  }

  const day = user?.day_progress;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold text-app-text">Foydalanuvchini boshqarish</h1>
      <p className="mb-6 text-sm text-app-text-muted">
        Telefon bo‘yicha toping: oxirgi kirish, kunlik progress, muzlatish yoki to‘lovni bekor qilish.
      </p>

      <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-medium text-app-text-muted">
          Telefon raqami
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-app-surface px-3 py-2.5 text-sm text-app-text outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-app-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-app-primary-deep disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {loading ? 'Qidirilmoqda...' : 'Qidirish'}
        </button>
      </form>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</div>
      ) : null}

      {user ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-app-border bg-app-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-app-text">{user.name}</h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  ID {user.id}
                  {user.account_type ? ` · ${user.account_type}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.access_frozen ? (
                  <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-bold text-sky-800">Muzlatilgan</span>
                ) : null}
                <span
                  className={`rounded-md px-2 py-1 text-xs font-bold ${
                    user.subscription.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {user.subscription.status === 'active' ? 'Obuna faol' : 'Obuna yo‘q'}
                </span>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-app-text-muted">Telefon</dt>
                <dd className="font-medium text-app-text">{user.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-app-text-muted">Email</dt>
                <dd className="font-medium text-app-text">{user.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-app-text-muted">Ro‘yxatdan o‘tgan</dt>
                <dd className="font-medium text-app-text">{fmt(user.registration_date)}</dd>
              </div>
              <div>
                <dt className="text-app-text-muted">Oxirgi kirish</dt>
                <dd className="font-medium text-app-text">{fmt(user.last_seen_at)}</dd>
              </div>
              <div>
                <dt className="text-app-text-muted">Tarif</dt>
                <dd className="font-medium text-app-text">
                  {user.subscription.plan_type ?? '—'}
                  {user.subscription.expires_at ? ` · gacha ${fmt(user.subscription.expires_at)}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-app-text-muted">Kunlikda qayerda</dt>
                <dd className="font-medium text-app-text">
                  {user.reached_day > 0 ? `${user.reached_day}-kun` : 'Boshlamagan'}
                  {day
                    ? ` · grammatika ${day.grammar_done}/${day.grammar_total}, so‘z ${day.vocabulary_done ? '✓' : '—'}, o‘qish ${day.reading_done ? '✓' : '—'}, gapirish ${day.speaking_level}`
                    : ''}
                </dd>
              </div>
              {day?.updated_at ? (
                <div className="sm:col-span-2">
                  <dt className="text-app-text-muted">Oxirgi kunlik faollik</dt>
                  <dd className="font-medium text-app-text">{fmt(day.updated_at)}</dd>
                </div>
              ) : null}
              {user.access_frozen ? (
                <div className="sm:col-span-2">
                  <dt className="text-app-text-muted">Muzlatish</dt>
                  <dd className="font-medium text-app-text">
                    {fmt(user.access_frozen_at)}
                    {user.access_frozen_reason ? ` — ${user.access_frozen_reason}` : ''}
                  </dd>
                </div>
              ) : null}
            </dl>

            <Link
              to={adminPath(`/users/${user.id}`)}
              className="mt-4 inline-block text-sm font-medium text-app-primary hover:underline"
            >
              To‘liq profil →
            </Link>
          </section>

          <section className="rounded-xl border border-app-border bg-app-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-app-text">Amallar</h3>
            <label className="mb-3 block text-xs font-medium text-app-text-muted">
              Muzlatish izohi (ixtiyoriy)
              <input
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Masalan: to‘lov bahsi"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {user.access_frozen ? (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void runAction('unfreeze')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-app-surface px-4 py-2.5 text-sm font-semibold text-app-text hover:bg-app-bg-muted disabled:opacity-50"
                >
                  <Sun className="h-4 w-4" />
                  Muzlatishni ochish
                </button>
              ) : (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void runAction('freeze')}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  <Snowflake className="h-4 w-4" />
                  Muzlatish
                </button>
              )}
              <button
                type="button"
                disabled={acting}
                onClick={() => void runAction('revoke')}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <Ban className="h-4 w-4" />
                To‘lovni bekor qilish
              </button>
              <button
                type="button"
                disabled={acting || loading}
                onClick={() => void handleSearch()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-app-text hover:bg-app-bg-muted disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4" />
                Yangilash
              </button>
            </div>
            <p className="mt-3 text-xs text-app-text-muted">
              Muzlatish: to‘lov saqlanadi, kurs ishlamaydi. Bekor qilish: obuna va tasdiqlangan rus kursi to‘lovlari o‘chiriladi (Click refund emas).
            </p>
          </section>

          <section className="rounded-xl border border-app-border bg-app-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-app-text">So‘nggi to‘lovlar</h3>
            {user.payments.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {user.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-app-text">
                      #{p.id} · {p.product_code ?? '—'} · {p.tariff_type ?? '—'}
                      {p.amount != null ? ` · ${p.amount} ${p.currency ?? ''}` : ''}
                    </span>
                    <span className="text-app-text-muted">
                      {p.status} · {fmt(p.approved_at ?? p.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-app-text-muted">To‘lov yo‘q</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
