import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Coins, Copy, CreditCard, Gift, GraduationCap, History, Link2, RefreshCw, Send, Share2, ShieldCheck, Users, Wallet, X } from 'lucide-react';
import {
  buyWithBonus,
  getBonusPrices,
  getReferralHistory,
  getReferralPageData,
  getWithdrawalMinimums,
  requestWithdrawal,
  type BonusPriceItem,
  type Currency,
  type InvitedFriend,
  type LedgerItem,
  type ReferralBalance,
  type ReferralPageData,
  type WithdrawalItem,
  type WithdrawalMinimums,
} from '../api/referral';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import '../styles/invite-page.css';

const SYMBOL: Record<Currency, string> = { UZS: "so'm", RUB: '₽', USD: '$' };
const money = (n: number, c: Currency) => `${n.toLocaleString('ru-RU', { maximumFractionDigits: c === 'UZS' ? 0 : 2 })} ${SYMBOL[c]}`;
const UZ_MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
// Browsers render uz-UZ short months as "M10", so the month names are spelled out here.
const date = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const FRIEND_STATUS: Record<InvitedFriend['status'], { label: string; tone: string }> = {
  registered: { label: "Ro'yxatdan o'tdi", tone: 'bg-blue-50 text-[#1D4ED8] ring-blue-200' },
  purchased: { label: 'Kurs sotib oldi', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  review: { label: 'Tekshiruvda', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  not_eligible: { label: 'Bonus hisoblanmaydi', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

const LEDGER_LABEL: Record<LedgerItem['type'], string> = {
  reward: 'Bonus hisoblandi',
  hold_release: 'Tekshiruvdan o‘tdi',
  hold_cancel: 'Tekshiruvda bekor qilindi',
  reversal: 'Qaytarilgan to‘lov uchun ushlandi',
  withdrawal_reserve: 'Pul yechish so‘rovi',
  withdrawal_release: 'So‘rov rad etildi — qaytarildi',
  withdrawal_payout: 'Kartaga o‘tkazildi',
  spend: 'Bonusga kurs olindi',
  spend_release: 'Bonus xaridi bekor qilindi',
};

const WITHDRAWAL_STATUS: Record<WithdrawalItem['status'], { label: string; tone: string }> = {
  pending: { label: 'Ko‘rib chiqilmoqda', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  approved: { label: 'Tasdiqlandi — o‘tkazilmoqda', tone: 'bg-blue-50 text-[#1D4ED8] ring-blue-200' },
  paid: { label: 'O‘tkazildi', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'Rad etildi', tone: 'bg-red-50 text-red-700 ring-red-200' },
};

/** Balance effect shown in history: what the user could spend changed by this much. */
function ledgerChange(item: LedgerItem): number {
  return item.available_change + item.pending_change - item.debt_change;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] bg-app-surface p-5 ring-1 ring-slate-200 shadow-[0_14px_34px_rgba(148,163,184,0.12)] ${className}`}>{children}</section>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[24px] bg-app-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-app-text">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-bg-muted text-app-text" aria-label="Yopish"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass = 'mt-1 w-full min-h-11 rounded-2xl border border-slate-200 bg-app-bg px-3 text-[15px] text-app-text outline-none focus:border-[#16A34A]';

function WithdrawSheet({ token, balances, onClose, onDone }: { token: string | null; balances: ReferralBalance[]; onClose: () => void; onDone: () => void }) {
  const usable = balances.filter((b) => b.available > 0);
  const [currency, setCurrency] = useState<Currency>(usable[0]?.currency ?? 'UZS');
  const [amount, setAmount] = useState('');
  const [card, setCard] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mins, setMins] = useState<WithdrawalMinimums | null>(null);
  const [rateError, setRateError] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [key] = useState(newKey);
  const hasDebt = balances.some((b) => b.debt > 0);

  const loadMins = useCallback(() => {
    setRateError('');
    setMins(null);
    getWithdrawalMinimums(token).then(setMins).catch((e) => setRateError(e instanceof Error ? e.message : 'Valyuta kursi olinmadi'));
  }, [token]);
  useEffect(loadMins, [loadMins]);

  const balance = balances.find((b) => b.currency === currency)!;
  const min = mins?.minimums[currency];
  const value = Number(amount.replace(',', '.'));

  const submit = async () => {
    setError('');
    if (!min) return;
    if (!(value >= min)) return setError(`Minimal summa: ${money(min, currency)}`);
    if (value > balance.available) return setError('Balans yetarli emas');
    if (card.replace(/\D/g, '').length < 12) return setError("Karta raqamini to'liq kiriting");
    if (name.trim().length < 3) return setError('Karta egasining ism-familiyasini kiriting');
    setSending(true);
    try {
      await requestWithdrawal(token, { currency, amount: value, card_number: card, full_name: name, phone, idempotency_key: key });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "So'rov yuborilmadi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet title="Pul yechish" onClose={onClose}>
      {hasDebt ? (
        <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">Qarzdorlik to‘liq yopilmaguncha pul yechib bo‘lmaydi. Yangi bonuslar avval qarzni yopadi.</p>
      ) : usable.length === 0 ? (
        <p className="rounded-2xl bg-app-bg-muted p-3 text-sm text-app-text-muted">Yechish uchun mavjud bonus yo‘q.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            {usable.map((b) => (
              <button key={b.currency} type="button" onClick={() => setCurrency(b.currency)} aria-pressed={currency === b.currency}
                className={`min-h-11 flex-1 rounded-2xl px-3 text-sm font-extrabold ring-1 transition active:scale-[0.97] ${currency === b.currency ? 'bg-[#16A34A] text-white ring-[#16A34A]' : 'bg-app-bg text-app-text ring-slate-200'}`}>
                {b.currency}
              </button>
            ))}
          </div>
          <p className="text-sm text-app-text-muted">Mavjud: <b className="text-app-text">{money(balance.available, currency)}</b></p>
          {rateError ? (
            <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
              {rateError}
              <button type="button" onClick={loadMins} className="mt-2 block min-h-11 font-extrabold underline">Qayta urinish</button>
            </div>
          ) : min ? (
            <p className="text-xs text-app-text-muted">Minimal summa {money(min, currency)} (2 000 ₽ ekvivalenti, Markaziy bank kursi {mins?.rate_as_of})</p>
          ) : (
            <p className="text-xs text-app-text-muted">Kurs yuklanmoqda…</p>
          )}
          <label className="block text-sm font-semibold text-app-text">Summa
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} placeholder={min ? String(min) : ''} />
          </label>
          <label className="block text-sm font-semibold text-app-text">Karta raqami
            <input inputMode="numeric" autoComplete="cc-number" value={card} onChange={(e) => setCard(e.target.value)} className={inputClass} placeholder="8600 0000 0000 0000" />
          </label>
          <label className="block text-sm font-semibold text-app-text">Karta egasi
            <input autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ism Familiya" />
          </label>
          <label className="block text-sm font-semibold text-app-text">Telefon (ixtiyoriy)
            <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </label>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
          <button type="button" disabled={sending || !min} onClick={submit}
            className="min-h-12 w-full rounded-2xl bg-[#16A34A] text-[15px] font-extrabold text-white shadow-[0_18px_44px_rgba(22,163,74,0.28)] transition active:scale-[0.98] disabled:opacity-50">
            {sending ? 'Yuborilmoqda…' : "So'rov yuborish"}
          </button>
          <p className="text-xs text-app-text-muted">Pulni administrator qo‘lda o‘tkazadi. So‘rov tasdiqlangach va pul o‘tkazilgach holati shu yerda yangilanadi.</p>
        </div>
      )}
    </Sheet>
  );
}

function BuySheet({ token, balances, onClose, onDone }: { token: string | null; balances: ReferralBalance[]; onClose: () => void; onDone: () => void }) {
  const usable = balances.filter((b) => b.available > 0);
  const [currency, setCurrency] = useState<Currency>(usable[0]?.currency ?? 'UZS');
  const [items, setItems] = useState<BonusPriceItem[] | null>(null);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState<string | null>(null);
  const [key, setKey] = useState(newKey);
  const balance = balances.find((b) => b.currency === currency)!;
  const hasDebt = balances.some((b) => b.debt > 0);

  useEffect(() => {
    setItems(null);
    getBonusPrices(token, currency).then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Narxlar yuklanmadi'));
  }, [token, currency]);

  const buy = async (item: BonusPriceItem) => {
    setError('');
    setBuying(`${item.product}:${item.tariff}`);
    try {
      await buyWithBonus(token, { product: item.product, tariff: item.tariff, currency, idempotency_key: key });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xarid amalga oshmadi');
      setKey(newKey());
    } finally {
      setBuying(null);
    }
  };

  return (
    <Sheet title="Bonusga kurs olish" onClose={onClose}>
      {hasDebt ? (
        <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">Qarzdorlik yopilmaguncha bonus bilan to‘lab bo‘lmaydi.</p>
      ) : usable.length === 0 ? (
        <p className="rounded-2xl bg-app-bg-muted p-3 text-sm text-app-text-muted">Mavjud bonus yo‘q.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            {usable.map((b) => (
              <button key={b.currency} type="button" onClick={() => setCurrency(b.currency)} aria-pressed={currency === b.currency}
                className={`min-h-11 flex-1 rounded-2xl px-3 text-sm font-extrabold ring-1 transition active:scale-[0.97] ${currency === b.currency ? 'bg-[#16A34A] text-white ring-[#16A34A]' : 'bg-app-bg text-app-text ring-slate-200'}`}>
                {b.currency}
              </button>
            ))}
          </div>
          <p className="text-sm text-app-text-muted">Mavjud: <b className="text-app-text">{money(balance.available, currency)}</b>. To‘liq bonus bilan to‘lanadi, boshqa valyutaga aylantirilmaydi.</p>
          {!items && !error && <p className="text-sm text-app-text-muted">Yuklanmoqda…</p>}
          {items?.map((item) => {
            const enough = balance.available >= item.price;
            const id = `${item.product}:${item.tariff}`;
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded-2xl bg-app-bg p-3 ring-1 ring-slate-200">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-app-text">{item.label}</p>
                  <p className="text-xs text-app-text-muted">{money(item.price, currency)}</p>
                </div>
                <button type="button" disabled={!enough || buying !== null} onClick={() => buy(item)}
                  className="min-h-11 shrink-0 rounded-2xl bg-[#16A34A] px-4 text-sm font-extrabold text-white transition active:scale-[0.97] disabled:opacity-40">
                  {buying === id ? '…' : enough ? 'Olish' : 'Yetmaydi'}
                </button>
              </div>
            );
          })}
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}

const SHARE_TEXT = 'FalaRus’da rus tilini o‘rganamiz — mening havolam orqali qo‘shiling:';

const HOW_STEPS = [
  { icon: Link2, title: 'Havolani yuboring', text: 'Telegram, WhatsApp yoki istalgan chatga.' },
  { icon: GraduationCap, title: 'Do‘stingiz kurs oladi', text: 'Havola orqali ro‘yxatdan o‘tib, birinchi xaridini qiladi.' },
  { icon: Coins, title: 'Bonus sizga', text: 'To‘lovning ulushi balansingizga tushadi — kartaga yoki kursga.' },
];

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-app-bg-subtle ${className}`} />;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-2xl bg-app-surface px-3 py-3 ring-1 ring-slate-200">
      <p className="text-[18px] font-extrabold leading-tight text-app-text [overflow-wrap:anywhere]">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold leading-tight text-app-text-muted">{label}</p>
    </div>
  );
}

function HowItWorks({ percent }: { percent: number }) {
  return (
    <Card>
      <h2 className="text-base font-extrabold text-app-text">Qanday ishlaydi</h2>
      <ol className="mt-4 space-y-4">
        {HOW_STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="relative flex gap-3">
            {i < HOW_STEPS.length - 1 && <span className="absolute left-[21px] top-11 h-[calc(100%-28px)] w-0.5 bg-emerald-100" aria-hidden="true" />}
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-extrabold text-app-text">{i + 1}. {i === 2 ? `${percent}% sizga` : title}</p>
              <p className="text-[13px] leading-snug text-app-text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Rules({ percent }: { percent: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-app-text-muted" aria-hidden="true" /><h2 className="text-base font-extrabold text-app-text">Dastur shartlari</h2></span>
        <ChevronDown className={`h-5 w-5 text-app-text-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-app-text-muted">
          <li>• Do‘stingiz sizning havolangiz orqali ro‘yxatdan o‘tishi kerak.</li>
          <li>• Bonus — do‘stingizning <b className="text-app-text">birinchi</b> xaridi uchun to‘langan summaning {percent}%: rus tili kursi, patent yoki VNJ tayyorgarligi.</li>
          <li>• Operator orqali bo‘lib to‘lansa, shu birinchi shartnoma bo‘yicha har bir to‘lovdan {percent}% hisoblanadi.</li>
          <li>• Keyingi xaridlar, sinov darslari va o‘qituvchi xizmatlari uchun bonus berilmaydi. Bonusga olingan kurs ham bonus bermaydi.</li>
          <li>• Bonus to‘lov valyutasida (so‘m, rubl yoki dollar) hisoblanadi va boshqa valyutaga aylantirilmaydi.</li>
          <li>• To‘lov qaytarilsa, uning bonusi ham mutanosib ravishda bekor qilinadi.</li>
          <li>• Pul yechish — kamida 2 000 ₽ ekvivalenti. Bonusni kurs sotib olishga ham ishlatish mumkin.</li>
          <li>• O‘zingizni taklif qilib bo‘lmaydi. Shubhali holatlar administrator tomonidan tekshiriladi.</li>
        </ul>
      )}
    </Card>
  );
}

function EmptyRow({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-app-bg-subtle px-4 py-6 text-center">
      <Icon className="h-7 w-7 text-app-text-muted" aria-hidden="true" />
      <p className="text-sm text-app-text-muted">{text}</p>
    </div>
  );
}

type Tab = 'friends' | 'history' | 'withdrawals';

export default function InvitePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferralPageData | null>(null);
  const [history, setHistory] = useState<LedgerItem[]>([]);
  const [moreHistory, setMoreHistory] = useState(true);
  const [sheet, setSheet] = useState<'withdraw' | 'buy' | null>(null);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('friends');
  const [walletCurrency, setWalletCurrency] = useState<Currency | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const payload = await getReferralPageData(token);
      setData(payload);
      setHistory(payload.history);
      setMoreHistory(payload.history.length >= 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);
  useEffect(() => { void load(); }, [load]);

  const referralLink = data?.referral_link ?? '';
  const percent = data?.program.reward_percent ?? 10;
  const enabled = data?.program.enabled === true;
  const balances = data?.balances ?? [];
  const shownBalances = balances.filter((b) => b.available || b.pending || b.reserved || b.debt || b.earned || b.paid_out || b.spent);
  const invited = data?.invited ?? [];
  const withdrawals = data?.withdrawals ?? [];
  const purchased = useMemo(() => invited.filter((f) => f.status === 'purchased').length, [invited]);
  const canUse = enabled && balances.some((b) => b.available > 0);
  const hasDebt = balances.some((b) => b.debt > 0);
  const wallet = shownBalances.find((b) => b.currency === walletCurrency) ?? shownBalances[0] ?? null;
  const topEarned = [...shownBalances].sort((a, b) => b.earned - a.earned)[0];
  const telegramUrl = referralLink ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(SHARE_TEXT)}` : '';

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const handleShare = async () => {
    if (!referralLink) return;
    try {
      if (navigator.share) await navigator.share({ title: 'FalaRus.uz', text: SHARE_TEXT, url: referralLink });
      else await handleCopy();
    } catch {
      // user cancelled share sheet
    }
  };
  const loadMore = async () => {
    const last = history.at(-1);
    if (!last) return;
    const next = await getReferralHistory(token, last.id).catch(() => []);
    setHistory((h) => [...h, ...next]);
    setMoreHistory(next.length >= 50);
  };
  const finished = (message: string) => {
    setSheet(null);
    setNotice(message);
    void load();
  };
  const openSheet = (kind: 'withdraw' | 'buy') => { setNotice(''); setSheet(kind); };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'friends', label: `Do‘stlar${invited.length ? ` · ${invited.length}` : ''}` },
    { id: 'history', label: 'Tarix' },
    ...(withdrawals.length ? [{ id: 'withdrawals' as const, label: 'So‘rovlar' }] : []),
  ];

  return (
    <div className="min-h-screen bg-app-bg px-4 pb-24 pt-4">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/profile'))} aria-label={t('common.back')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-surface text-app-text ring-1 ring-slate-200 transition hover:bg-app-bg-subtle active:scale-[0.95]">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold text-app-text">{t('invite.title')}</h1>
        </div>

        <section className="invite-hero relative isolate overflow-hidden rounded-[28px] px-5 pb-5 pt-6 text-white">
          <span className="invite-hero__coin invite-hero__coin--a" aria-hidden="true">{percent}%</span>
          <span className="invite-hero__coin invite-hero__coin--b" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em]">
            <Gift className="h-3.5 w-3.5" aria-hidden="true" />Taklif dasturi
          </span>
          <h2 className="mt-3 max-w-[78%] text-[24px] font-black leading-[1.15]">Do‘stlaringizni taklif qiling — pul ishlang</h2>
          <p className="mt-2 max-w-[92%] text-[14px] font-semibold leading-snug text-white/90">
            Har bir do‘stingizning birinchi to‘lovidan <b className="text-[#FDE68A]">{percent}%</b> sizning hisobingizga tushadi.
          </p>

          {loading ? (
            <div className="mt-5 h-[124px] animate-pulse rounded-2xl bg-white/12" />
          ) : error ? (
            <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold text-red-700" role="alert">
              {error}
              <button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-2 flex min-h-11 items-center gap-2 font-extrabold text-app-text">
                <RefreshCw className="h-4 w-4" />Qayta urinish
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 flex items-center gap-2 rounded-2xl bg-black/15 p-1.5 pl-3.5 ring-1 ring-white/15">
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/95">{referralLink.replace(/^https?:\/\//, '') || t('invite.linkMissing')}</p>
                <button type="button" onClick={handleCopy} aria-label={t('common.copy')}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[13px] font-extrabold transition hover:bg-white/25 active:scale-[0.95]">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={handleShare}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-[15px] font-black text-[#15803D] shadow-[0_10px_24px_-10px_rgba(0,0,0,.35)] transition hover:bg-emerald-50 active:scale-[0.97]">
                  <Share2 className="h-[18px] w-[18px]" />Ulashish
                </button>
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Telegram orqali yuborish"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#229ED9] px-4 text-[15px] font-extrabold text-white transition hover:bg-[#1E8EC4] active:scale-[0.97]">
                  <Send className="h-[18px] w-[18px]" />Telegram
                </a>
              </div>
              {!enabled && (
                <p className="mt-3 rounded-2xl bg-black/15 p-3 text-xs font-semibold text-white/90">Bonus dasturi tez orada ishga tushadi. Havolani hozirdan ulashishingiz mumkin — do‘stlaringiz bog‘lanib qoladi.</p>
              )}
            </>
          )}
        </section>

        {notice && (
          <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200" role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}
          </div>
        )}

        {loading && (
          <>
            <div className="grid grid-cols-3 gap-2"><Skeleton className="h-[62px]" /><Skeleton className="h-[62px]" /><Skeleton className="h-[62px]" /></div>
            <Skeleton className="h-[190px] rounded-[24px]" />
          </>
        )}

        {data && (
          <>
            <section className="grid grid-cols-[1fr_1fr_1.5fr] gap-2" aria-label="Natijalar">
              <Stat label="Taklif qilingan" value={invited.length} />
              <Stat label="Kurs olgan" value={purchased} />
              <Stat label="Jami ishlangan" value={topEarned ? money(topEarned.earned, topEarned.currency) : "0 so'm"} />
            </section>

            {invited.length === 0 && <HowItWorks percent={percent} />}

            <Card>
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-extrabold text-app-text"><Wallet className="h-5 w-5 text-emerald-600" aria-hidden="true" />Bonus hamyon</h2>
                {shownBalances.length > 1 && (
                  <div className="flex rounded-xl bg-app-bg-subtle p-1" role="tablist" aria-label="Valyuta">
                    {shownBalances.map((b) => (
                      <button key={b.currency} type="button" role="tab" aria-selected={wallet?.currency === b.currency} onClick={() => setWalletCurrency(b.currency)}
                        className={`min-h-9 rounded-lg px-2.5 text-xs font-extrabold transition ${wallet?.currency === b.currency ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-text-muted'}`}>
                        {b.currency}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-4 text-xs font-semibold text-app-text-muted">Yechish mumkin</p>
              <p className="text-[32px] font-black leading-tight tracking-tight text-app-text">{wallet ? money(wallet.available, wallet.currency) : "0 so'm"}</p>
              {!wallet && <p className="mt-1 text-sm text-app-text-muted">Do‘stingiz birinchi kursini sotib olgach, bonus shu yerda paydo bo‘ladi.</p>}

              {wallet && (
                <dl className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {[
                    { label: 'Jami', value: wallet.earned, tone: 'bg-app-bg-subtle text-app-text' },
                    { label: 'Tekshiruvda', value: wallet.pending, tone: 'bg-amber-50 text-amber-800' },
                    { label: 'So‘rovda', value: wallet.reserved, tone: 'bg-blue-50 text-blue-800' },
                    { label: 'Kartaga', value: wallet.paid_out, tone: 'bg-app-bg-subtle text-app-text' },
                    { label: 'Kursga', value: wallet.spent, tone: 'bg-app-bg-subtle text-app-text' },
                    { label: 'Qarz', value: wallet.debt, tone: 'bg-red-50 text-red-700' },
                  ].filter((row, i) => i === 0 || row.value > 0).map((row) => (
                    <div key={row.label} className={`flex gap-1 rounded-lg px-2 py-1 ${row.tone}`}>
                      <dt className="opacity-75">{row.label}</dt><dd className="font-extrabold">{money(row.value, wallet.currency)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {hasDebt && (
                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">Bonus berilgan to‘lov qaytarilgani uchun qarzdorlik paydo bo‘ldi. Yangi bonuslar avval uni yopadi; shu vaqtgacha pul yechish yopiq.</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" disabled={!canUse} onClick={() => openSheet('withdraw')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#16A34A] px-3 text-sm font-extrabold text-white shadow-[0_12px_28px_-12px_rgba(22,163,74,.7)] transition hover:bg-[#15803D] active:scale-[0.97] disabled:opacity-40 disabled:shadow-none">
                  <CreditCard className="h-4 w-4 shrink-0" />Pul yechish
                </button>
                <button type="button" disabled={!canUse} onClick={() => openSheet('buy')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-app-surface px-3 text-sm font-extrabold text-[#15803D] ring-1 ring-emerald-200 transition hover:bg-emerald-50 active:scale-[0.97] disabled:opacity-40">
                  <GraduationCap className="h-4 w-4 shrink-0" />Kurs olish
                </button>
              </div>
            </Card>

            <Card className="!p-0">
              <div className="flex gap-1 border-b border-slate-200 px-3 pt-3" role="tablist" aria-label="Faoliyat">
                {tabs.map((item) => (
                  <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
                    className={`-mb-px min-h-11 border-b-2 px-3 text-sm font-extrabold transition ${tab === item.id ? 'border-[#16A34A] text-app-text' : 'border-transparent text-app-text-muted hover:text-app-text'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {tab === 'friends' && (invited.length === 0 ? (
                  <EmptyRow icon={Users} text="Hozircha hech kim qo‘shilmadi. Havolani 3–5 ta do‘stingizga yuborib ko‘ring." />
                ) : (
                  <ul className="space-y-2">
                    {invited.map((f, idx) => (
                      <li key={`${f.name}-${idx}`} className="flex items-center gap-3 rounded-2xl bg-app-bg-subtle px-3 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800" aria-hidden="true">{initials(f.name)}</span>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-app-text">{f.name}</p><p className="text-[11px] text-app-text-muted">{date(f.joined_at)}</p></div>
                        <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ring-1 ${FRIEND_STATUS[f.status].tone}`}>{FRIEND_STATUS[f.status].label}</span>
                      </li>
                    ))}
                  </ul>
                ))}

                {tab === 'history' && (history.length === 0 ? (
                  <EmptyRow icon={History} text="Hozircha amallar yo‘q." />
                ) : (
                  <ul className="space-y-2">
                    {history.map((h) => {
                      const change = ledgerChange(h);
                      return (
                        <li key={h.id} className="flex items-center justify-between gap-2 rounded-2xl bg-app-bg-subtle px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-app-text">{LEDGER_LABEL[h.type]}</p>
                            <p className="text-[11px] text-app-text-muted">{date(h.created_at)}{h.type === 'reward' && h.base_amount ? ` · ${money(h.base_amount, h.currency)} to‘lovdan ${h.rate_percent}%` : ''}{h.type === 'reward' && h.pending_change > 0 ? ' · tekshiruvda' : ''}</p>
                          </div>
                          <span className={`shrink-0 text-sm font-extrabold ${change > 0 ? 'text-emerald-700' : change < 0 ? 'text-red-700' : 'text-app-text'}`}>
                            {change > 0 ? '+' : change < 0 ? '−' : ''}{money(Math.abs(change || h.amount), h.currency)}
                          </span>
                        </li>
                      );
                    })}
                    {moreHistory && <li><button type="button" onClick={loadMore} className="min-h-11 w-full rounded-xl text-sm font-bold text-[#15803D]">Yana ko‘rsatish</button></li>}
                  </ul>
                ))}

                {tab === 'withdrawals' && (
                  <ul className="space-y-2">
                    {withdrawals.map((w) => (
                      <li key={w.id} className="rounded-2xl bg-app-bg-subtle px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-app-text">{money(w.amount, w.currency)} · {w.card}</p>
                          <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ring-1 ${WITHDRAWAL_STATUS[w.status].tone}`}>{WITHDRAWAL_STATUS[w.status].label}</span>
                        </div>
                        <p className="text-[11px] text-app-text-muted">{date(w.created_at)}{w.paid_at ? ` · o‘tkazildi ${date(w.paid_at)}` : ''}{w.reject_reason ? ` · ${w.reject_reason}` : ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            {invited.length > 0 && <HowItWorks percent={percent} />}
            <Rules percent={percent} />
          </>
        )}
      </div>

      {sheet === 'withdraw' && <WithdrawSheet token={token} balances={balances} onClose={() => setSheet(null)} onDone={() => finished("So'rov yuborildi. Administrator ko‘rib chiqqach pul kartangizga o‘tkaziladi.")} />}
      {sheet === 'buy' && <BuySheet token={token} balances={balances} onClose={() => setSheet(null)} onDone={() => finished('Kurs bonus hisobidan ochildi.')} />}
    </div>
  );
}
