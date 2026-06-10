-- Payment methods (admin-managed cards/phones per currency)
CREATE TABLE IF NOT EXISTS payment_methods (
  id BIGSERIAL PRIMARY KEY,
  currency TEXT NOT NULL CHECK (currency IN ('UZS', 'RUB', 'USD')),
  bank_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  phone_number TEXT,
  card_holder_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_currency ON payment_methods(currency);
CREATE INDEX IF NOT EXISTS idx_payment_methods_status ON payment_methods(status);

-- Multi-currency tariff prices (admin-editable)
CREATE TABLE IF NOT EXISTS tariff_prices (
  id BIGSERIAL PRIMARY KEY,
  tariff_type TEXT NOT NULL CHECK (tariff_type IN ('month', 'three_months', 'year')),
  currency TEXT NOT NULL CHECK (currency IN ('UZS', 'RUB', 'USD')),
  price NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tariff_type, currency)
);

CREATE INDEX IF NOT EXISTS idx_tariff_prices_currency ON tariff_prices(currency);

-- Seed default tariff prices
INSERT INTO tariff_prices (tariff_type, currency, price) VALUES
  ('month', 'UZS', 99000),
  ('month', 'RUB', 660),
  ('month', 'USD', 6.5),
  ('three_months', 'UZS', 199000),
  ('three_months', 'RUB', 1320),
  ('three_months', 'USD', 13),
  ('year', 'UZS', 299000),
  ('year', 'RUB', 1990),
  ('year', 'USD', 19)
ON CONFLICT (tariff_type, currency) DO NOTHING;

-- Seed example payment method
INSERT INTO payment_methods (currency, bank_name, card_number, phone_number, card_holder_name, status)
SELECT 'RUB', 'Sberbank', '2202 2032 1234 5678', '+7 900 000 00 00', 'Ibragimova Aziza Azamatovna', 'active'
WHERE NOT EXISTS (SELECT 1 FROM payment_methods LIMIT 1);
