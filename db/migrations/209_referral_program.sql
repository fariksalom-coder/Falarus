-- Referral program v2: per-currency balances, immutable ledger, idempotent
-- reward processing, refunds with debt, manual payouts and fraud review.
--
-- Additive only. Existing referrals, codes, payments and operator contracts are
-- kept as they are; the legacy users.referral_balance / total_referral_earned
-- columns (all zero in production) are no longer used by the code.
--
-- The program stays OFF: referral_program_settings.enabled = false and
-- launch_at IS NULL until the owner turns it on in the admin panel.
BEGIN;

-- 1. Program settings (single row).
CREATE TABLE IF NOT EXISTS referral_program_settings (
  id                 boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled            boolean NOT NULL DEFAULT false,
  launch_at          timestamptz,
  reward_percent     numeric(5,2) NOT NULL DEFAULT 10 CHECK (reward_percent > 0 AND reward_percent <= 50),
  min_withdrawal_rub numeric(14,2) NOT NULL DEFAULT 2000 CHECK (min_withdrawal_rub > 0),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         bigint,
  CONSTRAINT referral_program_enabled_needs_launch CHECK (NOT enabled OR launch_at IS NOT NULL)
);
INSERT INTO referral_program_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 2. Referral links: one referrer per invited user, first-purchase decision, review.
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_user_uidx ON referrals (referred_user_id);
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS first_source_type  text CHECK (first_source_type IN ('payment', 'operator_contract')),
  ADD COLUMN IF NOT EXISTS first_source_id    bigint,
  ADD COLUMN IF NOT EXISTS first_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome            text CHECK (outcome IN ('eligible', 'not_eligible')),
  ADD COLUMN IF NOT EXISTS outcome_reason     text,
  ADD COLUMN IF NOT EXISTS review_status      text NOT NULL DEFAULT 'none'
    CHECK (review_status IN ('none', 'pending', 'cleared', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_note        text,
  ADD COLUMN IF NOT EXISTS reviewed_by        bigint,
  ADD COLUMN IF NOT EXISTS reviewed_at        timestamptz;

-- 3. Balances per user and currency. Every column equals the sum of the matching
--    ledger deltas; available/held/reserved/debt never go negative.
CREATE TABLE IF NOT EXISTS referral_balances (
  user_id        bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  currency       text   NOT NULL CHECK (currency IN ('UZS', 'RUB', 'USD')),
  available      numeric(14,2) NOT NULL DEFAULT 0 CHECK (available >= 0),
  held           numeric(14,2) NOT NULL DEFAULT 0 CHECK (held >= 0),
  reserved       numeric(14,2) NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  debt           numeric(14,2) NOT NULL DEFAULT 0 CHECK (debt >= 0),
  earned_total   numeric(14,2) NOT NULL DEFAULT 0 CHECK (earned_total >= 0),
  paid_out_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_out_total >= 0),
  spent_total    numeric(14,2) NOT NULL DEFAULT 0 CHECK (spent_total >= 0),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, currency)
);

-- 4. Immutable ledger. user_id has no FK on purpose: the history must outlive
--    account deletion. idempotency_key makes every operation apply once.
CREATE TABLE IF NOT EXISTS referral_ledger (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL,
  currency         text   NOT NULL CHECK (currency IN ('UZS', 'RUB', 'USD')),
  entry_type       text   NOT NULL CHECK (entry_type IN (
                     'reward', 'hold_release', 'hold_cancel', 'reversal',
                     'withdrawal_reserve', 'withdrawal_release', 'withdrawal_payout',
                     'spend', 'spend_release')),
  amount           numeric(14,2) NOT NULL CHECK (amount >= 0),
  d_available      numeric(14,2) NOT NULL DEFAULT 0,
  d_held           numeric(14,2) NOT NULL DEFAULT 0,
  d_reserved       numeric(14,2) NOT NULL DEFAULT 0,
  d_debt           numeric(14,2) NOT NULL DEFAULT 0,
  idempotency_key  text   NOT NULL UNIQUE,
  referral_id      bigint REFERENCES referrals (id) ON DELETE SET NULL,
  source_type      text CHECK (source_type IN ('payment', 'operator_receipt', 'withdrawal', 'refund', 'review')),
  source_id        bigint,
  base_amount      numeric(14,2),
  rate_percent     numeric(5,2),
  related_entry_id bigint REFERENCES referral_ledger (id),
  actor_admin_id   bigint,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_ledger_user_idx ON referral_ledger (user_id, currency, id DESC);
CREATE INDEX IF NOT EXISTS referral_ledger_source_idx ON referral_ledger (source_type, source_id);

CREATE OR REPLACE FUNCTION referral_ledger_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Account deletion nulls referral_id through the FK; nothing else may change.
  IF TG_OP = 'UPDATE' AND NEW.referral_id IS NULL AND OLD.referral_id IS NOT NULL
     AND (to_jsonb(NEW) - 'referral_id') = (to_jsonb(OLD) - 'referral_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'referral_ledger is append-only';
END
$$;
DROP TRIGGER IF EXISTS referral_ledger_no_change ON referral_ledger;
CREATE TRIGGER referral_ledger_no_change BEFORE UPDATE OR DELETE ON referral_ledger
  FOR EACH ROW EXECUTE FUNCTION referral_ledger_immutable();

-- 5. One processing record per confirmed source (payment or operator receipt).
CREATE TABLE IF NOT EXISTS referral_source_events (
  id              bigserial PRIMARY KEY,
  source_type     text NOT NULL CHECK (source_type IN ('payment', 'operator_receipt')),
  source_id       bigint NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'skipped', 'failed')),
  reason          text,
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text,
  ledger_entry_id bigint REFERENCES referral_ledger (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);
CREATE INDEX IF NOT EXISTS referral_source_events_status_idx ON referral_source_events (status, updated_at);

-- 6. Confirmed money refunds. reference identifies the real refund, so the same
--    refund cannot be registered twice.
CREATE TABLE IF NOT EXISTS referral_refunds (
  id             bigserial PRIMARY KEY,
  source_type    text NOT NULL CHECK (source_type IN ('payment', 'operator_receipt')),
  source_id      bigint NOT NULL,
  refund_amount  numeric(14,2) NOT NULL CHECK (refund_amount > 0),
  currency       text NOT NULL CHECK (currency IN ('UZS', 'RUB', 'USD')),
  reference      text NOT NULL CHECK (length(reference) BETWEEN 3 AND 200),
  origin         text NOT NULL CHECK (origin IN ('click', 'admin')),
  actor_admin_id bigint,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, reference)
);

-- 7. Fraud review signals. A signal never rejects anything by itself.
CREATE TABLE IF NOT EXISTS referral_review_flags (
  id            bigserial PRIMARY KEY,
  kind          text NOT NULL CHECK (kind IN ('reward_burst', 'shared_payout_card', 'referral_cycle', 'manual')),
  dedupe_key    text NOT NULL UNIQUE,
  user_id       bigint,
  referral_id   bigint REFERENCES referrals (id) ON DELETE SET NULL,
  withdrawal_id bigint,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cleared', 'confirmed')),
  decided_by    bigint,
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_review_flags_open_idx ON referral_review_flags (status, created_at DESC);

-- 8. Withdrawals: currency, threshold snapshot, approval separate from payout.
--    The table is empty in production, so the new NOT NULL-free columns are safe.
ALTER TABLE referral_withdrawals
  ADD COLUMN IF NOT EXISTS currency         text CHECK (currency IN ('UZS', 'RUB', 'USD')),
  ADD COLUMN IF NOT EXISTS idempotency_key  text,
  ADD COLUMN IF NOT EXISTS card_last4       text,
  ADD COLUMN IF NOT EXISTS min_amount       numeric(14,2),
  ADD COLUMN IF NOT EXISTS rate_rub_uzs     numeric(14,4),
  ADD COLUMN IF NOT EXISTS rate_usd_uzs     numeric(14,4),
  ADD COLUMN IF NOT EXISTS rate_as_of       text,
  ADD COLUMN IF NOT EXISTS rate_source      text,
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by      bigint,
  ADD COLUMN IF NOT EXISTS paid_at          timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by          bigint,
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS rejected_by      bigint,
  ADD COLUMN IF NOT EXISTS reject_reason    text;
ALTER TABLE referral_withdrawals DROP CONSTRAINT IF EXISTS referral_withdrawals_status_check;
ALTER TABLE referral_withdrawals ADD CONSTRAINT referral_withdrawals_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'rejected'));
CREATE UNIQUE INDEX IF NOT EXISTS referral_withdrawals_idem_uidx
  ON referral_withdrawals (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS referral_withdrawals_payout_ref_uidx
  ON referral_withdrawals (payout_reference) WHERE payout_reference IS NOT NULL;

-- 9. Course bought with bonus balance: recorded as a zero-money payment so revenue
--    and sales reports (which require amount > 1) stay unchanged.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_channel_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_channel_check CHECK (
  payment_channel IS NULL OR payment_channel IN (
    'manual', 'click_button', 'click_auto_token', 'click_auto_cron', 'rahmat',
    'google_play', 'app_store', 'referral_bonus'));

-- 10. Operator contracts state their product. Every existing contract was sold
--     from the Russian course tariff catalog and activated the Russian course.
ALTER TABLE operator_contracts
  ADD COLUMN IF NOT EXISTS product_code text NOT NULL DEFAULT 'russian'
    CHECK (product_code IN ('russian', 'patent', 'vnzh'));

COMMIT;
