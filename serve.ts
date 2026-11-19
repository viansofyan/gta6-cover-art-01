// Neon Coast Cover Studio — tiny local static server for testing.
// Serves the app/ directory next to this file on localhost. Standard
// library only, no dependencies, no logging of request bodies.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, 'app');
const port = Number(process.env.PORT || 8080);

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer((request, response) => {
  const rawPath = decodeURIComponent(request.url?.split('?')[0] || '/');
  const safePath = rawPath === '/' ? '/index.html' : rawPath;
  const filePath = join(appDir, safePath);
  if (!filePath.startsWith(appDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found\n');
    return;
  }
  response.writeHead(200, {
    'content-type': types[extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  response.end(readFileSync(filePath));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Neon Coast Cover Studio at http://localhost:${port}/`);
});
