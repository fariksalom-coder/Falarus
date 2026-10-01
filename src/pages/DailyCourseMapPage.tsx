import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Lock, Sparkles, Flag, LocateFixed } from 'lucide-react';
import '../styles/trial-day-cue.css';
import '../styles/journey-map.css';
import TrialHandAnimation from '../components/TrialHandAnimation';
import { useAccess } from '../context/AccessContext';
import { useKunlikProgress } from '../hooks/useKunlikProgress';
import { buildQuestSlots, getRow } from '../utils/kunlikBloklar';
import { TOTAL_DAYS } from '../data/dailyPlan';
import { canEnterKunlikDayContent } from '../../shared/dailyCourseDay';
import KunlikFreeLimitModal from '../components/KunlikFreeLimitModal';
import { isKunlikDayRowFullyComplete } from '../../shared/kunlikDayCompletion';
import { rememberKunlikOpenedDay } from '../utils/kunlikLastDay';

const DAYS = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1);
// Source mockup coordinates; alternate the same road rhythm through day 182.
const dayX = (day: number) => day === 0 ? 195 : day % 2 === 0 ? 290 : day === 1 ? 100 : 120;
const dayY = (day: number) => 300 + (day - 1) * 110;

export default function DailyCourseMapPage() {
  const navigate = useNavigate();
  const { access, accessLoaded } = useAccess();
  const premium = Boolean(access?.subscription_active);
  const golden = Boolean(access?.golden);
  const { rows, loaded, practicePromptCountByDay } = useKunlikProgress();
  const [paywall, setPaywall] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [currentHidden, setCurrentHidden] = useState(false);
  const currentRef = useRef<HTMLDivElement>(null);
  const completed = useMemo(() => new Set(DAYS.filter(day => {
    const row = rows.get(day);
    return row && isKunlikDayRowFullyComplete(row, practicePromptCountByDay);
  })), [rows, practicePromptCountByDay]);
  const currentDay = DAYS.find(day => !completed.has(day)) ?? TOTAL_DAYS;
  const currentSlots = loaded ? buildQuestSlots(getRow(rows, currentDay), practicePromptCountByDay.get(currentDay) ?? 0, golden) : [];
  const fraction = completed.has(currentDay) ? 0 : currentSlots.filter(slot => slot.state === 'done').length / Math.max(1, currentSlots.length);
  const pct = Math.min(100, Math.round((completed.size + fraction) / TOTAL_DAYS * 1000) / 10);
  const focusDay = premium || golden ? currentDay : 0;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!loaded || !currentRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setCurrentHidden(!entry.isIntersecting));
    observer.observe(currentRef.current);
    return () => observer.disconnect();
  }, [loaded, focusDay]);
  useEffect(() => {
    if (!loaded || focusDay <= 1) return;
    const timer = window.setTimeout(() => currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 220);
    return () => window.clearTimeout(timer);
  }, [loaded, focusDay]);

  const openDay = (day: number) => {
    if (!loaded || !accessLoaded) return;
    if (!golden && !canEnterKunlikDayContent(day, premium)) { setPaywall(true); return; }
    if (day > currentDay && !golden && !completed.has(day)) {
      setToast(`Bu kunga hali yetib bormadingiz. Hozir Kun ${currentDay}.`);
      return;
    }
    rememberKunlikOpenedDay(day);
    navigate(`/kunlik-reja/kun/${day}`);
  };

  return <div className="journey-map" aria-busy={!loaded || !accessLoaded}>
    <div className="journey-shell">
      <header className="journey-summary">
        <div className="journey-summary-top">
          <button className="journey-back" onClick={() => navigate('/')} aria-label="Orqaga"><ArrowLeft size={20} /></button>
          <h1>{TOTAL_DAYS} kunlik sayohat</h1>
          <div className="journey-progress" role="progressbar" aria-label="Bosib o'tilgan yo'l" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="7" /><circle cx="36" cy="36" r="30" fill="none" stroke="#FFC83D" strokeWidth="7" strokeLinecap="round" strokeDasharray={2 * Math.PI * 30} strokeDashoffset={2 * Math.PI * 30 * (1 - pct / 100)} transform="rotate(-90 36 36)" /></svg>
            <span>{pct}%</span>
          </div>
        </div>
        <dl className="journey-stats"><div><dt>Hozir</dt><dd>{currentDay}-kun</dd></div><div><dt>O'tilgan</dt><dd>{completed.size} <small>/ {TOTAL_DAYS}</small></dd></div></dl>
      </header>
      {!premium && !golden && <button className="journey-tariffs" onClick={() => navigate('/kurs-haqida')}>
        <span className="journey-tariff-icon"><Sparkles size={22} /></span>
        <span className="journey-tariff-copy"><strong>Tariflarni ko'rish</strong><small>1 / 3 / 6 oy · Rahmat orqali to'lov</small></span>
        <span className="journey-tariff-arrow"><ArrowRight size={18} /></span>
      </button>}
      <main className="journey-road" aria-label="Yo'l xaritasi" style={{ height: dayY(TOTAL_DAYS) + 150 }}>
        <div className="journey-trial" ref={focusDay === 0 ? currentRef : undefined}>
          <h2>Sinov darsi</h2>
          <div className="journey-hand"><TrialHandAnimation /></div>
          <div className="journey-trial-ring"><button disabled={!loaded || !accessLoaded} onClick={() => openDay(0)} className="journey-trial-button trial-day-beacon" aria-label="0-kun · Sinov darsi"><BookOpen size={30} /></button></div>
        </div>
        {DAYS.map(day => {
          const done = completed.has(day);
          const available = golden || (premium && (day <= currentDay || done));
          const active = available && day === currentDay;
          const x = dayX(day), y = dayY(day);
          const prevX = dayX(day - 1);
          const path = day === 1 ? 'M195 0 C195 50, 100 40, 100 100' : `M${prevX} 0 C${prevX} 70, ${x} 40, ${x} 110`;
          return <div key={day}>
            <svg className="journey-connector" style={{ top: day === 1 ? 200 : y - 110, height: day === 1 ? 100 : 110 }} viewBox={`0 0 390 ${day === 1 ? 100 : 110}`} preserveAspectRatio="none" aria-hidden="true"><path d={path} fill="none" stroke={done ? '#B5DBCD' : '#DCE3EE'} strokeWidth="26" strokeLinecap="round" /><path d={path} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" /></svg>
            <div ref={day === focusDay ? currentRef : undefined} className="journey-day" style={{ left: `${x / 390 * 100}%`, top: y - 32 }}>
              <button disabled={!loaded || !accessLoaded} onClick={() => openDay(day)} aria-label={`Kun ${day}${available ? '' : ' (yopiq)'}`} aria-current={active ? 'step' : undefined} className={`journey-node${done ? ' is-done' : active ? ' is-current' : available ? ' is-available' : ''}`}>
                {done ? <Check size={25} /> : available ? day : <Lock size={22} />}
              </button><span>{day}-kun</span>
            </div>
          </div>;
        })}
        <div className="journey-finish" style={{ top: dayY(TOTAL_DAYS) + 65 }}><Flag size={24} /><span>Tugagach — sertifikat</span></div>
      </main>
    </div>
    {paywall && <KunlikFreeLimitModal onClose={() => setPaywall(false)} />}
    {currentHidden && <button className="journey-return" onClick={() => currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}><LocateFixed size={18} />{focusDay === 0 ? 'Sinov darsiga qaytish' : 'Bugunga qaytish'}</button>}
    {toast && <div className="journey-toast" role="status">{toast}</div>}
  </div>;
}
