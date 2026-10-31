const UNSAFE =
  /[\p{Cc}\p{Zl}\p{Zp}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u;

export function isSingleLine(value: string): boolean {
  return !UNSAFE.test(value);
}
