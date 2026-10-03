# Build POSTMARK, an immersive world-stamp puzzle platformer

POSTMARK is a four-letter puzzle platformer set in an impossible post office. Reusable Ocean, Forest, and Sky stamps raise crates, grow paths, and reverse local gravity. A fold dash, Tide vault, Root spring, Sky release, and twelve optional memories add movement combinations while the original four authored puzzle routes remain solvable.

The game fills its viewport, with a courier-following phone camera and a whole-room stamp map. A postal HUD, ability readiness, lantern checkpoints, seeded effects, afterimages, landing feedback, restrained shake, optional synthesized audio, paused dialogs, and a complete letter/victory/replay flow make actions and progression readable. One-way root bridges and swept vertical collision checks fix late-jump and thin-platform edge cases. Reduced motion, multitouch, input queuing, and unavailable-storage handling preserve reliable play.

DreamLayer is a development art workflow: an Ocean master and Forest/Sky reference edits become local stamp and world-region PNGs, with actual provenance in the manifest. Credentials and generation tooling are excluded from the browser build. Deterministic artwork appears immediately; bounded asynchronous loading safely handles missing, slow, malformed, rate-limited, or corrupt art.

Validation:

- 31 deterministic tests pass, covering all four original solutions, all twelve memories, movement abilities, undo, checkpoints, collision regressions, and artwork error/deadline behavior.
- Actual packaged Chrome keyboard playthrough completes every letter and all twelve memories with zero falls, then restarts through the victory UI.
- Browser checks pass for drag placement, keyboard/button undo, pause/help, native fullscreen, multitouch, reduced motion, storage failure, and six artwork failure/success fixtures.
- Laptop, ultrawide, 320px/390px phone, phone landscape, and tablet layouts pass overflow checks. Short-screen endings retain access to replay. Captures are visually reviewed.
- Syntax/build/ZIP checks pass; the ZIP has root index.html and ten public files, with no environment files or development tooling.
- Local headless Chrome timing is recorded in ignored artifacts/browser-results.json. Mobile checks are emulated; physical device and uploaded itch.io testing remain separate.

The configured DreamLayer key authenticates, but available credits are zero. No generation has run or credits been spent. Current landscapes are original procedural fallback art, and the manifest explicitly records pending generation. Keep this PR draft until actual DreamLayer artwork is generated and reviewed for the jam requirement.

No merge, production deployment, itch.io publication, or submission is included.
