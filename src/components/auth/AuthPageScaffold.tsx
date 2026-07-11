import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/** White full-screen auth shell with safe-area padding; centers on desktop. */
export function AuthPageScaffold({ children, className = '' }: Props) {
  return (
    <div
      className={[
        'auth-theme min-h-[100dvh] bg-white text-[#17224A]',
        'pt-[max(0px,env(safe-area-inset-top))]',
        'pb-[max(0px,env(safe-area-inset-bottom))]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full flex-col md:max-w-md lg:max-w-lg">
        {children}
      </div>
    </div>
  );
}

type ScrollProps = {
  children: ReactNode;
};

export function AuthScrollBody({ children }: ScrollProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 sm:px-5 [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}

type GapProps = {
  compact?: boolean;
};

export function AuthGap({ compact }: GapProps) {
  return <div className={compact ? 'h-3' : 'h-4'} aria-hidden />;
}
