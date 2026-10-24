-- 216: Bildirishnomalar — matnli va ovozli xabarlar, qoidalar bo'yicha.
--
-- notification_rules   — "qachon va kimga": shart (trigger), soat (Toshkent),
--                        matn, ovoz (audio_url). HAMMASI O'CHIQ boshlanadi:
--                        admin «Bildirishnomalar» bo'limida yoqadi.
-- notifications        — har bir odamga ketgan xabar. Bir vaqtda ilova ichidagi
--                        «kirish qutisi» ham: ilova ochilganda ko'rilmagan xabar
--                        ovozi bilan chiqadi. (user_id, dedupe_key) — bir qoida
--                        bir odamga kuniga bir martadan ortiq yubormasin.
-- notification_campaigns — admin qo'lda yuborgan ommaviy xabar.
-- push_devices         — mobil ilova (FCM) tokenlari. Ilova push plaginini olgach
--                        to'ladi; web push obunalari eskicha push_subscriptions da.

CREATE TABLE IF NOT EXISTS notification_rules (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  trigger     TEXT NOT NULL CHECK (trigger IN ('no_study_today', 'inactive_days', 'registered_not_started', 'day_completed')),
  param       INTEGER NOT NULL DEFAULT 0,
  send_hour   SMALLINT NOT NULL DEFAULT 19 CHECK (send_hour BETWEEN 0 AND 23),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  url         TEXT NOT NULL DEFAULT '/',
  voice_text  TEXT,
  audio_url   TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_campaigns (
  id          BIGSERIAL PRIMARY KEY,
  segment     TEXT NOT NULL,
  param       INTEGER NOT NULL DEFAULT 0,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  url         TEXT NOT NULL DEFAULT '/',
  audio_url   TEXT,
  created_by  BIGINT,
  total       INTEGER NOT NULL DEFAULT 0,
  pushed      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id      BIGINT REFERENCES notification_rules(id) ON DELETE SET NULL,
  campaign_id  BIGINT REFERENCES notification_campaigns(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  url          TEXT NOT NULL DEFAULT '/',
  audio_url    TEXT,
  dedupe_key   TEXT NOT NULL,
  pushed       INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_rule_idx ON notifications (rule_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_devices (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  token        TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_devices_user_idx ON push_devices (user_id);

-- "Bugun shug'ullanmadi" sharti har soatda progress jadvalini updated_at bo'yicha o'qiydi.
CREATE INDEX IF NOT EXISTS idx_ukdp_updated_at ON user_kunlik_day_progress (updated_at);

INSERT INTO notification_rules (code, trigger, param, send_hour, title, body, url, voice_text) VALUES
  ('no_study_today', 'no_study_today', 7, 19,
   'Bugungi darsingiz kutyapti',
   '10–15 daqiqa ajrating va bugungi kunni yoping. Har kungi oz-ozdan — eng tez yo‘l!',
   '/',
   'Salom! Bugungi darsingiz sizni kutyapti. Atigi o‘n besh daqiqa ajrating — bugungi kunni birga yopamiz.'),
  ('inactive_3_days', 'inactive_days', 3, 11,
   'Sizni sog‘indik!',
   '3 kundan beri ko‘rinmadingiz. Qaytib keling — to‘xtagan joyingizdan davom etamiz.',
   '/',
   'Salom! Uch kundan beri ko‘rinmadingiz. Qaytib keling, to‘xtagan joyingizdan davom etamiz.'),
  ('registered_not_started', 'registered_not_started', 1, 12,
   'Birinchi dars sizni kutyapti',
   'Ro‘yxatdan o‘tdingiz, endi birinchi qadam: 1-kun darsini oching.',
   '/',
   'Xush kelibsiz! Birinchi darsingizni boshlang — bu juda oson va qiziqarli.'),
  ('day_completed', 'day_completed', 0, 0,
   'Barakalla! Yana bir kun ortda',
   'Kunni yopdingiz. Ertaga yangi mavzu ochiladi.',
   '/',
   'Barakalla! Yana bir kun ortda qoldi. Shunday davom eting!')
ON CONFLICT (code) DO NOTHING;
