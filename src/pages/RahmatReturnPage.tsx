import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const BG = '#F8FAFC';

export default function RahmatReturnPage() {
  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: BG }}>
      <div className="mx-auto max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(148,163,184,0.14)]">
        <div className="flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden />
        </div>
        <h1 className="mt-4 text-center text-xl font-bold text-slate-900">To‘lov qabul qilindi</h1>
        <p className="mt-2 text-center text-slate-600">
          Agar kirish hali ochilmasa, bir necha soniyadan so‘ng profilni yangilang. Rahmat to‘lovi tasdiqlangach
          avtomatik yangilanadi.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/profile"
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Profilga o‘tish
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-slate-50"
          >
            Bosh sahifa
          </Link>
        </div>
      </div>
    </div>
  );
}
