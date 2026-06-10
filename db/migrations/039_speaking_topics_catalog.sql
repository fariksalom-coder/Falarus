-- Speaking trainer topics catalog (A1/A2)
-- Keeps topic structure explicit for stable UX grouping/order.

CREATE TABLE IF NOT EXISTS public.speaking_topics_catalog (
  id serial PRIMARY KEY,
  topic text NOT NULL UNIQUE,
  level text NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2')),
  order_index integer NOT NULL,
  title_uz text NOT NULL,
  title_ru text NOT NULL,
  target_tasks_count integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speaking_topics_catalog_level_order
  ON public.speaking_topics_catalog(level, order_index);

INSERT INTO public.speaking_topics_catalog
  (topic, level, order_index, title_uz, title_ru, target_tasks_count)
VALUES
  ('tanishuv', 'A1', 1, 'Tanishuv', 'Знакомство', 20),
  ('oila', 'A1', 2, 'Oila', 'Семья', 20),
  ('uy_joy', 'A1', 3, 'Uy va yashash joyi', 'Дом и жильё', 20),
  ('shahar', 'A1', 4, 'Shahar', 'Город', 20),
  ('xarid', 'A1', 5, 'Do‘kon', 'Магазин', 20),
  ('ovqat_ichimlik', 'A1', 6, 'Ovqat va ichimlik', 'Еда и напитки', 20),
  ('ish_sodda', 'A1', 7, 'Ish (sodda)', 'Работа (простая)', 20),
  ('kun_vaqt', 'A1', 8, 'Kun va vaqt', 'День и время', 20),
  ('kundalik_harakatlar', 'A1', 9, 'Kundalik harakatlar', 'Повседневные действия', 20),
  ('qongiroqlar', 'A1', 10, 'Qo‘ng‘iroqlar', 'Простое общение (звонки)', 20),

  ('ish_batafsil', 'A2', 101, 'Ish (batafsil)', 'Работа (подробнее)', 20),
  ('ofis', 'A2', 102, 'Ofis', 'Офис', 20),
  ('transport', 'A2', 103, 'Transport', 'Транспорт', 20),
  ('sogliq', 'A2', 104, 'Sog‘liq', 'Здоровье', 20),
  ('xarid_batafsil', 'A2', 105, 'Xarid (batafsil)', 'Покупки (детально)', 20),
  ('restoran', 'A2', 106, 'Restoran / Kafe', 'Ресторан / кафе', 20),
  ('sayohat', 'A2', 107, 'Sayohat', 'Путешествия', 20),
  ('mehmonxona', 'A2', 108, 'Mehmonxona', 'Гостиница', 20),
  ('xizmatlar', 'A2', 109, 'Xizmatlar', 'Услуги (банк, почта)', 20),
  ('bosh_vaqt', 'A2', 110, 'Bo‘sh vaqt', 'Свободное время', 20),
  ('muloqot', 'A2', 111, 'Muloqot', 'Общение (соцсети)', 20),
  ('muammolar', 'A2', 112, 'Oddiy muammolar', 'Простые проблемы', 20)
ON CONFLICT (topic) DO UPDATE SET
  level = EXCLUDED.level,
  order_index = EXCLUDED.order_index,
  title_uz = EXCLUDED.title_uz,
  title_ru = EXCLUDED.title_ru,
  target_tasks_count = EXCLUDED.target_tasks_count;
