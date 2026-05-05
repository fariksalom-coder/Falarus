-- Audit log for every payment provider webhook call.
-- Captures duplicates, signature failures, and the state transition that
-- actually happened so we can reconcile disputes with Click/Payme.

CREATE TABLE IF NOT EXISTS public.payment_events (
  id           BIGSERIAL PRIMARY KEY,
  payment_id   BIGINT,
  provider     TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  -- Status the row was in when we read it (or null if no payment row).
  status_before TEXT,
  -- Status the row ended up in after our handler (or null if unchanged).
  status_after  TEXT,
  -- Provider-side correlation IDs.
  provider_trans_id TEXT,
  click_paydoc_id   TEXT,
  -- Outcome of THIS handler invocation: 'applied' | 'duplicate' | 'rejected'
  -- | 'invalid_signature' | 'amount_mismatch' | 'not_found' | 'config_missing'.
  outcome      TEXT NOT NULL,
  -- True when the handler actually mutated payments (avoid double activation).
  applied      BOOLEAN NOT NULL DEFAULT FALSE,
  signature_valid BOOLEAN,
  amount_expected NUMERIC(14, 2),
  amount_received NUMERIC(14, 2),
  payload      JSONB,
  ip           TEXT,
  user_agent   TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_created
  ON public.payment_events(payment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider_paydoc
  ON public.payment_events(provider, click_paydoc_id)
  WHERE click_paydoc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_events_outcome_created
  ON public.payment_events(outcome, created_at DESC);

COMMENT ON TABLE public.payment_events IS
  'Append-only audit log of payment provider webhook calls (Click/Payme). Rows are written by Express server in server/routes/paymentRoutes.ts.';
