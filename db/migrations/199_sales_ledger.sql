-- Sotuvlar jurnali (admin → «Аналитика продаж»).
-- Operatorlar sotgan tariflar, bo'lib to'lovlar va qarzlar qo'lda yuritiladi.
-- Obuna/shlyuz/operator botiga tegmaydi — faqat kunlik hisobot uchun.
BEGIN;

CREATE TABLE IF NOT EXISTS sales_ledger_operators (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  is_auto BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sales_ledger_operators_name_uq ON sales_ledger_operators (lower(btrim(name)));

-- Sayt orqali o'zi to'lagan mijozlar uchun «operator».
INSERT INTO sales_ledger_operators (name, is_auto, sort_order)
VALUES ('Автопродажи', TRUE, 1000)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sales_ledger_sales (
  id BIGSERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  client_name TEXT NOT NULL CHECK (length(btrim(client_name)) BETWEEN 1 AND 120),
  phone TEXT NOT NULL DEFAULT '' CHECK (length(phone) <= 40),
  operator_id BIGINT NOT NULL REFERENCES sales_ledger_operators(id),
  tariff TEXT NOT NULL CHECK (tariff IN ('month', 'three_month', 'six_month')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 20),
  price_rub NUMERIC(12,2) NOT NULL CHECK (price_rub > 0),
  price_uzs NUMERIC(14,2) NOT NULL CHECK (price_uzs >= 0),
  due_date DATE,
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  created_by BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_ledger_sales_date_idx ON sales_ledger_sales (sale_date);
CREATE INDEX IF NOT EXISTS sales_ledger_sales_operator_idx ON sales_ledger_sales (operator_id, sale_date);

CREATE TABLE IF NOT EXISTS sales_ledger_payments (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales_ledger_sales(id) ON DELETE CASCADE,
  paid_on DATE NOT NULL,
  amount_rub NUMERIC(12,2) NOT NULL CHECK (amount_rub > 0),
  amount_uzs NUMERIC(14,2) NOT NULL CHECK (amount_uzs >= 0),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  created_by BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_ledger_payments_paid_on_idx ON sales_ledger_payments (paid_on);
CREATE INDEX IF NOT EXISTS sales_ledger_payments_sale_idx ON sales_ledger_payments (sale_id);

CREATE OR REPLACE VIEW sales_ledger_balances AS
SELECT
  s.*,
  COALESCE(sum(p.amount_rub), 0) AS paid_rub,
  COALESCE(sum(p.amount_uzs), 0) AS paid_uzs,
  s.price_rub - COALESCE(sum(p.amount_rub), 0) AS debt_rub,
  s.price_uzs - COALESCE(sum(p.amount_uzs), 0) AS debt_uzs,
  count(p.id)::int AS payments_count
FROM sales_ledger_sales s
LEFT JOIN sales_ledger_payments p ON p.sale_id = s.id
GROUP BY s.id;

COMMIT;
