Web export of experiments/bimo-rive-v2. Keep the approved source experiment unchanged.
Character shapes, pose library and controller are preserved. The derivative removes the preview background, debug labels and debug font, and changes initial inputs to deep focus with external gaze ownership and pointer tracking off. The web host explicitly reapplies these inputs.

Run `rive . --verify` and `rive inspect . --summary` after edits. Browser delivery needs the signed `rive . --publish=local` output, never an unsigned screenshot/once build. Signing transfers scripts to Rive and requires an authenticated account. The current approved signed build carries Rive's export watermark because no account-file push binding exists.

See ../../../docs/hero-opening.md for integration and validation details.
