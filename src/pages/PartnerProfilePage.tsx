import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PartnerProfileSetup from '../components/partner/PartnerProfileSetup';

export default function PartnerProfilePage() {
  const navigate = useNavigate();
  return <main className="mx-auto min-h-screen max-w-xl bg-app-bg px-4 py-6 pb-24">
    <button className="mb-5 inline-flex items-center gap-2 rounded-xl border border-app-border px-4 py-3 text-app-text" onClick={()=>navigate('/partner')}><ArrowLeft size={18}/> Muloqotga qaytish</button>
    <PartnerProfileSetup onSaved={()=>navigate('/partner', {replace:true})}/>
  </main>;
}
