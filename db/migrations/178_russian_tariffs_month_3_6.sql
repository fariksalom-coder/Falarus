-- Rus tili tariflari: 1 oy / 3 oy / 6 oy (RUB katalog).
-- Eski 'year' qatorlari saqlanadi (tarix), lekin yangi sotuvlar uchun emas.

ALTER TABLE tariff_prices DROP CONSTRAINT IF EXISTS tariff_prices_tariff_type_check;
ALTER TABLE tariff_prices ADD CONSTRAINT tariff_prices_tariff_type_check
  CHECK (tariff_type = ANY (ARRAY[
    'month'::text,
    'three_month'::text,
    'six_month'::text,
    'year'::text
  ]));

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_tariff_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_tariff_type_check
  CHECK (
    tariff_type IS NULL
    OR tariff_type = ANY (ARRAY[
      'month'::text,
      'three_month'::text,
      'six_month'::text,
      'year'::text,
      '3months'::text
    ])
  );

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type = ANY (ARRAY[
    'monthly'::text,
    'three_month'::text,
    'three_months'::text,
    'six_month'::text,
    'yearly'::text
  ]));

-- RUB katalog + UZS fallback (150)
INSERT INTO tariff_prices (tariff_type, currency, price, updated_at) VALUES
  ('month',       'RUB',   3000, NOW()),
  ('month',       'UZS', 450000, NOW()),
  ('three_month', 'RUB',   4000, NOW()),
  ('three_month', 'UZS', 600000, NOW()),
  ('six_month',   'RUB',   6000, NOW()),
  ('six_month',   'UZS', 900000, NOW())
ON CONFLICT (tariff_type, currency) DO UPDATE
  SET price = EXCLUDED.price,
      updated_at = EXCLUDED.updated_at;
