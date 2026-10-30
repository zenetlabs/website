export const PLACEHOLDER =
  /\bTODO\b|\[X\]|\[(?:EMAIL|SPANISH|LINKEDIN|GITHUB)\b|\[[A-Z][A-Z0-9]*_[A-Z0-9_]*\]|\b[Ll]orem\b/;

export function stringsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsOf);
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(stringsOf);
  }
  return [];
}
