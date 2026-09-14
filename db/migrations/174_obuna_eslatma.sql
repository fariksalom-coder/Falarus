-- Obuna tugashi haqida eslatma yuborilganini qayd qiladi.
--
-- NEGA KERAK: eslatma kuniga bir marta ishlaydigan vazifadan yuboriladi.
-- Yozuvsiz bir xil eslatma har yugurishda qayta ketardi. Bu yerdagi
-- UNIQUE cheklov "bitta obuna muddati uchun har turdagi eslatma FAQAT
-- BIR MARTA" qoidasini bazaning o'zida ushlab turadi — kod xato qilsa ham
-- foydalanuvchi bir xil xabarni ikki marta olmaydi.
--
-- `muddat_tugashi` — o'sha paytdagi obuna tugash sanasi. Odam qayta to'lasa
-- yangi sana chiqadi va eslatmalar yangi davr uchun qaytadan ishlaydi.

CREATE TABLE IF NOT EXISTS obuna_eslatma (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'kun_7' | 'kun_3' | 'kun_1' | 'tugadi'
  tur            TEXT   NOT NULL,
  muddat_tugashi TIMESTAMPTZ NOT NULL,
  yuborildi      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Nechta qurilmaga yetib bordi (0 = push obunasi yo'q, faqat ilova ichida ko'radi).
  qurilma_soni   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT obuna_eslatma_bir_marta UNIQUE (user_id, tur, muddat_tugashi)
);

CREATE INDEX IF NOT EXISTS obuna_eslatma_user_idx ON obuna_eslatma (user_id, yuborildi DESC);
