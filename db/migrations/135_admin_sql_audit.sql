-- 135_admin_sql_audit.sql
--
-- Admin SQL konsolining audit jurnali: kim, qachon, qanday skript bajardi.
--
-- NEGA KERAK: konsol kontent jadvallarini o'zgartira oladi. Nimadir noto'g'ri
-- ketsa, "kim nima qildi" degan savolga javob shu yerda bo'ladi.
-- Jurnal ASOSIY (ega) ulanish orqali yoziladi va konsol rolining bu jadvalga
-- huquqi YO'Q — ya'ni konsoldan turib o'z izini o'chirib bo'lmaydi.

BEGIN;

CREATE TABLE IF NOT EXISTS admin_sql_audit (
  id            bigserial PRIMARY KEY,
  admin_id      bigint,
  admin_email   text,
  sql_text      text NOT NULL,
  dry_run       boolean NOT NULL DEFAULT false,
  ok            boolean NOT NULL,
  rows_changed  integer NOT NULL DEFAULT 0,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sql_audit_created ON admin_sql_audit (created_at DESC);

COMMIT;
