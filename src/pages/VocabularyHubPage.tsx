import { ArrowLeft, BookOpen, BookOpenText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VocabularyHubPage() {
  const navigate = useNavigate();

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
