-- Speaking topics catalog extension: B1/B2
-- Structure-first migration so UI can show full roadmap immediately.

INSERT INTO public.speaking_topics_catalog
  (topic, level, order_index, title_uz, title_ru, target_tasks_count)
VALUES
  -- B1
  ('ish_tajriba_b1', 'B1', 201, 'Ish (tajriba)', 'Работа (обязанности, опыт)', 20),
  ('karyera_b1', 'B1', 202, 'Karyera', 'Карьера', 20),
  ('talim_b1', 'B1', 203, 'Ta’lim', 'Образование', 20),
  ('fikr_va_dalil_b1', 'B1', 204, 'Fikr va dalillar', 'Мнение и аргументы', 20),
  ('muloqot_odamlar_b1', 'B1', 205, 'Muloqot', 'Общение с людьми', 20),
  ('muammo_yechim_b1', 'B1', 206, 'Muammo va yechim', 'Проблемы и решения', 20),
  ('kochish_b1', 'B1', 207, 'Ko‘chish', 'Переезд / жизнь в другой стране', 20),
  ('hujjatlar_b1', 'B1', 208, 'Hujjatlar', 'Документы', 20),
  ('pul_xarajat_b1', 'B1', 209, 'Pul va xarajatlar', 'Деньги и расходы', 20),
  ('media_b1', 'B1', 210, 'Media', 'Медиа (новости, видео)', 20),
  ('dostlar_munosabat_b1', 'B1', 211, 'Do‘stlar va munosabatlar', 'Друзья и отношения', 20),
  ('kundalik_muammo_b1', 'B1', 212, 'Kundalik vaziyatlar', 'Повседневные ситуации (конфликты, просьбы)', 20),

  -- B2
  ('munozara_fikr_b2', 'B2', 301, 'Fikr muhokamasi', 'Обсуждение мнений', 20),
  ('taqqoslash_tahlil_b2', 'B2', 302, 'Taqqoslash va tahlil', 'Сравнение и анализ', 20),
  ('biznes_b2', 'B2', 303, 'Ish va biznes', 'Работа и бизнес', 20),
  ('jamiyat_b2', 'B2', 304, 'Jamiyat', 'Общество', 20),
  ('iqtisod_b2', 'B2', 305, 'Iqtisod', 'Экономика (простая)', 20),
  ('argument_b2', 'B2', 306, 'Argumentatsiya', 'Аргументация', 20),
  ('muammo_chuqur_b2', 'B2', 307, 'Muammo va yechim', 'Проблемы и решения (глубже)', 20),
  ('maqsad_reja_b2', 'B2', 308, 'Maqsad va rejalar', 'Цели и планы', 20),
  ('debat_b2', 'B2', 309, 'Debatlar', 'Дебаты', 20),
  ('rivojlanish_b2', 'B2', 310, 'Ta’lim va rivojlanish', 'Обучение и развитие', 20),
  ('madaniyat_b2', 'B2', 311, 'Madaniyat va an’ana', 'Культура и традиции', 20),
  ('texnologiya_b2', 'B2', 312, 'Texnologiya', 'Технологии', 20)
ON CONFLICT (topic) DO UPDATE SET
  level = EXCLUDED.level,
  order_index = EXCLUDED.order_index,
  title_uz = EXCLUDED.title_uz,
  title_ru = EXCLUDED.title_ru,
  target_tasks_count = EXCLUDED.target_tasks_count;
