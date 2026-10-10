# Bimo V2 hero export source

A derivative of `experiments/bimo-rive-v2`, retaining its original vector geometry,
view model, state machine, `bimo_controller.luau` and `pose_library.luau`.
The preview background, debug labels and debug font have been removed. Default
inputs are awake stage 0, external gaze ownership true, pointer tracking false.
The approved experiment itself is unchanged.

`Client/scripts/hero-v2/export-bimo.py` runs the original controller natively,
records awake and deep-focus motion, and creates the script-free `.riv` used by
this hero. The browser plays those channels through `native-motion.js`.
No Rive account upload or script-signing service is required for this export.
See `Client/docs/hero-opening-v2.md` for the deliberate runtime limitation.
