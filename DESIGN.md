# POSTMARK visual system

## Scene and mood

An impossible post office during the night shift. Cool blue ink, folded correspondence, printed textures, small vivid landscape stamps, and a warm light at the last address make the journey tactile and personal.

## Color and type

CSS uses OKLCH tokens, with the postal blue anchored at hue 230. The tinted desk gives pale paper platforms and the courier contrast. Cyan Ocean, mint Forest, violet Sky, and gold memories communicate distinct physical interactions. Solid geometry remains clear inside illustrated world regions.

Georgia gives the title and letters a printed character. Trebuchet MS / Segoe UI carries controls; Courier New carries postal annotations. Local system fonts keep the game self-contained.

## Composition

One viewport-filling Canvas stage between a compact postal HUD and a functional stamp/ability tray. Desktop shows the authored room; portrait and short touch landscapes follow the courier at a useful scale. Selecting a stamp opens a whole-room overview. Controls convert through the same camera transform as rendering.

The opening appears over the room. Delivery appears as a readable letter with restored memories and safe returns. Overflowing title/ending cards scroll on short screens. Native fullscreen is optional; ordinary viewport play remains supported.

## Motion and feedback

Fixed-step physics with render interpolation, variable-height jumps, a buffered jump and ledge grace period, short horizontal dash, and contextual world pulses. Paper courier squash and stretch, afterimages, seeded bursts, expanding rings, gravity cues, water ripples, root growth, and restrained impact shake give actions readable consequences.

Room entry fades briefly; delivery has a short paper arrival. Paused dialogs freeze gameplay and clear held input. Reduced motion disables particles, trails, shake, cosmetic oscillation, and transitions while preserving gameplay and static feedback. Cached landscapes/room scenes and bounded effect pools keep drawing inexpensive.

## Controls and HUD

Named stamp thumbnails, borrowed-state labels, contextual ability name/readiness, dash charge/cooldown, optional memory count, letter progress, undo, reclaim, map, help, pause, sound, and fullscreen. Touch movement supports simultaneous fingers; touch abilities have explicit buttons. Native dialogs and focus styles preserve keyboard navigation.

## Art provenance

Landscape slots accept only local Ocean, Forest, and Sky PNGs from assets/manifest.json. They load with bounded deadlines over immediate original procedural artwork. Failed enhancement never creates a loading screen.

Fallback art is authored code and is never described as DreamLayer-generated. Only actual outputs may be marked as generated. Courier, geometry, roots, water effects, paper textures, UI, particles, and sound remain code-authored regardless of landscape source.
