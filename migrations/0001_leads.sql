-- Migration number: 0001 	 2026-10-31
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'es')),
  source TEXT NOT NULL CHECK (source IN ('form', 'chat', 'voice', 'calculator', 'booking')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_at INTEGER NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  gclid TEXT,
  referrer TEXT,
  landing_page TEXT,
  submit_page TEXT,
  context TEXT CHECK (context IS NULL OR json_valid(context)),
  chat_session_id TEXT,
  is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0, 1))
);
CREATE INDEX leads_created_at ON leads (created_at);
CREATE INDEX leads_email_created_at ON leads (email, created_at);

CREATE TABLE email_outbox (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('owner', 'confirmation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'failed', 'sent', 'dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL,
  sent_at INTEGER,
  last_error TEXT,
  provider_id TEXT,
  UNIQUE (lead_id, kind)
);
CREATE INDEX email_outbox_due ON email_outbox (status, next_attempt_at);
