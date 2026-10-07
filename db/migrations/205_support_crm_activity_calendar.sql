-- Exact prospective task history. Do not attribute old progress flags to updated_at.
BEGIN;
CREATE TABLE IF NOT EXISTS support_crm_calendar_meta (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), tracking_since timestamptz NOT NULL DEFAULT now()
);
INSERT INTO support_crm_calendar_meta(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS support_crm_premium_periods (
 id bigserial PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 started_at timestamptz NOT NULL, expires_at timestamptz NOT NULL CHECK(expires_at>=started_at),
 source text NOT NULL DEFAULT 'observed' CHECK(source IN ('observed','legacy'))
);
CREATE INDEX IF NOT EXISTS support_crm_premium_periods_user_idx ON support_crm_premium_periods(user_id,started_at,expires_at);
-- Baseline only when first installed. Reruns never reset the cutoff or add overlapping baselines.
INSERT INTO support_crm_premium_periods(user_id,started_at,expires_at)
 SELECT u.id,m.tracking_since,u.plan_expires_at FROM users u CROSS JOIN support_crm_calendar_meta m
 WHERE u.plan_expires_at>now() AND NOT EXISTS(SELECT 1 FROM support_crm_premium_periods p WHERE p.user_id=u.id AND p.source='observed');
CREATE UNIQUE INDEX IF NOT EXISTS support_crm_premium_periods_legacy_idx ON support_crm_premium_periods(user_id,started_at,expires_at) WHERE source='legacy';
-- Freeze available history at installation; subsequent expiry/revocation must not rewrite prior days.
INSERT INTO support_crm_premium_periods(user_id,started_at,expires_at,source)
 SELECT s.user_id,s.started_at,LEAST(s.expires_at,m.tracking_since),'legacy'
 FROM subscriptions s CROSS JOIN support_crm_calendar_meta m
 WHERE s.status IN ('active','expired') AND lower(s.plan_type) IN ('month','monthly','three_month','three_months','3months','six_month','year','yearly')
 AND s.started_at<m.tracking_since AND s.expires_at>s.started_at
 ON CONFLICT DO NOTHING;
-- Payments alone cannot prove continuous access between purchases; never fill unknown gaps.
CREATE OR REPLACE FUNCTION support_crm_record_premium_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.plan_expires_at IS NOT DISTINCT FROM OLD.plan_expires_at THEN RETURN NEW; END IF;
 UPDATE support_crm_premium_periods SET expires_at=GREATEST(started_at,now()) WHERE user_id=NEW.id AND source='observed' AND expires_at>now();
 IF NEW.plan_expires_at>now() THEN
  INSERT INTO support_crm_premium_periods(user_id,started_at,expires_at) VALUES(NEW.id,now(),NEW.plan_expires_at);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS support_crm_record_premium_period ON users;
CREATE TRIGGER support_crm_record_premium_period AFTER INSERT OR UPDATE OF plan_expires_at ON users
 FOR EACH ROW EXECUTE FUNCTION support_crm_record_premium_period();
CREATE TABLE IF NOT EXISTS learning_task_completions (
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 activity_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Tashkent')::date,
 task_key text NOT NULL CHECK(length(task_key) BETWEEN 1 AND 180),
 completed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,activity_date,task_key)
);
CREATE INDEX IF NOT EXISTS learning_task_completions_date_idx ON learning_task_completions(activity_date,user_id);
CREATE TABLE IF NOT EXISTS support_crm_user_visits (
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 activity_date date NOT NULL, PRIMARY KEY(user_id,activity_date)
);
CREATE INDEX IF NOT EXISTS support_crm_user_visits_date_idx ON support_crm_user_visits(activity_date,user_id);
CREATE OR REPLACE FUNCTION support_crm_record_visit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.last_seen_at IS NOT NULL THEN
  INSERT INTO support_crm_user_visits(user_id,activity_date) VALUES(NEW.id,(NEW.last_seen_at AT TIME ZONE 'Asia/Tashkent')::date) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS support_crm_record_visit ON users;
CREATE TRIGGER support_crm_record_visit AFTER INSERT OR UPDATE OF last_seen_at ON users
 FOR EACH ROW EXECUTE FUNCTION support_crm_record_visit();
CREATE OR REPLACE FUNCTION support_crm_record_task_transitions() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_row jsonb; new_row jsonb; field text; i integer; previous integer; current_value integer;
BEGIN
 old_row=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
 new_row=to_jsonb(NEW);
 IF NEW.day_number<1 THEN RETURN NEW; END IF;
 FOREACH field IN ARRAY ARRAY['grammar_1','grammar_2','grammar_3','words_match','phrases_done','oqish_done','suhbat_done'] LOOP
  IF COALESCE((new_row->>field)::boolean,false) AND NOT COALESCE((old_row->>field)::boolean,false) THEN
   INSERT INTO learning_task_completions(user_id,task_key) VALUES(NEW.user_id,'kunlik:'||NEW.day_number||':'||field) ON CONFLICT DO NOTHING;
  END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['speaking_level','speaking_tasks_done'] LOOP
  previous=GREATEST(0,COALESCE((old_row->>field)::integer,0));
  current_value=LEAST(100,COALESCE((new_row->>field)::integer,0));
  FOR i IN previous+1..current_value LOOP
   INSERT INTO learning_task_completions(user_id,task_key) VALUES(NEW.user_id,'kunlik:'||NEW.day_number||':'||field||':'||i) ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS support_crm_record_task_transitions ON user_kunlik_day_progress;
CREATE TRIGGER support_crm_record_task_transitions AFTER INSERT OR UPDATE ON user_kunlik_day_progress
 FOR EACH ROW EXECUTE FUNCTION support_crm_record_task_transitions();
CREATE OR REPLACE FUNCTION support_crm_record_legacy_task() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='PASSED' AND NEW.completed_at IS NOT NULL THEN
  INSERT INTO learning_task_completions(user_id,activity_date,task_key,completed_at)
   VALUES(NEW.user_id,(NEW.completed_at AT TIME ZONE 'Asia/Tashkent')::date,'legacy:'||NEW.task_id,NEW.completed_at) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS support_crm_record_legacy_task ON user_tasks;
CREATE TRIGGER support_crm_record_legacy_task AFTER INSERT OR UPDATE ON user_tasks
 FOR EACH ROW EXECUTE FUNCTION support_crm_record_legacy_task();
COMMIT;
