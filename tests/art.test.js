import test from 'node:test';
import assert from 'node:assert/strict';
import { loadArtwork } from '../src/art.js';

const manifest = assets => async () => ({ ok: true, json: async () => ({ assets }) });
const image = success => () => ({ naturalWidth: success ? 600 : 0, naturalHeight: success ? 400 : 0, set src(_) { queueMicrotask(() => success ? this.onload?.() : this.onerror?.()); } });
test('valid bundled images upgrade their slots without remote requests', async () => {
  const loaded = [];
  const result = await loadArtwork({ fetcher: manifest([{ id: 'ocean', file: 'ocean.png' }, { id: 'sky', file: 'sky.png' }]), imageFactory: image(true), onAsset: id => loaded.push(id) });
  assert.deepEqual(result, ['ocean', 'sky']); assert.deepEqual(loaded, result);
});
test('authentication, rate limit, server failure, malformed data and offline errors preserve fallback', async () => {
  for (const status of [401, 429, 500, 503]) assert.deepEqual(await loadArtwork({ fetcher: async () => ({ ok: false, status }) }), []);
  assert.deepEqual(await loadArtwork({ fetcher: async () => { throw new Error('Offline'); } }), []);
  assert.deepEqual(await loadArtwork({ fetcher: async () => ({ ok: true, json: async () => { throw new Error('Bad JSON'); } }) }), []);
  assert.deepEqual(await loadArtwork({ fetcher: async () => ({ ok: true, json: async () => ({ assets: 'invalid' }) }) }), []);
});
test('hung fetches and decoding finish within a bounded deadline', async () => {
  let signal;
  assert.deepEqual(await loadArtwork({ timeoutMs: 20, fetcher: (_, options) => { signal = options.signal; return new Promise(() => {}); } }), []);
  assert.equal(signal.aborted, true);
  assert.deepEqual(await loadArtwork({ timeoutMs: 20, fetcher: manifest([{ id: 'ocean', file: 'ocean.png' }]), imageFactory: () => ({ set src(_) {} }) }), []);
});
test('corrupt images, invalid asset paths and failed upgrades cannot strand startup', async () => {
  assert.deepEqual(await loadArtwork({ fetcher: manifest([{ id: 'ocean', file: 'ocean.png' }]), imageFactory: image(false) }), []);
  assert.deepEqual(await loadArtwork({ fetcher: manifest([{ id: 'ocean', file: 'https://example.com/ocean.png' }, { id: 'forest', file: '../.env.local' }]), imageFactory: () => { throw new Error('Must not request untrusted assets'); } }), []);
  assert.deepEqual(await loadArtwork({ fetcher: manifest([{ id: 'ocean', file: 'ocean.png' }]), imageFactory: image(true), onAsset: () => { throw new Error('Invalid upgrade'); } }), []);
});
