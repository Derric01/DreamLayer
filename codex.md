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

The four-room game and ending are implemented. All 12 deterministic gameplay tests pass, syntax and ZIP checks pass, and the packaged build passes actual Chrome smoke tests, including a complete first delivery through real keyboard controls. Screenshots are in ignored artifacts/. The official DreamLayer 0.3.0 CLI is cached locally and its commands were inspected; no credits have been spent and no DreamLayer assets have been generated because no local key is configured. assets/manifest.json is the source of truth.

Local Git was initialized on feat/postmark. The workspace owner differs from the sandbox account, so Git commands may require a per-command safe.directory entry for this exact project; do not change global trust settings or operate on the user's home repository. GitHub CLI authentication was invalid and no remote URL was supplied. Finish actual asset generation and open the PR when those inputs are available. Publishing still requires the user's instruction.
