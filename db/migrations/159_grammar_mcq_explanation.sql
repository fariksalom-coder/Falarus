-- 159: Grammatika test savollariga IZOH.
--
-- Xato javob berilganda o'quvchiga faqat to'g'ri variant ko'rsatilardi —
-- "nega" degan savol javobsiz qolardi va shu xato ertaga qaytarilardi.
-- Izoh bir-ikki gap: qaysi qoida ishlayapti va nima uchun aynan shu variant.
--
-- Bo'sh qatorlar bilan yashaydi: izoh yozilmagan savolda interfeys eskicha
-- "To'g'ri javob: …" ni ko'rsatadi.

ALTER TABLE daily_grammar_mcqs
  ADD COLUMN IF NOT EXISTS explanation TEXT NOT NULL DEFAULT '';
