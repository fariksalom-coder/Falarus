import { useSyncExternalStore } from 'react';
import { apiUrl } from '../api';
import type { KunlikDayPatch } from '../api/kunlikProgress';

/*
 * OFLAYN REJIM — SO'ROVLAR NAVBATI.
 *
 * Internet yo'q paytda bajarilgan ish (mashq natijasi, javoblar, yakunlash)
 * yo'qolmasin: so'rov qurilmada navbatga yoziladi va internet qaytgach AYNAN
 * SHU TARTIBDA serverga yuboriladi. Tartib muhim — masalan, iboralar testi
 * "boshlash → javoblar → yakunlash" ketma-ketligida qayta ijro etiladi va
 * natijani server o'zi hisoblaydi.
 *
 * `optimistic` — server tasdiqlaguncha progressga qo'shib turiladigan belgi
 * (kun xaritasi oflayn ham "bajarildi" deb ko'rsatsin).
 *
 * Navbat foydalanuvchi bo'yicha saqlanadi va hisobdan chiqilganda o'chmaydi:
 * yuborilmagan natija keyingi kirishda yetib boradi.
 */
export type OutboxItem = {
  id: string;
  method: 'POST' | 'PATCH';
  path: string;
  body: string;
  day?: number;
  optimistic?: KunlikDayPatch;
  createdAt: number;
};

const PREFIX = 'falarus:outbox:v1:';
const MAX_ITEMS = 500;

/** Joriy foydalanuvchi — kesh va navbat hisoblar orasida aralashmasin. */
export function offlineUserId(): number | null {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || 'null') as { id?: unknown } | null;
    const id = Number(user?.id);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function key(): string | null {
  const uid = offlineUserId();
  return uid ? `${PREFIX}${uid}` : null;
}

export function pendingOutbox(): OutboxItem[] {
  const k = key();
  if (!k) return [];
  try {
    const items = JSON.parse(localStorage.getItem(k) || '[]');
    return Array.isArray(items) ? (items as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: OutboxItem[]): void {
  const k = key();
  if (!k) return;
  try {
    if (items.length) localStorage.setItem(k, JSON.stringify(items.slice(-MAX_ITEMS)));
    else localStorage.removeItem(k);
  } catch {
    /* xotira to'lgan — eng yomoni, oflayn natija yo'qoladi */
  }
  emit();
}

function enqueue(item: Omit<OutboxItem, 'id' | 'createdAt'>): void {
  save([
    ...pendingOutbox(),
    { ...item, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() },
  ]);
}

/* ---------------- Tarmoq holati ---------------- */

const listeners = new Set<() => void>();
function emit() {
  snapshot = { online: navigatorOnline(), pending: pendingOutbox().length };
  listeners.forEach((l) => l());
}

function navigatorOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

let snapshot = { online: true, pending: 0 };

export function isOffline(): boolean {
  return !navigatorOnline();
}

/** `fetch` tarmoq tufayli yiqildi (server javob bergan xato emas). */
export function isNetworkError(e: unknown): boolean {
  return isOffline() || e instanceof TypeError || (e instanceof DOMException && e.name === 'AbortError');
}

/* ---------------- Yuborish ---------------- */

let currentToken: string | null = null;
let flushing: Promise<void> | null = null;

/**
 * Navbatni tartib bilan yuboradi. Tarmoq yoki server (5xx/429) xatosida
 * to'xtaydi — keyingi urinishgacha qoladi. 4xx (masalan, obuna tugagan) —
 * qayta yuborishdan foyda yo'q, element tashlanadi.
 */
export function flushOutbox(token: string | null = currentToken): Promise<void> {
  if (token) currentToken = token;
  if (flushing) return flushing;
  if (!currentToken || isOffline() || pendingOutbox().length === 0) return Promise.resolve();
  const auth = currentToken;
  flushing = (async () => {
    let sent = 0;
    for (;;) {
      const [item] = pendingOutbox();
      if (!item) break;
      let res: Response;
      try {
        res = await fetch(apiUrl(item.path), {
          method: item.method,
          headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
          body: item.body,
        });
      } catch {
        break;
      }
      if (res.status === 401 || res.status === 429 || res.status >= 500) break;
      save(pendingOutbox().filter((i) => i.id !== item.id));
      sent += 1;
    }
    if (sent > 0) flushListeners.forEach((l) => l());
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

const flushListeners = new Set<() => void>();
/** Navbatdagi so'rovlar serverga yetgach — progressni qayta o'qish uchun. */
export function onOutboxFlushed(listener: () => void): () => void {
  flushListeners.add(listener);
  return () => flushListeners.delete(listener);
}

/**
 * So'rovni yuboradi; internet bo'lmasa yoki tarmoq uzilsa — navbatga yozadi.
 *
 * Navbatda kutayotgan so'rov bo'lsa, yangisi ham navbatga tushadi — aks holda
 * u eskilaridan OLDIN yetib, tartib buziladi (yakunlash javoblardan oldin).
 *
 * Qaytaradi: server javobi yoki `null` (navbatga yozildi).
 */
export async function sendOrQueue(
  token: string | null,
  method: OutboxItem['method'],
  path: string,
  body: unknown,
  opts: { day?: number; optimistic?: KunlikDayPatch } = {},
): Promise<Response | null> {
  if (!token) return null;
  currentToken = token;
  const payload = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  if (pendingOutbox().length > 0) await flushOutbox(token);
  if (isOffline() || pendingOutbox().length > 0) {
    enqueue({ method, path, body: payload, ...opts });
    return null;
  }
  try {
    const res = await fetch(apiUrl(path), {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: payload,
    });
    if (res.status >= 500) {
      enqueue({ method, path, body: payload, ...opts });
      return null;
    }
    return res;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    enqueue({ method, path, body: payload, ...opts });
    return null;
  }
}

/** Server hali tasdiqlamagan belgilar — kunlar bo'yicha. */
export function pendingOptimisticPatches(): Array<{ day: number; patch: KunlikDayPatch }> {
  return pendingOutbox()
    .filter((i) => typeof i.day === 'number' && i.optimistic)
    .map((i) => ({ day: i.day!, patch: i.optimistic! }));
}

/* ---------------- React ---------------- */

let started = false;
function startNetworkWatch(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  snapshot = { online: navigatorOnline(), pending: pendingOutbox().length };
  window.addEventListener('online', () => {
    emit();
    void flushOutbox();
  });
  window.addEventListener('offline', emit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushOutbox();
  });
}

function subscribe(listener: () => void): () => void {
  startNetworkWatch();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Internet holati va navbatdagi (yuborilmagan) natijalar soni. */
export function useNetworkStatus(): { online: boolean; pending: number } {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
