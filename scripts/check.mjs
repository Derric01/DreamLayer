import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const files = [];
for (const dir of ['src', 'scripts', 'tests']) for (const file of await readdir(dir)) if (/\.m?js$/.test(file)) files.push(resolve(dir, file));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(1); }
}
const html = await readFile('index.html', 'utf8');
if (/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(html)) throw new Error('Game must not depend on an external runtime');
console.log(`Syntax checked ${files.length} JavaScript files. Game entry has no external dependencies.`);
