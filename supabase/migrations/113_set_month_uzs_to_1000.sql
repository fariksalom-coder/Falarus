-- Set Russian course monthly tariff in UZS to 1,000 (used by Click flow too).
UPDATE public.tariff_prices
SET
  price = 1000,
  updated_at = NOW()
WHERE tariff_type = 'month'
  AND currency = 'UZS';
