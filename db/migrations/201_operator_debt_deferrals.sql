-- Apply to installations using the operator ledger before deploying debt deferrals.
BEGIN;
CREATE TABLE IF NOT EXISTS operator_debt_deferrals (
 id bigserial PRIMARY KEY,
 contract_id bigint NOT NULL REFERENCES operator_contracts(id),
 operator_id bigint NOT NULL REFERENCES operator_accounts(id),
 previous_due_at timestamptz NOT NULL,
 requested_due_at timestamptz NOT NULL CHECK (requested_due_at > previous_due_at),
 reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 admin_id bigint REFERENCES admins(id), decision_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS operator_debt_deferrals_pending_idx
 ON operator_debt_deferrals(contract_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS operator_debt_deferrals_contract_idx ON operator_debt_deferrals(contract_id,id DESC);
COMMIT;
