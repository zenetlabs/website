// Local stand-ins for Resend, Cloudflare Access, Google (token + Calendar) and ElevenLabs (conversation token), used by e2e and manual tests.
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

const GOOGLE = '/__google';
const CALENDAR = `${GOOGLE}/calendar/v3`;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

const googleEvents = new Map();
const googleBusy = new Map();
const googleFailures = [];
const google = { tokens: 0, meets: 0, conference: 'success' };

function takeGoogleFailure(op) {
  const rule = googleFailures.find(
    (candidate) => candidate.op === op && candidate.remaining > 0,
  );
  if (!rule) return null;
  rule.remaining -= 1;
  return rule;
}

function googleError(response, status, reason, message = 'fake failure') {
  return send(response, status, {
    error: { code: status, message, errors: [{ reason }] },
  });
}

function decodePart(part) {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

async function googleToken(request, response) {
  const failure = takeGoogleFailure('token');
  if (failure) {
    return send(response, failure.status, {
      error: failure.error ?? 'unauthorized_client',
    });
  }
  const form = new URLSearchParams(await readBody(request));
  const parts = (form.get('assertion') ?? '').split('.');
  const header = parts.length === 3 ? decodePart(parts[0]) : undefined;
  const claims = parts.length === 3 ? decodePart(parts[1]) : undefined;
  const valid =
    form.get('grant_type') === 'urn:ietf:params:oauth:grant-type:jwt-bearer' &&
    header?.alg === 'RS256' &&
    typeof claims?.iss === 'string' &&
    typeof claims?.sub === 'string' &&
    claims?.scope === SCOPES.join(' ') &&
    claims?.aud === `${ORIGIN}${GOOGLE}/token` &&
    claims?.exp - claims?.iat <= 3600;
  if (!valid) return send(response, 400, { error: 'invalid_grant' });
  google.tokens += 1;
  return send(response, 200, {
    access_token: `fake-${google.tokens}`,
    expires_in: 3600,
  });
}

function isAuthorised(request) {
  return /^Bearer fake-\d+$/.test(request.headers.authorization ?? '');
}

function eventInterval(event) {
  return {
    start: new Date(event.start.dateTime).toISOString(),
    end: new Date(event.end.dateTime).toISOString(),
  };
}

function busyFor(calendarId) {
  const own = [...(googleEvents.get(calendarId)?.values() ?? [])].map(
    eventInterval,
  );
  return [...(googleBusy.get(calendarId) ?? []), ...own];
}

async function googleFreeBusy(request, response) {
  if (!isAuthorised(request)) return googleError(response, 401, 'authError');
  const failure = takeGoogleFailure('freebusy');
  if (failure) return googleError(response, failure.status, 'backendError');
  const body = parse(await readBody(request)) ?? {};
  const calendars = {};
  for (const item of body.items ?? []) {
    calendars[item.id] = { busy: busyFor(item.id) };
  }
  return send(response, 200, { calendars });
}

function eventResponse(event) {
  return {
    id: event.id,
    htmlLink: `https://calendar.google.com/calendar/event?eid=${event.id}`,
    hangoutLink: event.hangoutLink,
    conferenceData: {
      createRequest: { status: { statusCode: event.conferenceStatus } },
      entryPoints: event.hangoutLink
        ? [{ entryPointType: 'video', uri: event.hangoutLink }]
        : [],
    },
  };
}

async function googleInsert(request, response, calendarId, url) {
  if (!isAuthorised(request)) return googleError(response, 401, 'authError');
  const body = parse(await readBody(request)) ?? {};
  const failure = takeGoogleFailure('insert');
  if (failure) {
    if (failure.lost) storeEvent(calendarId, body);
    return googleError(response, failure.status, 'backendError');
  }
  const attendees = body.attendees ?? [];
  if (
    url.searchParams.get('conferenceDataVersion') !== '1' ||
    url.searchParams.get('sendUpdates') !== 'all' ||
    attendees.length !== 1 ||
    typeof attendees[0]?.email !== 'string'
  ) {
    return googleError(response, 400, 'invalid');
  }
  if (googleEvents.get(calendarId)?.has(body.id)) {
    return googleError(response, 409, 'duplicate');
  }
  return send(response, 200, eventResponse(storeEvent(calendarId, body)));
}

function storeEvent(calendarId, body) {
  const calendar = googleEvents.get(calendarId) ?? new Map();
  googleEvents.set(calendarId, calendar);
  const pending = google.conference === 'pending';
  if (!pending) google.meets += 1;
  const event = {
    ...body,
    calendarId,
    hangoutLink: pending
      ? undefined
      : `https://meet.google.com/fak-e${google.meets}`,
    conferenceStatus: pending ? 'pending' : 'success',
    reads: 0,
  };
  calendar.set(body.id, event);
  return event;
}

function googleGet(request, response, calendarId, eventId) {
  if (!isAuthorised(request)) return googleError(response, 401, 'authError');
  const event = googleEvents.get(calendarId)?.get(eventId);
  if (!event) return googleError(response, 404, 'notFound');
  event.reads += 1;
  if (event.conferenceStatus === 'pending' && event.reads >= 1) {
    google.meets += 1;
    event.hangoutLink = `https://meet.google.com/fak-e${google.meets}`;
    event.conferenceStatus = 'success';
  }
  return send(response, 200, eventResponse(event));
}

async function handleGoogle(request, response, url) {
  const { pathname } = url;
  const route = `${request.method} ${pathname}`;
  if (route === `POST ${GOOGLE}/token`) return googleToken(request, response);
  if (route === `POST ${CALENDAR}/freeBusy`) {
    return googleFreeBusy(request, response);
  }
  const insert = pathname.match(
    /^\/__google\/calendar\/v3\/calendars\/([^/]+)\/events$/,
  );
  if (insert && request.method === 'POST') {
    return googleInsert(request, response, decodeURIComponent(insert[1]), url);
  }
  const one = pathname.match(
    /^\/__google\/calendar\/v3\/calendars\/([^/]+)\/events\/([^/]+)$/,
  );
  if (one && request.method === 'GET') {
    return googleGet(
      request,
      response,
      decodeURIComponent(one[1]),
      decodeURIComponent(one[2]),
    );
  }
  if (route === `GET ${GOOGLE}/__events`) {
    return send(
      response,
      200,
      [...googleEvents.values()].flatMap((calendar) => [...calendar.values()]),
    );
  }
  if (route === `POST ${GOOGLE}/__busy`) {
    const options = parse(await readBody(request)) ?? {};
    googleBusy.set(options.calendarId, options.intervals ?? []);
    return send(response, 200, { ok: true });
  }
  if (route === `POST ${GOOGLE}/__fail`) {
    const options = parse(await readBody(request)) ?? {};
    googleFailures.push({
      op: options.op,
      status: Number(options.status) || 500,
      remaining: Number(options.count) || 0,
      error: options.error,
      lost: options.lost === true,
    });
    return send(response, 200, { rules: googleFailures.length });
  }
  if (route === `POST ${GOOGLE}/__mode`) {
    const options = parse(await readBody(request)) ?? {};
    google.conference =
      options.conference === 'pending' ? 'pending' : 'success';
    return send(response, 200, { ok: true });
  }
  if (route === `DELETE ${GOOGLE}/__state`) {
    googleEvents.clear();
    googleBusy.clear();
    googleFailures.length = 0;
    google.conference = 'success';
    return send(response, 200, { ok: true });
  }
  return send(response, 404, { error: 'not found' });
}

const ELEVENLABS = '/__elevenlabs';
const LOCAL_ELEVENLABS_KEY = 'local-elevenlabs-key';
const LOCAL_AGENTS = new Set(['local-agent-en', 'local-agent-es']);
const elevenLabsCalls = [];
const elevenLabsFailures = [];
let elevenLabsTokens = 0;

async function handleElevenLabs(request, response, url) {
  const { pathname } = url;
  const route = `${request.method} ${pathname.slice(ELEVENLABS.length)}`;
  if (route === 'GET /v1/convai/conversation/token') {
    const agentId = url.searchParams.get('agent_id') ?? '';
    elevenLabsCalls.push({
      agentId,
      keyPresent: Boolean(request.headers['xi-api-key']),
    });
    const failure = elevenLabsFailures.find((rule) => rule.remaining > 0);
    if (failure) {
      failure.remaining -= 1;
      return send(response, failure.status, { detail: 'fake failure' });
    }
    if (request.headers['xi-api-key'] !== LOCAL_ELEVENLABS_KEY) {
      return send(response, 401, { detail: 'invalid key' });
    }
    if (!LOCAL_AGENTS.has(agentId)) {
      return send(response, 404, { detail: 'unknown agent' });
    }
    elevenLabsTokens += 1;
    return send(response, 200, {
      token: `fake-voice-token-${elevenLabsTokens}`,
      conversation_id: `conv-local-${elevenLabsTokens}`,
    });
  }
  if (route === 'GET /__calls') return send(response, 200, elevenLabsCalls);
  if (route === 'POST /__fail') {
    const options = parse(await readBody(request)) ?? {};
    elevenLabsFailures.push({
      status: Number(options.status) || 500,
      remaining: Number(options.count) || 0,
    });
    return send(response, 200, { rules: elevenLabsFailures.length });
  }
  if (route === 'DELETE /__state') {
    elevenLabsCalls.length = 0;
    elevenLabsFailures.length = 0;
    return send(response, 200, { ok: true });
  }
  return send(response, 404, { error: 'not found' });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', ORIGIN);
  const { pathname } = url;
  if (pathname.startsWith(`${GOOGLE}/`)) {
    return handleGoogle(request, response, url);
  }
  if (pathname.startsWith(`${ELEVENLABS}/`)) {
    return handleElevenLabs(request, response, url);
  }
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
