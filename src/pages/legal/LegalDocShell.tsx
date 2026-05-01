import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SiteLegalFooter } from '../../components/legal/SiteLegalFooter';

export function LegalDocShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <header className="sticky top-0 z-10 border-b border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Orqaga
          </button>
          <Link to="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            FalaRus
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 pt-6 sm:pt-8">
        <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(148,163,184,0.12)] sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">{children}</div>
        </article>
      </div>
      <SiteLegalFooter variant="compact" />
    </div>
  );
}
