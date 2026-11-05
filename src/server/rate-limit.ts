export type Limiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export async function isLimited(
  limiter: Limiter,
  key: string,
  label: string,
): Promise<boolean> {
  try {
    const { success } = await limiter.limit({ key });
    return !success;
  } catch {
    console.error(`${label}: limiter unavailable`);
    return false;
  }
}

// An IPv6 visitor usually holds a whole /64, so the /64 counts as one address.
// IPv4 (and an IPv4-mapped IPv6 address) is used as it is.
export function ipBucket(ip: string): string {
  if (!ip.includes(':')) return ip;
  const mapped = /:(\d+\.\d+\.\d+\.\d+)$/.exec(ip)?.[1];
  if (mapped) return mapped;
  const [head = '', tail = ''] = ip.toLowerCase().split('::');
  const left = head === '' ? [] : head.split(':');
  const right = tail === '' ? [] : tail.split(':');
  const groups = ip.includes('::')
    ? [
        ...left,
        ...Array.from({ length: 8 - left.length - right.length }, () => '0'),
        ...right,
      ]
    : left;
  const prefix = groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, '') || '0');
  return `${prefix.join(':')}::/64`;
}
