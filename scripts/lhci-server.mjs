// Emulates edge brotli compression so local and CI Lighthouse scores match what visitors get.
import { spawn } from 'node:child_process';
import http from 'node:http';
import zlib from 'node:zlib';

const PREVIEW_PORT = 4173;
const PROXY_PORT = 4174;
const COMPRESSIBLE = /text|javascript|json|svg|xml/;

const preview = spawn('pnpm', ['preview'], { stdio: 'inherit' });
preview.on('exit', (code) => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    preview.kill(signal);
    process.exit(0);
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
        delete headers['content-length'];
        headers['content-encoding'] = 'br';
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
