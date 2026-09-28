ALTER TABLE sales_crm_leads
  DROP CONSTRAINT IF EXISTS sales_crm_leads_status_chk;

ALTER TABLE sales_crm_leads
  ADD CONSTRAINT sales_crm_leads_status_chk CHECK (
    status IN (
      'NEW', 'TO_CALL', 'CALLED', 'ANSWERED', 'FOLLOW_UP', 'THINKING',
      'PAYMENT_PENDING', 'PAID', 'NO_ANSWER', 'INVALID_PHONE', 'CALLBACK',
      'NOT_INTERESTED', 'ARCHIVED'
    )
  );
