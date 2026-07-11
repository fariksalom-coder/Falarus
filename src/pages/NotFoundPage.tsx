import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';

/**
 * SPA-friendly 404 — HTTP status stays 200 unless edge SSR adds 404.
 * Meta robots noindex handled globally via unknown pathname detection + GlobalSeo.
 */
export default function NotFoundPage() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-app-bg px-4 py-16 text-center">
      <p className="text-[120px] font-black leading-none text-[#0B2A6B] sm:text-[160px]">404</p>
      <h1 className="mt-2 text-2xl font-extrabold text-app-text">{t('notFound.title')}</h1>
      <p className="mt-3 max-w-md text-sm text-slate-600">
        {t('notFound.body')}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-2xl bg-[#0B2A6B] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(11,42,107,0.28)] transition hover:bg-[#071B5E]"
        >
          {t('notFound.home')}
        </Link>
        <Link
          to="/login"
          className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {t('notFound.login')}
        </Link>
      </div>
      <p className="mt-10 max-w-lg text-xs leading-relaxed text-slate-500">
        {t('notFound.footerPrefix')}{' '}
        <Link className="font-medium text-[#0B2A6B] underline-offset-2 hover:underline" to="/kurslar/patent">
          {t('notFound.footerPatent')}
        </Link>
        {' · '}
        <Link className="font-medium text-[#0B2A6B] underline-offset-2 hover:underline" to="/kurslar/vnzh">
          {t('notFound.footerVnzh')}
        </Link>
        {' · '}
        <Link className="font-medium text-[#0B2A6B] underline-offset-2 hover:underline" to="/tariflar">
          {t('notFound.footerPricing')}
        </Link>
      </p>
    </div>
  );
}
