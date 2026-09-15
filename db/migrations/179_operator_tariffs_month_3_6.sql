-- Operator shartnomalari: 1 / 3 / 6 oy (eski 'year' saqlanadi).
ALTER TABLE operator_contracts DROP CONSTRAINT IF EXISTS operator_contracts_tariff_check;
ALTER TABLE operator_contracts ADD CONSTRAINT operator_contracts_tariff_check
  CHECK (tariff = ANY (ARRAY[
    'month'::text,
    'three_month'::text,
    'six_month'::text,
    'year'::text
  ]));
