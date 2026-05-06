import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createAdminUser, type AdminCreateUserResponse } from '../../api/admin';
import { adminPath } from '../../constants/adminPath';
import { AlertCircle, ArrowLeft, Check, Copy, Loader2 } from 'lucide-react';

export default function AdminCreateUserPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [russianTariff, setRussianTariff] = useState<'none' | 'month' | 'year'>('none');
  const [grantPatent, setGrantPatent] = useState(false);
  const [grantVnzh, setGrantVnzh] = useState(false);
  const [courseCurrency, setCourseCurrency] = useState<'UZS' | 'USD' | 'RUB'>('UZS');
  const [amountRussian, setAmountRussian] = useState('');
  const [amountPatent, setAmountPatent] = useState('');
  const [amountVnzh, setAmountVnzh] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<AdminCreateUserResponse | null>(null);
  const [copiedField, setCopiedField] = useState<'login' | 'password' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreated(null);
    setLoading(true);
    try {
      const ar = amountRussian.trim() === '' ? null : Number(amountRussian.replace(/\s/g, ''));
      const ap = amountPatent.trim() === '' ? null : Number(amountPatent.replace(/\s/g, ''));
      const av = amountVnzh.trim() === '' ? null : Number(amountVnzh.replace(/\s/g, ''));
      const res = await createAdminUser({
        firstName,
        lastName,
        identifier,
        password,
        russianTariff: russianTariff === 'none' ? null : russianTariff,
        grantPatent,
        grantVnzh,
        courseCurrency,
        amountRussian: ar != null && Number.isFinite(ar) ? ar : null,
        amountPatent: ap != null && Number.isFinite(ap) ? ap : null,
        amountVnzh: av != null && Number.isFinite(av) ? av : null,
      });
      setCreated(res);
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  function copyText(label: 'login' | 'password', text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 2000);
    });
  }

  if (created) {
    return (
      <div className="max-w-lg">
        <Link
          to={adminPath('/users')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Foydalanuvchilar ro‘yxati
        </Link>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-4">
            <Check className="h-5 w-5" />
            Foydalanuvchi yaratildi
          </div>
          <p className="text-sm text-slate-700 mb-4">
            Quyidagi login va parolni foydalanuvchiga bering. Parol boshqa ko‘rinmaydi — kerak bo‘lsa hozir
            nusxalang.
          </p>
          <div className="space-y-3 rounded-xl bg-white border border-slate-200 p-4">
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Login</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-slate-900 break-all">{created.login_identifier}</code>
                <button
                  type="button"
                  onClick={() => copyText('login', created.login_identifier)}
                  className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  aria-label="Login nusxalash"
                >
                  {copiedField === 'login' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Parol</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-slate-900 break-all">{created.password}</code>
                <button
                  type="button"
                  onClick={() => copyText('password', created.password)}
                  className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  aria-label="Parol nusxalash"
                >
                  {copiedField === 'password' ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            ID: {created.user.id} ·{' '}
            {[created.grants.russian && 'Rus tili', created.grants.patent && 'Patent', created.grants.vnzh && 'VNJ']
              .filter(Boolean)
              .join(', ')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={adminPath(`/users/${created.user.id}`)}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Profilni ochish
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setFirstName('');
                setLastName('');
                setIdentifier('');
                setRussianTariff('none');
                setGrantPatent(false);
                setGrantVnzh(false);
                setAmountRussian('');
                setAmountPatent('');
                setAmountVnzh('');
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Yana yaratish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Link
        to={adminPath('/users')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Orqaga
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Yangi foydalanuvchi</h1>
      <p className="text-sm text-slate-600 mb-6">
        Naqd yoki boshqa kanal orqali to‘langan mijoz uchun akkaunt yarating va kirishni darhol oching.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(148,163,184,0.12)] space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ism</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Familiya</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Telefon yoki email</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="+998… yoki name@mail.com"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Parol (kamida 8 belgi)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rus tili kursi</label>
            <select
              value={russianTariff}
              onChange={(e) => setRussianTariff(e.target.value as 'none' | 'month' | 'year')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            >
              <option value="none">Tanlanmagan</option>
              <option value="month">1 oy</option>
              <option value="year">1 yil</option>
            </select>
          </div>
          {russianTariff !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rus tili — to‘lov summasi (UZS, ixtiyoriy)
              </label>
              <input
                value={amountRussian}
                onChange={(e) => setAmountRussian(e.target.value)}
                placeholder="Bo‘sh qoldiring — joriy narx"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                inputMode="numeric"
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={grantPatent}
                onChange={(e) => setGrantPatent(e.target.checked)}
                className="rounded border-slate-300 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-800">Patent imtihoni kursi</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={grantVnzh}
                onChange={(e) => setGrantVnzh(e.target.checked)}
                className="rounded border-slate-300 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-800">VNJ imtihoni kursi</span>
            </label>
          </div>

          {(grantPatent || grantVnzh) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Patent / VNJ narxi valyutasi</label>
              <select
                value={courseCurrency}
                onChange={(e) => setCourseCurrency(e.target.value as 'UZS' | 'USD' | 'RUB')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
              </select>
            </div>
          )}
          {grantPatent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Patent — summa (ixtiyoriy, tanlangan valyutada)
              </label>
              <input
                value={amountPatent}
                onChange={(e) => setAmountPatent(e.target.value)}
                placeholder="Bo‘sh qoldiring — joriy narx"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                inputMode="decimal"
              />
            </div>
          )}
          {grantVnzh && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                VNJ — summa (ixtiyoriy, tanlangan valyutada)
              </label>
              <input
                value={amountVnzh}
                onChange={(e) => setAmountVnzh(e.target.value)}
                placeholder="Bo‘sh qoldiring — joriy narx"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                inputMode="decimal"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-white font-medium py-3 text-sm hover:bg-indigo-700 disabled:opacity-60 min-h-[48px]"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Saqlash va kirishni ochish
        </button>
      </form>
    </div>
  );
}
