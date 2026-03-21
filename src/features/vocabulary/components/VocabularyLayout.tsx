import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onBack: () => void;
  backLabel?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Карточка под заголовком (агрегат прогресса темы/подтемы) */
  headerExtra?: ReactNode;
};

export function VocabularyLayout({
  children,
  onBack,
  backLabel = 'Orqaga',
  title,
  subtitle,
  headerExtra,
}: Props) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#F8FAFC',
        backgroundImage: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
      }}
    >
      <main className="mx-auto max-w-[720px] px-4 py-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/80"
        >
          ← {backLabel}
        </button>

        {title ? (
          <header className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
            {headerExtra ? <div className="mt-4">{headerExtra}</div> : null}
          </header>
        ) : null}

        {children}
      </main>
    </div>
  );
}
