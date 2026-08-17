-- Ustoz javoblarining umumiy keshi.
--
-- MAQSAD: bir xil savolga model qayta-qayta pul evaziga javob yozmasin.
-- Bir o'quvchi so'ragan savolning javobi saqlanadi va keyin BOSHQA
-- o'quvchilarga ham shu yerdan beriladi.
--
-- Nima keshlanadi: savol-javob (`savol`) va dars tayyorlash (`dars`).
-- Nima keshlanmaydi: o'quvchining og'zaki javobini baholash — u shaxsiy;
-- va qo'shimcha mashq — u har safar yangi bo'lishi kerak.
CREATE TABLE IF NOT EXISTS ustoz_javob_keshi (
  -- Kalit: tur + prompt versiyasi + normallashtirilgan matn hash'i.
  kalit             TEXT PRIMARY KEY,
  tur               TEXT        NOT NULL,
  -- Asl matn — nosozlikni tekshirish va keshni ko'zdan kechirish uchun.
  manba_matn        TEXT        NOT NULL,
  javob             JSONB       NOT NULL,
  ishlatilgan_soni  INTEGER     NOT NULL DEFAULT 1,
  yaratildi         TIMESTAMPTZ NOT NULL DEFAULT now(),
  oxirgi_ishlatilgan TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eskirgan yozuvlarni tozalash va statistika uchun.
CREATE INDEX IF NOT EXISTS ustoz_javob_keshi_yaratildi_idx
  ON ustoz_javob_keshi (yaratildi);
CREATE INDEX IF NOT EXISTS ustoz_javob_keshi_tur_idx
  ON ustoz_javob_keshi (tur);
