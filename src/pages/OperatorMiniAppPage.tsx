import { useEffect, useMemo, useState } from 'react';
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

const tariffs = [
  { code: 'month', label: '1 oy', hint: '3 000 ₽' },
  { code: 'three_month', label: '3 oy', hint: '4 000 ₽' },
  { code: 'six_month', label: '6 oy', hint: '6 000 ₽' },
];
const sources = ['Instagram', 'Telegram', 'WhatsApp', 'IMO', 'MAX', 'Boshqa'];
const currencies = ['RUB', 'UZS', 'USD'];

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

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-slate-600">{props.label}</span>
      <input
        className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none focus:border-[#0B2A6B] focus:ring-4 focus:ring-blue-100"
        type={props.type || 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

export default function OperatorMiniAppPage() {
  const [ready, setReady] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [resetLink, setResetLink] = useState('');
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', phone: '+998 ', email: '' });
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

  const hasTelegram = Boolean(initData());
  const activeUserId = selected?.id ?? null;
  const isPartial = Number(payment.amount) > 0 && Number(payment.total) > Number(payment.amount);

  const selectedLabel = useMemo(() => {
    if (!selected) return '';
    return `#${selected.id} · ${selected.first_name || ''} ${selected.last_name || ''}`.trim();
  }, [selected]);

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
    if (mode !== 'existing' || query.trim().length < 2 || !hasTelegram) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api<{ items: Customer[] }>(`/customers?q=${encodeURIComponent(query)}`)
        .then((res) => setResults(res.items))
        .catch((e) => setError(e.message));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, mode, hasTelegram]);

  async function createCustomer() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const res = await api<{ user: { id: number }; resetLink: string }>('/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...customer, email: customer.email.trim() || '-' }),
      });
      setSelected({
        id: res.user.id,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
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
      for (const [key, value] of Object.entries(payment)) form.set(key, value);
      form.set('receipt', receipt);
      const res = await api<{ receiptId: number }>('/payments', { method: 'POST', body: form });
      setNote(`Chek #${res.receiptId} adminga yuborildi. Holat: tekshiruvda.`);
      setReceipt(null);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch (e: any) {
      setError(e.message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="min-h-screen bg-[#071B3A] p-5 text-white">Yuklanmoqda...</div>;
  }

  return (
    <main className="min-h-screen bg-[#071B3A] px-4 py-5 text-slate-950">
      <section className="mx-auto max-w-md rounded-[24px] bg-slate-50 p-4 shadow-2xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1E5BFF]">FalaRus</p>
            <h1 className="text-2xl font-black text-[#071B3A]">Operator</h1>
          </div>
          <div className="rounded-2xl bg-[#071B3A] px-3 py-2 text-right text-xs font-bold text-white">
            {operatorName || 'Mini app'}
          </div>
        </header>

        {!hasTelegram && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Mini ilova Telegram ichida ochilganda ishlaydi.
          </div>
        )}

        {error && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        {note && <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{note}</div>}

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
              <Field label="Ism" value={customer.firstName} onChange={(v) => setCustomer({ ...customer, firstName: v })} placeholder="Ali" />
              <Field label="Familiya" value={customer.lastName} onChange={(v) => setCustomer({ ...customer, lastName: v })} placeholder="Aliyev" />
            </div>
            <Field label="Telefon" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} placeholder="+998 90 123 45 67" />
            <Field label="Email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} placeholder="email bo‘lmasa bo‘sh qoldiring" />
            <button
              className="h-12 w-full rounded-xl bg-[#0B2A6B] text-[15px] font-black text-white disabled:opacity-50"
              disabled={busy || !hasTelegram}
              onClick={createCustomer}
              type="button"
            >
              O‘quvchini yaratish
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
            <Field label="Qidirish" value={query} onChange={setQuery} placeholder="Ism, telefon, email yoki ID" />
            <div className="max-h-64 space-y-2 overflow-auto">
              {results.map((item) => (
                <button
                  className={`w-full rounded-xl border p-3 text-left ${selected?.id === item.id ? 'border-[#0B2A6B] bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                >
                  <strong>#{item.id} · {item.first_name} {item.last_name}</strong>
                  <span className="mt-1 block text-sm font-semibold text-slate-500">{item.phone || item.email || 'kontakt yo‘q'}</span>
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
            {resetLink && (
              <textarea
                className="mt-3 h-24 w-full rounded-xl border border-blue-200 bg-white p-2 text-xs font-semibold text-slate-700"
                readOnly
                value={resetLink}
              />
            )}
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
                onClick={() => setPayment({ ...payment, tariff: item.code, total: item.code === 'month' ? '3000' : item.code === 'six_month' ? '6000' : '4000', amount: item.code === 'month' ? '3000' : item.code === 'six_month' ? '6000' : '4000' })}
              >
                <strong className="block text-sm">{item.label}</strong>
                <span className="text-xs opacity-80">{item.hint}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[13px] font-semibold text-slate-600">Manba</span>
              <select
                className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold"
                value={payment.source}
                onChange={(e) => setPayment({ ...payment, source: e.target.value })}
              >
                {sources.map((source) => <option key={source}>{source}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-slate-600">Valyuta</span>
              <select
                className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold"
                value={payment.currency}
                onChange={(e) => setPayment({ ...payment, currency: e.target.value })}
              >
                {currencies.map((currency) => <option key={currency}>{currency}</option>)}
              </select>
            </label>
          </div>
          {payment.source === 'Boshqa' && (
            <Field label="Manba nomi" value={payment.otherSource} onChange={(v) => setPayment({ ...payment, otherSource: v })} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Jami summa" value={payment.total} onChange={(v) => setPayment({ ...payment, total: v })} />
            <Field label="To‘langan" value={payment.amount} onChange={(v) => setPayment({ ...payment, amount: v })} />
          </div>
          {isPartial && (
            <Field label="Qarz muddati" value={payment.dueAt} onChange={(v) => setPayment({ ...payment, dueAt: v })} placeholder="2026-10-01 15:30" />
          )}
          <label className="block">
            <span className="text-[13px] font-semibold text-slate-600">Chek</span>
            <input
              className="mt-1 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            className="h-13 w-full rounded-xl bg-[#1E5BFF] py-4 text-[16px] font-black text-white shadow-lg shadow-blue-900/20 disabled:opacity-50"
            disabled={busy || !hasTelegram || !activeUserId}
            onClick={submitPayment}
            type="button"
          >
            Chekni adminga yuborish
          </button>
        </div>
      </section>
    </main>
  );
}
