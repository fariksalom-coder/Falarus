-- Receipt evidence attributes an existing Rahmat payment; never creates money or access.
BEGIN;
DO $$
BEGIN
 IF to_regclass('operator_accounts') IS NULL THEN RETURN; END IF;
CREATE TABLE IF NOT EXISTS operator_rahmat_claims (
 id bigserial PRIMARY KEY,
 payment_id bigint NOT NULL REFERENCES payments(id),
 operator_id bigint NOT NULL REFERENCES operator_accounts(id),
 file_id text NOT NULL, file_unique_id text NOT NULL, mime text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 admin_id bigint REFERENCES admins(id), reason text CHECK(length(reason)<=500),
 created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS operator_rahmat_claims_live_payment_idx
 ON operator_rahmat_claims(payment_id) WHERE status IN ('pending','approved');
CREATE UNIQUE INDEX IF NOT EXISTS operator_rahmat_claims_live_file_idx
 ON operator_rahmat_claims(file_unique_id) WHERE status IN ('pending','approved');
CREATE INDEX IF NOT EXISTS operator_rahmat_claims_operator_idx ON operator_rahmat_claims(operator_id,created_at);
CREATE OR REPLACE VIEW operator_rahmat_sales AS
 SELECT a.id claim_id,a.operator_id,p.id payment_id,p.user_id,p.amount,p.currency,p.tariff_type tariff,
        COALESCE(p.payment_time,p.created_at) paid_at
 FROM operator_rahmat_claims a JOIN payments p ON p.id=a.payment_id
 WHERE a.status='approved' AND p.status='approved' AND p.payment_channel='rahmat'
   AND COALESCE(p.product_code,'russian')='russian' AND p.amount>1
   AND p.tariff_type IN ('month','three_month','six_month','year') AND p.currency IN ('UZS','RUB','USD')
   AND NOT EXISTS(SELECT 1 FROM operator_receipts r WHERE r.payment_id=p.id);
END $$;
COMMIT;
