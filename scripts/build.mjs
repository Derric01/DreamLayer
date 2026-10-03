import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const manifest = JSON.parse(await readFile('assets/manifest.json', 'utf8'));
const files = ['index.html', 'styles.css', 'assets/favicon.svg', 'assets/manifest.json', 'src/main.js', 'src/engine.js', 'src/levels.js', 'src/renderer.js', 'src/audio.js', 'src/art.js'];
for (const asset of manifest.assets) {
  if (!/^[a-z0-9-]+\.png$/.test(asset.file)) throw new Error('Asset file must be a local PNG filename');
  files.push(`assets/${asset.file}`);
}
const entries = [];
for (const path of files) { await mkdir(dirname(`dist/${path}`), { recursive: true }); await copyFile(path, `dist/${path}`); entries.push({ path, data: await readFile(path) }); }

// A minimal uncompressed ZIP keeps packaging dependency-free and broadly compatible.
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(data) { let crc = 0xffffffff; for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
let offset = 0; const local = [], central = [];
for (const { path, data } of entries) {
  const name = Buffer.from(path), crc = crc32(data), header = Buffer.alloc(30), directory = Buffer.alloc(46);
  header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
  directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(data.length, 20); directory.writeUInt32LE(data.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42);
  local.push(header, name, data); central.push(directory, name); offset += header.length + name.length + data.length;
}
const centralData = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralData.length, 12); end.writeUInt32LE(offset, 16);
await writeFile('dist/postmark-itch.zip', Buffer.concat([...local, centralData, end]));
console.log(`Built ${entries.length} files and dist/postmark-itch.zip. Art status: ${manifest.status}.`);
if (!manifest.assets.length) console.log('DreamLayer artwork is still pending. This build is playable but not yet jam-ready.');
