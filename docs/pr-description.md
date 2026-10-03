# Build POSTMARK, a four-room postage-world puzzle game

POSTMARK gives the player three reusable postage stamps whose worlds alter authored physics: Ocean raises a crate, Forest creates a bridge, and Sky reverses gravity inside its frame. Four hand-authored rooms introduce the rules and end with delivery to the courier's childhood home.

The game runs as a self-contained HTML/Canvas build with keyboard, pointer, and touch controls, optional synthesized audio, room restart, local progress, and reduced cosmetic motion. Selecting a stamp previews its lift, bridge, or gravity effect without changing physics. Undo restores previous stamp placements, and an explicit pause dialog freezes the simulation and clears held movement. Undo history clears on respawn to keep the lift reachable.

A development-only DreamLayer workflow checks capabilities and credits, generates an Ocean master with Forest/Sky reference edits, and records provenance. Generated images are bundled into the browser build; credentials and tooling are excluded. Players need no API key or credits.

DreamLayer authentication and free account capability checks succeeded. Artwork generation awaits available jam API credits. The asset manifest marks current procedural fallback art honestly, and the submission description contains a corresponding completion note.

Validation: 15 deterministic gameplay tests pass, including complete solutions for all four rooms, bridge/gravity undo, and checkpoint recovery. JavaScript syntax checks and ZIP integrity checks pass. Headless Chrome smoke tests complete the first delivery through actual keyboard input and cover effect previews, keyboard/button undo, pause/resume, stamp dragging, help, replay, packaged modules, laptop/mobile layouts down to 320px, and reduced motion; screenshots were visually reviewed. No production deployment or itch.io publication was performed.
