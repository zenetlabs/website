// Emulates edge brotli compression so local and CI Lighthouse scores match what visitors get.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import zlib from 'node:zlib';

const PREVIEW_PORT = 4173;
const PROXY_PORT = 4174;
const FAKES_PORT = 4175;
const COMPRESSIBLE = /text|javascript|json|svg|xml/;
const ASSETS_DIR = new URL('../dist/client/assets/', import.meta.url);

if (!fs.existsSync(ASSETS_DIR)) {
  console.error(
    'lhci-server: dist/client/assets is missing, run pnpm build first',
  );
  process.exit(1);
}

// Hashed assets are compressed once, as the edge serves them from cache.

const precompressed = new Map(
  fs
    .readdirSync(ASSETS_DIR)
    .filter((name) => /\.(js|css|svg)$/.test(name))
    .map((name) => [
      `/assets/${name}`,
      zlib.brotliCompressSync(fs.readFileSync(new URL(name, ASSETS_DIR))),
    ]),
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
}

async function waitForFreePorts(ports, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const free = await Promise.all(ports.map(isFree));
    if (free.every(Boolean)) return;
    await sleep(100);
  }
}

await waitForFreePorts([PREVIEW_PORT, PROXY_PORT, FAKES_PORT], 15_000);

const fakes = spawn('node', ['scripts/fake-services.mjs'], {
  stdio: 'inherit',
});
const preview = spawn('pnpm', ['preview'], { stdio: 'inherit' });
let stopping = false;
preview.on('exit', (code) => {
  fakes.kill('SIGTERM');
  process.exit(stopping ? 0 : (code ?? 1));
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true;
    fakes.kill(signal);
    preview.kill(signal);
    setTimeout(() => process.exit(0), 5_000).unref();
  });
}

http
  .createServer((req, res) => {
    const upstream = http.request(
      {
        host: 'localhost',
        port: PREVIEW_PORT,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `localhost:${PREVIEW_PORT}`,
          'accept-encoding': 'identity',
        },
      },
      (response) => {
        const headers = { ...response.headers };
        if (!COMPRESSIBLE.test(headers['content-type'] ?? '')) {
          res.writeHead(response.statusCode ?? 502, headers);
          response.pipe(res);
          return;
        }
        headers['content-encoding'] = 'br';
        const cached =
          req.method === 'GET' &&
          response.statusCode === 200 &&
          precompressed.get(req.url ?? '');
        if (cached) {
          response.resume();
          headers['content-length'] = String(cached.length);
          res.writeHead(200, headers);
          res.end(cached);
          return;
        }
        delete headers['content-length'];
        res.writeHead(response.statusCode ?? 502, headers);
        response.pipe(zlib.createBrotliCompress()).pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  })
  .listen(PROXY_PORT, () => console.log('lhci proxy ready'));
