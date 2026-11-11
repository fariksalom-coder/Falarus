-- Aksiya «birinchi 1000 o‘quvchi»: operator shartnomasi chegirma bilan sotilganini belgilaydi.
-- Jami summa (total) allaqachon chegirmali narx; bu ustun hisob va limit (1000) uchun.
BEGIN;
ALTER TABLE operator_contracts ADD COLUMN IF NOT EXISTS promo text;
DO $$ BEGIN
  ALTER TABLE operator_contracts ADD CONSTRAINT operator_contracts_promo_check CHECK (promo IS NULL OR promo IN ('first1000'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS operator_contracts_promo_idx ON operator_contracts(promo) WHERE promo IS NOT NULL;
COMMIT;
