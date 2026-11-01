-- Migration number: 0003 	 2026-11-01
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'es')),
  model TEXT NOT NULL,
  start_page TEXT NOT NULL,
  user_messages INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  neurons INTEGER NOT NULL DEFAULT 0,
  guards INTEGER NOT NULL DEFAULT 0,
  is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1))
);
CREATE INDEX chat_sessions_created_at ON chat_sessions (created_at);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL CHECK (json_valid(content)),
  shown TEXT
);
CREATE INDEX chat_messages_session ON chat_messages (session_id, id);

CREATE TABLE ai_usage (
  day TEXT PRIMARY KEY,
  sessions INTEGER NOT NULL DEFAULT 0,
  turns INTEGER NOT NULL DEFAULT 0,
  refused INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  neurons INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX leads_chat_session ON leads (chat_session_id);
