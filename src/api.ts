import { Capacitor } from '@capacitor/core';

/** Base URL for API. Empty = same origin (dev with Express). Set VITE_API_URL on Vercel to your backend URL. */
const ENV_API_BASE = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  ?.VITE_API_URL || '';

const LIVE_ORIGIN = 'https://falarus.uz';

function isNativeShell(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function liveOriginFromEnv(): string {
  const fromEnv = ENV_API_BASE.trim().replace(/\/$/, '');
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      return LIVE_ORIGIN;
    }
  }
  return LIVE_ORIGIN;
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
}

function resolveApiBase(): string {
  // Android WebView origin = https://localhost — sayt APIsiga majburan ulanamiz.
  if (isNativeShell()) return liveOriginFromEnv();
  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
    return liveOriginFromEnv();
  }
  if (!ENV_API_BASE) return '';
  if (typeof window === 'undefined') return ENV_API_BASE;

  try {
    const configured = new URL(ENV_API_BASE, window.location.origin);
    const current = new URL(window.location.origin);

    const normalizeHost = (h: string) => h.replace(/^www\./, '');
    const sameHostFamily =
      normalizeHost(configured.hostname) === normalizeHost(current.hostname) &&
      configured.protocol === current.protocol;

    // Keep API same-origin for same host family (apex <-> www).
    // This avoids CORS preflight redirects between www and apex domains.
    if (configured.origin === current.origin || sameHostFamily) {
      return '';
    }

    return configured.origin;
  } catch {
    return ENV_API_BASE;
  }
}

export const API_BASE = resolveApiBase();

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

function publicAssetOrigin(): string {
  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
    return API_BASE || LIVE_ORIGIN;
  }
  if (isNativeShell()) return API_BASE || LIVE_ORIGIN;
  return API_BASE || (typeof window !== 'undefined' ? window.location.origin : LIVE_ORIGIN);
}

/** Turn API-relative asset paths (/uploads/...) into a browser-loadable URL. */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;
  try {
    const origin = publicAssetOrigin();
    const absolute = /^(https?:)/i.test(trimmed)
      ? new URL(trimmed)
      : new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, origin);
    if (isLocalHost(absolute.hostname)) {
      return new URL(absolute.pathname + absolute.search + absolute.hash, LIVE_ORIGIN).href;
    }
    if (absolute.protocol === 'http:' && /(^|\.)falarus\.uz$/i.test(absolute.hostname)) {
      absolute.protocol = 'https:';
    }
    return absolute.href;
  } catch {
    if (trimmed.startsWith('/')) return `${LIVE_ORIGIN}${trimmed}`;
    return trimmed;
  }
}
