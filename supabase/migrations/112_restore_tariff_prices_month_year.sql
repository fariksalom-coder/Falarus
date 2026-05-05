CREATE TABLE IF NOT EXISTS public.tariff_prices (
  id BIGSERIAL PRIMARY KEY,
  tariff_type TEXT NOT NULL CHECK (tariff_type IN ('month', 'year')),
  currency TEXT NOT NULL CHECK (currency IN ('UZS', 'RUB', 'USD')),
  price NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tariff_type, currency)
);

CREATE INDEX IF NOT EXISTS idx_tariff_prices_currency ON public.tariff_prices(currency);

INSERT INTO public.tariff_prices (tariff_type, currency, price)
VALUES
  ('month', 'UZS', 99000),
  ('year', 'UZS', 299000),
  ('month', 'RUB', 660),
  ('year', 'RUB', 1990),
  ('month', 'USD', 6.5),
  ('year', 'USD', 19)
ON CONFLICT (tariff_type, currency) DO UPDATE
SET
  price = EXCLUDED.price,
  updated_at = NOW();
