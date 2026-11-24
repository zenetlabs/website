export const FAILURE_TTL_MS = 30_000;

type Entry<V> = { value: Promise<V>; failedAt: number | null };

// Memoises an async loader by key for the life of the isolate. A failure is
// remembered for a short while too, so a page that cannot be built is not
// rebuilt on every call, then it is tried again.
export function memoAsync<K, V>(
  load: (key: K) => Promise<V>,
  options: {
    keyOf?: (key: K) => string;
    failureTtlMs?: number;
    now?: () => number;
  } = {},
): (key: K) => Promise<V> {
  const {
    keyOf = String,
    failureTtlMs = FAILURE_TTL_MS,
    now = Date.now,
  } = options;
  const entries = new Map<string, Entry<V>>();
  return (key) => {
    const id = keyOf(key);
    const kept = entries.get(id);
    if (
      kept &&
      (kept.failedAt === null || now() - kept.failedAt < failureTtlMs)
    ) {
      return kept.value;
    }
    const value = load(key);
    const entry: Entry<V> = { value, failedAt: null };
    entries.set(id, entry);
    value.catch(() => {
      entry.failedAt = now();
    });
    return value;
  };
}
