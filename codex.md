# POSTMARK engineering context

## Scope and authorization

The user approved a small browser game for the DreamLayer jam and, on October 3, 2026, explicitly requested a substantial final gameplay and production/polish pass. Preserve the four-room postage-world concept and plain Canvas architecture. Dash, three world abilities, twelve optional memories, lantern checkpoints, immersive layouts, and stronger feedback are within that authorization. Do not expand into extra rooms/frameworks or live billable generation for players.

Keep work on feat/postmark-final-polish. Draft PR #2 is open against current main: https://github.com/Derric01/DreamLayer/pull/2. Do not merge, deploy, publish, or submit without the owner's instruction. The earlier prototype PR #1 was merged by the owner before this iteration.

## Implementation

Plain JavaScript ES modules, Canvas 2D, semantic HTML controls, CSS, and Node built-ins. No runtime dependencies. Simulation remains DOM-independent in engine.js; art.js provides a small bounded loader; rendering, audio, and flow remain separate. Authored geometry determines solvability.

Fixed 60 Hz simulation, interpolation, jump buffer/coyote time, variable jumps, horizontal dash, contextual pulses, one-way root bridges, swept vertical collisions, recoverable falls, and mid-route checkpoints. Memories survive falls but reset on room restart. Undo holds 64 stamp snapshots without rewinding position; it clears on falls/restart. Checkpoint falls preserve reachable placed worlds; start falls reset Ocean. An early Ocean stamp leaves the crate at its boarding height until the courier lands on it; the lift then continues its journey. Jump release only trims an ordinary jump, never a Tide vault or Root spring.

A full-viewport shell with desktop room overview, portrait/short touch landscape camera, selectable stamp map, pointer/keyboard/multitouch controls, optional sound/fullscreen, native paused dialogs, complete letter/victory/replay flow, and storage failure handling. Effect pools/pixel density are bounded and artwork/room scenes cached. Reduced motion suppresses cosmetic animation.

## DreamLayer and secrets

Read DREAMLAYER_API_KEY only from the environment or ignored .env.local. Never print, commit, or transmit it outside authorized API authentication. Do not use the second key in .env without separate explicit authorization; automatic review rejected an alternate-account check in an earlier turn.

Use the official dreamlayer@0.3.0 CLI, cached inside ignored artifacts. Check balance/capabilities before generation; the initial approved workflow is three ordinary operations, up to three credits: Ocean master followed by Forest and Sky reference edits. No automatic billable retries. Save sanitized logs and actual execution provenance.

The .env.local key authenticates. Latest balance on October 3: zero available credits. No generation has run and no credits have been spent. assets/manifest.json is authoritative and remains awaiting-dreamlayer-generation. The game is playable with original deterministic procedural landscapes but the jam art requirement is pending.

The packaged game contains no API credentials or generation tooling, makes no live DreamLayer requests, and loads only validated local images. Procedural graphics are immediate; manifest/image loads have 2.5-second deadlines and safely handle failure. Keep fallback provenance honest.

## Verification

Run npm test, npm run check, npm run build, npm run test:browser, and ZIP integrity/security checks. There are 37 deterministic tests covering the four original routes, twelve-memory routes, movement abilities, recovery/checkpoints, undo, collision regressions, robust artwork errors/timeouts, early Ocean boarding in both lift rooms, and jump release during world abilities.

The browser harness uses a fresh isolated Chrome/Edge profile and dynamic debugging port, with a Python websocket-client loopback bridge. On this Windows host the sandbox can reset its DevTools WebSocket; the authorized local browser verification may need sandbox escalation. Never reuse or terminate the owner's browser profile.

Actual keyboard playthroughs cover all four deliveries, world abilities, optional memory detours, and victory/replay. UI checks cover pointer drag, preview, undo, pause/help, native fullscreen, touch input, storage failure, reduced motion, art faults/success fixtures, and layouts from 320px phone to ultrawide. Ending fixtures check short-screen replay access; they are not mobile full playthrough claims. Visually inspect saved screenshots. Timings measure local headless Chrome only; no physical mobile device or universal performance claim.

Screenshots, browser-results.json, test profiles, API logs/cache, and dist are ignored artifacts. Rebuild and repeat relevant checks after changes. Document real limitations in README and the asset manifest.

## Git and PR

The owner merged prototype PR #1 at 97fe5608cb3fd6340e405b2fcf8b269f75bcd3f5 on October 3. That is the current remote main. The final game pass is a0c0d30, on feat/postmark-final-polish; the existing feat/postmark branch also contains that commit. No history was rewritten. Final-polish PR #2 is open against main and stays draft while DreamLayer artwork is pending. Do not edit the merged prototype PR to describe unmerged features.

Project/.git ownership differs from the sandbox account: use per-command safe.directory for this exact repository, remove inherited GIT_CONFIG_* variables from the child Git environment, and avoid global trust changes or the unrelated home repository. Git mutations may need sandbox escalation.

GitHub connector reads work; writes return 403 integration permission errors. Existing Git credential-manager authentication supports feature-branch push. gh can use that existing credential only in process memory for PR updates; never print/save/change it. Do not push directly to main, force-push, merge, or deploy.
