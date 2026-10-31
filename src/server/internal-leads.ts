import { isoTime, prettyJson } from '@/server/format';
import {
  EXPORT_SHAPE,
  type ExportRow,
  type LeadCounts,
  type LeadRow,
  type ListRow,
  type OutboxRow,
} from '@/server/lead-store';
import { privateHeaders } from '@/server/responses';

export const CSV_MAX_ROWS = 2000;

const STYLE = `
:root { color-scheme: light dark; font-family: system-ui, sans-serif; }
body { margin: 0; padding: 1.5rem; line-height: 1.4; background: Canvas; color: CanvasText; }
h1 { margin: 0 0 .5rem; font-size: 1.5rem; }
h2 { margin: 1.5rem 0 .5rem; font-size: 1.1rem; }
nav, .counts { margin: 0 0 1rem; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: .875rem; }
th, td { border: 1px solid currentColor; padding: .35rem .5rem; text-align: left; vertical-align: top; }
th { white-space: nowrap; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: .25rem 1rem; }
dt { font-weight: bold; }
dd { margin: 0; overflow-wrap: anywhere; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid currentColor; padding: .75rem; }
.bad { font-weight: bold; text-decoration: underline wavy; }
.alert { font-weight: bold; border: 3px solid currentColor; padding: .75rem; margin: 0 0 1rem; }
.muted { font-style: italic; }
`;

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

function shown(value: string | number | null): string {
  return value === null || value === '' ? '-' : escapeHtml(String(value));
}

function testBadge(lead: { is_test: number }): string {
  return lead.is_test === 1 ? ' <span class="muted">(test)</span>' : '';
}

function statusCell(status: string | null): string {
  if (status === null) return '<td>-</td>';
  const bad = status === 'failed' || status === 'dead';
  return `<td${bad ? ' class="bad"' : ''}>${escapeHtml(status)}</td>`;
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

function table(
  label: string,
  headings: readonly string[],
  rows: readonly string[],
): string {
  const head = headings.map((h) => `<th scope="col">${h}</th>`).join('');
  return `<div class="scroll" role="region" aria-label="${label}" tabindex="0">
<table>
<thead><tr>${head}</tr></thead>
<tbody>
${rows.join('\n')}
</tbody>
</table>
</div>`;
}

const LIST_COLUMNS: ReadonlyArray<
  readonly [string, (lead: ListRow) => string]
> = [
  ['Created', (l) => `<td>${isoTime(l.created_at)}</td>`],
  ['Locale', (l) => `<td>${escapeHtml(l.locale)}</td>`],
  ['Source', (l) => `<td>${escapeHtml(l.source)}</td>`],
  [
    'Name',
    (l) =>
      `<td><a href="/internal/leads/${encodeURIComponent(l.id)}">${escapeHtml(l.name)}</a>${testBadge(l)}</td>`,
  ],
  [
    'Email',
    (l) =>
      `<td><a href="mailto:${escapeHtml(l.email)}">${escapeHtml(l.email)}</a></td>`,
  ],
  ['Company', (l) => `<td>${shown(l.company)}</td>`],
  ['utm_source', (l) => `<td>${shown(l.utm_source)}</td>`],
  ['utm_medium', (l) => `<td>${shown(l.utm_medium)}</td>`],
  ['utm_campaign', (l) => `<td>${shown(l.utm_campaign)}</td>`],
  ['Owner email', (l) => statusCell(l.owner_email_status)],
  ['Confirmation', (l) => statusCell(l.confirmation_status)],
];

function deadOwnerAlert(count: number): string {
  if (count === 0) return '';
  return `<p class="alert" role="alert">${count} owner ${count === 1 ? 'notification was' : 'notifications were'} never delivered (dead). Check the Emails column and the Resend dashboard.</p>
`;
}

export function leadsListHtml(
  leads: readonly ListRow[],
  counts: LeadCounts,
): string {
  const rows = leads.map(
    (lead) => `<tr>${LIST_COLUMNS.map(([, cell]) => cell(lead)).join('')}</tr>`,
  );
  return page(
    'Leads',
    `<h1>Leads</h1>
${deadOwnerAlert(counts.dead_owner)}<p class="counts">${counts.total} total · ${counts.test} test · ${counts.failed} emails failed · ${counts.dead} emails dead · showing the latest ${leads.length}</p>
<nav><a href="/internal/leads.csv">Download CSV</a></nav>
${table(
  'Leads',
  LIST_COLUMNS.map(([label]) => label),
  rows,
)}`,
  );
}

const DETAIL_FIELDS: ReadonlyArray<readonly [string, keyof LeadRow]> = [
  ['Id', 'id'],
  ['Created', 'created_at'],
  ['Locale', 'locale'],
  ['Source', 'source'],
  ['Email', 'email'],
  ['Company', 'company'],
  ['Consent version', 'consent_version'],
  ['Consent at', 'consent_at'],
  ['utm_source', 'utm_source'],
  ['utm_medium', 'utm_medium'],
  ['utm_campaign', 'utm_campaign'],
  ['utm_term', 'utm_term'],
  ['utm_content', 'utm_content'],
  ['gclid', 'gclid'],
  ['Referrer', 'referrer'],
  ['Landing page', 'landing_page'],
  ['Submitted from', 'submit_page'],
  ['Chat session', 'chat_session_id'],
  ['Test lead', 'is_test'],
];

function detailValue(
  lead: LeadRow,
  key: keyof LeadRow,
): string | number | null {
  const value = lead[key];
  if (key === 'is_test') return value === 1 ? 'yes' : 'no';
  return EXPORT_SHAPE[key] === 'time' && typeof value === 'number'
    ? isoTime(value)
    : value;
}

const EMAIL_COLUMNS: ReadonlyArray<
  readonly [string, (email: OutboxRow) => string]
> = [
  ['Kind', (e) => `<td>${escapeHtml(e.kind)}</td>`],
  ['Status', (e) => statusCell(e.status)],
  ['Attempts', (e) => `<td>${e.attempts}</td>`],
  ['Next attempt', (e) => `<td>${isoTime(e.next_attempt_at)}</td>`],
  ['Sent at', (e) => `<td>${shown(isoTime(e.sent_at))}</td>`],
  ['Last error', (e) => `<td>${shown(e.last_error)}</td>`],
  ['Provider id', (e) => `<td>${shown(e.provider_id)}</td>`],
];

export function leadDetailHtml(
  lead: LeadRow,
  emails: readonly OutboxRow[],
): string {
  const fields = DETAIL_FIELDS.map(
    ([label, key]) =>
      `<dt>${label}</dt><dd>${shown(detailValue(lead, key))}</dd>`,
  ).join('\n');
  const context = lead.context
    ? `<h2>Context</h2><pre>${escapeHtml(prettyJson(lead.context))}</pre>`
    : '';
  return page(
    `Lead ${lead.name}`,
    `<nav><a href="/internal/leads">All leads</a></nav>
<h1>${escapeHtml(lead.name)}${testBadge(lead)}</h1>
<dl>
${fields}
</dl>
<h2>Message</h2>
<pre>${escapeHtml(lead.message)}</pre>
${context}
<h2>Emails</h2>
${table(
  'Emails',
  EMAIL_COLUMNS.map(([label]) => label),
  emails.map(
    (email) =>
      `<tr>${EMAIL_COLUMNS.map(([, cell]) => cell(email)).join('')}</tr>`,
  ),
)}`,
  );
}

function csvCell(value: unknown): string {
  const text =
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replaceAll('"', '""')}"`;
}

const CSV_COLUMNS = Object.entries(EXPORT_SHAPE);

export function leadsCsv(
  leads: readonly ExportRow[],
  truncated: boolean,
): string {
  const lines = [
    CSV_COLUMNS.map(([key]) => csvCell(key)).join(','),
    ...leads.map((lead) =>
      CSV_COLUMNS.map(([key, kind]) =>
        csvCell(
          kind === 'time' && typeof lead[key] === 'number'
            ? isoTime(lead[key])
            : lead[key],
        ),
      ).join(','),
    ),
  ];
  if (truncated) {
    lines.push(csvCell(`# Truncated: only the newest ${CSV_MAX_ROWS} leads`));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: privateHeaders('text/html; charset=utf-8'),
  });
}

export function csvResponse(csv: string, now: number): Response {
  const headers = privateHeaders('text/csv; charset=utf-8');
  headers.set(
    'Content-Disposition',
    `attachment; filename="zenetlabs-leads-${isoTime(now).slice(0, 10)}.csv"`,
  );
  return new Response(csv, { headers });
}
