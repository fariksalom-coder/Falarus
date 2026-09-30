CREATE INDEX IF NOT EXISTS idx_admin_users_created_id
  ON users (created_at DESC, id DESC)
  WHERE is_golden IS NOT TRUE AND account_type IS DISTINCT FROM 'teacher';
CREATE INDEX IF NOT EXISTS idx_admin_unread_support
  ON support_chat_messages (chat_id, created_at) WHERE sender_type = 'user';
