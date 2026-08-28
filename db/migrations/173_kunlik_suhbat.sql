-- Kunning 5-bloki: ustoz bilan jonli savol-javob.
--
-- Ilgari suhbat grammatika oqimining ichidagi bosqich edi va bazada iz
-- qoldirmasdi. Endi u mustaqil blok va kun "to'liq tugadi" mezoniga kiradi,
-- shuning uchun o'z ustuni kerak.
--
-- DIQQAT: `db:push` hamma migratsiyani HAR SAFAR qayta yuritadi, shuning
-- uchun orqaga moslik uchun qilinadigan to'ldirish faqat ustun BIRINCHI
-- marta qo'shilganda ishlashi shart. Aks holda keyingi yurgizishlarda
-- to'rt blok bilan yopilgan yangi kunlar ham "suhbat qilingan" bo'lib
-- belgilanib ketardi.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'user_kunlik_day_progress'
       AND column_name = 'suhbat_done'
  ) THEN
    ALTER TABLE user_kunlik_day_progress
      ADD COLUMN suhbat_done BOOLEAN NOT NULL DEFAULT false;

    -- ORQAGA MOSLIK: allaqachon TO'RT blok bilan yopilgan kunlar ochilib
    -- ketmasligi kerak. Aks holda ketma-ket ochilish zanjiri hamma
    -- o'quvchini ortga uloqtirardi.
    UPDATE user_kunlik_day_progress d
       SET suhbat_done = true
     WHERE d.grammar_1 AND d.grammar_2 AND d.grammar_3
       AND d.words_match
       AND d.oqish_done
       AND (
         SELECT COUNT(*) FROM daily_practice_prompts p WHERE p.day_number = d.day_number
       ) <= COALESCE(d.speaking_level, 0);
  END IF;
END $$;
