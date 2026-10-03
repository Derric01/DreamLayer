# POSTMARK engineering context

## Scope and authorization

The user approved POSTMARK as a small browser game for the DreamLayer jam. Four single-screen rooms, three reusable world stamps, and a complete ending. Do not expand the scope without approval. Do not publish, merge, or deploy without an explicit instruction. Create a feature branch and PR when a GitHub destination is available.

## Implementation

Use plain JavaScript ES modules and Canvas 2D, semantic HTML controls, CSS, and Node built-ins for local tooling. No runtime dependencies. Keep simulation logic independent from rendering so physics and level solutions can be verified with deterministic tests. The packaged game must make no external requests and contain no API credentials.

## DreamLayer

Read DREAMLAYER_API_KEY from local environment or ignored .env.local. Never print the key. Image generation happens only during development. Record prompts and actual execution IDs, save approved PNGs locally, and distinguish generated assets from procedural fallback graphics. Check balance/capabilities before generation and bound spending to a small initial asset batch.

## Validation

Run node --test for meaningful physics and puzzle-solution tests, syntax checks, a packaged-build check, and real-browser smoke tests. Visually inspect desktop and mobile captures. Track material limitations in README and the asset manifest rather than claiming unperformed checks.

## Current state, October 3, 2026

The four-room game and ending are implemented. Stamp selection previews lifts, bridges, and gravity without changing physics. Z/the Undo stamp button restores up to 64 previous stamp placements without rewinding the courier; history clears on restart and fall. Escape/the Pause button opens a native modal and clears held input; closing it resumes without a simulation backlog. Room transitions clear stale toasts and particles.

All 15 deterministic gameplay tests pass, syntax and ZIP checks pass, and the packaged build passes actual Chrome smoke tests, including a complete first delivery through real keyboard controls, previews, undo, pause/resume, and mobile controls. Desktop, laptop, 390px phone, and 320px phone captures were visually inspected. Screenshots are in ignored artifacts/. The official DreamLayer 0.3.0 CLI is cached locally. The .env.local key authenticates, and free balance/capability checks succeeded, but the API balance is zero. No credits have been spent and no DreamLayer assets have been generated. assets/manifest.json is the source of truth. Do not use the second key in .env without the user's explicit authorization; automatic review rejected an alternate-account check.

Local Git was initialized on feat/postmark; the prototype commit is d52673c. The workspace owner differs from the sandbox account, so Git commands may require a per-command safe.directory entry for this exact project; do not change global trust settings or operate on the user's home repository. The user provided https://github.com/Derric01/DreamLayer.git. GitHub connector authentication works, although GitHub CLI authentication remains invalid. The remote repository is empty. The user's instructions prohibit direct writes to main without explicit approval, so a minimal README-only main initialization requires approval before a PR can be opened. Finish actual asset generation when jam API credits are available. Publishing still requires the user's instruction.
