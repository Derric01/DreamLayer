const WORLDS = ['ocean', 'forest', 'sky'];

// Local art is visible immediately. Valid bundled artwork only upgrades a slot.
export async function loadArtwork({ fetcher = fetch, imageFactory = () => new Image(), timeoutMs = 2500, onAsset = () => {} } = {}) {
  const controller = new AbortController(); let timer;
  try {
    const manifest = await Promise.race([
      (async () => {
        const response = await fetcher('./assets/manifest.json', { signal: controller.signal });
        if (!response.ok) throw new Error('Artwork unavailable');
        return response.json();
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Artwork deadline')); }, timeoutMs); })
    ]);
    clearTimeout(timer);
    if (!Array.isArray(manifest?.assets)) return [];
    const slots = manifest.assets.filter(a => WORLDS.includes(a?.id) && a.file === `${a.id}.png`).slice(0, 3);
    const results = await Promise.all(slots.map(asset => new Promise(resolve => {
      const picture = imageFactory(); let done = false;
      const finish = valid => {
        if (done) return; done = true; clearTimeout(deadline); picture.onload = picture.onerror = null;
        if (valid && picture.naturalWidth > 0 && picture.naturalHeight > 0) { try { onAsset(asset.id, picture); resolve(asset.id); } catch { resolve(null); } }
        else resolve(null);
      };
      const deadline = setTimeout(() => finish(false), timeoutMs);
      picture.onload = () => finish(true); picture.onerror = () => finish(false);
      picture.src = `./assets/${asset.file}`;
    })));
    return results.filter(Boolean);
  } catch { return []; }
  finally { clearTimeout(timer); }
}
