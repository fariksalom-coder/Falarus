import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { DbClient } from '../types/dbClient';
import {
  buildAppConfig,
  DEFAULT_APP_CONFIG,
  normalizeMedia,
  normalizeWelcomeOffer,
  type AppConfig,
  type AppMediaSettings,
  type WelcomeOfferSettings,
} from '../../shared/appConfig.js';
import { isRussianTariffCode, type RussianTariffPriceOverrides } from '../../shared/russianTariffs.js';

/*
 * ILOVA KONFIGURATSIYASI — YAGONA MANBA: BAZA.
 *
 *   tariff_prices  — tarif narxlari (UZS va RUB), admin "Tariflar" sahifasi;
 *   app_settings   — maxsus taklif va videolar (kalit → JSON).
 *
 * To'lov summasi ham, sahifadagi narx ham shu yerdan olinadi — admin narxni
 * o'zgartirsa, keyingi to'lov yangi narx bilan yaratiladi.
 *
 * Kesh qisqa (30 s) va admin har yozganda darhol tozalanadi. Bir nechta server
 * nusxasi bo'lsa, ular eng ko'pi bilan 30 soniyada yangilanadi.
 */
const CACHE_MS = 30_000;
let cache: { at: number; value: AppConfig } | null = null;
let inflight: Promise<AppConfig> | null = null;

export const APP_SETTING_KEYS = ['welcome_offer', 'media'] as const;
export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

export function invalidateAppConfig(): void {
  cache = null;
}

async function loadFromDb(supabase: DbClient): Promise<AppConfig> {
  const [pricesRes, settingsRes] = await Promise.all([
    supabase.from('tariff_prices').select('tariff_type, currency, price, updated_at'),
    supabase.from('app_settings').select('key, value, updated_at').in('key', [...APP_SETTING_KEYS]),
  ]);
  if (pricesRes.error) throw pricesRes.error;
  // Jadval hali yaratilmagan bo'lsa (migratsiyadan oldin) — standart sozlamalar.
  const settingsRows = settingsRes.error ? [] : ((settingsRes.data ?? []) as Array<{ key: string; value: unknown; updated_at: string }>);

  const prices: RussianTariffPriceOverrides = {};
  let updatedAt = 0;
  for (const row of (pricesRes.data ?? []) as Array<{ tariff_type: string; currency: string; price: unknown; updated_at: string | null }>) {
    if (!isRussianTariffCode(row.tariff_type)) continue;
    const price = Number(row.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const slot = (prices[row.tariff_type] ??= {});
    if (row.currency === 'UZS') slot.uzs = price;
    if (row.currency === 'RUB') slot.rub = price;
    updatedAt = Math.max(updatedAt, Date.parse(String(row.updated_at ?? '')) || 0);
  }
  const byKey = new Map(settingsRows.map((r) => [r.key, r]));
  for (const r of settingsRows) updatedAt = Math.max(updatedAt, Date.parse(r.updated_at) || 0);

  return buildAppConfig({
    prices,
    welcomeOffer: byKey.get('welcome_offer')?.value,
    media: byKey.get('media')?.value,
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
  });
}

export async function getAppConfig(supabase: DbClient): Promise<AppConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  if (inflight) return inflight;
  inflight = loadFromDb(supabase)
    .then((value) => {
      cache = { at: Date.now(), value };
      return value;
    })
    .catch((e) => {
      /*
       * Baza vaqtincha javob bermasa, to'lov va taklif to'xtab qolmasin:
       * oxirgi ma'lum sozlamalar, ular ham bo'lmasa — standart qiymatlar.
       */
      console.error('[appConfig] bazadan o‘qilmadi, zaxira ishlatiladi', e);
      return cache?.value ?? DEFAULT_APP_CONFIG;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function saveAppSetting(
  supabase: DbClient,
  key: AppSettingKey,
  raw: unknown,
  updatedBy: string | null,
): Promise<WelcomeOfferSettings | AppMediaSettings> {
  const value = key === 'welcome_offer' ? normalizeWelcomeOffer(raw) : normalizeMedia(raw);
  const { error } = await supabase.from('app_settings').upsert(
    { key, value, updated_at: new Date().toISOString(), updated_by: updatedBy },
    { onConflict: 'key' },
  );
  if (error) throw error;
  invalidateAppConfig();
  return value;
}

/*
 * VIDEO VERSIYASI.
 *
 * Fayl serverda almashtirilsa, uning nomi o'zgarmaydi — telefon esa eski
 * nusxani keshdan ko'rsataverardi. Shuning uchun manzilga faylning o'zgarish
 * vaqti qo'shiladi (`?v=...`): fayl yangilansa, manzil ham yangilanadi.
 */
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const versionCache = new Map<string, { at: number; v: string | null }>();

async function fileVersion(publicPath: string): Promise<string | null> {
  const hit = versionCache.get(publicPath);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.v;
  let v: string | null = null;
  const full = path.resolve(PUBLIC_DIR, `.${publicPath}`);
  if (full.startsWith(PUBLIC_DIR + path.sep)) {
    try {
      const s = await stat(full);
      v = `${Math.round(s.mtimeMs).toString(36)}-${s.size.toString(36)}`;
    } catch {
      v = null;
    }
  }
  versionCache.set(publicPath, { at: Date.now(), v });
  return v;
}

export async function withMediaVersions(media: AppMediaSettings): Promise<AppMediaSettings> {
  const entries = await Promise.all(
    (Object.keys(media) as Array<keyof AppMediaSettings>).map(async (k) => {
      const url = media[k];
      if (!url.startsWith('/')) return [k, url] as const;
      const v = await fileVersion(url.split('?')[0]);
      return [k, v ? `${url.split('?')[0]}?v=${v}` : url] as const;
    }),
  );
  return Object.fromEntries(entries) as AppMediaSettings;
}
