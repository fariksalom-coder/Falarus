import { useSyncExternalStore } from 'react';
import { apiUrl, resolveAssetUrl } from '../api';
import { buildAppConfig, DEFAULT_APP_CONFIG, type AppConfig } from '../../shared/appConfig';

/*
 * NARXLAR, TAKLIF VA VIDEOLAR — SERVERDAN.
 *
 * Mobil ilovada veb-qism ilova ichiga joylangan, shuning uchun kodga yozilgan
 * narx faqat yangi versiya chiqqanda o'zgarardi. Endi ular `/api/app-config`
 * dan olinadi: admin panelda o'zgartirilsa, ilova keyingi ochilishda (yoki
 * fondan qaytganda) yangisini ko'rsatadi.
 *
 * Oxirgi javob qurilmada saqlanadi — internet bo'lmasa ham narxlar bo'sh
 * qolmaydi, sahifa ham "yuklanmoqda" bilan kutib turmaydi.
 */
const STORAGE_KEY = 'falarus:app-config:v1';
/** Ilova fonda turib qaytganda — shundan eski bo'lsa qayta so'raladi. */
const REFRESH_MS = 60_000;

function fromStorage(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseConfig(JSON.parse(raw));
  } catch {
    /* buzilgan yoki yo'q — zaxira qiymatlar */
  }
  return DEFAULT_APP_CONFIG;
}

/**
 * Server javobini tekshirib qabul qiladi. Narxlar qayta hisoblanadi —
 * javobdagi biror maydon yetishmasa ham sahifa buzilmaydi.
 */
function parseConfig(raw: unknown): AppConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppConfig>;
  const prices: Record<string, { rub?: number; uzs?: number }> = {};
  for (const plan of Array.isArray(r.plans) ? r.plans : []) {
    if (plan && typeof plan.code === 'string') prices[plan.code] = { rub: plan.priceRub, uzs: plan.priceUzs };
  }
  return buildAppConfig({
    prices,
    welcomeOffer: r.welcomeOffer,
    media: r.media,
    promo: r.promo,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : null,
  });
}

let current: AppConfig = typeof window === 'undefined' ? DEFAULT_APP_CONFIG : fromStorage();
let lastFetch = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function refreshAppConfig(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && Date.now() - lastFetch < REFRESH_MS) return Promise.resolve();
  lastFetch = Date.now();
  inflight = fetch(apiUrl('/api/app-config'), { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then((json) => {
      current = parseConfig(json);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch {
        /* saqlanmasa ham joriy sessiya yangi narxni ko'radi */
      }
      listeners.forEach((l) => l());
    })
    .catch(() => {
      // Tarmoq xatosi: keyingi urinish kutmasdan bo'lsin.
      lastFetch = 0;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refreshAppConfig();
    document.addEventListener('visibilitychange', onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) document.removeEventListener('visibilitychange', onVisible);
  };
}

function onVisible() {
  if (document.visibilityState === 'visible') void refreshAppConfig();
}

/** Narxlar, maxsus taklif va videolar. Darhol qaytadi, serverdan kelgach yangilanadi. */
export function useAppConfig(): AppConfig {
  return useSyncExternalStore(subscribe, () => current, () => DEFAULT_APP_CONFIG);
}

/**
 * Video/rasm manzili. Ilovada ham SAYTDAN olinadi (ilova ichidagi nusxadan
 * emas) — serverda almashtirilgan video ilovani yangilamasdan ko'rinadi.
 */
export function mediaUrl(path: string): string {
  return resolveAssetUrl(path) ?? path;
}
