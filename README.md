# POSTMARK

Borrow a world from a postage stamp. Work the night shift at an impossible post office and deliver four letters with Ocean, Forest, and Sky.

A short puzzle platformer with reusable world stamps, a fold dash, three contextual abilities, twelve optional memories, and a complete journey home. The game fills its viewport; phones follow the courier, while selecting a stamp opens the whole-room map. There are no lives or time limits.

## Play locally

Requires Node.js 22.12 or newer. No dependency installation is needed for the game.

```sh
npm run dev
```

Open http://127.0.0.1:4173. On Windows PowerShell with script execution restricted, use `npm.cmd`.

| Action | Controls |
| --- | --- |
| Move | A / D or arrows |
| Jump; release early for a shorter hop | Space / W / Up |
| Fold dash | Shift / X |
| Borrowed-world ability | F |
| Select Ocean / Forest / Sky | 1 / 2 / 3, or the stamp tray |
| Place a stamp | Click its frame or world region; drag from the tray |
| Select a frame; place | Q / E; Enter |
| Reclaim a stamp | Backspace, tray button, or right-click |
| Undo a stamp move | Z or tray button |
| Whole-room map | M or Map |
| Pause / resume | Escape or Pause |
| Restart this letter | R or the pause menu |
| Fullscreen; optional sound | Header controls |

Touch controls support simultaneous movement and jumping. Dash and world abilities have their own tray buttons. Native fullscreen depends on the browser and embedding permissions; the game also adapts to its ordinary viewport.

## Borrowed worlds and movement

Ocean waits for you to board its floating crate, then raises it; inside its field, **Tide vault** launches the courier. Forest creates a one-way root bridge; standing on it unlocks **Root spring**. Sky reverses gravity inside its marked region; **Sky release** briefly restores normal gravity so you can drop before gravity returns.

Chain a vault or spring into a dash, or dash out of a gravity field. Landing, a world pulse, a gravity change, and finding a memory recharge the air dash. Buffered jumps and a short grace period at ledges make controls forgiving. Optional glowing memories give each room an additional movement route.

Each stamp exists in one frame at a time. Moving Forest removes its old bridge. Selecting a stamp previews its effect without changing physics. Undo restores up to 64 previous stamp placements without rewinding the courier.

Lantern checkpoints in the Forest and Home rooms remember safe ground. A fall preserves collected memories and returns you immediately; the start respawn also resets Ocean so a raised lift cannot strand you. Restart resets the room. Help and Pause freeze simulation and clear held input. Room progress and shift totals are saved when browser storage is available. The final letter shows your memories and safe returns, then offers a fresh shift.

## Presentation and performance

A dark postal desk, illustrated stamp worlds, paper courier, warm home window, letter transitions, seeded particles, dash afterimages, landing squash, gravity feedback, and restrained impact shake support the action. Audio is synthesized locally and optional. Reduced motion suppresses particles, trails, shake, and cosmetic movement while retaining readable gameplay.

Simulation runs at a fixed 60 Hz with render interpolation and bounded catch-up. Landscape art and room scenes are cached. Particles, rings, trails, and pixel density are capped. There are no runtime dependencies, remote fonts, analytics, or live image-generation calls.

## DreamLayer and reliable fallback

**Current provenance is authoritative in `assets/manifest.json`.** The configured key authenticates, but its latest available API balance is zero. No credits have been spent and no DreamLayer images have been generated. The playable build uses original procedural artwork; the jam's DreamLayer requirement still needs actual generated assets.

The API creates landscape art during development. Players need no key, account, or credits. The three resulting PNGs are used both in the stamp tray and inside the playable fields.

1. Copy `.env.example` to ignored `.env.local`, then set `DREAMLAYER_API_KEY` there or in your environment. Never put a key in browser code, commits, or chat.
2. Run `npm run art:check`. The development script uses the official `dreamlayer@0.3.0` CLI, with its npm cache in ignored project artifacts. Balance and capability checks do not generate images.
3. Run `npm run art:generate` once credits are available. The initial batch is three ordinary operations, up to three credits: an Ocean master, then Forest and Sky edits using that master. Saved outputs are reused; failures are not automatically retried. Stable request identities and sanitized local logs support recovery.
4. Inspect the PNGs and provenance in the manifest, then rebuild and rerun browser validation.

Prompts are in `assets/prompts.json`. The generation workflow follows the official [DreamLayer CLI guide](https://docs.dreamlayer.io/cli); completing an actual generation remains unverified with the current zero-credit account.

The local deterministic landscapes and effects are visible immediately. Artwork loads asynchronously as an enhancement, with a 2.5-second deadline for the manifest and each image. Missing art, HTTP errors, rate limits, malformed data, corrupt images, slow responses, or unavailable storage leave the game playable. Browser code loads only validated local filenames and never sends credentials to the API. An API outage during development therefore cannot interrupt a player's game.

## Validate and package

```sh
npm test
npm run check
npm run build
npm run test:browser
```

The 37 deterministic tests cover all four original solutions, all twelve optional memories, dash and variable jumps, contextual abilities, one-way roots, swept collisions, undo, checkpoints, recovery, early Ocean placement, independent world-launch arcs, and bounded artwork failure handling.

The packaged-browser harness plays all four deliveries through actual keyboard input, exercises pointer dragging, abilities, undo, native fullscreen, pause, victory/replay, multi-touch, reduced motion, unavailable storage, and art fault injection. It checks laptop, ultrawide, phone, landscape, and tablet layouts, captures screenshots, and records draw-call and animation-frame timings in ignored `artifacts/browser-results.json`.

On Windows the browser harness requires Chrome/Edge, Python, and `websocket-client`. Set `POSTMARK_CHROME` or `POSTMARK_PYTHON` if needed. Each run uses its own test profile and debugging port; tooling is never packaged. Mobile checks use browser emulation, not physical devices.

`dist/postmark-itch.zip` contains root `index.html`, all six game modules, styles, and local assets. Environment files and development tooling are excluded. `npm run dev -- --dist` serves the upload for review. The build reports pending DreamLayer art honestly.

## Submission

Use `docs/itch-submission.md` for the itch.io description after completing its art provenance section. Upload the ZIP as an HTML game, choose “This file will be played in the browser,” and enable fullscreen and a resizable viewport. A 1280 × 800 embed is a useful desktop starting point. Test the uploaded build before submitting. Publishing, merging, deploying, and jam submission require the owner's instruction.

## Architecture and limits

`src/engine.js` holds DOM-independent physics, `src/levels.js` holds four authored rooms, `src/renderer.js` draws the world, `src/art.js` validates optional bundled imagery, `src/main.js` handles controls and flow, and `src/audio.js` synthesizes cues. Node built-ins serve, check, and package the game.

This is a visual spatial platformer with keyboard/touch alternatives, visible focus, readable controls, shape/text stamp identifiers, and reduced-motion support. It has no nonvisual mode. Fullscreen, audio, and device performance depend on the host browser.
