export function isoTime(ms: number | null): string {
  return ms === null ? '' : new Date(ms).toISOString();
}

export function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
