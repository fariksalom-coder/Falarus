import { ArrowLeft, BookOpen, BookOpenText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/AccessContext';

export default function VocabularyHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { access } = useAccess();
  const subscriptionExpired =
    access?.subscription_active === false && Boolean(user?.planName || user?.planExpiresAt);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-3xl px-4 py-6">
        <button
          type="button"
          onClick={() => navigate('/russian')}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>

        <h1 className="text-2xl font-bold text-slate-900">Lug&apos;at bo&apos;limi</h1>
        <p className="mt-1 text-sm text-slate-500">Kerakli bo&apos;limni tanlang</p>
        {subscriptionExpired && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-900">Obuna muddati tugagan</p>
            <p className="mt-1 text-xs font-medium text-amber-700">
              Siz bepul rejimdasiz. To'liq lug'at materiallarini ochish uchun tarif sotib oling.
            </p>
            <button
              type="button"
              onClick={() => navigate('/tariflar')}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600"
            >
              Sotib olish
            </button>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/vocabulary/words')}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="mt-3 text-base font-bold text-slate-900">So&apos;zlar</p>
            <p className="mt-1 text-xs text-slate-500">10 ta mavzu bo&apos;yicha lug&apos;at</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/vocabulary/matnlar')}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <BookOpenText className="h-5 w-5" />
            </div>
            <p className="mt-3 text-base font-bold text-slate-900">Matnlar</p>
            <p className="mt-1 text-xs text-slate-500">Interaktiv o&apos;qish va tarjima</p>
          </button>
        </div>
      </main>
    </div>
  );
}
