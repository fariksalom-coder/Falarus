-- Support CRM: add imo + email contact channels (keep max for historical rows).
-- Idempotent: safe to re-run.

ALTER TABLE support_crm_contacts
  DROP CONSTRAINT IF EXISTS support_crm_contacts_channel_chk;

ALTER TABLE support_crm_contacts
  ADD CONSTRAINT support_crm_contacts_channel_chk CHECK (
    channel IN ('phone', 'telegram', 'whatsapp', 'max', 'imo', 'email', 'other')
  );

ALTER TABLE support_crm_contacts
  DROP CONSTRAINT IF EXISTS support_crm_contacts_outcome_chk;

ALTER TABLE support_crm_contacts
  ADD CONSTRAINT support_crm_contacts_outcome_chk CHECK (
    outcome IN (
      'reached',
      'no_answer',
      'no_pickup',
      'no_contact',
      'no_telegram',
      'no_whatsapp',
      'no_imo',
      'other'
    )
  );
