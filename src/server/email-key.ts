const GMAIL = new Set(['gmail.com', 'googlemail.com']);

// The mailbox an address reaches, only for counting: `+tag` goes, and Gmail
// ignores dots and answers on both of its domains. Never used to send.
export function emailKey(email: string): string {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf('@');
  if (at < 1) return lower;
  let local = lower.slice(0, at);
  let domain = lower.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);
  if (GMAIL.has(domain)) {
    local = local.replaceAll('.', '');
    domain = 'gmail.com';
  }
  return `${local}@${domain}`;
}
