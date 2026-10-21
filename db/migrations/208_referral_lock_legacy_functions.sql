-- Close the legacy SECURITY DEFINER referral functions to every role except their owner.
--
-- Both functions run with the owner's rights (falarus) and change
-- users.referral_balance. Migration 117 meant to restrict them to
-- `service_role`, but that role never existed on this database, so the
-- REVOKE/GRANT block was not applied: proacl stayed NULL, which means the
-- default ACL — EXECUTE for PUBLIC. As a result the admin SQL console role
-- (falarus_content_sql), whose only intended reach is course content, could
-- credit or debit any user's referral balance through these functions.
--
-- After this migration:
--   * the function owner keeps EXECUTE (the application connects as the owner);
--   * PUBLIC and falarus_content_sql lose EXECUTE;
--   * superusers are unaffected (they bypass privilege checks).
--
-- Idempotent: REVOKE of an absent privilege is a no-op, missing functions or a
-- missing console role are skipped. The final check aborts the transaction if
-- the owner lost access or the console role still has it.
BEGIN;

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.process_referral_reward(bigint,bigint,numeric)'),
    to_regprocedure('public.deduct_referral_balance(bigint,numeric)')
  ] LOOP
    CONTINUE WHEN fn IS NULL;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'falarus_content_sql') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM falarus_content_sql', fn);
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn, p.proowner AS owner
    FROM pg_proc p
    WHERE p.oid IN (
      to_regprocedure('public.process_referral_reward(bigint,bigint,numeric)'),
      to_regprocedure('public.deduct_referral_balance(bigint,numeric)')
    )
  LOOP
    IF NOT has_function_privilege(r.owner, r.fn, 'EXECUTE') THEN
      RAISE EXCEPTION '208: owner lost EXECUTE on %', r.fn;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'falarus_content_sql' AND NOT rolsuper)
       AND has_function_privilege('falarus_content_sql', r.fn, 'EXECUTE') THEN
      RAISE EXCEPTION '208: falarus_content_sql still has EXECUTE on %', r.fn;
    END IF;
  END LOOP;
END
$$;

COMMIT;
