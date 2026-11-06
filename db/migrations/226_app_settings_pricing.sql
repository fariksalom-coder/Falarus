-- NARXLAR, MAXSUS TAKLIF VA VIDEOLAR — BAZADAN (admin panel).
--
-- Ilgari to'lov summasi va sahifadagi narx kodga qattiq yozilgan edi
-- (shared/russianTariffs.ts), `tariff_prices` jadvali esa admin panelda
-- o'zgartirilsa ham hech narsaga ta'sir qilmasdi. Endi server va ilovalar
-- narxni shu jadvaldan oladi (`GET /api/app-config`).
--
-- 1) `tariff_prices` amaldagi narxlarga tenglashtiriladi — aks holda deploy
--    paytida narx eski, ishlatilmagan qiymatlarga (450/600/900 ming) sakrab ketardi.
-- 2) `app_settings` — maxsus taklif (vaqt, narx) va almashtiriladigan videolar.

BEGIN;

INSERT INTO public.tariff_prices (tariff_type, currency, price, updated_at) VALUES
  ('month',       'RUB',   3000, NOW()),
  ('month',       'UZS', 400000, NOW()),
  ('three_month', 'RUB',   4000, NOW()),
  ('three_month', 'UZS', 530000, NOW()),
  ('six_month',   'RUB',   6000, NOW()),
  ('six_month',   'UZS', 790000, NOW())
ON CONFLICT (tariff_type, currency) DO UPDATE
  SET price = EXCLUDED.price,
      updated_at = EXCLUDED.updated_at;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);

INSERT INTO public.app_settings (key, value, updated_by) VALUES
  ('welcome_offer', jsonb_build_object(
      'eligibilityMinutes', 10,
      'offerMinutes', 10,
      'revealSecondsBeforeEnd', 20,
      'payTariff', 'three_month',
      'accessTariff', 'six_month',
      'priceUzs', NULL,
      'priceRub', NULL
   ), 'migration:226'),
  ('media', jsonb_build_object(
      'courseOfferVideo', '/videos/welcome-combined.mp4',
      'courseOfferPoster', '/videos/welcome-poster.jpg',
      'paymentGuideVideo', '/payment-guide/russia.mp4',
      'paymentGuidePoster', '/payment-guide/russia.jpg'
   ), 'migration:226')
ON CONFLICT (key) DO NOTHING;

COMMIT;
