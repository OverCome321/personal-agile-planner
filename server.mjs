import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405).end('Method not allowed');
    return;
  }
  const route = new URL(request.url, 'http://localhost');
  let name;
  try { name = decodeURIComponent(route.pathname); } catch { response.writeHead(400).end(); return; }
  const domain = path.resolve(root, '../src/domain.js');
  const file = name === '/domain.js' ? domain : path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep) && file !== domain) { response.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 8741), '127.0.0.1', () => console.log('Agile-планировщик: http://127.0.0.1:8741'));
