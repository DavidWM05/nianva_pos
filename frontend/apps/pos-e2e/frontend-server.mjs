import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const root = normalize(join(frontendRoot, 'dist/apps/pos/browser'));
const port = Number(process.env.POS_E2E_FRONTEND_PORT ?? '4301');
const backendPort = process.env.POS_E2E_BACKEND_PORT ?? '8100';

const mime = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);

  if (url.pathname === '/config.json') {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ apiBaseUrl: 'http://127.0.0.1:' + backendPort }));

    return;
  }

  let file = normalize(join(root, decodeURIComponent(url.pathname)));

  if (! file.startsWith(root) || ! existsSync(file) || statSync(file).isDirectory()) {
    file = join(root, 'index.html');
  }

  response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
  createReadStream(file)
    .on('error', () => {
      response.statusCode = 500;
      response.end('No se pudo leer el frontend de pos.');
    })
    .pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`POS en http://127.0.0.1:${port}`));
