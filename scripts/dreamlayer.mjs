import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';

// This development script is never copied into the browser build.
const command = process.argv[2] || 'check';
let key = process.env.DREAMLAYER_API_KEY;
if (!key) {
  try {
    const text = await readFile('.env.local', 'utf8');
    key = text.match(/^\s*DREAMLAYER_API_KEY\s*=\s*(.*?)\s*$/m)?.[1]?.replace(/^(["'])(.*)\1$/, '$2');
  } catch {}
}
if (!key || key.includes('your_key') || key.includes('your-key')) {
  console.error('DreamLayer key is not configured. Copy .env.example to .env.local, set DREAMLAYER_API_KEY locally, then rerun. Never paste the key into chat.');
  process.exit(1);
}
if (!['check', 'generate'].includes(command)) throw new Error('Use check or generate');
await mkdir('artifacts/dreamlayer', { recursive: true });
const npx = join(dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js');
await access(npx).catch(() => { throw new Error('Could not locate npm. Run this script with the Node.js distribution that includes npm.'); });
const sanitize = text => text.split(key).join('[REDACTED]').replace(/dlr_live_[A-Za-z0-9_-]+/g, '[REDACTED]');
async function cli(args, logName) {
  const output = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npx, '--yes', '--package=dreamlayer@0.3.0', 'dreamlayer', ...args, '--json'], { shell: false, windowsHide: true, env: { ...process.env, DREAMLAYER_API_KEY: key, npm_config_cache: resolve('artifacts/npm-cache') } });
    let stdout = '', stderr = '';
    child.stdout.on('data', c => { stdout += c; }); child.stderr.on('data', c => { stderr += c; }); child.on('error', reject);
    child.on('close', code => resolve({ code, stdout: sanitize(stdout), stderr: sanitize(stderr) }));
  });
  await writeFile(`artifacts/dreamlayer/${logName}.json`, JSON.stringify(output, null, 2));
  if (output.code !== 0) throw new Error(`DreamLayer ${args[0]} failed. ${output.stderr.slice(-1500)} ${output.stdout.slice(-1500)}`);
  return output;
}
function jsonValues(text) {
  const values = [];
  try { values.push(JSON.parse(text)); } catch { for (const line of text.split(/\r?\n/)) { try { values.push(JSON.parse(line)); } catch {} } }
  return values;
}
function executionId(value) {
  if (!value || typeof value !== 'object') return null;
  for (const [k, v] of Object.entries(value)) if (['execution_id', 'executionId'].includes(k) && typeof v === 'string') return v;
  for (const v of Object.values(value)) { const found = executionId(v); if (found) return found; }
  return null;
}
const balance = await cli(['balance'], 'balance');
const capabilities = await cli(['capabilities'], 'capabilities');
console.log('DreamLayer connection verified. Balance and capabilities checked without generating an image.');
for (const value of jsonValues(balance.stdout)) console.log(JSON.stringify(value));
if (command === 'check') { console.log('Run npm run art:generate for a bounded batch of three ordinary images (up to 3 credits).'); process.exit(0); }

const prompts = JSON.parse(await readFile('assets/prompts.json', 'utf8'));
const manifest = JSON.parse(await readFile('assets/manifest.json', 'utf8'));
const credits = jsonValues(balance.stdout).find(value => Number.isSafeInteger(value?.available))?.available;
const needed = prompts.filter(asset => !manifest.assets.some(saved => saved.id === asset.id)).length;
if (!Number.isSafeInteger(credits) || credits < needed) throw new Error(`This batch needs ${needed} available credits. No generation was started.`);
const ops = jsonValues(capabilities.stdout).find(value => Array.isArray(value?.operations))?.operations;
if (!ops || !['text_to_image', 'image_to_image'].every(op => ops.includes(op))) throw new Error('The account does not advertise both required image operations. No generation was started.');
console.log('Generating the three stamp landscapes. Existing validated outputs are reused. No automatic billable retries.');
for (const asset of prompts) {
  const file = `${asset.id}.png`, destination = `assets/${file}`, request = `postmark-${asset.id}-v1`;
  if (manifest.assets.some(a => a.id === asset.id)) {
    const png = await readFile(destination); if (png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) { console.log(`${asset.id}: reusing saved artwork.`); continue; }
    throw new Error(`${asset.id}: manifest points to an invalid PNG. Inspect the original execution before regenerating.`);
  }
  const args = asset.id === 'ocean'
    ? ['generate', asset.prompt, '--aspect', '4:3', '--out', destination, '--idempotency-key', request]
    : ['edit', 'assets/ocean.png', asset.prompt, '--out', destination, '--idempotency-key', request];
  console.log(`${asset.id}: ${asset.id === 'ocean' ? 'generating master illustration' : 'editing from the saved Ocean reference'}…`);
  const result = await cli(args, asset.id);
  const png = await readFile(destination);
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${asset.id}: output is not a PNG`);
  const id = jsonValues(result.stdout).map(executionId).find(Boolean) ?? null;
  manifest.assets.push({ id: asset.id, file, source: 'DreamLayer', operation: asset.id === 'ocean' ? 'text_to_image' : 'image_to_image', reference: asset.id === 'ocean' ? null : 'ocean.png', prompt: asset.prompt, execution_id: id, idempotency_key: request, generated_at: new Date().toISOString(), provenance_log: `artifacts/dreamlayer/${asset.id}.json` });
  manifest.status = manifest.assets.length === 3 ? 'dreamlayer-art-integrated' : 'partial-dreamlayer-generation';
  manifest.notes = 'DreamLayer-generated stamp landscapes. The character, platforms, roots, water effects, paper texture, interface, and audio are authored in code.';
  await writeFile('assets/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${asset.id}: saved and recorded${id ? ` (execution ${id})` : '. Execution detail is preserved in the local provenance log'}.`);
}
await cli(['balance'], 'balance-after');
console.log('Artwork integrated. Run npm run build and npm run test:browser to validate the updated submission.');
