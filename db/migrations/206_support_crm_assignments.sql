-- Existing CRM accounts retain supervisory access. Newly provisioned operators opt out.
BEGIN;
ALTER TABLE support_crm_agents ADD COLUMN IF NOT EXISTS is_manager boolean NOT NULL DEFAULT true;
-- Future accounts are restricted unless explicitly designated supervisors.
ALTER TABLE support_crm_agents ALTER COLUMN is_manager SET DEFAULT false;
ALTER TABLE support_crm_agents ADD COLUMN IF NOT EXISTS receives_assignments boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS support_crm_assignments (
 user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 agent_id bigint NOT NULL REFERENCES support_crm_agents(id) ON DELETE RESTRICT,
 assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_crm_assignments_agent_idx ON support_crm_assignments(agent_id,user_id);
CREATE TABLE IF NOT EXISTS support_crm_assignment_cursor (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), last_agent_id bigint
);
INSERT INTO support_crm_assignment_cursor(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION support_crm_assign_student(student_id bigint) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE previous_agent bigint; selected_agent bigint;
BEGIN
 -- Serializes all assignment paths, including initial provisioning and concurrent purchases.
 SELECT last_agent_id INTO previous_agent FROM support_crm_assignment_cursor WHERE id=true FOR UPDATE;
 SELECT agent_id INTO selected_agent FROM support_crm_assignments WHERE user_id=student_id;
 IF selected_agent IS NOT NULL THEN RETURN selected_agent; END IF;
 SELECT id INTO selected_agent FROM support_crm_agents WHERE active AND receives_assignments AND NOT is_manager AND id>COALESCE(previous_agent,0) ORDER BY id LIMIT 1;
 IF selected_agent IS NULL THEN
  SELECT id INTO selected_agent FROM support_crm_agents WHERE active AND receives_assignments AND NOT is_manager ORDER BY id LIMIT 1;
 END IF;
 IF selected_agent IS NULL THEN RETURN NULL; END IF;
 INSERT INTO support_crm_assignments(user_id,agent_id) VALUES(student_id,selected_agent);
 UPDATE support_crm_assignment_cursor SET last_agent_id=selected_agent WHERE id=true;
 RETURN selected_agent;
END $$;
CREATE OR REPLACE FUNCTION support_crm_assign_premium_student() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.plan_expires_at>now() AND NOT COALESCE(NEW.is_golden,false) AND COALESCE(NEW.account_type,'student')<>'teacher' THEN
  PERFORM support_crm_assign_student(NEW.id);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS support_crm_assign_premium_student ON users;
CREATE TRIGGER support_crm_assign_premium_student AFTER INSERT OR UPDATE OF plan_expires_at ON users
 FOR EACH ROW EXECUTE FUNCTION support_crm_assign_premium_student();
COMMIT;
