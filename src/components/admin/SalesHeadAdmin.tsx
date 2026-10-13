import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { salesHeadAdmin, type SalesHeadAccount } from '../../api/salesHead';
import type { SalesHeadDashboard, SalesHeadSettings } from '../../../shared/salesHead';
import { MonthSwitcher, SalesHeadDashboardView, currentTashkentMonth } from '../salesHead/SalesHeadDashboardView';

const input = 'w-full rounded-xl border border-slate-300 bg-white p-2.5 text-slate-900';
const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** Bosh admin: sotuv bo'limi rahbari maoshi qoidalari, hisoblari va paneli. */
export default function SalesHeadAdmin() {
  return (
    <div className="space-y-6">
      <p className="text-sm opacity-80">
        Rahbar o‘z panelini <a className="font-semibold text-blue-600 underline" href="/sotuv-rahbari" target="_blank" rel="noreferrer">/sotuv-rahbari</a> sahifasida
        login-parol bilan ko‘radi. Maosh = qat’iy oylik + operatorlar sotgan har bir kurs × stavka + bonus.
      </p>
      <SettingsForm />
      <Accounts />
      <Preview />
    </div>
  );
}

function SettingsForm() {
  const [form, setForm] = useState<SalesHeadSettings | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    salesHeadAdmin.settings().then(setForm).catch((e) => setError(errorText(e, 'Sozlamalarni yuklab bo‘lmadi.')));
  }, []);

  if (!form) return error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p> : <p role="status" className="text-sm opacity-70">Yuklanmoqda…</p>;

  const set = (patch: Partial<SalesHeadSettings>) => { setNote(''); setForm({ ...form, ...patch }); };
  const setTier = (i: number, patch: Partial<SalesHeadSettings['tiers'][number]>) =>
    set({ tiers: form.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      setForm(await salesHeadAdmin.saveSettings(form));
      setNote('Saqlandi. Rahbar maoshi yangi qoidalar bilan qayta hisoblanadi.');
    } catch (err) {
      setError(errorText(err, 'Saqlab bo‘lmadi.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-app-border bg-app-surface p-5">
      <h2 className="text-lg font-bold">Maosh qoidalari</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Qat’iy oylik (so‘m)
          <input className={`${input} mt-1`} type="number" min={0} step={1000} required value={form.fixedSalary} onChange={(e) => set({ fixedSalary: Number(e.target.value) })} />
        </label>
        <label className="text-sm font-semibold">Har bir operator sotuvi uchun (so‘m)
          <input className={`${input} mt-1`} type="number" min={0} step={1000} required value={form.perSale} onChange={(e) => set({ perSale: Number(e.target.value) })} />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={form.includeRahmatClaims} onChange={(e) => set({ includeRahmatClaims: e.target.checked })} />
        <span>Operator biriktirgan Rahmat avtoto‘lovlari ham hisoblansin <span className="block opacity-70">O‘chiq bo‘lsa — faqat operator o‘z cheki bilan sotgan kurslar hisoblanadi.</span></span>
      </label>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold">Bonuslar</h3>
          <select className="rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-900" value={form.bonusPeriod} onChange={(e) => set({ bonusPeriod: e.target.value === 'day' ? 'day' : 'month' })}>
            <option value="month">Oylik jami sotuvga qarab</option>
            <option value="day">Har kungi sotuvga qarab</option>
          </select>
        </div>
        <p className="text-xs opacity-70">Eng yuqori erishilgan pog‘ona bonusi beriladi (pog‘onalar qo‘shilmaydi). Bonus 0 bo‘lsa — berilmaydi.</p>
        {form.tiers.map((tier, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_44px] items-end gap-3">
            <label className="text-sm">Sotuvlar soni (dan)
              <input className={`${input} mt-1`} type="number" min={1} step={1} required value={tier.sales} onChange={(e) => setTier(i, { sales: Number(e.target.value) })} />
            </label>
            <label className="text-sm">Bonus (so‘m)
              <input className={`${input} mt-1`} type="number" min={0} step={1000} required value={tier.amount} onChange={(e) => setTier(i, { amount: Number(e.target.value) })} />
            </label>
            <button type="button" aria-label={`${i + 1}-pog‘onani o‘chirish`} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-300 text-slate-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => set({ tiers: form.tiers.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" className="ui-button ui-button--secondary" disabled={form.tiers.length >= 20}
          onClick={() => set({ tiers: [...form.tiers, { sales: (form.tiers[form.tiers.length - 1]?.sales ?? 0) + 5, amount: 0 }] })}>
          <Plus className="h-4 w-4" /> Pog‘ona qo‘shish
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
      {note && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{note}</p>}
      <button className="ui-button ui-button--primary" disabled={saving}>{saving ? 'Saqlanmoqda…' : 'Qoidalarni saqlash'}</button>
    </form>
  );
}

function Accounts() {
  const [accounts, setAccounts] = useState<SalesHeadAccount[]>([]);
  const [form, setForm] = useState({ name: '', login: '', password: '' });
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordFor, setPasswordFor] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const load = () => salesHeadAdmin.accounts().then(setAccounts).catch((e) => setError(errorText(e, 'Hisoblarni yuklab bo‘lmadi.')));
  useEffect(() => { void load(); }, []);

  async function run(fn: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNote('');
    try {
      await fn();
      setNote(message);
      await load();
    } catch (e) {
      setError(errorText(e, 'Amal bajarilmadi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-app-border bg-app-surface p-5">
      <h2 className="text-lg font-bold">Rahbar hisoblari</h2>
      <form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => {
        e.preventDefault();
        void run(async () => { await salesHeadAdmin.createAccount(form); setForm({ name: '', login: '', password: '' }); }, 'Hisob yaratildi. Login va parolni rahbarga shaxsan yetkazing.');
      }}>
        <input className={input} required maxLength={100} placeholder="Ism" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={input} required minLength={3} maxLength={40} autoComplete="off" placeholder="Login" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
        <input className={input} required minLength={12} maxLength={72} type="password" autoComplete="new-password" placeholder="Parol (12+ belgi, harf va raqam)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="ui-button ui-button--primary" disabled={busy}>Hisob yaratish</button>
      </form>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
      {note && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{note}</p>}
      {accounts.length ? (
        <ul className="divide-y divide-app-border">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-[180px] flex-1">
                <p className="font-semibold">{a.name} <span className="font-normal opacity-60">@{a.login}</span></p>
                <p className={`text-xs ${a.active ? 'text-green-700' : 'text-red-700'}`}>{a.active ? 'Faol' : 'O‘chirilgan'}</p>
              </div>
              {passwordFor === a.id ? (
                <form className="flex flex-wrap gap-2" onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => { await salesHeadAdmin.updateAccount(a.id, { action: 'password', password: newPassword }); setPasswordFor(null); setNewPassword(''); }, 'Parol almashtirildi.');
                }}>
                  <input className={input} type="password" required minLength={12} maxLength={72} autoComplete="new-password" placeholder="Yangi parol" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <button className="ui-button ui-button--primary" disabled={busy}>Saqlash</button>
                  <button type="button" className="ui-button ui-button--secondary" onClick={() => setPasswordFor(null)}>Bekor</button>
                </form>
              ) : (
                <button type="button" className="ui-button ui-button--secondary" onClick={() => { setPasswordFor(a.id); setNewPassword(''); }}>Parolni almashtirish</button>
              )}
              <button type="button" className="ui-button ui-button--secondary" disabled={busy}
                onClick={() => void run(() => salesHeadAdmin.updateAccount(a.id, { action: a.active ? 'disable' : 'enable' }), a.active ? 'Hisob o‘chirildi — kirish darhol yopildi.' : 'Hisob yoqildi.')}>
                {a.active ? 'O‘chirish' : 'Yoqish'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm opacity-70">Hali hisob yo‘q. Yuqorida rahbar uchun login va parol yarating.</p>
      )}
    </section>
  );
}

function Preview() {
  const [month, setMonth] = useState(currentTashkentMonth);
  const [data, setData] = useState<SalesHeadDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    salesHeadAdmin.dashboard(month)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(errorText(e, 'Panelni yuklab bo‘lmadi.')); });
    return () => { cancelled = true; };
  }, [month]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Rahbar paneli — u ko‘radigan ko‘rinish</h2>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>
        : data?.month === month ? <SalesHeadDashboardView data={data} />
          : <p role="status" className="text-sm opacity-70">Yuklanmoqda…</p>}
    </section>
  );
}
