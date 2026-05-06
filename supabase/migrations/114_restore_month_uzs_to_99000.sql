-- Restore monthly Russian tariff test override back to production value.
UPDATE tariff_prices
SET
  price = 99000,
  updated_at = NOW()
WHERE tariff_type = 'month'
  AND currency = 'UZS';
