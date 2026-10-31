import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import { textResponse } from '@/server/responses';
import type { AccessConfig } from '../../site.config';

const remote = new Map<string, JWTVerifyGetKey>();

function remoteKeys(teamDomain: string): JWTVerifyGetKey {
  const known = remote.get(teamDomain);
  if (known) return known;
  const created = createRemoteJWKSet(
    new URL('/cdn-cgi/access/certs', teamDomain),
  );
  remote.set(teamDomain, created);
  return created;
}

export async function accessGate(
  request: Request,
  config: AccessConfig | null,
  keys?: JWTVerifyGetKey,
): Promise<Response | null> {
  if (config === null) return textResponse('Not found', 404);
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return textResponse('Forbidden', 403);
  try {
    await jwtVerify(token, keys ?? remoteKeys(config.teamDomain), {
      issuer: config.teamDomain,
      audience: config.aud,
      algorithms: ['RS256'],
      requiredClaims: ['exp'],
    });
    return null;
  } catch {
    return textResponse('Forbidden', 403);
  }
}
