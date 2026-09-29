ALTER TABLE promo_landing_events
  DROP CONSTRAINT IF EXISTS promo_landing_events_type_check;

ALTER TABLE promo_landing_events
  ADD CONSTRAINT promo_landing_events_type_check CHECK (
    event_type IN (
      'page_view',
      'name_input',
      'phone_input',
      'submit_click',
      'form_error',
      'lead_saved',
      'crm_lead_saved',
      'platform_click',
      'page_exit'
    )
  );
