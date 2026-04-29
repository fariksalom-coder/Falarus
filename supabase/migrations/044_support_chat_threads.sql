-- Telegram-like support chat: one thread per user, many messages

CREATE TABLE IF NOT EXISTS support_chats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  user_last_read_at TIMESTAMPTZ,
  admin_last_read_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS support_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  sender_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_chats_last_message_at
  ON support_chats(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_support_chats_user_id
  ON support_chats(user_id);

CREATE INDEX IF NOT EXISTS idx_support_chat_messages_chat_created
  ON support_chat_messages(chat_id, created_at);

