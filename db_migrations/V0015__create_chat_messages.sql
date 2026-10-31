CREATE TABLE IF NOT EXISTS t_p39946729_azs_lg_project.chat_messages (
  id SERIAL PRIMARY KEY,
  channel VARCHAR(10) NOT NULL DEFAULT 'general',
  sender_id INTEGER NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  sender_role VARCHAR(10) NOT NULL,
  recipient_id INTEGER NULL,
  recipient_name VARCHAR(255) NULL,
  text TEXT NOT NULL DEFAULT '',
  file_url TEXT NULL,
  file_name VARCHAR(255) NULL,
  file_key TEXT NULL,
  file_size INTEGER NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON t_p39946729_azs_lg_project.chat_messages(channel, archived, id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON t_p39946729_azs_lg_project.chat_messages(recipient_id, sender_id);