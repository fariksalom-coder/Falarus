import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { apiUrl } from '../api';
import { operatorTariffCatalog, OPERATOR_CURRENCIES } from '../../shared/operatorTariffs';

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
  debts?: Array<{ currency: string; debt: string; pending: string }>;
};

type TariffItem = {
  code: string;
  label: string;
  prices: Array<{ currency: string; amount: number; display: string }>;
};

type StatsResponse = {
  range: { label: string; from: string; to: string };
  payments: Array<{ currency: string; status: string; receipts: number; clients: number; amount: string }>;
  salesDays: Array<{ day: string; currency: string; receipts: number; clients: number; amount: string }>;
  salesMonth: Array<{ currency: string; receipts: number; clients: number; amount: string }>;
  salary: {
    currency: 'UZS';
    soldCourses: number;
    perCourseAmount: number;
    baseAmount: number;
    bonusAmount: number;
    totalAmount: number;
    bonusTier: { courses: number; amount: number } | null;
    nextTarget: number | null;
    nextBonusAmount: number | null;
    remainingToNext: number;
    tiers: Array<{ courses: number; amount: number }>;
  };
  salaryDays: Array<{ day: string; soldCourses: number; baseAmount: number; bonusAmount: number; totalAmount: number }>;
  salaryTariffs: Array<{ tariff: string; sold_courses: number }>;
  debts: Array<{
    currency: string;
    contracts: number;
    clients: number;
    debt: string;
    overdue: string;
    debtors: Array<{
      contract_id: number;
      user_id: number;
      tariff: string;
      source: string;
      due_at: string | null;
      debt: string;
      pending: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    }>;
  }>;
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

const fallbackTariffs: TariffItem[] = operatorTariffCatalog();
const sources = ['Instagram', 'Telegram', 'WhatsApp', 'IMO', 'MAX', 'Boshqa'];
const fallbackCurrencies = [...OPERATOR_CURRENCIES];
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
  const digits = digitsOnly(value).slice(0, groups.reduce((sum, size) => sum + size, 0));
  const parts: string[] = [];
  let pos = 0;
  for (const size of groups) {
    const part = digits.slice(pos, pos + size);
    if (!part) break;
    parts.push(part);
    pos += size;
  }
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
  const amount = n.toLocaleString(currency === 'UZS' ? 'uz-UZ' : 'ru-RU', { maximumFractionDigits: 2 });
  if (currency === 'UZS') return `${amount} so‘m`;
  if (currency === 'RUB') return `${amount} ₽`;
  if (currency === 'USD') return `$${amount}`;
  return `${amount} ${currency}`.trim();
}

function dayText(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(+parsed)) return value;
  return parsed.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
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
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-slate-600">{props.label}</span>
      <input
        ref={props.innerRef}
        className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 caret-[#071B3A] outline-none transition focus:border-[#0B2A6B] focus:ring-4 focus:ring-blue-100"
        type={props.type || 'text'}
        inputMode={props.inputMode}
        readOnly={props.readOnly}
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
      <div className="mt-1 space-y-2">
        <select
          aria-label="Davlat"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-[#0B2A6B] focus:ring-4 focus:ring-blue-100"
          value={props.countryCode}
          onChange={(e) => props.onCountry(e.target.value)}
        >
          {countries.map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
        <div className="flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-[#0B2A6B] focus-within:ring-4 focus-within:ring-blue-100">
        <span className="shrink-0 border-r border-slate-200 px-3 font-semibold text-slate-900">{country.dial}</span>
        <input
          aria-label="Telefon raqami"
          autoComplete="tel-national"
          className="h-12 min-w-0 w-full rounded-xl bg-white px-3 text-[16px] font-semibold text-slate-950 caret-[#071B3A] outline-none"
          type="tel"
          inputMode="tel"
          value={props.local}
          placeholder={country.placeholder}
          onChange={(e) => {
            let digits = e.target.value.replace(/\D/g, '');
            const length = country.groups.reduce((sum, size) => sum + size, 0);
            const dial = country.dial.slice(1);
            if (digits.startsWith(dial) && (e.target.value.trim().startsWith('+') || digits.length > length)) digits = digits.slice(dial.length);
            else if ((country.code === 'RU' || country.code === 'KZ') && digits.length === 11 && digits.startsWith('8')) digits = digits.slice(1);
            props.onLocal(formatByGroups(digits, country.groups));
          }}
        />
        </div>
      </div>
    </div>
  );
}

export default function OperatorMiniAppPage() {
  const firstNameRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const successDialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const statsRequestRef = useRef<AbortController | null>(null);
  const [submission, setSubmission] = useState<{ receiptId: number; customer: string; amount: string; currency: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [tariffList, setTariffList] = useState<TariffItem[]>(fallbackTariffs);
  const [currencyList, setCurrencyList] = useState<string[]>(fallbackCurrencies);
  const [tab, setTab] = useState<'payment' | 'stats' | 'salary'>('payment');
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [initialPassword, setInitialPassword] = useState('');
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', country: 'UZ', phoneLocal: '', email: '' });
  const [payment, setPayment] = useState({
    tariff: 'three_month',
    source: 'Instagram',
    otherSource: '',
    currency: 'RUB',
    total: String(fallbackTariffs.find((item) => item.code === 'three_month')!.prices.find((item) => item.currency === 'RUB')!.amount),
    amount: String(fallbackTariffs.find((item) => item.code === 'three_month')!.prices.find((item) => item.currency === 'RUB')!.amount),
    dueAt: '',
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customRange, setCustomRange] = useState({ from: todayAppDate(), to: todayAppDate() });
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [statsRevision, setStatsRevision] = useState(0);
  const [openDebtCurrency, setOpenDebtCurrency] = useState<string | null>(null);

  const hasTelegram = Boolean(initData());
  const activeUserId = selected?.id ?? null;
  const isPartial = Number(payment.amount) > 0 && Number(payment.total) > Number(payment.amount);
  const currentTariff = tariffList.find((item) => item.code === payment.tariff) ?? tariffList[0];
  const currentPrice = currentTariff?.prices.find((item) => item.currency === payment.currency);

  const selectedLabel = useMemo(() => {
    if (!selected) return '';
    return `#${selected.id} · ${selected.first_name || ''} ${selected.last_name || ''}`.trim();
  }, [selected]);

  const phone = useMemo(() => {
    const country = countries.find((item) => item.code === customer.country) ?? countries[0];
    return `${country.dial} ${customer.phoneLocal}`.trim();
  }, [customer.country, customer.phoneLocal]);

  function tariffPrice(tariffCode: string, currency: string) {
    return tariffList.find((item) => item.code === tariffCode)?.prices.find((item) => item.currency === currency);
  }

  function applyCatalogPrice(next: Partial<typeof payment>) {
    const tariffCode = next.tariff ?? payment.tariff;
    const currency = next.currency ?? payment.currency;
    const price = tariffPrice(tariffCode, currency);
    const total = price?.amount ? String(price.amount) : '';
    setPayment({ ...payment, ...next, total, amount: total });
  }

  const loadStats = useCallback(async (silent = false) => {
    if (!hasTelegram) {
      setStatsError('Hisobotni Telegram mini ilovasida oching.');
      return;
    }
    if (silent && statsRequestRef.current) return;
    statsRequestRef.current?.abort();
    const controller = new AbortController();
    statsRequestRef.current = controller;
    setStatsLoading(true);
    setStatsError('');
    if (!silent) setStats(null);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        params.set('from', customRange.from);
        params.set('to', customRange.to);
      }
      const result = await api<StatsResponse>(`/stats?${params}`, { signal: controller.signal, cache: 'no-store' });
      if (!controller.signal.aborted) setStats(result);
    } catch (e: any) {
      if (!controller.signal.aborted) setStatsError(e.message || 'Hisobot yuklanmadi. Qayta urinib ko‘ring.');
    } finally {
      if (statsRequestRef.current === controller) {
        statsRequestRef.current = null;
        setStatsLoading(false);
      }
    }
  }, [hasTelegram, period, customRange.from, customRange.to]);

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    if (!hasTelegram) {
      setReady(true);
      return;
    }
    api<{ operator: { name: string }; tariffs: TariffItem[]; currencies: string[] }>('/me')
      .then((res) => {
        setOperatorName(res.operator.name);
        if (res.tariffs?.length) {
          setTariffList(res.tariffs);
          const price = res.tariffs.find((item) => item.code === payment.tariff)?.prices.find((item) => item.currency === payment.currency);
          if (price?.amount) setPayment((prev) => ({ ...prev, total: String(price.amount), amount: String(price.amount) }));
        }
        if (res.currencies?.length) setCurrencyList(res.currencies);
      })
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
    if (!ready || tab === 'payment') return;
    setOpenDebtCurrency(null);
    void loadStats();
    const refresh = () => { if (document.visibilityState === 'visible') void loadStats(true); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      statsRequestRef.current?.abort();
      statsRequestRef.current = null;
    };
  }, [ready, tab, loadStats, statsRevision]);

  useEffect(() => {
    if (!submission) return;
    const dialog = successDialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, [submission]);

  async function createCustomer() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const res = await api<{ user: { id: number }; initialPassword: string }>('/customers', {
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
      setInitialPassword(res.initialPassword);
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
    if (!hasTelegram) {
      setResults([]);
      if (showErrors) setError('Qidirish Telegram mini ilovasi ichida ishlaydi.');
      return;
    }
    setSearchBusy(true);
    setError('');
    setNote('');
    try {
      const res = await api<{ items: Customer[] }>(`/customers?q=${encodeURIComponent(term)}`);
      setResults(res.items);
      if (showErrors && !res.items.length) setNote('Bu so‘rov bo‘yicha o‘quvchi topilmadi.');
    } catch (e: any) {
      if (showErrors) setError(e.message);
    } finally {
      setSearchBusy(false);
    }
  }

  async function submitPayment() {
    if (submittingRef.current) return;
    if (!activeUserId) {
      setError('Avval o‘quvchini tanlang yoki yarating.');
      return;
    }
    if (!receipt) {
      setError('Chek rasmini yoki PDF faylni yuklang.');
      return;
    }
    submittingRef.current = true;
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
      setSubmission({ receiptId: res.receiptId, customer: selectedLabel, amount: payment.amount, currency: payment.currency });
      setStats(null);
      setStatsRevision((value) => value + 1);
      setReceipt(null);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch (e: any) {
      setError(e.message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  const approvedByCurrency = useMemo(() => {
    const rows = new Map<string, number>();
    for (const item of stats?.payments ?? []) {
      if (item.status !== 'approved') continue;
      rows.set(item.currency, (rows.get(item.currency) ?? 0) + Number(item.amount || 0));
    }
    return [...rows.entries()].map(([currency, amount]) => ({ currency, amount }));
  }, [stats?.payments]);
  const pendingCount = stats?.payments
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + Number(item.receipts || 0), 0) ?? 0;
  const salesByDay = useMemo(() => {
    const grouped = new Map<string, StatsResponse['salesDays']>();
    for (const item of stats?.salesDays ?? []) {
      const list = grouped.get(item.day) ?? [];
      list.push(item);
      grouped.set(item.day, list);
    }
    return [...grouped.entries()].map(([day, rows]) => ({ day, rows }));
  }, [stats?.salesDays]);

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
        {note && tab === 'payment' && <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{note}</div>}

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-200 p-1">
          {[
            ['payment', 'To‘lov'],
            ['stats', 'Hisobot'],
            ['salary', 'Maosh'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`h-11 rounded-xl text-sm font-black ${tab === key ? 'bg-white text-[#071B3A] shadow-sm' : 'text-slate-500'}`}
              onClick={() => setTab(key as 'payment' | 'stats' | 'salary')}
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
                    setInitialPassword('');
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
                  onCountry={(v) => setCustomer((prev) => ({ ...prev, country: v, phoneLocal: '' }))}
                  onLocal={(v) => setCustomer((prev) => ({ ...prev, phoneLocal: v }))}
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
                    disabled={searchBusy || query.trim().length < 2}
                    onClick={() => void searchCustomers(true)}
                  >
                    {searchBusy ? 'Izlanmoqda...' : 'Topish'}
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
                      {item.debts?.length ? (
                        <span className="mt-2 block space-y-1">
                          {item.debts.map((debt) => (
                            <span key={debt.currency} className="block rounded-lg bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                              Qarz {debt.currency}: {moneyText(debt.debt, debt.currency)}
                            </span>
                          ))}
                        </span>
                      ) : null}
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
                {selected.debts?.length ? (
                  <div className="mt-3 space-y-2">
                    {selected.debts.map((debt) => (
                      <div key={debt.currency} className="rounded-xl bg-white p-3 text-sm font-bold text-red-700">
                        Qarz {debt.currency}: {moneyText(debt.debt, debt.currency)}
                        {Number(debt.pending) > 0 ? <span className="block text-xs text-amber-700">Tekshiruvda: {moneyText(debt.pending, debt.currency)}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {initialPassword && <p className="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-sm">Parol: <strong className="select-all font-mono text-base">{initialPassword}</strong></p>}
              </div>
            )}

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">To‘lov</p>
              <div className="grid grid-cols-3 gap-2">
                {tariffList.map((item) => {
                  const price = item.prices.find((p) => p.currency === payment.currency);
                  return (
                  <button
                    className={`rounded-xl border p-3 text-left ${payment.tariff === item.code ? 'border-[#0B2A6B] bg-[#071B3A] text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    key={item.code}
                    type="button"
                    disabled={!price?.amount}
                    onClick={() => applyCatalogPrice({ tariff: item.code })}
                  >
                    <strong className="block text-sm">{item.label}</strong>
                    <span className="text-xs opacity-80">{price?.display || 'Narx yo‘q'}</span>
                  </button>
                  );
                })}
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
                Kurs narxi: <span className="text-[#071B3A]">{currentPrice?.display || 'bu valyutada narx yo‘q'}</span>
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
                  <select className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold" value={payment.currency} onChange={(e) => applyCatalogPrice({ currency: e.target.value })}>
                    {currencyList.map((currency) => <option key={currency}>{currency}</option>)}
                  </select>
                </label>
              </div>
              {payment.source === 'Boshqa' && <Field label="Manba nomi" value={payment.otherSource} onChange={(v) => setPayment({ ...payment, otherSource: v })} />}
              <div className="grid grid-cols-2 gap-2">
                <Field label="Jami summa" value={payment.total} readOnly onChange={() => {}} inputMode="decimal" />
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
                <input ref={receiptInputRef} className="mt-1 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
              </label>
              <button className="h-13 w-full rounded-xl bg-[#1E5BFF] py-4 text-[16px] font-black text-white shadow-lg shadow-blue-900/20 disabled:opacity-50" disabled={busy || !hasTelegram || !activeUserId || !currentPrice?.amount || !receipt} onClick={submitPayment} type="button">
                {busy ? 'Yuborilmoqda...' : 'Chekni adminga yuborish'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200 p-1">
              {[
                ['today', 'Kun'],
                ['yesterday', 'Kecha'],
                ['week', 'Hafta'],
                ['month', 'Oy'],
                ['all', 'Jami'],
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
            <button className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-black text-[#071B3A]" type="button" disabled={statsLoading} onClick={() => void loadStats()}>
              {statsLoading ? 'Yangilanmoqda...' : 'Yangilash'}
            </button>
            {statsError ? (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{statsError}</p>
            ) : !stats ? (
              <p role="status" className="py-8 text-center text-sm text-slate-500">Yuklanmoqda...</p>
            ) : tab === 'salary' ? (
              <>
                <section className="rounded-2xl bg-[#071B3A] p-4 text-white shadow-lg shadow-slate-900/15">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-100/70">{stats?.range.label || 'Davr'} maoshi</p>
                  <p className="mt-2 break-words text-2xl font-black">{moneyText(stats?.salary.totalAmount ?? 0, 'UZS')}</p>
                  <p className="mt-1 text-sm font-bold text-blue-100/80">
                    {stats?.salary.soldCourses ?? 0} ta kurs · {moneyText(stats?.salary.perCourseAmount ?? 30000, 'UZS')} / kurs
                  </p>
                </section>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-black uppercase text-slate-400">Kurs</p>
                    <p className="mt-1 text-xl font-black text-[#071B3A]">{stats?.salary.soldCourses ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-black uppercase text-slate-400">Asosiy</p>
                    <p className="mt-1 text-sm font-black text-[#071B3A]">{moneyText(stats?.salary.baseAmount ?? 0, 'UZS')}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-black uppercase text-slate-400">Bonus</p>
                    <p className="mt-1 text-sm font-black text-emerald-600">{moneyText(stats?.salary.bonusAmount ?? 0, 'UZS')}</p>
                  </div>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-3">
                  <h2 className="text-sm font-black text-[#071B3A]">Hisob-kitob</h2>
                  <div className="mt-3 space-y-2 text-sm font-bold text-slate-700">
                    <div className="flex justify-between rounded-xl bg-slate-50 p-3">
                      <span>{stats?.salary.soldCourses ?? 0} kurs × {moneyText(stats?.salary.perCourseAmount ?? 30000, 'UZS')}</span>
                      <strong>{moneyText(stats?.salary.baseAmount ?? 0, 'UZS')}</strong>
                    </div>
                    <div className="flex justify-between rounded-xl bg-emerald-50 p-3 text-emerald-700">
                      <span>Bonus</span>
                      <strong>{moneyText(stats?.salary.bonusAmount ?? 0, 'UZS')}</strong>
                    </div>
                    {period === 'today' && (stats?.salary.nextTarget ? (
                      <p className="rounded-xl bg-blue-50 p-3 text-xs font-black text-blue-700">
                        Keyingi bonus: yana {stats.salary.remainingToNext} ta kurs → {moneyText(stats.salary.nextBonusAmount ?? 0, 'UZS')}
                      </p>
                    ) : (
                      <p className="rounded-xl bg-emerald-50 p-3 text-xs font-black text-emerald-700">Eng yuqori bonus olindi.</p>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-3">
                  <h2 className="text-sm font-black text-[#071B3A]">Kunlik bonus</h2>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(stats?.salary.tiers ?? []).map((tier) => (
                      <div key={tier.courses} className={`rounded-xl p-3 text-center ${period === 'today' && Number(stats?.salary.soldCourses ?? 0) >= tier.courses ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                        <p className="text-lg font-black">{tier.courses} ta</p>
                        <p className="text-xs font-black">{moneyText(tier.amount, 'UZS')}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-3">
                  <h2 className="text-sm font-black text-[#071B3A]">Kunlar bo‘yicha</h2>
                  <div className="mt-2 space-y-2">
                    {stats?.salaryDays.length ? stats.salaryDays.map((item) => (
                      <div key={item.day} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-sm text-[#071B3A]">{dayText(item.day)}</strong>
                          <strong>{moneyText(item.totalAmount, 'UZS')}</strong>
                        </div>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {item.soldCourses} ta kurs · asosiy {moneyText(item.baseAmount, 'UZS')} · bonus {moneyText(item.bonusAmount, 'UZS')}
                        </p>
                      </div>
                    )) : <p className="text-sm font-semibold text-slate-500">Bu davrda tasdiqlangan kurs yo‘q.</p>}
                  </div>
                </section>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-black uppercase text-slate-400">Tasdiq</p>
                    {approvedByCurrency.length ? approvedByCurrency.map((item) => (
                      <p key={item.currency} className="mt-1 text-sm font-black text-emerald-600">{moneyText(item.amount, item.currency)}</p>
                    )) : <p className="mt-1 text-lg font-black text-emerald-600">0</p>}
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-black uppercase text-slate-400">Kutilmoqda</p>
                    <p className="mt-1 text-lg font-black text-amber-600">{pendingCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="text-[11px] font-black uppercase text-slate-400">Joriy qarz</p>
                    <div className="mt-1 space-y-0.5">
                      {stats?.debts.length ? stats.debts.map((item) => (
                        <p key={item.currency} className="text-xs font-black text-red-600">{moneyText(item.debt, item.currency)}</p>
                      )) : <p className="text-lg font-black text-red-600">0</p>}
                    </div>
                  </div>
                </div>
                <section className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-black text-[#071B3A]">Savdo statistikasi</h2>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400">Oy jami</p>
                      {stats?.salesMonth?.length ? stats.salesMonth.map((item) => (
                        <p key={item.currency} className="text-xs font-black text-[#071B3A]">{moneyText(item.amount, item.currency)}</p>
                      )) : <p className="text-xs font-black text-[#071B3A]">0</p>}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {salesByDay.length ? salesByDay.map((group) => (
                      <div key={group.day} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-sm text-[#071B3A]">{dayText(group.day)}</strong>
                          <span className="text-xs font-bold text-slate-500">{group.rows.reduce((sum, row) => sum + Number(row.receipts || 0), 0)} ta to‘lov</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.rows.map((row) => (
                            <span key={`${group.day}-${row.currency}`} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-[#071B3A]">
                              {moneyText(row.amount, row.currency)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )) : <p className="text-sm font-semibold text-slate-500">Bu davrda tasdiqlangan savdo yo‘q.</p>}
                  </div>
                </section>
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
                  <h2 className="text-sm font-black text-[#071B3A]">Joriy qarzlar</h2>
                  <div className="mt-2 space-y-2">
                    {stats?.debts.length ? stats.debts.map((item) => (
                      <div key={item.currency} className="rounded-xl bg-red-50 p-3 text-sm">
                        <button
                          className="w-full text-left"
                          type="button"
                          onClick={() => setOpenDebtCurrency(openDebtCurrency === item.currency ? null : item.currency)}
                        >
                          <div className="flex justify-between gap-2"><strong>{item.clients} mijoz · {item.currency}</strong><strong>{moneyText(item.debt, item.currency)}</strong></div>
                          <p className="mt-1 font-semibold text-red-700">Muddati o‘tgan: {moneyText(item.overdue, item.currency)}</p>
                          <p className="mt-1 text-xs font-black text-red-500">{openDebtCurrency === item.currency ? 'Yopish' : 'Kim qarzdorligini ko‘rish'}</p>
                        </button>
                        {openDebtCurrency === item.currency && (
                          <div className="mt-3 space-y-2">
                            {item.debtors.length ? item.debtors.map((debtor) => (
                              <article key={debtor.contract_id} className="rounded-xl bg-white p-3">
                                <div className="flex justify-between gap-2">
                                  <strong>#{debtor.user_id} · {debtor.first_name || 'Ism yo‘q'} {debtor.last_name || ''}</strong>
                                  <strong>{moneyText(debtor.debt, item.currency)}</strong>
                                </div>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{debtor.phone || 'telefon yo‘q'} · {debtor.source || 'manba yo‘q'} · {debtor.tariff}</p>
                                <p className="mt-1 text-xs font-bold text-red-700">Muddat: {fmtDate(debtor.due_at)}{Number(debtor.pending) > 0 ? ` · Tekshiruvda: ${moneyText(debtor.pending, item.currency)}` : ''}</p>
                              </article>
                            )) : <p className="rounded-xl bg-white p-3 text-xs font-bold text-slate-500">Bu valyutada qarzdorlar ro‘yxati bo‘sh.</p>}
                          </div>
                        )}
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
                        <p className="mt-1 text-xs font-semibold text-slate-500">{item.phone || 'telefon yo‘q'} · {item.source} · {fmtDate(item.status === 'pending' ? item.created_at : item.decided_at || item.created_at)}</p>
                        <p className="mt-2 text-xs font-black text-[#071B3A]">{statusLabel[item.status] || item.status} · Qarz: {moneyText(item.status === 'rejected' ? 0 : item.debt, item.currency)} · Tekshiruvda: {moneyText(item.status === 'rejected' ? 0 : item.pending, item.currency)}</p>
                      </article>
                    )) : <p className="text-sm font-semibold text-slate-500">Tarix bo‘sh.</p>}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </section>
      <dialog
        ref={successDialogRef}
        aria-labelledby="receipt-success-title"
        aria-describedby="receipt-success-description"
        onCancel={() => setSubmission(null)}
        className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-32px)] max-w-sm overflow-auto rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-xl backdrop:bg-black/50"
      >
        <button type="button" aria-label="Yopish" title="Yopish" className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-lg text-slate-500" onClick={() => setSubmission(null)}><X size={20} /></button>
        <CheckCircle2 className="mb-3 text-emerald-600" size={36} aria-hidden="true" />
        <h2 id="receipt-success-title" className="pr-7 text-xl font-bold">To‘lov yuborildi</h2>
        <p id="receipt-success-description" className="mt-2 text-sm text-slate-600">Chek #{submission?.receiptId} administratorga yuborildi. Tasdiqlash kutilmoqda.</p>
        <p className="mt-4 break-words text-sm font-semibold">{submission?.customer}</p>
        <p className="mt-1 text-lg font-bold">{submission && moneyText(submission.amount, submission.currency)}</p>
        <button type="button" className="mt-5 h-12 w-full rounded-lg bg-[#071B3A] font-bold text-white" onClick={() => { setSubmission(null); setPeriod('today'); setTab('stats'); }}>Hisobotni ko‘rish</button>
        <button type="button" className="mt-2 h-12 w-full rounded-lg border border-slate-200 font-semibold" onClick={() => {
          setSubmission(null);
          setSelected(null);
          setInitialPassword('');
          setCustomer({ firstName: '', lastName: '', country: 'UZ', phoneLocal: '', email: '' });
          setQuery('');
          setResults([]);
          setNote('');
          setPayment((prev) => ({ ...prev, amount: prev.total, dueAt: '' }));
          setTab('payment');
        }}>Yangi to‘lov</button>
      </dialog>
    </main>
  );
}
