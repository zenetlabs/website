-- Migration number: 0006 	 2026-11-05
-- A pending booking is a 'held' row with confirm_hash set and confirmed_at NULL.
ALTER TABLE bookings ADD COLUMN email_key TEXT;            -- canonical mailbox, only for the caps
ALTER TABLE bookings ADD COLUMN request TEXT CHECK (request IS NULL OR json_valid(request)); -- details until confirm or expiry
ALTER TABLE bookings ADD COLUMN link_origin TEXT;          -- origin the links point to
ALTER TABLE bookings ADD COLUMN confirm_hash TEXT;         -- SHA-256 hex of the confirm secret
ALTER TABLE bookings ADD COLUMN confirm_expires_at INTEGER;
ALTER TABLE bookings ADD COLUMN confirmed_at INTEGER;
ALTER TABLE bookings ADD COLUMN cancel_hash TEXT;          -- SHA-256 hex of the owner's cancel secret
ALTER TABLE bookings ADD COLUMN cancelled_at INTEGER;
ALTER TABLE bookings ADD COLUMN event_deleted_at INTEGER;
ALTER TABLE bookings ADD COLUMN purge_tried_at INTEGER;     -- last calendar-purge attempt, so failures rotate
CREATE INDEX bookings_email_key_created ON bookings (email_key, created_at);
CREATE INDEX bookings_held_expiry ON bookings (status, hold_expires_at);

CREATE TABLE booking_emails (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('verify', 'cancelled')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'failed', 'sent', 'dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL,
  sent_at INTEGER,
  last_error TEXT,
  provider_id TEXT
);
CREATE INDEX booking_emails_due ON booking_emails (status, next_attempt_at);
CREATE INDEX booking_emails_booking ON booking_emails (booking_id, kind, created_at);

-- Keyed one-way fingerprints of the requesting IP, per UTC day; deleted two days later.
CREATE TABLE booking_ip_usage (
  day TEXT NOT NULL,
  key TEXT NOT NULL,
  sends INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, key)
);
