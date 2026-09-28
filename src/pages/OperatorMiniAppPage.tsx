import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../api';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        close?: () => void;
        HapticFeedback?: { notificationOccurred?: (type: 'success' | 'warning' | 'error') => void };
      };
    };
  }
}

type Customer = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  plan_name?: string | null;
  plan_expires_at?: string | null;
};

type StatsResponse = {
  range: { label: string; from: string; to: string };
  payments: Array<{ currency: string; status: string; receipts: number; clients: number; amount: string }>;
  debts: Array<{ currency: string; contracts: number; clients: number; debt: string; overdue: string }>;
  history: Array<{
    id: number;
    amount: string;
    status: string;
    created_at: string;
    decided_at: string | null;
    reason: string | null;
    user_id: number;
    currency: string;
    tariff: string;
    source: string;
    debt: string;
    pending: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  }>;
  actions: { actions: number; clients: number };
};

const tariffs = [
  { code: 'month', label: '1 oy', hint: '3 000 ₽', amount: '3000' },
  { code: 'three_month', label: '3 oy', hint: '4 000 ₽', amount: '4000' },
  { code: 'six_month', label: '6 oy', hint: '6 000 ₽', amount: '6000' },
];
const sources = ['Instagram', 'Telegram', 'WhatsApp', 'IMO', 'MAX', 'Boshqa'];
const currencies = ['RUB', 'UZS', 'USD'];
const countries = [
  { code: 'UZ', label: 'O‘zbekiston', dial: '+998', placeholder: '90 123 45 67', groups: [2, 3, 2, 2] },
  { code: 'RU', label: 'Rossiya', dial: '+7', placeholder: '900 123 45 67', groups: [3, 3, 2, 2] },
  { code: 'KZ', label: 'Qozog‘iston', dial: '+7', placeholder: '701 123 45 67', groups: [3, 3, 2, 2] },
  { code: 'TJ', label: 'Tojikiston', dial: '+992', placeholder: '90 123 45 67', groups: [2, 3, 2, 2] },
  { code: 'GE', label: 'Gruziya', dial: '+995', placeholder: '599 12 34 56', groups: [3, 2, 2, 2] },
] as const;
const statusLabel: Record<string, string> = { pending: 'Tekshiruvda', approved: 'Tasdiqlandi', rejected: 'Rad etildi' };

function initData() {
  return window.Telegram?.WebApp?.initData || '';
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Telegram-Init-Data', initData());
  const res = await fetch(apiUrl(`/api/operator-mini${path}`), { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Amal bajarilmadi.');
  return data as T;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '').slice(0, 12);
}

function formatByGroups(value: string, groups: readonly number[]) {
  const digits = digitsOnly(value);
  const parts: string[] = [];
  let pos = 0;
  for (const size of groups) {
    const part = digits.slice(pos, pos + size);
    if (!part) break;
    parts.push(part);
    pos += size;
  }
  const rest = digits.slice(pos);
  if (rest) parts.push(rest);
  return parts.join(' ');
}

function todayAppDate() {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fmtDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function moneyText(value: string | number, currency = '') {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value} ${currency}`.trim();
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currency}`.trim();
}

function subscriptionText(customer: Customer) {
  if (!customer.plan_name || !customer.plan_expires_at) return 'Pullik obuna yo‘q';
  const expires = new Date(customer.plan_expires_at);
  if (!Number.isFinite(+expires)) return `Obuna: ${customer.plan_name}`;
  const active = +expires > Date.now();
  const date = expires.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric' });
  return active ? `Faol obuna: ${customer.plan_name} · ${date} gacha` : `Obuna tugagan: ${customer.plan_name} · ${date}`;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'decimal' | 'numeric';
  innerRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-slate-600">{props.label}</span>
      <input
        ref={props.innerRef}
        className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 caret-[#071B3A] outline-none transition focus:border-[#0B2A6B] focus:ring-4 focus:ring-blue-100"
        type={props.type || 'text'}
        inputMode={props.inputMode}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

function PhoneField(props: {
  countryCode: string;
  local: string;
  onCountry: (value: string) => void;
  onLocal: (value: string) => void;
}) {
  const country = countries.find((item) => item.code === props.countryCode) ?? countries[0];
  return (
    <div>
      <span className="text-[13px] font-semibold text-slate-600">Telefon</span>
      <div className="mt-1 grid grid-cols-[118px_1fr] gap-2">
        <select
          className="h-12 rounded-xl border border-slate-200 bg-white px-2 text-sm font-black text-slate-900 outline-none focus:border-[#0B2A6B] focus:ring-4 focus:ring-blue-100"
          value={props.countryCode}
          onChange={(e) => {
            props.onCountry(e.target.value);
            props.onLocal('');
          }}
        >
          {countries.map((item) => (
            <option key={item.code} value={item.code}>{item.dial} {item.code}</option>
          ))}
        </select>
        <input
          className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 caret-[#071B3A] outline-none transition focus:border-[#0B2A6B] focus:ring-4 focus:ring-blue-100"
          type="tel"
          inputMode="tel"
          value={props.local}
          placeholder={country.placeholder}
          onChange={(e) => props.onLocal(formatByGroups(e.target.value, country.groups))}
        />
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-500">{country.label} · {country.dial} {props.local || country.placeholder}</p>
    </div>
  );
}

export default function OperatorMiniAppPage() {
  const firstNameRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'payment' | 'stats'>('payment');
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [resetLink, setResetLink] = useState('');
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', country: 'UZ', phoneLocal: '', email: '' });
  const [payment, setPayment] = useState({
    tariff: 'three_month',
    source: 'Instagram',
    otherSource: '',
    currency: 'RUB',
    total: '4000',
    amount: '4000',
    dueAt: '',
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customRange, setCustomRange] = useState({ from: todayAppDate(), to: todayAppDate() });
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const hasTelegram = Boolean(initData());
  const activeUserId = selected?.id ?? null;
  const isPartial = Number(payment.amount) > 0 && Number(payment.total) > Number(payment.amount);

  const selectedLabel = useMemo(() => {
    if (!selected) return '';
    return `#${selected.id} · ${selected.first_name || ''} ${selected.last_name || ''}`.trim();
  }, [selected]);

  const phone = useMemo(() => {
    const country = countries.find((item) => item.code === customer.country) ?? countries[0];
    return `${country.dial} ${customer.phoneLocal}`.trim();
  }, [customer.country, customer.phoneLocal]);

  async function loadStats() {
    if (!hasTelegram) return;
    setStatsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        params.set('from', customRange.from);
        params.set('to', customRange.to);
      }
      setStats(await api<StatsResponse>(`/stats?${params}`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    if (!hasTelegram) {
      setReady(true);
      return;
    }
    api<{ operator: { name: string } }>('/me')
      .then((res) => setOperatorName(res.operator.name))
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, [hasTelegram]);

  useEffect(() => {
    if (ready && tab === 'payment' && mode === 'new') {
      window.setTimeout(() => firstNameRef.current?.focus(), 150);
    }
  }, [ready, tab, mode]);

  useEffect(() => {
    if (mode !== 'existing' || query.trim().length < 2 || !hasTelegram) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchCustomers(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, mode, hasTelegram]);

  useEffect(() => {
    if (tab === 'stats') void loadStats();
  }, [tab, period, customRange.from, customRange.to]);

  async function createCustomer() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const res = await api<{ user: { id: number }; resetLink: string }>('/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: customer.firstName, lastName: customer.lastName, phone, email: customer.email.trim() || '-' }),
      });
      setSelected({
        id: res.user.id,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone,
        email: customer.email || null,
      });
      setResetLink(res.resetLink);
      setNote('O‘quvchi yaratildi. Endi to‘lov chekini yuboring.');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch (e: any) {
      setError(e.message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
    } finally {
      setBusy(false);
    }
  }

  async function searchCustomers(showErrors = true) {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      if (showErrors) setError('Qidirish uchun kamida 2 ta belgi kiriting.');
      return;
    }
    setError('');
    try {
      const res = await api<{ items: Customer[] }>(`/customers?q=${encodeURIComponent(term)}`);
      setResults(res.items);
      if (showErrors && !res.items.length) setNote('Bu so‘rov bo‘yicha o‘quvchi topilmadi.');
    } catch (e: any) {
      if (showErrors) setError(e.message);
    }
  }

  async function submitPayment() {
    if (!activeUserId) {
      setError('Avval o‘quvchini tanlang yoki yarating.');
      return;
    }
    if (!receipt) {
      setError('Chek rasmini yoki PDF faylni yuklang.');
      return;
    }
    setBusy(true);
    setError('');
    setNote('');
    try {
      const form = new FormData();
      form.set('userId', String(activeUserId));
      for (const [key, value] of Object.entries(payment)) {
        form.set(key, key === 'dueAt' ? value.replace('T', ' ') : value);
      }
      form.set('receipt', receipt);
      const res = await api<{ receiptId: number }>('/payments', { method: 'POST', body: form });
      setNote(`Chek #${res.receiptId} adminga yuborildi. Holat: tekshiruvda.`);
      setReceipt(null);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
      if (tab === 'stats') void loadStats();
    } catch (e: any) {
      setError(e.message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
    } finally {
      setBusy(false);
    }
  }

  const approvedTotal = stats?.payments
    .filter((item) => item.status === 'approved')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0) ?? 0;
  const pendingCount = stats?.payments
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + Number(item.receipts || 0), 0) ?? 0;
  const debtTotal = stats?.debts.reduce((sum, item) => sum + Number(item.debt || 0), 0) ?? 0;

  if (!ready) return <div className="min-h-screen bg-[#071B3A] p-5 text-white">Yuklanmoqda...</div>;

  return (
    <main className="min-h-screen bg-[#071B3A] px-4 py-5 text-slate-950">
      <section className="mx-auto max-w-md rounded-[24px] bg-slate-50 p-4 shadow-2xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1E5BFF]">FalaRus</p>
            <h1 className="text-2xl font-black text-[#071B3A]">Operator</h1>
          </div>
          <div className="rounded-2xl bg-[#071B3A] px-3 py-2 text-right text-xs font-bold text-white">{operatorName || 'Mini app'}</div>
        </header>

        {!hasTelegram && <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Mini ilova Telegram ichida ochilganda ishlaydi.</div>}
        {error && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        {note && <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{note}</div>}

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-200 p-1">
          {[
            ['payment', 'To‘lov'],
            ['stats', 'Hisobot'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`h-11 rounded-xl text-sm font-black ${tab === key ? 'bg-white text-[#071B3A] shadow-sm' : 'text-slate-500'}`}
              onClick={() => setTab(key as 'payment' | 'stats')}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'payment' ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-200 p-1">
              {[
                ['new', 'Yangi o‘quvchi'],
                ['existing', 'Mavjud o‘quvchi'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`h-11 rounded-xl text-sm font-black ${mode === key ? 'bg-white text-[#071B3A] shadow-sm' : 'text-slate-500'}`}
                  onClick={() => {
                    setMode(key as 'new' | 'existing');
                    setSelected(null);
                    setResetLink('');
                  }}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'new' ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field innerRef={firstNameRef} label="Ism" value={customer.firstName} onChange={(v) => setCustomer({ ...customer, firstName: v })} placeholder="Ali" />
                  <Field label="Familiya" value={customer.lastName} onChange={(v) => setCustomer({ ...customer, lastName: v })} placeholder="Aliyev" />
                </div>
                <PhoneField
                  countryCode={customer.country}
                  local={customer.phoneLocal}
                  onCountry={(v) => setCustomer({ ...customer, country: v })}
                  onLocal={(v) => setCustomer({ ...customer, phoneLocal: v })}
                />
                <Field label="Email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} placeholder="email bo‘lmasa bo‘sh qoldiring" />
                <button className="h-12 w-full rounded-xl bg-[#0B2A6B] text-[15px] font-black text-white disabled:opacity-50" disabled={busy || !hasTelegram} onClick={createCustomer} type="button">
                  O‘quvchini yaratish
                </button>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <Field label="Qidirish" value={query} onChange={setQuery} placeholder="Ism, telefon, email yoki ID" />
                  <button
                    className="h-12 rounded-xl bg-[#071B3A] px-4 text-sm font-black text-white disabled:opacity-50"
                    type="button"
                    disabled={!hasTelegram || query.trim().length < 2}
                    onClick={() => void searchCustomers(true)}
                  >
                    Topish
                  </button>
                </div>
                <div className="max-h-64 space-y-2 overflow-auto">
                  {results.map((item) => (
                    <button
                      className={`w-full rounded-xl border p-3 text-left ${selected?.id === item.id ? 'border-[#0B2A6B] bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                    >
                      <strong className="text-[#071B3A]">#{item.id} · {item.first_name || 'Ism yo‘q'} {item.last_name || ''}</strong>
                      <span className="mt-1 block text-sm font-semibold text-slate-500">{item.phone || item.email || 'kontakt yo‘q'}</span>
                      <span className={`mt-2 inline-flex rounded-lg px-2 py-1 text-xs font-black ${item.plan_name && item.plan_expires_at && +new Date(item.plan_expires_at) > Date.now() ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {subscriptionText(item)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-black uppercase text-blue-500">Tanlangan o‘quvchi</p>
                <p className="mt-1 text-lg font-black text-[#071B3A]">{selectedLabel}</p>
                <p className="text-sm font-semibold text-slate-600">{selected.phone || selected.email || ''}</p>
                {resetLink && <textarea className="mt-3 h-24 w-full rounded-xl border border-blue-200 bg-white p-2 text-xs font-semibold text-slate-700" readOnly value={resetLink} />}
              </div>
            )}

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">To‘lov</p>
              <div className="grid grid-cols-3 gap-2">
                {tariffs.map((item) => (
                  <button
                    className={`rounded-xl border p-3 text-left ${payment.tariff === item.code ? 'border-[#0B2A6B] bg-[#071B3A] text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    key={item.code}
                    type="button"
                    onClick={() => setPayment({ ...payment, tariff: item.code, total: item.amount, amount: item.amount })}
                  >
                    <strong className="block text-sm">{item.label}</strong>
                    <span className="text-xs opacity-80">{item.hint}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[13px] font-semibold text-slate-600">Manba</span>
                  <select className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold" value={payment.source} onChange={(e) => setPayment({ ...payment, source: e.target.value })}>
                    {sources.map((source) => <option key={source}>{source}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[13px] font-semibold text-slate-600">Valyuta</span>
                  <select className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold" value={payment.currency} onChange={(e) => setPayment({ ...payment, currency: e.target.value })}>
                    {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                  </select>
                </label>
              </div>
              {payment.source === 'Boshqa' && <Field label="Manba nomi" value={payment.otherSource} onChange={(v) => setPayment({ ...payment, otherSource: v })} />}
              <div className="grid grid-cols-2 gap-2">
                <Field label="Jami summa" value={payment.total} onChange={(v) => setPayment({ ...payment, total: v })} inputMode="decimal" />
                <Field label="To‘langan" value={payment.amount} onChange={(v) => setPayment({ ...payment, amount: v })} inputMode="decimal" />
              </div>
              {isPartial && (
                <label className="block">
                  <span className="text-[13px] font-semibold text-slate-600">Qarz muddati</span>
                  <input
                    className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 caret-[#071B3A] outline-none focus:border-[#0B2A6B] focus:ring-4 focus:ring-blue-100"
                    type="datetime-local"
                    value={payment.dueAt}
                    onChange={(e) => setPayment({ ...payment, dueAt: e.target.value })}
                  />
                </label>
              )}
              <label className="block">
                <span className="text-[13px] font-semibold text-slate-600">Chek</span>
                <input className="mt-1 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
              </label>
              <button className="h-13 w-full rounded-xl bg-[#1E5BFF] py-4 text-[16px] font-black text-white shadow-lg shadow-blue-900/20 disabled:opacity-50" disabled={busy || !hasTelegram || !activeUserId} onClick={submitPayment} type="button">
                Chekni adminga yuborish
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-200 p-1">
              {[
                ['today', 'Kun'],
                ['week', 'Hafta'],
                ['month', 'Oy'],
                ['custom', 'Davr'],
              ].map(([key, label]) => (
                <button key={key} className={`h-10 rounded-xl text-xs font-black ${period === key ? 'bg-white text-[#071B3A] shadow-sm' : 'text-slate-500'}`} type="button" onClick={() => setPeriod(key as typeof period)}>
                  {label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                <Field label="Boshlanish" type="date" value={customRange.from} onChange={(v) => setCustomRange({ ...customRange, from: v })} />
                <Field label="Tugash" type="date" value={customRange.to} onChange={(v) => setCustomRange({ ...customRange, to: v })} />
              </div>
            )}
            <button className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-black text-[#071B3A]" type="button" disabled={statsLoading} onClick={loadStats}>
              {statsLoading ? 'Yangilanmoqda...' : 'Yangilash'}
            </button>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="text-[11px] font-black uppercase text-slate-400">Tasdiq</p>
                <p className="mt-1 text-lg font-black text-emerald-600">{moneyText(approvedTotal)}</p>
              </div>
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="text-[11px] font-black uppercase text-slate-400">Kutilmoqda</p>
                <p className="mt-1 text-lg font-black text-amber-600">{pendingCount}</p>
              </div>
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="text-[11px] font-black uppercase text-slate-400">Qarz</p>
                <p className="mt-1 text-lg font-black text-red-600">{moneyText(debtTotal)}</p>
              </div>
            </div>
            <section className="rounded-2xl border border-slate-200 bg-white p-3">
              <h2 className="text-sm font-black text-[#071B3A]">To‘lovlar</h2>
              <div className="mt-2 space-y-2">
                {stats?.payments.length ? stats.payments.map((item, index) => (
                  <div key={`${item.currency}-${item.status}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                    <span className="font-bold">{statusLabel[item.status] || item.status} · {item.currency}</span>
                    <span className="font-black">{item.receipts} ta · {moneyText(item.amount, item.currency)}</span>
                  </div>
                )) : <p className="text-sm font-semibold text-slate-500">Bu davrda to‘lov yo‘q.</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-3">
              <h2 className="text-sm font-black text-[#071B3A]">Qarzlar</h2>
              <div className="mt-2 space-y-2">
                {stats?.debts.length ? stats.debts.map((item) => (
                  <div key={item.currency} className="rounded-xl bg-red-50 p-3 text-sm">
                    <div className="flex justify-between gap-2"><strong>{item.clients} mijoz · {item.currency}</strong><strong>{moneyText(item.debt, item.currency)}</strong></div>
                    <p className="mt-1 font-semibold text-red-700">Muddati o‘tgan: {moneyText(item.overdue, item.currency)}</p>
                  </div>
                )) : <p className="text-sm font-semibold text-slate-500">Hozir qarz yo‘q.</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-3">
              <h2 className="text-sm font-black text-[#071B3A]">Tarix</h2>
              <div className="mt-2 space-y-2">
                {stats?.history.length ? stats.history.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex justify-between gap-2">
                      <strong>#{item.user_id} · {item.first_name} {item.last_name}</strong>
                      <span className="font-black">{moneyText(item.amount, item.currency)}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.phone || 'telefon yo‘q'} · {item.source} · {fmtDate(item.created_at)}</p>
                    <p className="mt-2 text-xs font-black text-[#071B3A]">{statusLabel[item.status] || item.status} · Qarz: {moneyText(item.debt, item.currency)} · Tekshiruvda: {moneyText(item.pending, item.currency)}</p>
                  </article>
                )) : <p className="text-sm font-semibold text-slate-500">Tarix bo‘sh.</p>}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
