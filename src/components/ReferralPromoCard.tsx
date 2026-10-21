import { ArrowRight, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/referral-promo.css';

const STEPS = ['Havolani yuboring', 'Do‘stingiz kurs oladi', '10% sizga'];

/** Home-screen promo of the referral program; links to the invite page. */
export default function ReferralPromoCard() {
  return (
    <Link to="/invite" className="referral-promo" aria-label="Do‘stlarni taklif qilib pul ishlash — taklif dasturi">
      <span className="referral-promo__coin referral-promo__coin--a" aria-hidden="true">10%</span>
      <span className="referral-promo__coin referral-promo__coin--b" aria-hidden="true" />
      <span className="referral-promo__eyebrow"><Wallet size={14} aria-hidden="true" />Taklif dasturi</span>
      <strong className="referral-promo__title">Do‘stlaringizni taklif qiling — pul ishlang</strong>
      <span className="referral-promo__text">
        Har bir do‘stingizning birinchi to‘lovidan <b>10%</b> sizning hisobingizga tushadi.
        Kartaga yechib oling yoki kursga ishlating.
      </span>
      <ol className="referral-promo__steps">
        {STEPS.map((step, i) => <li key={step}><span>{i + 1}</span>{step}</li>)}
      </ol>
      <span className="referral-promo__cta">Pul ishlashni boshlash <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" /></span>
    </Link>
  );
}
