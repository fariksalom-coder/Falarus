-- Additive, isolated operator ledger. Apply explicitly before enabling OPERATOR_BOT_ENABLED.
BEGIN;
CREATE TABLE IF NOT EXISTS operator_accounts (
 id bigserial PRIMARY KEY, login text NOT NULL UNIQUE, name text NOT NULL,
 password_hash text NOT NULL, telegram_id bigint UNIQUE, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS operator_sessions (
 telegram_id bigint PRIMARY KEY, operator_id bigint REFERENCES operator_accounts(id),
 expires_at timestamptz, state jsonb NOT NULL DEFAULT '{}', failures integer NOT NULL DEFAULT 0,
 locked_until timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS operator_contracts (
 id bigserial PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id),
 operator_id bigint NOT NULL REFERENCES operator_accounts(id),
 tariff text NOT NULL CHECK(tariff IN ('three_month','year')),
 currency text NOT NULL CHECK(currency IN ('UZS','RUB','USD')),
 total numeric(16,2) NOT NULL CHECK(total>0), source text NOT NULL,
 due_at timestamptz, activated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS operator_receipts (
 id bigserial PRIMARY KEY, contract_id bigint NOT NULL REFERENCES operator_contracts(id),
 operator_id bigint NOT NULL REFERENCES operator_accounts(id), amount numeric(16,2) NOT NULL CHECK(amount>0),
 file_id text NOT NULL, file_unique_id text NOT NULL UNIQUE, mime text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 admin_id bigint REFERENCES admins(id), reason text,
 payment_id bigint UNIQUE REFERENCES payments(id), created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
);
CREATE TABLE IF NOT EXISTS operator_audit (
 id bigserial PRIMARY KEY, operator_id bigint REFERENCES operator_accounts(id), admin_id bigint REFERENCES admins(id),
 user_id bigint REFERENCES users(id), action text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION operator_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Operator audit is append only'; END $$;
DROP TRIGGER IF EXISTS operator_audit_immutable ON operator_audit;
CREATE TRIGGER operator_audit_immutable BEFORE UPDATE OR DELETE ON operator_audit FOR EACH ROW EXECUTE FUNCTION operator_audit_immutable();
CREATE TABLE IF NOT EXISTS operator_freezes (
 user_id bigint PRIMARY KEY REFERENCES users(id), contract_id bigint NOT NULL REFERENCES operator_contracts(id),
 operator_id bigint NOT NULL REFERENCES operator_accounts(id), reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS operator_password_resets (
 id bigserial PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id),
 operator_id bigint NOT NULL REFERENCES operator_accounts(id), token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operator_password_resets_user_idx ON operator_password_resets(user_id,created_at);
CREATE TABLE IF NOT EXISTS operator_updates (id bigint PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS operator_outbox (
 id bigserial PRIMARY KEY, method text NOT NULL, payload jsonb NOT NULL,
 dedupe text UNIQUE, contract_id bigint REFERENCES operator_contracts(id),
 operator_id bigint REFERENCES operator_accounts(id), last_error text,
 attempts integer NOT NULL DEFAULT 0, next_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operator_receipts_contract_idx ON operator_receipts(contract_id,status);
CREATE INDEX IF NOT EXISTS operator_contracts_user_idx ON operator_contracts(user_id);
CREATE INDEX IF NOT EXISTS operator_outbox_pending_idx ON operator_outbox(next_at) WHERE delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS operator_audit_actor_idx ON operator_audit(operator_id,created_at);
CREATE OR REPLACE VIEW operator_balances AS
 SELECT c.*, COALESCE(sum(r.amount) FILTER (WHERE r.status='approved'),0) AS paid,
 c.total-COALESCE(sum(r.amount) FILTER (WHERE r.status='approved'),0) AS debt,
 COALESCE(sum(r.amount) FILTER (WHERE r.status='pending'),0) AS pending
 FROM operator_contracts c LEFT JOIN operator_receipts r ON r.contract_id=c.id GROUP BY c.id;
COMMIT;
