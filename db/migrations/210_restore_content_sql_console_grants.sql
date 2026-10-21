-- Restore the admin SQL console role's access to course content tables.
--
-- The console (server/services/sqlConsole.service.ts) relies only on database
-- privileges: falarus_content_sql may read and edit course content and nothing
-- else. The RLS policies `content_sql_console` survived, but the table GRANTs
-- were lost (absent from every backup since 2026-08-31, most likely during the
-- server move), so every console query failed with "permission denied".
--
-- The grant set is exactly the tables that carry the content_sql_console policy
-- (the same 11 content tables the console was built for) plus their sequences.
-- Re-runnable; the final check aborts if the console could reach anything
-- outside course content.
BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'falarus_content_sql') THEN
    RAISE NOTICE '210: role falarus_content_sql does not exist, nothing to do';
    RETURN;
  END IF;
  FOR r IN
    SELECT DISTINCT format('%I.%I', schemaname, tablename) AS tbl, schemaname, tablename
    FROM pg_policies
    WHERE policyname = 'content_sql_console' AND 'falarus_content_sql' = ANY (roles)
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO falarus_content_sql', r.tbl);
  END LOOP;
  FOR r IN
    SELECT DISTINCT s.oid::regclass::text AS seq
    FROM pg_policies p
    JOIN pg_class t ON t.relname = p.tablename
    JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = p.schemaname
    JOIN pg_depend d ON d.refobjid = t.oid AND d.deptype IN ('a', 'i')
    JOIN pg_class s ON s.oid = d.objid AND s.relkind = 'S'
    WHERE p.policyname = 'content_sql_console' AND 'falarus_content_sql' = ANY (p.roles)
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO falarus_content_sql', r.seq);
  END LOOP;
END
$$;

DO $$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'falarus_content_sql') THEN RETURN; END IF;
  FOREACH t IN ARRAY ARRAY['public.daily_phrase_mcqs', 'public.daily_vocab_words', 'public.daily_grammar_topics'] LOOP
    IF to_regclass(t) IS NOT NULL AND NOT has_table_privilege('falarus_content_sql', t, 'UPDATE') THEN
      RAISE EXCEPTION '210: console still cannot edit %', t;
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['public.users', 'public.payments', 'public.admins', 'public.admin_sql_audit',
                           'public.referrals', 'public.referral_ledger', 'public.referral_balances'] LOOP
    IF to_regclass(t) IS NOT NULL AND has_table_privilege('falarus_content_sql', t, 'SELECT') THEN
      RAISE EXCEPTION '210: console must not read %', t;
    END IF;
  END LOOP;
END
$$;

COMMIT;
