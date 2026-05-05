-- Atomic referral reward + balance functions.
--
-- Replaces three sequential UPDATEs done from JS in
-- server/services/referralReward.service.ts. The previous code had
-- two races:
--   1. concurrent rewards for the same referrer would race on
--      read-balance/modify/write-balance (one increment lost),
--   2. a crash between UPDATE referrals→paid and UPDATE users→balance
--      left rewards in a half-applied state, and a retry could
--      re-credit the balance.
--
-- All writes here run in a single PL/pgSQL block, which inherits the
-- caller's implicit statement-level transaction. Row locks (FOR UPDATE)
-- guarantee that two callers cannot both pass the "not yet rewarded"
-- check.

-- =====================================================================
-- 1. process_referral_reward — credit referrer once per referral row.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.process_referral_reward(
  p_referred_user_id BIGINT,
  p_payment_id       BIGINT,
  p_reward_amount    NUMERIC
)
RETURNS TABLE (
  rewarded         BOOLEAN,
  referrer_id      BIGINT,
  reward_amount    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_id        BIGINT;
  v_referrer_id   BIGINT;
  v_status        TEXT;
BEGIN
  IF p_reward_amount IS NULL OR p_reward_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Lock the referral row so a parallel caller waits.
  SELECT id, referrer_id, status
    INTO v_ref_id, v_referrer_id, v_status
    FROM public.referrals
    WHERE referred_user_id = p_referred_user_id
    FOR UPDATE;

  IF v_ref_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Idempotent: already rewarded (or being self-referred).
  IF v_status = 'rewarded' OR v_referrer_id = p_referred_user_id THEN
    RETURN QUERY SELECT FALSE, v_referrer_id, 0::NUMERIC;
    RETURN;
  END IF;

  -- Atomic balance increment. No JS-side read-modify-write.
  UPDATE public.users
     SET referral_balance      = COALESCE(referral_balance, 0)      + p_reward_amount,
         total_referral_earned = COALESCE(total_referral_earned, 0) + p_reward_amount
   WHERE id = v_referrer_id;

  UPDATE public.referrals
     SET status        = 'rewarded',
         reward_amount = p_reward_amount,
         payment_id    = p_payment_id,
         rewarded_at   = now()
   WHERE id = v_ref_id;

  RETURN QUERY SELECT TRUE, v_referrer_id, p_reward_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.process_referral_reward(BIGINT, BIGINT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_referral_reward(BIGINT, BIGINT, NUMERIC) TO service_role;

COMMENT ON FUNCTION public.process_referral_reward IS
  'Idempotently credit a referrer for a referred user payment. Returns rewarded=FALSE if no referral exists, self-referral, or already rewarded.';

-- =====================================================================
-- 2. deduct_referral_balance — atomic balance decrement with overdraw guard.
-- =====================================================================
-- The previous JS version did SELECT balance → IF balance >= amount → UPDATE,
-- which let two concurrent withdrawals both pass the check and overdraw.
-- Here the predicate is in the WHERE clause so only one wins.
CREATE OR REPLACE FUNCTION public.deduct_referral_balance(
  p_user_id BIGINT,
  p_amount  NUMERIC
)
RETURNS TABLE (
  deducted BOOLEAN,
  new_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::NUMERIC;
    RETURN;
  END IF;

  UPDATE public.users
     SET referral_balance = COALESCE(referral_balance, 0) - p_amount
   WHERE id = p_user_id
     AND COALESCE(referral_balance, 0) >= p_amount
   RETURNING referral_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::NUMERIC;
  ELSE
    RETURN QUERY SELECT TRUE, v_new_balance;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_referral_balance(BIGINT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_referral_balance(BIGINT, NUMERIC) TO service_role;

COMMENT ON FUNCTION public.deduct_referral_balance IS
  'Atomically deduct from a user referral_balance, refusing the operation if balance would go negative.';
