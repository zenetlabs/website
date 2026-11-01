import { describe, expect, it } from 'vitest';
import {
  CSV_MAX_ROWS,
  csvResponse,
  escapeHtml,
  htmlResponse,
  leadDetailHtml,
  leadsCsv,
  leadsListHtml,
} from '@/server/internal-leads';
import {
  EXPORT_SHAPE,
  type ExportRow,
  type LeadRow,
  type OutboxRow,
} from '@/server/lead-store';
import { LEAD_ROW } from '../../test/leads';

const T = Date.UTC(2026, 9, 31, 12, 0, 0);
const XSS = '<script>alert(1)</script>';

const LEAD: ExportRow = {
  ...LEAD_ROW,
  locale: 'es',
  name: 'Ana Núñez',
  email: 'ana@example.com',
  company: 'Café, S.L.',
  message: 'Hola,\n"cita" y coma',
  utm_source: 'e2e',
  utm_medium: 'test',
  utm_campaign: 'r6',
  is_test: 1,
  owner_email_status: 'sent',
  confirmation_status: 'failed',
};

const DETAIL: LeadRow = {
  ...LEAD_ROW,
  name: 'Ana Núñez',
  email: 'ana@example.com',
  is_test: 1,
};

const EMAIL: OutboxRow = {
  id: 'o1',
  lead_id: LEAD.id,
  kind: 'owner',
  status: 'dead',
  attempts: 6,
  created_at: T,
  next_attempt_at: T + 60_000,
  sent_at: null,
  last_error: 'resend 500 internal_server_error',
  provider_id: null,
};

const COUNTS = { total: 3, test: 1, failed: 2, dead: 1, dead_owner: 0 };

describe('escapeHtml', () => {
  it('escapes the five dangerous characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;',
    );
  });
});

describe('leadsListHtml', () => {
  it('escapes markup in every user-controlled column', () => {
    const html = leadsListHtml(
      [
        {
          ...LEAD,
          name: XSS,
          company: XSS,
          email: `${XSS}@example.com`,
          utm_source: XSS,
        },
      ],
      COUNTS,
    );
    expect(html).not.toContain('<script>alert');
    expect(html.match(/&lt;script&gt;/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('shows counts, one row per lead, ISO UTC times, statuses and the test badge', () => {
    const html = leadsListHtml([LEAD], COUNTS);
    expect(html).toContain(
      '3 total · 1 test · 2 emails failed · 1 emails dead',
    );
    expect(html).toContain('2026-10-31T12:00:00.000Z');
    expect(html).toContain(`href="/internal/leads/${LEAD.id}"`);
    expect(html).toContain('href="mailto:ana@example.com"');
    expect(html).toContain('(test)');
    expect(html).toContain('<td>sent</td>');
    expect(html).toContain('<td class="bad">failed</td>');
    expect(html).toContain('href="/internal/leads.csv"');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it('uses no colour literals', () => {
    expect(leadsListHtml([], COUNTS)).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i,
    );
  });
});

describe('dead owner notifications', () => {
  it('shows nothing when none are dead', () => {
    expect(leadsListHtml([], COUNTS)).not.toContain('class="alert"');
  });

  it('shows a prominent alert above the counts when some are dead', () => {
    const html = leadsListHtml([], { ...COUNTS, dead_owner: 2 });
    expect(html).toContain('role="alert"');
    expect(html).toContain('2 owner notifications were never delivered');
    expect(html.indexOf('class="alert"')).toBeLessThan(
      html.indexOf('class="counts"'),
    );
    expect(leadsListHtml([], { ...COUNTS, dead_owner: 1 })).toContain(
      '1 owner notification was never delivered',
    );
  });
});

describe('leadDetailHtml', () => {
  it('escapes every field, the message and the context', () => {
    const html = leadDetailHtml(
      {
        ...DETAIL,
        name: XSS,
        company: XSS,
        message: XSS,
        referrer: XSS,
        context: JSON.stringify({ x: XSS }),
        chat_session_id: XSS,
      },
      [{ ...EMAIL, last_error: XSS }],
    );
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('<pre>&lt;script&gt;alert(1)&lt;/script&gt;</pre>');
  });

  it('lists the outbox rows and pretty-prints the context', () => {
    const html = leadDetailHtml({ ...DETAIL, context: '{"a":1}' }, [EMAIL]);
    expect(html).toContain('<pre>{\n  &quot;a&quot;: 1\n}</pre>');
    expect(html).toContain('<td class="bad">dead</td>');
    expect(html).toContain('<td>6</td>');
    expect(html).toContain('resend 500 internal_server_error');
    expect(html).toContain('2026-10-31T12:01:00.000Z');
  });
});

describe('the conversation section', () => {
  const TRANSCRIPT = {
    session: {
      created_at: T,
      locale: 'en' as const,
      model: 'fake',
      start_page: '/pricing',
      user_messages: 2,
      neurons: 12,
      guards: 1,
      is_test: 1,
    },
    messages: [
      { at: T, role: 'user' as const, text: 'How much?' },
      { at: T, role: 'tool' as const, text: 'get_pricing' },
      { at: T, role: 'assistant' as const, text: 'See the price list.' },
    ],
  };

  it('is absent for a lead without a conversation', () => {
    expect(leadDetailHtml(DETAIL, [EMAIL])).not.toContain('id="conversation"');
  });

  it('lists the session and the exchange under #conversation', () => {
    const html = leadDetailHtml(DETAIL, [EMAIL], TRANSCRIPT);
    expect(html).toContain('<section id="conversation">');
    expect(html).toContain('<strong>You:</strong> How much?');
    expect(html).toContain('<strong>Tool:</strong> get_pricing');
    expect(html).toContain('<strong>Assistant:</strong> See the price list.');
    expect(html).toContain('/pricing');
    expect(html).toContain('<dt>Test session</dt><dd>yes</dd>');
  });

  it('escapes what the visitor and the model wrote', () => {
    const html = leadDetailHtml(DETAIL, [EMAIL], {
      session: { ...TRANSCRIPT.session, start_page: XSS },
      messages: [
        { at: T, role: 'user', text: XSS },
        { at: T, role: 'assistant', text: XSS },
      ],
    });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('says so when the transcript has been purged', () => {
    expect(leadDetailHtml(DETAIL, [EMAIL], null)).toContain(
      'Conversation no longer stored.',
    );
  });
});

describe('leadsCsv', () => {
  function rows(csv: string): string[] {
    return csv.slice(1).split('\r\n');
  }

  it('starts with a BOM, ends with CRLF and keeps accents', () => {
    const csv = leadsCsv([LEAD], false);
    expect(csv.startsWith('﻿"id","created_at"')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).toContain('"Ana Núñez"');
  });

  it('writes the lead columns in table order, then the two statuses', () => {
    const [header] = rows(leadsCsv([], false));
    expect(header).toBe(
      Object.keys(EXPORT_SHAPE)
        .map((c) => `"${c}"`)
        .join(','),
    );
    expect(Object.keys(EXPORT_SHAPE).slice(-2)).toEqual([
      'owner_email_status',
      'confirmation_status',
    ]);
    expect(Object.keys(EXPORT_SHAPE).slice(0, 3)).toEqual([
      'id',
      'created_at',
      'locale',
    ]);
  });

  it('quotes every cell, doubles quotes and keeps embedded newlines', () => {
    const csv = leadsCsv([LEAD], false);
    expect(csv).toContain('"Café, S.L."');
    expect(csv).toContain('"Hola,\n""cita"" y coma"');
    expect(csv).toContain('"2026-10-31T12:00:00.000Z"');
    expect(csv).toContain('"sent","failed"');
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx'])(
    'neutralises a formula starting with %j',
    (value) => {
      const csv = leadsCsv([{ ...LEAD, name: value }], false);
      expect(csv).toContain(`"'${value}"`);
    },
  );

  it('leaves ordinary text and empty cells alone', () => {
    const csv = leadsCsv([{ ...LEAD, name: 'Plain', company: null }], false);
    expect(csv).toContain('"Plain"');
    expect(csv).toContain(',"",');
  });
});

describe('leadsCsv truncation', () => {
  it('adds a note row only when truncated', () => {
    expect(leadsCsv([LEAD], false)).not.toContain('Truncated');
    const csv = leadsCsv([LEAD], true);
    expect(
      csv
        .trimEnd()
        .endsWith(`"# Truncated: only the newest ${CSV_MAX_ROWS} leads"`),
    ).toBe(true);
  });
});

describe('responses', () => {
  it('sends the private headers', () => {
    const response = htmlResponse('<p>x</p>');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'",
    );
    expect(response.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    );
  });

  it('names the CSV download after the UTC date', () => {
    const response = csvResponse('x', T);
    expect(response.headers.get('content-type')).toBe(
      'text/csv; charset=utf-8',
    );
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="zenetlabs-leads-2026-10-31.csv"',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
