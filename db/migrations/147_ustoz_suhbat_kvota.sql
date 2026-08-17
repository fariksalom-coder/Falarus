-- Ustoz bilan SUHBAT kvotasi (savol berish va jonli gaplashish).
--
-- Nima uchun bazada, xotirada emas: serverda Redis yo'q va PM2 jarayoni
-- tez-tez qayta ishga tushadi. Xotiradagi hisoblagich har restartda nolga
-- tushib, cheklov amalda ishlamay qolardi.
--
-- Mavzuni TUSHUNTIRISH bu kvotaga kirmaydi — o'quvchi darsni cheklovsiz
-- o'tishi kerak. Kvota faqat erkin suhbatga: u eng ko'p token yeydigan qism.
CREATE TABLE IF NOT EXISTS ustoz_suhbat_kvota (
  user_id           INTEGER PRIMARY KEY,
  -- Joriy davrda ishlatilgan so'rovlar soni.
  soni              INTEGER     NOT NULL DEFAULT 0,
  -- Chegara to'lganda shu vaqtgacha bloklanadi; o'tgach hisob noldan boshlanadi.
  bloklangan_gacha  TIMESTAMPTZ,
  yangilandi        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bloki tugagan yozuvlarni tozalash uchun.
CREATE INDEX IF NOT EXISTS ustoz_suhbat_kvota_blok_idx
  ON ustoz_suhbat_kvota (bloklangan_gacha)
  WHERE bloklangan_gacha IS NOT NULL;
