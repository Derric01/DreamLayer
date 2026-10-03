import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const root = resolve(base, args.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.POSTMARK_PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), pathname = decodeURIComponent(url.pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    // An explicit public-file allowlist keeps local keys, Git data, and scripts private.
    if (!/^(index\.html|styles\.css|src\/[a-z-]+\.js|assets\/[a-z0-9._/-]+)$/.test(relative) || relative.includes('..')) { res.writeHead(404).end('Not found'); return; }
    const absolute = resolve(root, relative); if (!absolute.startsWith(root + sep)) { res.writeHead(404).end('Not found'); return; }
    const data = await readFile(absolute); res.writeHead(200, { 'Content-Type': types[extname(absolute)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => process.stdout.write(`POSTMARK running at http://127.0.0.1:${port}\n`));
server.on('error', error => { process.stderr.write(`Could not start POSTMARK: ${error.code}\n`); process.exitCode = 1; });
