import '../styles/course-info-responsive.css';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Play, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { openRahmatCheckout } from '../api/rahmat';
import { getWelcomeVideoOffer, replayWelcomeVideoOffer } from '../api/welcomeVideoOffer';
import { COURSE_VIDEO_SRC, COURSE_VIDEO_DURATION_SECONDS, secondsUntilCourseBonus } from '../../shared/courseOfferPlayback';
import { RUSSIAN_TARIFF_PLANS_RUB, formatRubAmount, formatRussianTariffUzsMing, type RussianTariffCode } from '../../shared/russianTariffs';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const offerPlan = RUSSIAN_TARIFF_PLANS_RUB.find(p => p.code === 'three_month')!;

export default function CourseInfoPage() {
  const { token } = useAuth();
  const video = useRef<HTMLVideoElement>(null);
  const requested = useRef(false);
  const maxPlayed = useRef(0);
  const [selectedTariff, setSelectedTariff] = useState<RussianTariffCode>('six_month');
  const selectedPlan = RUSSIAN_TARIFF_PLANS_RUB.find(plan => plan.code === selectedTariff)!;
  const [speed, setSpeed] = useState(1);
  const [untilBonus, setUntilBonus] = useState<number | null>(() => secondsUntilCourseBonus(COURSE_VIDEO_DURATION_SECONDS, 0));
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerError, setOfferError] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(true);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState(false);
  const left = expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000)) : 0;
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    if (token) void getWelcomeVideoOffer(token).then(s => {
      if (active && s.mode === 'offer') setExpiresAt(s.offerExpiresAt);
    }).catch(() => { /* Retry at the bonus point; video remains available. */ });
    return () => { active = false; };
  }, [token]);
  const reveal = async () => {
    if (!token || requested.current) return;
    requested.current = true;
    setOfferLoading(true); setOfferError(false);
    try {
      const state = await replayWelcomeVideoOffer(token);
      if (state.mode !== 'offer' || !state.offerExpiresAt) throw new Error('Offer unavailable');
      setExpiresAt(state.offerExpiresAt); setNow(Date.now());
    } catch { requested.current = false; setOfferError(true); }
    finally { setOfferLoading(false); }
  };
  const sync = () => {
    const el = video.current;
    if (!el) return;
    if (el.seeking) return;
    maxPlayed.current = Math.max(maxPlayed.current, el.currentTime);
    const remaining = secondsUntilCourseBonus(el.duration, el.currentTime);
    if (remaining !== null) setUntilBonus(remaining);
    if (remaining === 0 && !offerError) void reveal();
  };
  const play = async () => {
    if (!video.current) return;
    video.current.playbackRate = speed;
    try { await video.current.play(); setNeedsPlay(false); } catch { setNeedsPlay(true); }
  };
  const purchase = async (tariffType: RussianTariffCode, welcomeOffer = false) => {
    if (!token || buying || (welcomeOffer && left <= 0)) return;
    setBuying(true); setBuyError(false);
    try { await openRahmatCheckout({ token, productCode: 'russian', tariffType, welcomeOffer }); }
    catch { setBuyError(true); }
    finally { setBuying(false); }
  };
  return <main className="min-h-[calc(100dvh-80px)] bg-[#F2F5FA] pb-2 text-[#0F172A]"><div className="course-info-shell">
    <header className="flex items-center justify-between gap-4 px-4 py-1"><Link to="/" className="inline-flex min-h-11 items-center gap-2"><ArrowLeft size={20} />Orqaga</Link><Link to="/" className="flex items-center gap-2 text-2xl font-bold"><img src="/landing/falarus-mark.svg" className="h-9 w-10" alt="" />FalaRus</Link></header>
    <div className="course-info-countdown mx-4 mb-3 flex min-h-[60px] flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border-2 border-[#2443B3] bg-white px-3 py-2 text-[#2443B3] shadow-sm">
      <span className="text-[15px] font-bold leading-snug">Oxirigacha ko'ring, bonus oling</span>
      <span role="timer" aria-label={untilBonus == null ? 'Bonusgacha qolgan vaqt' : `Bonusgacha ${clock(untilBonus)}`} className="flex shrink-0 items-center gap-1.5 tabular-nums">
        <span className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-blue-100 bg-[#F2F5FF]"><span className="text-2xl font-bold leading-none">{untilBonus == null ? '—' : String(Math.floor(untilBonus / 60)).padStart(2, '0')}</span><span className="mt-1 text-[9px] font-semibold leading-none text-slate-500">MIN</span></span>
        <span aria-hidden="true" className="pb-3 text-xl font-semibold text-blue-400">:</span>
        <span className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-blue-100 bg-[#F2F5FF]"><span className="text-2xl font-bold leading-none">{untilBonus == null ? '—' : String(untilBonus % 60).padStart(2, '0')}</span><span className="mt-1 text-[9px] font-semibold leading-none text-slate-500">SEK</span></span>
      </span>
    </div>
    <div className="course-info-player relative mx-auto aspect-video w-[calc(100%_-_32px)] overflow-hidden rounded-2xl bg-black ring-2 ring-white shadow-sm"><video ref={video} src={COURSE_VIDEO_SRC} className="h-full w-full object-contain" controls playsInline preload="metadata" onSeeking={() => { const el = video.current; if (el && el.currentTime > maxPlayed.current + 0.35) el.currentTime = maxPlayed.current; }} onDurationChange={sync} onLoadedData={sync} onLoadedMetadata={sync} onTimeUpdate={sync} onEnded={sync} onError={() => setMediaError(true)} onPlay={() => setNeedsPlay(false)} />
      {needsPlay && !mediaError && <button onClick={() => void play()} aria-label="Videoni boshlash" className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-8 ring-blue-500/25"><Play size={28} fill="currentColor" /></button>}
      <select aria-label="Video tezligi" title="Video tezligi" value={speed} onChange={event => { const rate = Number(event.target.value); setSpeed(rate); if (video.current) video.current.playbackRate = rate; }} className="absolute right-2 top-2 z-10 min-h-11 min-w-[68px] rounded-xl border border-white/30 bg-slate-950/75 px-2 text-sm font-bold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
        {[1, 1.5, 2, 2.5].map(rate => <option key={rate} value={rate} className="bg-white text-slate-900">{rate}×</option>)}
      </select>
    </div>
    {mediaError && <p role="alert" className="p-4 text-center">Video yuklanmadi. <button className="underline" onClick={() => { setMediaError(false); video.current?.load(); }}>Qayta urinish</button></p>}
    <section aria-label="Tariflar" className="course-info-plans px-4 pb-2 pt-3">
      <fieldset disabled={buying} className="min-w-0"><legend className="mb-2 text-base font-bold">Tarifni tanlang</legend>
        <div className="flex flex-col gap-2">{RUSSIAN_TARIFF_PLANS_RUB.map(plan => {
          const selected = selectedTariff === plan.code;
          const monthly = Math.round(plan.priceRub / plan.months);
          return <label key={plan.code} className={'relative flex min-h-[68px] cursor-pointer items-center gap-2 rounded-[22px] border-2 px-3 py-2 transition-colors ' + (selected ? 'border-blue-600 bg-[#F5F8FF]' : 'border-[#E2E8F0] bg-white hover:border-blue-300')}>
            <input type="radio" name="course-tariff" value={plan.code} checked={selected} onChange={() => setSelectedTariff(plan.code)} className="peer sr-only" />
            <span aria-hidden="true" className={'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-blue-600 ' + (selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>
              {selected && <Check size={15} strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><span className="text-base font-bold">{plan.months} oy</span>{plan.discountPercent > 0 && <span title="Har oy alohida xarid qilishga nisbatan (RUB)" className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800">−{plan.discountPercent}%</span>}</div><p className="mt-1 text-xs text-slate-500">{plan.months === 3 ? '≈ ' : ''}{formatRubAmount(monthly)} ₽ / oy</p></div>
            <div className="shrink-0 text-right tabular-nums"><p className="text-xl font-bold">{formatRubAmount(plan.priceRub)} ₽</p><p className="mt-1 text-xs text-slate-500">{formatRussianTariffUzsMing(plan.priceUzs)}</p></div>
          </label>;
        })}</div>
      </fieldset>
      <button disabled={buying} onClick={() => void purchase(selectedTariff)} className="mt-3 flex min-h-14 w-full items-center justify-center gap-3 rounded-[22px] border-b-4 border-blue-800 bg-[#2563FF] px-4 py-3 text-lg font-extrabold text-white shadow-[0_5px_12px_rgba(37,99,235,0.2)] transition-colors hover:bg-blue-600 active:border-b-2 disabled:opacity-50">{buying ? '…' : 'Sotib olish · ' + formatRubAmount(selectedPlan.priceRub) + ' ₽'}<ArrowRight size={22} className="shrink-0" /></button>
    </section>
    {left > 0 && <section aria-label="Maxsus taklif" className="mx-4 mb-4 flex flex-col gap-4 rounded-2xl bg-[#1E40AF] p-5 text-white shadow-lg">
      <div><p className="text-xs font-bold text-blue-200">MAXSUS TAKLIF</p><h2 className="mt-1 text-[28px] font-extrabold leading-tight">+3 oy bepul</h2><p className="mt-1 text-sm text-blue-100">3 oy narxiga 6 oy o'qing</p></div>
      <div className="tabular-nums"><p className="text-[34px] font-extrabold leading-tight text-[#FFC83D]">{formatRubAmount(offerPlan.priceRub)} ₽</p><p className="mt-1 text-sm font-semibold text-[#FFC83D]">{offerPlan.priceUzs.toLocaleString('ru-RU')} so'm</p></div>
      <div className="flex items-center justify-between gap-2 border-y border-white/15 py-3"><span className="text-sm font-semibold text-blue-100">Taklif tugashiga</span><div role="timer" aria-label="Taklif tugashiga" className="flex items-center gap-1 text-xl font-bold tabular-nums"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">{String(Math.floor(left / 60)).padStart(2, '0')}</span>:<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">{String(left % 60).padStart(2, '0')}</span></div></div>
      <button disabled={buying} onClick={() => void purchase('three_month', true)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#FFC83D] px-3 py-3 text-base font-bold text-[#0A1120] disabled:opacity-50">{buying ? '…' : 'Taklifdan foydalanish'}</button>
    </section>}
    {offerLoading && <p role="status" className="px-4 pb-3 text-center">Taklif tayyorlanmoqda…</p>}
    {offerError && <p role="alert" className="px-4 pb-3 text-center text-red-700">Taklifni yuklab bo'lmadi. <button className="underline" onClick={() => void reveal()}>Qayta urinish</button></p>}
    {expiresAt && left === 0 && <div className="px-4 pb-4 text-center"><p>Taklif muddati tugadi.</p><button onClick={() => { requested.current = false; maxPlayed.current = 0; setOfferError(false); if (video.current) { video.current.currentTime = 0; sync(); void play(); } }} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4"><RotateCcw size={18} />Qayta ko'rish</button></div>}

    {buyError && <p role="alert" className="mx-4 mt-4 rounded-2xl bg-red-50 p-3 text-red-700">To'lovni ochib bo'lmadi. Qayta urinib ko'ring.</p>}
  </div></main>;
}
