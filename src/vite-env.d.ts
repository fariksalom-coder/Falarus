/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Comma-separated YouTube video IDs (11), order matches `PLATFORM_TUTORIAL_VIDEOS`. */
  readonly VITE_PLATFORM_TUTORIAL_YOUTUBE_IDS?: string;
  /** Google Analytics 4 Measurement ID (e.g. G-XXXXXXXXXX). */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Yandex Metrika counter ID (digits only). */
  readonly VITE_YANDEX_METRIKA_ID?: string;
  /** Search Console meta verification content string. */
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string;
  /** Yandex Webmaster verification meta content. */
  readonly VITE_YANDEX_VERIFICATION?: string;
  /** Footer / huquqiy sahifalar: yakka tartibdagi tadbirkor.F.I.SH */
  readonly VITE_LEGAL_OWNER_NAME?: string;
  /** STIR / INN */
  readonly VITE_LEGAL_INN?: string;
  readonly VITE_LEGAL_SUPPORT_EMAIL?: string;
  readonly VITE_LEGAL_SUPPORT_PHONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
