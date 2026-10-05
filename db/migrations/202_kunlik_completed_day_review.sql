-- Retain access to completed course days after the Russian subscription expires.
BEGIN;
ALTER TABLE user_kunlik_day_progress ADD COLUMN IF NOT EXISTS review_unlocked boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS user_kunlik_day_review_idx ON user_kunlik_day_progress(user_id,day_number) WHERE review_unlocked;

-- Existing completions use the same five-block definition as the application.
-- Incomplete days and accounts without any Russian-premium history are excluded.
WITH prompts AS (SELECT day_number,count(*) total FROM daily_practice_prompts GROUP BY day_number)
UPDATE user_kunlik_day_progress p SET review_unlocked=true
FROM users u
WHERE p.user_id=u.id AND p.day_number BETWEEN 1 AND 182 AND NOT p.review_unlocked
 AND p.grammar_1 AND p.grammar_2 AND p.grammar_3 AND p.words_match AND p.oqish_done AND p.suhbat_done
 AND COALESCE(p.speaking_level,0)>=COALESCE((SELECT total FROM prompts WHERE day_number=p.day_number),0)
 AND NOT COALESCE(u.is_golden,false)
 AND (u.plan_expires_at IS NOT NULL OR EXISTS (
   SELECT 1 FROM subscriptions s WHERE s.user_id=u.id AND lower(s.status) IN ('active','expired')
    AND s.started_at<=now() AND s.expires_at>s.started_at
    AND lower(s.plan_type) IN ('monthly','month','three_month','three_months','3months','six_month','yearly','year')
 ) OR EXISTS (
   SELECT 1 FROM payments pay WHERE pay.user_id=u.id AND pay.status='approved' AND pay.approved_at IS NOT NULL
    AND pay.approved_at<=now() AND (pay.product_code IS NULL OR pay.product_code IN ('','russian'))
 ));
COMMIT;
