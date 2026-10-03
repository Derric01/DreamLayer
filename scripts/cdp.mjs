import { spawn } from 'node:child_process';
import { mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const wait = ms => new Promise(r => setTimeout(r, ms));
export async function browser(port = 9227) {
  const chromePaths = [process.env.POSTMARK_CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  let chrome;
  for (const path of chromePaths) { try { await access(path); chrome = path; break; } catch {} }
  if (!chrome) throw new Error('Chrome or Edge is required. Set POSTMARK_CHROME to its executable.');
  const profile = resolve(`artifacts/browser-${port}`); await mkdir(profile, { recursive: true });
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let target;
  for (let i = 0; i < 80; i++) { try { const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()); target = pages.find(p => p.type === 'page'); if (target) break; } catch {} await wait(100); }
  if (!target) { proc.kill(); throw new Error('Browser did not expose its debugging endpoint'); }
  const endpoint = new URL(target.webSocketDebuggerUrl); endpoint.hostname = '127.0.0.1';
  const bridge = spawn(process.env.POSTMARK_PYTHON || 'python', ['scripts/cdp-bridge.py', endpoint.href], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map(), events = [], errors = []; let next = 1;
  let transportError = '';
  bridge.stderr.on('data', chunk => { transportError += chunk.toString(); });
  createInterface({ input: bridge.stdout }).on('line', line => {
    const data = JSON.parse(line);
    if (data.id) { const handlers = pending.get(data.id); if (!handlers) return; clearTimeout(handlers.timeout); pending.delete(data.id); if (data.error) handlers.reject(new Error(data.error.message)); else handlers.resolve(data.result); }
    else { events.push(data); if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description ?? '')); }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = next++; const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}. ${transportError}`)); }, 12000); pending.set(id, { resolve, reject, timeout }); bridge.stdin.write(JSON.stringify({ id, method, params }) + '\n'); });
  const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; };
  try { await call('Runtime.enable'); await call('Page.enable'); }
  catch (error) { bridge.kill(); proc.kill(); throw error; }
  return { call, evaluate, events, errors, async close() { try { await call('Browser.close'); } catch {} bridge.kill(); if (proc.exitCode === null) proc.kill(); } };
}
export async function waitFor(check, description, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await check()) return; await wait(60); }
  throw new Error(`Timed out: ${description}`);
}
