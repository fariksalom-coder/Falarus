-- Allow multiple pending outgoing partner requests per sender
DROP INDEX IF EXISTS public.idx_partner_requests_one_pending_per_sender;

-- Prevent duplicate pending requests for the same user pair in any direction
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_requests_unique_pending_pair
  ON public.partner_requests (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id)
  )
  WHERE status = 'pending';
