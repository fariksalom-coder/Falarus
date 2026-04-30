-- Allow multiple active chats per user.
DROP INDEX IF EXISTS public.idx_partner_matches_one_active_user1;
DROP INDEX IF EXISTS public.idx_partner_matches_one_active_user2;

-- Keep one active match per pair of users.
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_matches_unique_active_pair
  ON public.partner_matches (
    LEAST(user1_id, user2_id),
    GREATEST(user1_id, user2_id)
  )
  WHERE status = 'active';
