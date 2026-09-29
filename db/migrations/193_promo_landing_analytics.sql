CREATE TABLE IF NOT EXISTS promo_landing_events (
  id bigserial PRIMARY KEY,
  session_id text NOT NULL,
  event_type text NOT NULL,
  lead_id bigint REFERENCES sales_crm_leads(id) ON DELETE SET NULL,
  user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_landing_events_session_len CHECK (char_length(session_id) BETWEEN 8 AND 120),
  CONSTRAINT promo_landing_events_type_check CHECK (
    event_type IN ('page_view', 'name_input', 'phone_input', 'submit_click', 'lead_saved', 'crm_lead_saved', 'platform_click')
  ),
  CONSTRAINT promo_landing_events_landing_len CHECK (landing_page IS NULL OR char_length(landing_page) <= 300),
  CONSTRAINT promo_landing_events_utm_source_len CHECK (utm_source IS NULL OR char_length(utm_source) <= 120),
  CONSTRAINT promo_landing_events_utm_medium_len CHECK (utm_medium IS NULL OR char_length(utm_medium) <= 120),
  CONSTRAINT promo_landing_events_utm_campaign_len CHECK (utm_campaign IS NULL OR char_length(utm_campaign) <= 120),
  CONSTRAINT promo_landing_events_utm_content_len CHECK (utm_content IS NULL OR char_length(utm_content) <= 120),
  CONSTRAINT promo_landing_events_utm_term_len CHECK (utm_term IS NULL OR char_length(utm_term) <= 120)
);

CREATE INDEX IF NOT EXISTS idx_promo_landing_events_created_at
  ON promo_landing_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_landing_events_type_created
  ON promo_landing_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_landing_events_session
  ON promo_landing_events(session_id);
