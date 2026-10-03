# POSTMARK visual system

## Scene and mood

A player sits at an impossible post-office desk during the quiet night shift. Cool blue ink, folded correspondence, muted print textures, and small vivid landscape stamps make the scene tactile; the last letter makes it personal.

## Color

CSS uses OKLCH tokens. The primary blue is anchored at hue 230. The desk is a dark tinted blue surface because it represents a physical night desk. Pale neutral correspondence provides strong contrast inside the game; Ocean, Forest, and Sky colors communicate different physics. Gold marks actionable selection and the goal envelope.

## Typography

Georgia gives letters and the title the feel of printed correspondence. Trebuchet MS / Segoe UI carries controls and instructions. Courier New is reserved for postage annotations and keyboard keys. System fonts keep the downloadable game self-contained.

## Composition

One framed Canvas room, a restrained room header, an instructional note, and a stamp tray. The first screen is a letter laid across the playable scene. No marketing sections or decorative dashboard panels. Four single-screen puzzles use fixed authored geometry so generated artwork cannot alter collision or solvability.

## Motion and interaction

Short stamp-lift feedback, a paper confetti burst on placement, small envelope motion, water ripples, and a gravity flip. Reduced motion disables cosmetic movement while preserving necessary gameplay physics. Select-and-click and keyboard placement are alternatives to dragging. Native controls support focus navigation; help is a native modal dialog that pauses the game.

## Art provenance

Landscape slots accept local DreamLayer PNGs listed in assets/manifest.json. The procedural fallback is original code artwork and is never described as generated. Only real DreamLayer outputs may be marked as such. The paper courier, structural platforms, physics effects, UI, and synthesized sound are authored in code.
