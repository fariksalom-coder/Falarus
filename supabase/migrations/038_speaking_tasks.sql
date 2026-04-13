-- Speaking trainer: tasks + results
-- 038_speaking_tasks.sql

-- Tasks table (sentences to translate)
CREATE TABLE IF NOT EXISTS public.speaking_tasks (
  id            serial PRIMARY KEY,
  uz_text       text NOT NULL,
  ru_correct    text NOT NULL,
  topic         text NOT NULL,
  level         text NOT NULL DEFAULT 'A1',
  lesson_id     integer,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_speaking_tasks_topic ON public.speaking_tasks (topic);
CREATE INDEX idx_speaking_tasks_lesson ON public.speaking_tasks (lesson_id) WHERE lesson_id IS NOT NULL;

-- Results table (user answers log)
CREATE TABLE IF NOT EXISTS public.speaking_results (
  id            serial PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id       integer NOT NULL REFERENCES public.speaking_tasks(id) ON DELETE CASCADE,
  user_answer   text NOT NULL,
  mode          text NOT NULL CHECK (mode IN ('text', 'voice')),
  status        text NOT NULL CHECK (status IN ('correct', 'partial', 'wrong')),
  feedback      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_speaking_results_user ON public.speaking_results (user_id);
CREATE INDEX idx_speaking_results_task ON public.speaking_results (user_id, task_id);

-- RLS
ALTER TABLE public.speaking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks readable by authenticated"
  ON public.speaking_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Results: user reads own"
  ON public.speaking_results FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::integer);

CREATE POLICY "Results: user inserts own"
  ON public.speaking_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::integer);

-- Seed data: tanishuv (getting to know, A1)
INSERT INTO public.speaking_tasks (uz_text, ru_correct, topic, level, sort_order) VALUES
('Mening ismim Alisher', 'Меня зовут Алишер', 'tanishuv', 'A1', 1),
('Siz qayerdansiz?', 'Откуда вы?', 'tanishuv', 'A1', 2),
('Men O''zbekistondan kelganman', 'Я приехал из Узбекистана', 'tanishuv', 'A1', 3),
('Tanishganimdan xursandman', 'Рад познакомиться', 'tanishuv', 'A1', 4),
('Sizning yoshingiz nechida?', 'Сколько вам лет?', 'tanishuv', 'A1', 5),
('Men yigirma besh yoshdaman', 'Мне двадцать пять лет', 'tanishuv', 'A1', 6),
('Siz qayerda yashaysiz?', 'Где вы живёте?', 'tanishuv', 'A1', 7);

-- Seed data: oila (family, A1)
INSERT INTO public.speaking_tasks (uz_text, ru_correct, topic, level, sort_order) VALUES
('Mening oilam katta', 'Моя семья большая', 'oila', 'A1', 1),
('Mening akam bor', 'У меня есть старший брат', 'oila', 'A1', 2),
('Onam uy bekasi', 'Моя мама домохозяйка', 'oila', 'A1', 3),
('Otam shifokor', 'Мой папа врач', 'oila', 'A1', 4),
('Mening ikki singlim bor', 'У меня есть две младшие сестры', 'oila', 'A1', 5),
('Biz birga yashaymiz', 'Мы живём вместе', 'oila', 'A1', 6);

-- Seed data: xarid (shopping, A2)
INSERT INTO public.speaking_tasks (uz_text, ru_correct, topic, level, sort_order) VALUES
('Bu qancha turadi?', 'Сколько это стоит?', 'xarid', 'A2', 1),
('Menga yordam bering', 'Помогите мне', 'xarid', 'A2', 2),
('Men ko''ylak sotib olmoqchiman', 'Я хочу купить рубашку', 'xarid', 'A2', 3),
('Boshqa rangi bormi?', 'Есть другой цвет?', 'xarid', 'A2', 4),
('Chegirma bormi?', 'Есть скидка?', 'xarid', 'A2', 5),
('Men karta bilan to''layman', 'Я заплачу картой', 'xarid', 'A2', 6),
('Rahmat, xayr', 'Спасибо, до свидания', 'xarid', 'A2', 7);
