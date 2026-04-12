import type { ReactNode } from 'react';

type LessonHubLayoutProps = {
  onBack: () => void;
  children: ReactNode;
  /** Wide lessons (jadval) uchun */
  maxWidthClass?: string;
};

export function LessonHubLayout({ onBack, children, maxWidthClass = 'max-w-3xl' }: LessonHubLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className={`mx-auto ${maxWidthClass} p-6`}>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex min-h-[44px] items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
        >
          Orqaga
        </button>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      </main>
    </div>
  );
}
