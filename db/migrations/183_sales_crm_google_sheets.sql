-- Google Sheets ↔ Sales CRM integration metadata.
-- Idempotent.

ALTER TABLE sales_crm_leads
  ADD COLUMN IF NOT EXISTS external_key text,
  ADD COLUMN IF NOT EXISTS sheet_row_number integer,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_crm_leads_external_key
  ON sales_crm_leads (external_key)
  WHERE external_key IS NOT NULL AND external_key <> '';

CREATE TABLE IF NOT EXISTS sales_crm_sheet_sync_logs (
  id              bigserial PRIMARY KEY,
  source          text NOT NULL DEFAULT 'api_sync',
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  ok              boolean NOT NULL DEFAULT false,
  rows_checked    integer NOT NULL DEFAULT 0,
  new_leads       integer NOT NULL DEFAULT 0,
  duplicates      integer NOT NULL DEFAULT 0,
  errors          integer NOT NULL DEFAULT 0,
  error_message   text,
  details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT sales_crm_sheet_sync_source_chk CHECK (
    source IN ('api_sync', 'webhook', 'manual', 'connection_check')
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_crm_sheet_sync_started
  ON sales_crm_sheet_sync_logs (started_at DESC);

INSERT INTO sales_crm_settings (key, value)
VALUES
  ('sheets_last_sync_at', ''),
  ('sheets_last_error', ''),
  ('sheets_connected', '0')
ON CONFLICT (key) DO NOTHING;
