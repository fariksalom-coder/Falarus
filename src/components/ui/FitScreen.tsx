import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Bitta ekranga sig'adigan sahifa: MainLayout'dagi umumiy `.panel-scroll`
 * skroll qilmaydi, sahifa esa qolgan balandlikni to'liq egallaydi.
 * Kontent sig'masa (juda kichik ekran, 1.5x matn) faqat ichki panel skroll qiladi.
 *
 * Klass effekt orqali qo'yiladi: native ilovada yashirin tablar (Activity)
 * effektlarini tozalaydi, shuning uchun boshqa sahifalarga ta'sir qilmaydi.
 */
export function useFitScreenPanel<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const panel = ref.current?.closest<HTMLElement>('.panel-scroll');
    if (!panel) return;
    const count = Number(panel.dataset.fitCount ?? '0') + 1;
    panel.dataset.fitCount = String(count);
    panel.classList.add('panel-fit');
    panel.scrollTop = 0;
    return () => {
      const next = Math.max(0, Number(panel.dataset.fitCount ?? '1') - 1);
      panel.dataset.fitCount = String(next);
      if (next === 0) panel.classList.remove('panel-fit');
    };
  }, []);
  return ref;
}

export type FitTab<K extends string> = { key: K; label: string };

/** Segmentli tablar — bir ekranli sahifalarda bo'limlarni almashtirish uchun. */
export function FitTabs<K extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
  label,
}: {
  tabs: FitTab<K>[];
  active: K;
  onChange: (key: K) => void;
  idPrefix: string;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="fit-tabs">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.key}`}
            tabIndex={selected ? 0 : -1}
            className="fit-tab"
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const idx = tabs.findIndex((t) => t.key === active);
              const step = e.key === 'ArrowRight' ? 1 : -1;
              const next = tabs[(idx + step + tabs.length) % tabs.length];
              onChange(next.key);
              document.getElementById(`${idPrefix}-tab-${next.key}`)?.focus();
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tab kontenti: qolgan joyni egallaydi; sig'masa faqat shu yer skroll qiladi. */
export function FitTabPanel({
  idPrefix,
  tabKey,
  className,
  hidden,
  children,
}: {
  idPrefix: string;
  tabKey: string;
  className?: string;
  /** Yashirin tab — DOMda qoladi (qayta o'tish tez), lekin ko'rinmaydi. */
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      hidden={hidden}
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      className={`fit-panel${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}
