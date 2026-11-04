import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = normalize(join(process.cwd(), 'dist/apps/catalogo-ui/browser'));
const port = 4300;

const mime = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  let file = normalize(join(root, url.pathname));

  if (! file.startsWith(root) || ! existsSync(file) || statSync(file).isDirectory()) {
    file = join(root, 'index.html');
  }

  response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
  createReadStream(file)
    .on('error', () => {
      response.statusCode = 500;
      response.end('No se pudo leer el catálogo.');
    })
    .pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Catálogo en http://127.0.0.1:${port}`));
