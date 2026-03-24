-- Rollback snapshot for full-progress seed
BEGIN;
-- user_id=1, email=fariksalom@gmail.com
UPDATE users SET progress=0, total_points=46, points=46, weekly_points=46, monthly_points=46 WHERE id=1;
DELETE FROM lesson_task_results WHERE user_id=1;
INSERT INTO lesson_task_results (user_id, lesson_path, task_number, correct, total) VALUES
(1, '/lesson-14', 9, 11, 11),
(1, '/lesson-14', 10, 8, 11)
ON CONFLICT (user_id, lesson_path, task_number) DO UPDATE SET correct=EXCLUDED.correct, total=EXCLUDED.total;
COMMIT;