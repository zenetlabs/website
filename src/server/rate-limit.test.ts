import { describe, expect, it } from 'vitest';
import { ipBucket } from '@/server/rate-limit';

describe('ipBucket', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['2001:db8:85a3:0000:1111:2222:3333:4444', '2001:db8:85a3:0::/64'],
    ['2001:DB8:85A3::1', '2001:db8:85a3:0::/64'],
    ['2001:db8::', '2001:db8:0:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['::ffff:198.51.100.4', '198.51.100.4'],
  ])('%s counts as %s', (ip, bucket) => {
    expect(ipBucket(ip)).toBe(bucket);
  });

  it('puts two addresses of one /64 in one bucket', () => {
    expect(ipBucket('2001:db8:1:2:aaaa::1')).toBe(
      ipBucket('2001:db8:1:2:bbbb:cccc:dddd:eeee'),
    );
    expect(ipBucket('2001:db8:1:2::1')).not.toBe(ipBucket('2001:db8:1:3::1'));
  });
});
