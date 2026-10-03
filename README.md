# POSTMARK

A small puzzle game about postage stamps containing miniature worlds. Work the night shift at an impossible post office and deliver four letters by borrowing Ocean, Forest, and Sky.

## Play locally

Requires Node.js 22.12 or newer. No dependency installation is needed for the game.

```sh
npm run dev
```

Open http://127.0.0.1:4173. On Windows PowerShell with script execution restricted, use `npm.cmd` in place of `npm`.

- Move: A / D or arrow keys.
- Jump: Space / W / Up.
- Choose a stamp: click it, or press 1 / 2 / 3.
- Place: click its dotted frame, or drag it from the tray.
- Keyboard frames: Q / E select; Enter places.
- Reclaim: the tray button, Backspace, or right-click in the room.
- Restart room: R.
- Touch movement buttons appear on small screens or devices with coarse pointers.

Ocean raises a floating crate. Forest creates a bridge; moving it removes the previous bridge. Sky reverses gravity only inside its marked region. Help pauses the game. Falling returns you to the room start and resets Ocean so its lift remains accessible. Progress between letters is saved locally when the browser permits storage. Sound is optional and starts after an explicit interaction.

## DreamLayer art workflow

**Current provenance is authoritative in `assets/manifest.json`.** Until that manifest records real outputs, the game uses original procedural landscape fallback graphics and has not yet satisfied the jam's DreamLayer requirement.

1. Copy `.env.example` to `.env.local`. Set `DREAMLAYER_API_KEY` there, or provide it in your local environment. Do not put a key in browser code, a commit, or chat.
2. Run `npm run art:check`. The development script uses the official `dreamlayer@0.3.0` CLI through npm, with its cache scoped to ignored project artifacts. It checks balance and capabilities without image generation. This step needs network access.
3. Run `npm run art:generate`. The initial batch is three ordinary image operations, up to three credits: an Ocean master, then Forest and Sky edits using that master as a reference. Existing saved outputs are reused. Failed commands are not automatically retried; stable request identities and local logs preserve recovery information.
4. Inspect the three PNGs. Their prompts, operations, references, and available execution IDs are recorded in the manifest. The images appear both in the tray stamps and in their playable world regions. The game makes no live DreamLayer requests.
5. Rebuild and rerun browser validation after changing art.

The prompts are in `assets/prompts.json`. CLI behavior is based on the official [DreamLayer command-line guide](https://docs.dreamlayer.io/cli). The generation workflow is unverified until a configured account completes an actual request; CLI/API compatibility errors must be resolved against the installed version rather than hidden.

## Validate and package

```sh
npm test
npm run check
npm run build
npm run test:browser
```

Simulation tests exercise the complete routes through all four puzzles using real movement, including stamp reuse, gravity boundaries, and recovery. Syntax checks cover the game and Node tooling. The browser smoke test loads the packaged build in headless Chrome or Edge, checks controls, pointer placement, help, replay, mobile layout, and reduced motion, and saves screenshots to ignored `artifacts/`.

The Windows browser harness additionally requires Python and its `websocket-client` package. Set `POSTMARK_CHROME` or `POSTMARK_PYTHON` if your binaries are in different locations. Browser tooling is separate from the game and never packaged.

`dist/postmark-itch.zip` is the browser upload. The ZIP contains `index.html` at its root, all modules, and the local assets. `npm run dev -- --dist` serves the packaged files for review. The build deliberately reports when DreamLayer art is pending.

## Submission

Use `docs/itch-submission.md` as the itch.io description. Upload the ZIP as an HTML game, choose “This file will be played in the browser,” and enable fullscreen. Suggested embed size: 1200 × 1050 with a resizable viewport. Include screenshots and the actual asset manifest/provenance evidence. Test the uploaded itch build before submitting it to the jam. Publishing and submission require the project owner's action or explicit authorization.

## Architecture

`src/engine.js` is a fixed-step simulation independent of DOM and rendering. `src/levels.js` contains four authored rooms. `src/renderer.js` paints the postal world and local images. `src/main.js` handles controls and game state. `src/audio.js` synthesizes small feedback sounds. Node built-ins serve, check, and package the game. There are no runtime dependencies or remotely loaded fonts.

Known accessibility limit: the game is a visual spatial platformer, with keyboard and touch alternatives, readable labels, non-color-only stamp identities, and reduced-motion support; it does not provide a nonvisual mode.
