import type { LeadRow, NewLead } from '@/server/lead-store';

export const NEW_LEAD: NewLead = {
  locale: 'en',
  source: 'form',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  message: 'We would like to automate our inbox triage.',
  consent_version: '2026-10-31',
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  gclid: null,
  referrer: null,
  landing_page: '/',
  submit_page: '/',
  context: null,
  chat_session_id: null,
  is_test: 0,
};

export const DAY = 86_400_000;

export const LEAD_ROW: LeadRow = {
  ...NEW_LEAD,
  id: '0b3c5f4e-1111-4222-8333-444455556666',
  created_at: Date.UTC(2026, 9, 31, 12, 0, 0),
  consent_at: Date.UTC(2026, 9, 31, 12, 0, 0),
  utm_source: 'newsletter',
  utm_medium: 'email',
  utm_campaign: 'r6',
  gclid: 'g1',
  referrer: 'https://example.org/post',
  landing_page: '/?utm_source=newsletter',
  submit_page: '/services/ai-automation',
};
