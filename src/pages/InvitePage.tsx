import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, Copy, GraduationCap, Share2, Users, Wallet, X } from 'lucide-react';
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

const SYMBOL: Record<Currency, string> = { UZS: "so'm", RUB: '₽', USD: '$' };
const money = (n: number, c: Currency) => `${n.toLocaleString('ru-RU', { maximumFractionDigits: c === 'UZS' ? 0 : 2 })} ${SYMBOL[c]}`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
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

const inputClass = 'mt-1 w-full min-h-11 rounded-2xl border border-slate-200 bg-app-bg px-3 text-[15px] text-app-text outline-none focus:border-[#2563EB]';

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
                className={`min-h-11 flex-1 rounded-2xl px-3 text-sm font-extrabold ring-1 transition active:scale-[0.97] ${currency === b.currency ? 'bg-[#2563EB] text-white ring-[#2563EB]' : 'bg-app-bg text-app-text ring-slate-200'}`}>
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
            className="min-h-12 w-full rounded-2xl bg-[#2563EB] text-[15px] font-extrabold text-white shadow-[0_18px_44px_rgba(37,99,235,0.28)] transition active:scale-[0.98] disabled:opacity-50">
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
                className={`min-h-11 flex-1 rounded-2xl px-3 text-sm font-extrabold ring-1 transition active:scale-[0.97] ${currency === b.currency ? 'bg-[#2563EB] text-white ring-[#2563EB]' : 'bg-app-bg text-app-text ring-slate-200'}`}>
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
                  className="min-h-11 shrink-0 rounded-2xl bg-[#2563EB] px-4 text-sm font-extrabold text-white transition active:scale-[0.97] disabled:opacity-40">
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
  const [rulesOpen, setRulesOpen] = useState(false);

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
  const purchased = useMemo(() => invited.filter((f) => f.status === 'purchased').length, [invited]);
  const canUse = enabled && balances.some((b) => b.available > 0);

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
      if (navigator.share) await navigator.share({ title: 'FalaRus.uz', text: t('invite.shareText'), url: referralLink });
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

  return (
    <div className="min-h-screen bg-app-bg px-4 pb-24 pt-4">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/profile'))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-app-surface px-4 text-app-text ring-1 ring-slate-200 transition active:scale-[0.97]">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <section className="overflow-hidden rounded-[24px] p-5 text-white shadow-[0_20px_44px_-16px_rgba(11,42,107,0.55)]" style={{ background: 'linear-gradient(150deg, #123A8F 0%, #0B2A6B 55%, #071B5E 100%)' }}>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20"><Users className="h-5 w-5 text-[#E7C578]" /></div>
            <h1 className="text-xl font-extrabold">{t('invite.title')}</h1>
          </div>
          <p className="text-sm font-semibold text-white/85">Do‘stingiz kursni birinchi marta sotib olsa, uning to‘lovidan {percent}% sizga bonus bo‘ladi.</p>
          {loading ? (
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm font-semibold text-white/80">{t('common.loading')}</div>
          ) : error ? (
            <div className="mt-4 rounded-2xl bg-[#FDE5E5] p-4 text-sm font-semibold text-[#8A1F1F]">
              {error}
              <button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-2 block min-h-11 font-extrabold underline">Qayta urinish</button>
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-2xl bg-white/12 p-3 ring-1 ring-white/15">
                <p className="break-all text-sm font-semibold text-white">{referralLink || t('invite.linkMissing')}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={handleCopy} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C08A2D] px-4 text-sm font-extrabold text-white transition hover:bg-[#A9791C] active:scale-[0.97]">
                  <Copy className="h-4 w-4" />
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
                <button type="button" onClick={handleShare} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-app-surface px-4 text-sm font-extrabold text-app-primary transition active:scale-[0.97]">
                  <Share2 className="h-4 w-4" />
                  {t('common.share')}
                </button>
              </div>
              {!enabled && (
                <p className="mt-3 rounded-2xl bg-white/10 p-3 text-xs font-semibold text-white/85">Bonus dasturi tez orada ishga tushadi. Havolani hozirdan ulashishingiz mumkin — do‘stlaringiz bog‘lanib qoladi.</p>
              )}
            </>
          )}
        </section>

        {notice && (
          <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200" role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}
          </div>
        )}

        {data && (
          <>
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-app-surface p-4 ring-1 ring-slate-200"><p className="text-xs text-app-text-muted">Taklif qilinganlar</p><p className="mt-1 text-lg font-bold text-app-text">{invited.length}</p></div>
              <div className="rounded-2xl bg-app-surface p-4 ring-1 ring-slate-200"><p className="text-xs text-app-text-muted">Kurs sotib olganlar</p><p className="mt-1 text-lg font-bold text-app-text">{purchased}</p></div>
            </section>

            <Card>
              <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-[#2563EB]" /><h2 className="text-base font-extrabold text-app-text">Bonus balans</h2></div>
              {shownBalances.length === 0 ? (
                <p className="mt-3 text-sm text-app-text-muted">Hozircha bonus yo‘q. Do‘stingiz birinchi kursini sotib olgach, bonus shu yerda paydo bo‘ladi.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {shownBalances.map((b) => (
                    <div key={b.currency} className="rounded-2xl bg-app-bg p-4 ring-1 ring-slate-200">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-extrabold tracking-wide text-app-text-muted">{b.currency}</span>
                        <span className="text-xl font-extrabold text-app-text">{money(b.available, b.currency)}</span>
                      </div>
                      <p className="text-right text-xs text-app-text-muted">mavjud</p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <dt className="text-app-text-muted">Jami hisoblangan</dt><dd className="text-right font-semibold text-app-text">{money(b.earned, b.currency)}</dd>
                        {b.pending > 0 && <><dt className="text-app-text-muted">Tekshiruvda</dt><dd className="text-right font-semibold text-amber-700">{money(b.pending, b.currency)}</dd></>}
                        {b.reserved > 0 && <><dt className="text-app-text-muted">Yechish so‘rovida</dt><dd className="text-right font-semibold text-app-text">{money(b.reserved, b.currency)}</dd></>}
                        {b.paid_out > 0 && <><dt className="text-app-text-muted">Kartaga o‘tkazilgan</dt><dd className="text-right font-semibold text-app-text">{money(b.paid_out, b.currency)}</dd></>}
                        {b.spent > 0 && <><dt className="text-app-text-muted">Kursga sarflangan</dt><dd className="text-right font-semibold text-app-text">{money(b.spent, b.currency)}</dd></>}
                        {b.debt > 0 && <><dt className="font-semibold text-red-700">Qarzdorlik</dt><dd className="text-right font-extrabold text-red-700">{money(b.debt, b.currency)}</dd></>}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
              {balances.some((b) => b.debt > 0) && (
                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">Bonus berilgan to‘lov qaytarilgani uchun qarzdorlik paydo bo‘ldi. Yangi bonuslar avval uni yopadi; shu vaqtgacha pul yechish yopiq.</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" disabled={!canUse} onClick={() => { setNotice(''); setSheet('withdraw'); }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-3 text-sm font-extrabold text-white transition active:scale-[0.97] disabled:opacity-40">
                  <Wallet className="h-4 w-4" />Pul yechish
                </button>
                <button type="button" disabled={!canUse} onClick={() => { setNotice(''); setSheet('buy'); }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-app-bg px-3 text-sm font-extrabold text-[#2563EB] ring-1 ring-slate-200 transition active:scale-[0.97] disabled:opacity-40">
                  <GraduationCap className="h-4 w-4" />Bonusga kurs
                </button>
              </div>
            </Card>

            <Card>
              <button type="button" onClick={() => setRulesOpen((v) => !v)} aria-expanded={rulesOpen} className="flex min-h-11 w-full items-center justify-between text-left">
                <h2 className="text-base font-extrabold text-app-text">Dastur shartlari</h2>
                <ChevronDown className={`h-5 w-5 text-app-text-muted transition ${rulesOpen ? 'rotate-180' : ''}`} />
              </button>
              {rulesOpen && (
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

            <Card>
              <h2 className="text-base font-extrabold text-app-text">{t('invite.listTitle')}</h2>
              {invited.length === 0 ? (
                <p className="mt-3 text-sm text-app-text-muted">{t('invite.listEmpty')}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {invited.map((f, idx) => (
                    <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 rounded-xl bg-app-bg-subtle px-3 py-2">
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-app-text">{f.name}</p><p className="text-[11px] text-app-text-muted">{date(f.joined_at)}</p></div>
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ring-1 ${FRIEND_STATUS[f.status].tone}`}>{FRIEND_STATUS[f.status].label}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {data.withdrawals.length > 0 && (
              <Card>
                <h2 className="text-base font-extrabold text-app-text">Pul yechish so‘rovlari</h2>
                <div className="mt-3 space-y-2">
                  {data.withdrawals.map((w) => (
                    <div key={w.id} className="rounded-xl bg-app-bg-subtle px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-app-text">{money(w.amount, w.currency)} · {w.card}</p>
                        <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ring-1 ${WITHDRAWAL_STATUS[w.status].tone}`}>{WITHDRAWAL_STATUS[w.status].label}</span>
                      </div>
                      <p className="text-[11px] text-app-text-muted">{date(w.created_at)}{w.paid_at ? ` · o‘tkazildi ${date(w.paid_at)}` : ''}{w.reject_reason ? ` · ${w.reject_reason}` : ''}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h2 className="text-base font-extrabold text-app-text">Bonuslar tarixi</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-sm text-app-text-muted">Hozircha amallar yo‘q.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {history.map((h) => {
                    const change = ledgerChange(h);
                    return (
                      <div key={h.id} className="flex items-center justify-between gap-2 rounded-xl bg-app-bg-subtle px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-app-text">{LEDGER_LABEL[h.type]}</p>
                          <p className="text-[11px] text-app-text-muted">{date(h.created_at)}{h.type === 'reward' && h.base_amount ? ` · ${money(h.base_amount, h.currency)} to‘lovdan ${h.rate_percent}%` : ''}{h.type === 'reward' && h.pending_change > 0 ? ' · tekshiruvda' : ''}</p>
                        </div>
                        <span className={`shrink-0 text-sm font-extrabold ${change > 0 ? 'text-emerald-700' : change < 0 ? 'text-red-700' : 'text-app-text'}`}>
                          {change > 0 ? '+' : change < 0 ? '−' : ''}{money(Math.abs(change || h.amount), h.currency)}
                        </span>
                      </div>
                    );
                  })}
                  {moreHistory && <button type="button" onClick={loadMore} className="min-h-11 w-full rounded-xl text-sm font-bold text-[#2563EB]">Yana ko‘rsatish</button>}
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {sheet === 'withdraw' && <WithdrawSheet token={token} balances={balances} onClose={() => setSheet(null)} onDone={() => finished("So'rov yuborildi. Administrator ko‘rib chiqqach pul kartangizga o‘tkaziladi.")} />}
      {sheet === 'buy' && <BuySheet token={token} balances={balances} onClose={() => setSheet(null)} onDone={() => finished('Kurs bonus hisobidan ochildi.')} />}
    </div>
  );
}
