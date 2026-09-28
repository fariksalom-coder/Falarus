ALTER TABLE sales_crm_leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text;

ALTER TABLE sales_crm_leads
  DROP CONSTRAINT IF EXISTS sales_crm_leads_utm_source_len;

ALTER TABLE sales_crm_leads
  ADD CONSTRAINT sales_crm_leads_utm_source_len CHECK (
    utm_source IS NULL OR char_length(utm_source) <= 120
  );

ALTER TABLE sales_crm_leads
  DROP CONSTRAINT IF EXISTS sales_crm_leads_utm_content_len;

ALTER TABLE sales_crm_leads
  ADD CONSTRAINT sales_crm_leads_utm_content_len CHECK (
    utm_content IS NULL OR char_length(utm_content) <= 120
  );

ALTER TABLE sales_crm_leads
  DROP CONSTRAINT IF EXISTS sales_crm_leads_utm_term_len;

ALTER TABLE sales_crm_leads
  ADD CONSTRAINT sales_crm_leads_utm_term_len CHECK (
    utm_term IS NULL OR char_length(utm_term) <= 120
  );
