-- 161: Push obunalari — ilova YOPIQ bo'lganda ham bildirishnoma yuborish uchun.
--
-- Ilgari bu fayl 157 raqamida edi va faqat VPS'da yotardi, shu bilan birga
-- repoda 157_teacher_listing_price_300k.sql bor edi — bitta raqamni ikki
-- migratsiya da'vo qilib turgandi. Ikkalasi birlashtirilganda bu 161 ga
-- ko'chirildi. Prodda jadval allaqachon yaratilgan, migratsiya esa
-- `IF NOT EXISTS` bilan yozilgani uchun qayta yurgizish xavfsiz.
--
-- Har brauzer (qurilma) alohida obuna beradi, ya'ni bitta odamda bir nechta
-- yozuv bo'lishi mumkin: telefoni, noutbuki, ishxonadagi kompyuteri.
-- `endpoint` — brauzer bergan yagona manzil, shuning uchun kalit sifatida
-- ishlatiladi: bir xil qurilma qayta obuna bo'lsa yozuv yangilanadi.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  -- Brauzer kaliti va sirlari: xabar shular bilan shifrlanadi.
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sent_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);
