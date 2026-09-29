import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '../api';

type FormState = {
  name: string;
  phone: string;
  website: string;
};

function utmPayload() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
    landingPage: `${window.location.pathname}${window.location.search}`,
  };
}

function promoSessionId() {
  const key = 'promoRussianSessionId';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function formatUzPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);

  const operator = digits.slice(0, 2);
  const first = digits.slice(2, 5);
  const second = digits.slice(5, 7);
  const third = digits.slice(7, 9);

  let out = '+998';
  if (operator) out += ` ${operator}`;
  if (first) out += ` ${first}`;
  if (second) out += `-${second}`;
  if (third) out += `-${third}`;
  return out;
}

function uzPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('998') ? digits.slice(3) : digits;
}

export default function PromoRussianPage() {
  const [form, setForm] = useState<FormState>({ name: '', phone: '+998 ', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const source = useMemo(() => utmPayload(), []);
  const sessionId = useMemo(() => promoSessionId(), []);
  const tracked = useRef(new Set<string>());
  const startedAt = useRef(Date.now());
  const lastStep = useRef('open');
  const exitTracked = useRef(false);

  function sessionMetadata(extra: Record<string, unknown> = {}) {
    let referrerHost = '';
    try {
      referrerHost = document.referrer ? new URL(document.referrer).host : '';
    } catch {
      referrerHost = '';
    }
    return {
      device: window.innerWidth <= 640 ? 'mobile' : 'desktop',
      width: window.innerWidth,
      height: window.innerHeight,
      lang: navigator.language || '',
      referrerHost,
      step: lastStep.current,
      ...extra,
    };
  }

  function track(eventType: string, metadata: Record<string, unknown> = {}) {
    if (!['submit_click', 'form_error', 'page_exit'].includes(eventType) && tracked.current.has(eventType)) return;
    tracked.current.add(eventType);
    void fetch(apiUrl('/api/promo/russian-event'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, sessionId, ...source, metadata: sessionMetadata(metadata) }),
      keepalive: true,
    }).catch(() => undefined);
  }

  useEffect(() => {
    track('page_view');
    const onPageHide = () => {
      if (exitTracked.current) return;
      exitTracked.current = true;
      track('page_exit', { timeMs: Date.now() - startedAt.current });
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      onPageHide();
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (form.name.trim().length < 2) {
      setError('Ismingizni kiriting.');
      track('form_error', { errorCode: 'name_required' });
      return;
    }
    if (uzPhoneDigits(form.phone).length !== 9) {
      setError('Telefon raqamini to‘liq kiriting.');
      track('form_error', { errorCode: 'phone_incomplete' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(apiUrl('/api/promo/russian-lead'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          website: form.website,
          sessionId,
          ...source,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || 'Ariza yuborilmadi.'));
      lastStep.current = 'accepted';
      track('lead_saved');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ariza yuborilmadi.');
      track('form_error', { errorCode: 'server_error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071B3A] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 pb-6 pt-5">
        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="rounded-[28px] bg-white p-5 text-[#071B3A] shadow-2xl shadow-black/20">
            <header className="flex flex-col items-center text-center">
              <img src="/landing/falarus-mark.svg" alt="" className="h-12 w-16" />
              <p className="mt-3 text-[24px] font-black leading-none tracking-normal">FalaRus</p>
            </header>

            {done ? (
              <div className="mt-6 rounded-[22px] bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-8 w-8" />
                <h2 className="mt-3 text-xl font-black">Sizning arizangiz qabul qilindi.</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800">
                  Biz tez orada siz bilan bog‘lanamiz.
                </p>
                <a
                  href="/"
                  onClick={() => track('platform_click')}
                  className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[#071B3A] px-4 text-sm font-black text-white transition active:scale-[0.99]"
                >
                  Platformaga o‘tish
                </a>
              </div>
            ) : (
              <form className="mt-7 space-y-4" onSubmit={submit}>
                <div className="text-center">
                  <h1 className="text-[24px] font-black leading-tight tracking-normal">
                    Ma’lumotlaringizni to‘ldiring
                  </h1>
                  <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
                    Operatorlarimiz siz bilan bog‘lanib, to‘liq ma’lumot beradi.
                  </p>
                </div>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Ism</span>
                  <input
                    value={form.name}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, name: e.target.value }));
                      if (e.target.value.trim().length >= 2) {
                        lastStep.current = 'name';
                        track('name_input');
                      }
                    }}
                    autoComplete="name"
                    className="mt-1 h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="Ismingiz"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Telefon raqam</span>
                  <input
                    value={form.phone}
                    onChange={(e) => {
                      const value = formatUzPhone(e.target.value);
                      setForm((s) => ({ ...s, phone: value }));
                      if (uzPhoneDigits(value).length >= 9) {
                        lastStep.current = 'phone';
                        track('phone_input');
                      }
                    }}
                    onFocus={() => setForm((s) => ({ ...s, phone: formatUzPhone(s.phone) }))}
                    autoComplete="tel"
                    inputMode="tel"
                    className="mt-1 h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="+998 90 123-45-67"
                  />
                </label>

                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
                  className="hidden"
                  aria-hidden="true"
                />

                {error ? (
                  <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={busy}
                    onClick={() => {
                      lastStep.current = 'submit';
                      track('submit_click');
                    }}
                    className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-[15px] font-black text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.99] disabled:opacity-65"
                  >
                    {busy ? 'Yuborilmoqda…' : 'Ariza yuborish'}
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-center text-[11px] font-semibold leading-5 text-slate-400">
                  Operatorlarimiz siz bilan bog‘lanadi.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
