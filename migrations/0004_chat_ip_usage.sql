-- Migration number: 0004 	 2026-11-01
-- One counter per keyed fingerprint of a visitor address and a day. The
-- fingerprint is an HMAC, so it cannot be turned back into the address, and
-- rows go after two days. Nothing here is linked to a session or a lead.
CREATE TABLE chat_ip_usage (
  day TEXT NOT NULL,
  key TEXT NOT NULL,
  turns INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, key)
);
