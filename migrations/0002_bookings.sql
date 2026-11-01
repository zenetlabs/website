-- Migration number: 0002 	 2026-11-01
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  slot_start INTEGER NOT NULL,
  slot_end INTEGER NOT NULL,
  day TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('held', 'confirmed', 'unknown', 'failed', 'expired', 'cancelled')),
  hold_expires_at INTEGER,
  email TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'chat', 'webmcp', 'voice')),
  time_zone TEXT,
  event_id TEXT,
  meet_url TEXT,
  lead_id TEXT REFERENCES leads (id) ON DELETE CASCADE,
  is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1))
);
CREATE UNIQUE INDEX bookings_active_slot ON bookings (slot_start, is_test) WHERE status IN ('held', 'confirmed', 'unknown');
CREATE INDEX bookings_range ON bookings (is_test, slot_start);
CREATE INDEX bookings_day ON bookings (is_test, day);
CREATE INDEX bookings_email_created ON bookings (email, created_at);
