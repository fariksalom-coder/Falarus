import { Link } from 'react-router-dom';

/**
 * SPA-friendly 404 — HTTP status stays 200 unless edge SSR adds 404.
 * Meta robots noindex handled globally via unknown pathname detection + GlobalSeo.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#F8FAFC] px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Sahifa topilmadi</h1>
      <p className="mt-3 max-w-md text-sm text-slate-600">
        Manzil noto‘g‘ri yoki sahifa ko‘chirilgan bo‘lishi mumkin.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-700"
        >
          Bosh sahifa
        </Link>
        <Link
          to="/login"
          className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Kirish
        </Link>
      </div>
      <p className="mt-10 max-w-lg text-xs leading-relaxed text-slate-500">
        Rus tili patent uchun va ВНЖ bo‘limlari:{' '}
        <Link className="font-medium text-blue-600 underline-offset-2 hover:underline" to="/kurslar/patent">
          Patent kursi
        </Link>
        {' · '}
        <Link className="font-medium text-blue-600 underline-offset-2 hover:underline" to="/kurslar/vnzh">
          ВНЖ kursi
        </Link>
        {' · '}
        <Link className="font-medium text-blue-600 underline-offset-2 hover:underline" to="/tariflar">
          Tariflar
        </Link>
      </p>
    </div>
  );
}
