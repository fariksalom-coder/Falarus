import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';
import ParolTiklashPanel from '../components/support/ParolTiklashPanel';
import { supportParolTiklash } from '../api/parolTiklash';

/**
 * Support uchun parol tiklash ekrani (oltin hisob, +998 95 599 77 03).
 *
 * Ilova ichida, admin panelida emas: telefonga javob beradigan odam o'z
 * hisobidan kirib turadi. Ruxsat SERVERDA (`users.is_golden`) tekshiriladi —
 * bu ekran boshqa hisobda ochilib qolsa ham amal bajarilmaydi.
 */
export default function SupportParolPage() {
  const { token } = useAuth();
  const { access } = useAccess();
  const navigate = useNavigate();
  const oltin = Boolean(access?.golden);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-4">
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-app-text-muted"
      >
        <ArrowLeft className="h-4 w-4" />
        Profil
      </button>

      <h1 className="text-[22px] font-black text-app-text">Foydalanuvchi paroli</h1>
      <p className="mt-1 text-[13px] text-app-text-muted">
        Parolini unutgan odam telefon qilsa, shu yerdan yangi parol yarating va
        og'zaki ayting.
      </p>

      <div className="mt-5">
        {oltin && token ? (
          <ParolTiklashPanel onTikla={(sorov) => supportParolTiklash(token, sorov)} />
        ) : (
          <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-app-text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Bu bo'lim faqat support hisobi uchun.
          </div>
        )}
      </div>
    </div>
  );
}
