import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Auth sahifalarining oq to'liq ekranli qobig'i (safe-area bilan).
 *
 * BALANDLIK `h-[100dvh]` — `min-h` EMAS. Sabab: `min-h` da qobiq kontent bilan
 * birga cho'ziladi va ichidagi `AuthScrollBody` hech qachon skroll qutisiga
 * aylanmaydi (u ham cho'ziladi). Natijada telefonda forma ekranga sig'masa,
 * ayniqsa klaviatura ochilganda, ekran umuman surilmay qolardi.
 * `h-[100dvh] + overflow-hidden` qobiqni cheklaydi va skroll ichkarida —
 * `AuthScrollBody` da — sodir bo'ladi.
 */
export function AuthPageScaffold({ children, className = '' }: Props) {
  return (
    <div
      className={[
        'auth-theme h-[100dvh] overflow-hidden bg-app-bg text-app-text',
        'pt-[max(0px,env(safe-area-inset-top))]',
        'pb-[max(0px,env(safe-area-inset-bottom))]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto flex h-full w-full flex-col md:max-w-md lg:max-w-lg">
        {children}
      </div>
    </div>
  );
}

type ScrollProps = {
  children: ReactNode;
};

/**
 * Skrollanadigan qism. `overscroll-y-contain` ATAYIN olib tashlandi: u element
 * skrollanmaydigan holatda ham harakatni "yutib" qo'yishi mumkin, natijada
 * barmoq bilan surish umuman ishlamay qolardi. `pb` — pastdagi tugma
 * klaviatura ostida qolib ketmasligi uchun zaxira joy.
 */
export function AuthScrollBody({ children }: ScrollProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-2 sm:px-5 [-webkit-overflow-scrolling:touch]">
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
