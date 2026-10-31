// @vitest-environment node
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  type JWTVerifyGetKey,
  SignJWT,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { accessGate } from '@/server/access';

const CONFIG = {
  teamDomain: 'https://team.cloudflareaccess.com',
  aud: 'aud-1',
};

type Keys = Awaited<ReturnType<typeof generateKeyPair>>;
let pair: Keys;
let stranger: Keys;
let keys: JWTVerifyGetKey;

async function publicJwk(key: Keys['publicKey']): Promise<JWK> {
  return { ...(await exportJWK(key)), kid: 'k1', alg: 'RS256', use: 'sig' };
}

beforeAll(async () => {
  pair = await generateKeyPair('RS256');
  stranger = await generateKeyPair('RS256');
  keys = createLocalJWKSet({ keys: [await publicJwk(pair.publicKey)] });
});

type Claims = {
  aud?: string;
  iss?: string;
  exp?: string | number;
  nbf?: string | number;
};

function sign(
  claims: Claims = {},
  kid = 'k1',
  key: Keys['privateKey'] = pair.privateKey,
) {
  const jwt = new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid })
    .setAudience(claims.aud ?? CONFIG.aud)
    .setIssuer(claims.iss ?? CONFIG.teamDomain)
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? '10m');
  if (claims.nbf !== undefined) jwt.setNotBefore(claims.nbf);
  return jwt.sign(key);
}

function request(token?: string): Request {
  return new Request('https://zenetlabs.com/internal/leads', {
    headers: token ? { 'cf-access-jwt-assertion': token } : {},
  });
}

async function status(token?: string, config: typeof CONFIG | null = CONFIG) {
  return (await accessGate(request(token), config, keys))?.status ?? null;
}

describe('accessGate', () => {
  it('allows a valid token', async () => {
    expect(await status(await sign())).toBeNull();
  });

  it('answers 404 without Access config, even with a token', async () => {
    expect(await status(await sign(), null)).toBe(404);
    expect(await status(undefined, null)).toBe(404);
  });

  it('answers 403 without the header', async () => {
    const response = await accessGate(request(), CONFIG, keys);
    expect(response?.status).toBe(403);
    expect(await response?.text()).toBe('Forbidden');
    expect(response?.headers.get('cache-control')).toBe('no-store');
  });

  it.each([
    ['the wrong audience', { aud: 'other' }],
    ['the wrong issuer', { iss: 'https://evil.cloudflareaccess.com' }],
    ['an expired token', { exp: Math.floor(Date.now() / 1000) - 3600 }],
    [
      'a token that is not valid yet',
      { nbf: Math.floor(Date.now() / 1000) + 3600 },
    ],
  ])('answers 403 for %s', async (_label, claims) => {
    expect(await status(await sign(claims))).toBe(403);
  });

  it('answers 403 for an unknown kid', async () => {
    expect(await status(await sign({}, 'other'))).toBe(403);
  });

  it('answers 403 for a token signed by another key under a known kid', async () => {
    expect(await status(await sign({}, 'k1', stranger.privateKey))).toBe(403);
  });

  it('answers 403 for a token without an expiry', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setAudience(CONFIG.aud)
      .setIssuer(CONFIG.teamDomain)
      .sign(pair.privateKey);
    expect(await status(token)).toBe(403);
  });

  it('answers 403 for an HS256 token that reuses the kid', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', kid: 'k1' })
      .setAudience(CONFIG.aud)
      .setIssuer(CONFIG.teamDomain)
      .setExpirationTime('10m')
      .sign(new TextEncoder().encode('a-shared-secret-of-sufficient-len'));
    expect(await status(token)).toBe(403);
  });

  it('answers 403 for an unsigned token and for garbage', async () => {
    const header = Buffer.from('{"alg":"none"}').toString('base64url');
    const body = Buffer.from(
      JSON.stringify({ aud: CONFIG.aud, iss: CONFIG.teamDomain }),
    ).toString('base64url');
    expect(await status(`${header}.${body}.`)).toBe(403);
    expect(await status('not.a.jwt')).toBe(403);
    expect(await status('x')).toBe(403);
  });

  it('fails closed when the key set cannot be fetched', async () => {
    const broken: JWTVerifyGetKey = () => {
      throw new Error('jwks unavailable');
    };
    const response = await accessGate(request(await sign()), CONFIG, broken);
    expect(response?.status).toBe(403);
  });
});
