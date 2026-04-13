import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LESSONS_LIST_PATH } from '../../constants/lessonRoutes';

type LessonHubLayoutProps = {
  onBack?: () => void;
  children: ReactNode;
  /** Wide lessons (jadval) uchun */
  maxWidthClass?: string;
};

export function LessonHubLayout({ onBack, children, maxWidthClass = 'max-w-3xl' }: LessonHubLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleBack = onBack ?? (() => {
    navigate(LESSONS_LIST_PATH, { state: { scrollToLesson: pathname } });
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <main className={`mx-auto ${maxWidthClass} px-4 py-5 sm:p-6`}>
        <button
          type="button"
          onClick={handleBack}
          className="mb-4 inline-flex min-h-[44px] items-center rounded-2xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_4px_18px_rgba(15,23,42,0.06)] transition-colors hover:bg-slate-50 max-sm:border-slate-200/70"
        >
          Orqaga
        </button>
        {/* Mobil: tashqi oq «quti» yo‘q — fon bilan bir xil, ikki marta ramka bo‘lmaydi */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_14px_34px_rgba(148,163,184,0.1)] sm:p-8 max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none">
          {children}
        </div>
      </main>
    </div>
  );
}
