export const QUARTER_SECOND_MS = 250;
export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function noop(): void {}

// The UTC calendar day of an instant, as `YYYY-MM-DD`.
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function startOfUtcDay(now: number): number {
  return Math.floor(now / DAY_MS) * DAY_MS;
}
