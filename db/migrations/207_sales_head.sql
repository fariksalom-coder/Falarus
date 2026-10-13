-- Sales department head: own login and salary rules edited by the main admin.
BEGIN;
CREATE TABLE IF NOT EXISTS sales_head_accounts (
 id bigserial PRIMARY KEY,
 login text NOT NULL UNIQUE,
 name text NOT NULL,
 password_hash text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
-- Single row of salary rules; the defaults mirror DEFAULT_SALES_HEAD_SETTINGS.
CREATE TABLE IF NOT EXISTS sales_head_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 settings jsonb NOT NULL,
 updated_by bigint REFERENCES admins(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO sales_head_settings(id,settings) VALUES(true,
 '{"fixedSalary":2000000,"perSale":20000,"includeRahmatClaims":false,"bonusPeriod":"month","tiers":[{"sales":5,"amount":0},{"sales":15,"amount":0},{"sales":20,"amount":0},{"sales":30,"amount":0}]}'
) ON CONFLICT DO NOTHING;
COMMIT;
