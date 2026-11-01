-- Migration number: 0005 	 2026-11-01
-- One row per voice call a visitor started: no IP, audio or transcript. The
-- row is the proof that Turnstile passed, and the daily cap counts it.
CREATE TABLE voice_sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  day TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'es')),
  time_zone TEXT NOT NULL,
  start_page TEXT NOT NULL,
  conversation_id TEXT,
  tool_calls INTEGER NOT NULL DEFAULT 0,
  book_attempts INTEGER NOT NULL DEFAULT 0,
  booked_at INTEGER,
  -- Set while a booking runs, so a second one cannot start beside it.
  booking_started_at INTEGER,
  -- The id ElevenLabs sends with the first tool call; later calls must match.
  bound_conversation_id TEXT,
  is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1))
);
CREATE INDEX voice_sessions_day ON voice_sessions (day);
CREATE INDEX voice_sessions_created_at ON voice_sessions (created_at);
