-- Enable RLS on public tables exposed to PostgREST.
-- The API uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- Anon/authenticated clients get no policies here → no direct table access via REST
-- (fixes Supabase linter: rls_disabled_in_public, sensitive_columns_exposed).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'subscription_payment_requests',
    'referral_withdrawals',
    'lesson_task_results',
    'vocabulary_subtopics',
    'vocabulary_word_groups',
    'vocabulary_topics',
    'vocabulary_words',
    'user_word_group_progress',
    'user_activity_dates',
    'support_messages',
    'users',
    'referrals',
    'subscriptions',
    'leaderboard',
    'pricing_plans',
    'payment_methods',
    'tariff_prices',
    'admins',
    'payments',
    'user_vocabulary_step2_attempts'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;
