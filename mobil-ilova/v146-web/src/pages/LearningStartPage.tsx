import { ArrowRight, BookOpen, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';
import { hasAppPremiumAccess } from '../utils/premiumNav';
import DailyCourseMapPage from './DailyCourseMapPage';
import '../styles/learning-start.css';

export default function LearningStartPage() {
  const { access, accessLoaded } = useAccess();
  if (!accessLoaded) return <div className="min-h-[60vh] bg-[#F2F5FA]" aria-busy="true" />;
  if (hasAppPremiumAccess(access)) return <DailyCourseMapPage />;
  return <main className="learning-start">
    <div className="learning-start-inner">
      <h1>Nimadan<br />boshlaymiz?</h1>
      <div className="learning-start-options">
        <Link to="/kunlik-reja/xarita" className="learning-choice learning-choice-trial"><span className="learning-free">BEPUL</span><span className="learning-choice-icon"><BookOpen aria-hidden /></span><div className="learning-choice-bottom"><h2>Sinov<br />darsi</h2><span className="learning-choice-cta">Boshlash <ArrowRight size={22} /></span></div></Link>
        <Link to="/kurs-haqida" className="learning-choice learning-choice-course"><span className="learning-choice-icon"><Play aria-hidden /></span><div className="learning-choice-bottom"><h2>Kurs<br />haqida</h2><span className="learning-choice-cta">Videoni ko'rish <ArrowRight size={22} /></span></div></Link>
      </div>
    </div>
  </main>;
}
