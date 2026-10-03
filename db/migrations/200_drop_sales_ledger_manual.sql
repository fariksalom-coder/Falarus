-- «Аналитика продаж» endi bazadagi haqiqiy ma'lumotdan o'qiydi (operator boti +
-- payments). 199 dagi qo'lda kiritish jadvallari keraksiz. Xavfsizlik uchun:
-- jadvalda birorta sotuv bo'lsa, migratsiya to'xtaydi va hech narsa o'chmaydi.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.sales_ledger_sales') IS NOT NULL
     AND EXISTS (SELECT 1 FROM sales_ledger_sales) THEN
    RAISE EXCEPTION 'sales_ledger_sales is not empty: refusing to drop';
  END IF;
END $$;
DROP VIEW IF EXISTS sales_ledger_balances;
DROP TABLE IF EXISTS sales_ledger_payments;
DROP TABLE IF EXISTS sales_ledger_sales;
DROP TABLE IF EXISTS sales_ledger_operators;
COMMIT;
