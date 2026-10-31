// Local stand-ins for Resend and Cloudflare Access, used by e2e and manual tests.
// Never used by CI deploys or production builds. Listens on :4175.
import http from 'node:http';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const PORT = 4175;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const KID = 'fake-access-key';
const DEFAULT_AUD = 'local-access-aud';

const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = {
  ...(await exportJWK(publicKey)),
  kid: KID,
  alg: 'RS256',
  use: 'sig',
};

const attempts = [];
const replays = new Map();
const failures = [];
let counter = 0;

function readBody(request) {
  return new Promise((resolve) => {
    let text = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      text += chunk;
    });
    request.on('end', () => resolve(text));
  });
}

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function consumeFailure(entry) {
  const rule = failures.find(
    (candidate) =>
      candidate.remaining > 0 &&
      (candidate.match === '' ||
        entry.to?.includes(candidate.match) ||
        entry.replyTo?.includes(candidate.match)),
  );
  if (!rule) return false;
  rule.remaining -= 1;
  return true;
}

async function handleEmail(request, response) {
  const body = parse(await readBody(request));
  const key = request.headers['idempotency-key'] ?? '';
  const authorised = /^Bearer \S+$/.test(request.headers.authorization ?? '');
  const entry = {
    at: Date.now(),
    idempotencyKey: key,
    authorised,
    to: body?.to?.[0] ?? null,
    replyTo: body?.reply_to?.[0] ?? null,
    from: body?.from ?? null,
    subject: body?.subject ?? null,
    text: body?.text ?? null,
    status: 200,
    id: null,
  };
  if (!authorised) {
    entry.status = 401;
  } else if (consumeFailure(entry)) {
    entry.status = 500;
  } else if (key && replays.has(key)) {
    entry.id = replays.get(key);
  } else {
    counter += 1;
    entry.id = `fake_${counter}`;
    if (key) replays.set(key, entry.id);
  }
  attempts.push(entry);
  if (entry.status === 200) return send(response, 200, { id: entry.id });
  return send(response, entry.status, {
    name: entry.status === 401 ? 'missing_api_key' : 'internal_server_error',
    message: 'fake failure',
  });
}

async function mintToken(request, response) {
  const options = parse(await readBody(request)) ?? {};
  const token = await new SignJWT({ email: 'owner@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setAudience(options.aud ?? DEFAULT_AUD)
    .setIssuer(options.iss ?? ORIGIN)
    .setIssuedAt()
    .setExpirationTime(options.exp ?? '10m')
    .sign(privateKey);
  send(response, 200, { token });
}

const server = http.createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', ORIGIN);
  const route = `${request.method} ${pathname}`;
  if (route === 'GET /__health') return send(response, 200, { ok: true });
  if (route === 'POST /emails') return handleEmail(request, response);
  if (route === 'GET /__sent') {
    return send(
      response,
      200,
      attempts.filter((a) => a.status === 200),
    );
  }
  if (route === 'GET /__attempts') return send(response, 200, attempts);
  if (route === 'DELETE /__sent') {
    attempts.length = 0;
    replays.clear();
    failures.length = 0;
    return send(response, 200, { ok: true });
  }
  if (route === 'POST /__fail') {
    const options = parse(await readBody(request)) ?? {};
    failures.push({
      remaining: Number(options.count) || 0,
      match: typeof options.match === 'string' ? options.match : '',
    });
    return send(response, 200, { rules: failures.length });
  }
  if (route === 'GET /cdn-cgi/access/certs') {
    return send(response, 200, { keys: [jwk] });
  }
  if (route === 'POST /__access/token') return mintToken(request, response);
  return send(response, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log('fake services ready'));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
