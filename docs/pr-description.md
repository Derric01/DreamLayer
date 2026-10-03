# Build POSTMARK, a four-room postage-world puzzle game

POSTMARK gives the player three reusable postage stamps whose worlds alter authored physics: Ocean raises a crate, Forest creates a bridge, and Sky reverses gravity inside its frame. Four hand-authored rooms introduce the rules and end with delivery to the courier's childhood home.

The game runs as a self-contained HTML/Canvas build with keyboard, pointer, and touch controls, optional synthesized audio, room restart, local progress, and reduced cosmetic motion. A development-only DreamLayer workflow checks capabilities and credits, generates an Ocean master with Forest/Sky reference edits, and records provenance. Generated images are bundled into the browser build; credentials and tooling are excluded.

DreamLayer account configuration and actual artwork generation remain pending. The asset manifest marks current procedural fallback art honestly, and the submission description contains a corresponding completion note.

Validation: 12 deterministic gameplay tests pass, including complete solutions for all four rooms. JavaScript syntax checks and ZIP integrity checks pass. Headless Chrome smoke tests complete the first delivery through actual keyboard input and cover stamp dragging, help pause, replay, packaged modules, laptop/mobile layouts, and reduced motion; screenshots were visually reviewed. No production deployment or itch.io publication was performed.
