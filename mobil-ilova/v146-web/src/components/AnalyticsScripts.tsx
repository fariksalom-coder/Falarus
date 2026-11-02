import { useEffect } from 'react';

/**
 * Loads GA4 / Yandex Metrika once when env IDs are set.
 * IDs: VITE_GA_MEASUREMENT_ID, VITE_YANDEX_METRIKA_ID (digits).
 */
export function AnalyticsScripts() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
    if (gaId && !document.getElementById('ga4-src')) {
      const gajs = document.createElement('script');
      gajs.id = 'ga4-src';
      gajs.async = true;
      gajs.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      document.head.appendChild(gajs);
      const inline = document.createElement('script');
      inline.id = 'ga4-init';
      inline.text = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(gaId)});
`;
      document.head.appendChild(inline);
    }

    const ymRaw = import.meta.env.VITE_YANDEX_METRIKA_ID?.trim();
    const ymCounter = ymRaw ? Number(String(ymRaw).replace(/\D/g, '')) : 0;
    if (ymCounter > 0 && !document.getElementById('ym-tag-js')) {
      const s = document.createElement('script');
      s.id = 'ym-tag-js';
      s.async = true;
      s.src = 'https://mc.yandex.ru/metrika/tag.js';
      s.onload = () => {
        const w = window as unknown as {
          ym?: (id: number, cmd: string, opts: Record<string, unknown>) => void;
        };
        w.ym?.(ymCounter, 'init', {
          clickmap: true,
          trackLinks: true,
          accurateTrackBounce: true,
          webvisor: true,
        });
      };
      document.head.appendChild(s);
    }
  }, []);

  return null;
}
