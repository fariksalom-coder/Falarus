-- Sprint 2 #6: indexes targeted at the hot paths that show up on every
-- authenticated page load and on payment cron jobs.
--
-- We deliberately do NOT add an index for every column the audit listed —
-- many of them already exist (verified against migrations 001-117) or
-- are write-only (e.g. payments.admin_id is set during admin approval but
-- never used as a query predicate). A speculative index just slows down
-- writes and increases bloat.
--
-- Use IF NOT EXISTS so this migration is safe to re-run.
-- Use CREATE INDEX CONCURRENTLY when applying to a populated production
-- database to avoid blocking writes on the table for the duration of
-- the build. (Run the file directly in PostgreSQL with the keyword
-- inserted manually if you have live traffic — PostgreSQL migrations
-- helper wraps everything in a transaction, which CONCURRENTLY rejects.)

-- =====================================================================
-- 1. subscriptions: composite for the active-subscription lookup.
--    Query: WHERE user_id=? AND expires_at > now() ORDER BY expires_at DESC
--    runs on every authenticated request (getActiveSubscription).
--    Existing idx_subscriptions_user covers the equality, but the sort
--    requires an extra step. A composite (user_id, expires_at DESC)
--    serves both filter and sort with a single index range scan.
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_expires
  ON public.subscriptions (user_id, expires_at DESC);

-- =====================================================================
-- 2. payments: partial index for the small "pending" subset.
--    99%+ of payment rows end up approved/rejected. The full
--    idx_payments_status indexes them all even though we mostly only
--    care about pending. A partial index is tiny and fast for:
--      - resume-pending-payment lookups in /click/create
--      - auto-pay scans
--    Keep the existing idx_payments_status for admin status listings.
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_payments_pending_user_product
  ON public.payments (user_id, product_code)
  WHERE status = 'pending';

-- =====================================================================
-- 3. referral_withdrawals: composite for "user's withdrawals by status".
--    The admin panel and the user page both filter by both columns.
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_user_status
  ON public.referral_withdrawals (user_id, status);

-- =====================================================================
-- 4. subscription_payment_requests: composite for "user's manual review
--    requests by status". Same pattern as #3.
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_subscription_payment_requests_user_status
  ON public.subscription_payment_requests (user_id, status);
