# Bimo Rive narrative rig

This isolated Rive CLI 1.5.1 experiment builds an editable, full-body Bimo in
interactive FOCUS, DEEP FOCUS, NOTICE, CONCERNED, and OVERWHELMED. DEEP FOCUS is a pose within FOCUS,
not a new emotional stage. Its proportions and colors follow the canonical artwork in
`../../Client/references/bimo-original.png`, with parts guided by
`../../Client/references/bimo-rig-sheet.png` and the FOCUS pose in
`../../Client/references/bimo-focus.png`. The CONCERNED pose follows
`../../Client/references/bimo-concerned.png`. OVERWHELMED uses
`../../Client/references/bimo-overwhelmed.png` for its guarded full-body gesture.

## Source and generated files

- `scene.rml` contains the vector character, editable closed eyelids, concerned
  brows and mouth, hierarchy, view model bindings, pointer area, and
  FOCUS ↔ NOTICE ↔ CONCERNED ↔ OVERWHELMED state machine transitions.
- `bimo_controller.luau` drives look tracking, blink, breathing, weight shift,
  arm settling, the DEEP FOCUS pose, NOTICE and CONCERNED reactions, pointer
  gaze ownership, OVERWHELMED pose and target-driven inertia, and sprout sway.
- `validation/validate_overwhelmed.py` prepares an isolated deterministic host
  input fixture under `build/` and checks real per-frame CLI telemetry.
- `rive.yaml` configures the CLI project. `AGENTS.md`, `CLAUDE.md`, and
  `.gitignore` came from the CLI scaffold.
- `build/` is generated and gitignored. It contains the local `.riv` build and
  validation captures; it is safe to regenerate.

## Rig hierarchy

```text
Character root (narrative weight transfer)
├── Upper body rig (breath, weight shift, restrained look response)
│   ├── Torso visual and chest emblem
│   ├── Neck pivot and neck shaft
│   │   └── Head attitude pivot (pose tilt independent of gaze)
│   │       └── Head rig (shell, face panel, eyes, mouth, side pods, sprout)
│   ├── Left shoulder → upper arm → elbow → lower arm → wrist → hand
│   └── Right shoulder → upper arm → elbow → lower arm → wrist → hand
└── Lower body rig (pelvis counter-shift, planted foot compensation)
    ├── Left hip → upper leg → knee → lower leg → ankle → foot
    └── Right hip → upper leg → knee → lower leg → ankle → foot
```

The head's existing face, eye, pod, blink, and sprout channels remain nested
under the neck pivot. Separate shoulder, elbow, wrist, hip, knee, and ankle
pivots provide attachment points for future states. CONCERNED moves the pelvis
and angles the thighs/knees while the feet keep their original floor anchors.
FOCUS, DEEP FOCUS, and NOTICE retain their existing lower-body transforms. FOCUS shoulders rest about 9° higher than the first full-body pass,
with matching angles on both sides and a soft elbow bend.

The state machine contains `FOCUS hold`, `NOTICE hold`, `CONCERNED hold`,
and `OVERWHELMED hold`,
connected in both directions by conditions on the exported `emotionStage`
view model number. NOTICE → CONCERNED blends over 480 ms, and the return over
430 ms. A single damped CONCERNED envelope sequences the full-body reaction:
gaze/head, torso, pelvis, shoulders, chest-side arm, open arm, and sprout. The
body pose is substantially settled by about 650 ms; the sprout settles last.
`deepFocus` selects a second pose within `emotionStage=0`; it does not add a
state-machine stage. The controller springs between poses while breathing
continues. DEEP FOCUS centers the gaze, closes editable curved eyelids, opens
the arms and palms, slows breathing, and quiets weight and sprout motion. NOTICE
keeps the eyes open, turns toward `lookX`/`lookY`, nudges the torso, lifts the
target-side arm slightly, and gives the sprout a delayed response. CONCERNED
adds editable worried brows and a small downturned mouth, a guarded left
forearm near the upper chest, an open opposite forearm/palm, quicker target
following, and a stronger yet restrained sprout reaction. Root translation
and roughly 4° of torso lean transfer the upper mass left, while the pelvis
counter-shifts right. Independent shoulder offsets lift the chest-side shoulder
and leave the other side open. An independent head attitude pivot adds a small
pose tilt while the existing gaze turn remains active. Neither torso nor limbs
receive pose squash/stretch.

The root moves 5 px right and 3 px down; the pelvis adds a 2 px rightward
counter-shift and a tiny rotation. Thigh angles of about 6° left and 5° right
produce outward knee compensation. The controller aims each shin at its original
ankle anchor and cancels rotation at the foot. Up to about 3 px of ankle joint
travel remains hidden under the overlapping boot/toe shells; the vector shapes
are not scaled. This keeps feet level and planted throughout blending.

## Run from the repository root

```bash
rive experiments/bimo-rive --verify
rive inspect experiments/bimo-rive --summary
rive experiments/bimo-rive --once
rive experiments/bimo-rive
```

The last command opens the live preview and rebuilds on edits. Move the pointer
over the 700 × 860 artboard to steer the gaze and head only during introductory
IDLE FOCUS. While in FOCUS, press `D` to toggle DEEP FOCUS. Press `1` for FOCUS,
`2` for NOTICE, `3` for CONCERNED, or `4` for OVERWHELMED. `N` or an artboard click still toggles
FOCUS ↔ NOTICE for local testing, except that a click does not override an
external host target. Entering any narrative state clears `deepFocus`. The
temporary label reads FOCUS, DEEP FOCUS, NOTICE, CONCERNED, or OVERWHELMED; its `MOVE`,
`DOWN`, `N`, and `D` counts show which callbacks arrived. `MOVE` can increase
after story mode starts, but those events no longer change the gaze.
The RML `ScriptedLayout` has a direct `FocusData` child so the CLI player can
deliver keyboard events. A local toggle from a neutral gaze sets a temporary
rightward test target, then recenters on return; host-driven targets are never
replaced by this preview convenience.

The intended host controls are:

- `lookX`, `lookY`: numbers in `[-1, 1]`, with `0` as neutral.
- `emotionStage`: number `0` for FOCUS, `1` for NOTICE, `2` for CONCERNED,
  or `3` for OVERWHELMED.
- `overload`: number in `[0, 1]`, default `0.65`. Only affects OVERWHELMED
  gaze dynamics. `0` follows targets quickly with strong damping; `1` retains
  more inertia and imperfect settling after rapid target changes. A stationary
  target always settles. Values are clamped internally.
- `deepFocus`: boolean, default `false`. When `true` and `emotionStage=0`, the
  pose centers. Entering it permanently ends introductory pointer tracking for
  that story run.
- `pointerLookEnabled`: boolean, initially `true`. The controller latches it
  `false` upon entering DEEP FOCUS or any narrative state. Returning to FOCUS or
  leaving DEEP FOCUS does not restore it. Only an explicit host reset should
  set it `true` again while `emotionStage=0` and `deepFocus=false`.
- `useExternalLook`: boolean, default `false`. When `true`, pointer movement
  and pointer exit stop writing `lookX`/`lookY`; the host owns them and the
  preview click toggle is disabled.

The effective gaze source is mode dependent. Introductory IDLE FOCUS can write
`lookX`/`lookY` from the pointer. DEEP FOCUS centers the pose and latches the
pointer off. NOTICE, CONCERNED, and OVERWHELMED follow host supplied `lookX`/`lookY` while
`useExternalLook=true`; their pointer callbacks are ignored even if that flag
has not yet been set. The lock stays off through all later stages. When story
mode begins without an external target, the controller clears the last pointer
target. Local keyboard testing then assigns a small preview target so the pose
is visible; the host should set `useExternalLook=true` before supplying an
intentional centered or off-center narrative target.

Other view model numbers are internal animation channels driven by the Luau
controller.

To render a fixed pose without moving the pointer:

```bash
rive experiments/bimo-rive --screenshot=experiments/bimo-rive/build/force-focus.png \
  --data=emotionStage=0 --advance=120
rive experiments/bimo-rive --screenshot=experiments/bimo-rive/build/notice-pose.png \
  --data=emotionStage=1 --data=lookX=1 --data=lookY=-1 --advance=120
rive experiments/bimo-rive --screenshot=experiments/bimo-rive/build/deep-focus.png \
  --data=emotionStage=0 --data=deepFocus=true --advance=600
rive experiments/bimo-rive --screenshot=experiments/bimo-rive/build/concerned.png \
  --data=emotionStage=2 --data=useExternalLook=true \
  --data=lookX=-0.8 --data=lookY=0.2 --advance=120
```

The CLI's `--data` values apply when that preview starts. In the running live
window, press `1`, `2`, `3`, or `4` to switch without restarting it. The temporary
label follows `emotionStage` whether it was set by the host or by a callback.

To check both directions of the preview toggle:

```bash
rive experiments/bimo-rive --data-dump=- --pointer=click@350,238 --advance=60
rive experiments/bimo-rive --data-dump=- --key=2 --advance=45 --key=3 \
  --advance=45 --key=2 --advance=45
```

A future webpage can convert a Reel or stone target into artboard coordinates,
set `useExternalLook=true`, write normalized coordinates, and set
`emotionStage=1` for NOTICE or `emotionStage=2` for CONCERNED:
`lookX = clamp(2*x/700 - 1, -1, 1)` and
`lookY = clamp((y - 238)/(860*0.31), -1, 1)`. Continue writing these values as
the scripted target moves; pointer events cannot overwrite them after the
story lock. A full hero/story reset can return to `emotionStage=0`, clear
`deepFocus`, reset `lookX`/`lookY`, set `useExternalLook=false`, then explicitly
set `pointerLookEnabled=true` to allow a new introductory pointer phase.

For a ten-second idle capture at 60 FPS:

```bash
rive experiments/bimo-rive --screenshot=experiments/bimo-rive/build/focus-idle-10s.png \
  --advance=600
```

The natural FOCUS blink and existing damped look/head/sprout response are preserved.
The torso breathes by less than one percent and shifts only a few pixels. The
shoulders, elbows, and hands use separate spring rates for quiet delayed
settling. The feet have no idle translation, rotation, or scale.

Preview and screenshots require a macOS Metal graphics context. In a
restricted sandbox, these commands may report `Metal is not available on this
device`; run them with graphics access. `--verify`, `inspect`, and `--once` do
not need Metal. A local `--once` build is unsigned; the CLI requires account
signing for web distribution of scripted files.

This 2D vector rig uses inset face motion, small head and neck turns, and side
pod parallax to suggest depth. It has no true 3D yaw or side-profile artwork.
The existing open vector fingers are less curled than the painted CONCERNED
reference; the shoulder/elbow/wrist chain provides the chest gesture without
adding replacement hand artwork. RML Node transforms and bindings support the
full pose; the main fidelity limit is the existing flat artwork.

Validation captures in `build/pose-final-{concerned,left,right}.png` show the
new pose and gaze extremes. `build/pose-body-comparison.png` compares NOTICE,
the previous CONCERNED pose, and the refined pose with the face excluded.
Matched captures of FOCUS, DEEP FOCUS, and NOTICE were pixel-identical before
and after this refinement. A 928-frame replay covering entry, a ten-second
hold, return, and rapid reversals kept both ankle anchors within 0.001 px and
never narrowed the knees inside their neutral separation.

`JetBrainsMono.ttf` is bundled only for the temporary debug label and comes
from the installed Rive 1.5.1 `text_rain` sample. Its license is included in
`JetBrainsMono-OFL.txt` ([JetBrains Mono source](https://github.com/JetBrains/JetBrainsMono)).

## OVERWHELMED pose and gaze

The final stage overlays the approved CONCERNED base with its own damped
reaction envelope. At full weight, the root shifts 10 px left and 2 px down
relative to CONCERNED; the pelvis adds a small rightward counter-shift. The
chest recoils slightly and the shoulders move inward and upward. Both connected
shoulder/elbow/wrist chains bend to bring separated open hands beside the upper
chest/lower face. Small editable finger transforms suggest a partially curled
hand. The right forearm has animated RML DrawRules so it moves in front of the
chest when needed, while all previous states retain their original depth.
The feet remain at the same world anchors, with wider outward knee support.

A head attitude of about 5° remains independent of the gaze rotation. Separate
editable tense brow paths and a small filled concerned mouth replace the
CONCERNED facial shapes. Eyes narrow vertically by 13%; they are not enlarged.
Breathing runs at about 2.05 rad/s with 58% of the prior amplitude. Sprout
spring damping is reduced slightly so rapid attention changes settle last.

CONCERNED → OVERWHELMED uses a 570 ms expression transition and a coordinated
body envelope: head, chest, hips, shoulders, then both hands. The return uses
600 ms. The pose is substantially settled around 600–700 ms. Gaze uses faster
springs whose damping is controlled by `overload`; eye response leads head
response. This uses target history and spring velocity, with no random numbers
or autonomous gaze wandering. Identical inputs and frame steps replay exactly;
it is not a stateless function of scroll progress. The host can reverse the
state and target sequence and the rig settles naturally in either direction.

For an externally controlled preview, including an intentional centered target:

```bash
rive experiments/bimo-rive --data=emotionStage=3 --data=useExternalLook=true \
  --data=lookX=-0.45 --data=lookY=-0.25 --data=overload=0.65 --fit=contain
```

Set `useExternalLook=true` before writing Vortex targets through `lookX` and
`lookY`. Pointer movement and exit cannot overwrite them. No Vortex or website
integration is included in this experiment.

### Validation

`build/overwhelmed-body-comparison.png` compares CONCERNED and OVERWHELMED
with the face excluded. Both raised hands and the guarded shoulder silhouette
make the final state distinguishable. `build/overwhelmed-final-{left,right,up,down}.png`
show gaze extremes; `build/overwhelmed-transitions.png` shows intermediate entry
and return poses. No disconnected joints were visible in these captures.
The approved FOCUS, DEEP FOCUS, NOTICE, and CONCERNED matched renders were
pixel-identical before and after this addition.

The CLI applies `--data` at startup, so dynamic host-input validation uses a
copy of the project under `build/overwhelmed-validation/`. Its only controller
addition writes a fixed sequence to the public look inputs, like a host would.
It does not replace the gaze, pose, ownership, or state handlers. Prepare it:

```bash
python3 experiments/bimo-rive/validation/validate_overwhelmed.py --prepare
rive experiments/bimo-rive/build/overwhelmed-validation --verify
rive inspect experiments/bimo-rive/build/overwhelmed-validation --summary
```

Run this replay twice, naming the outputs `overwhelmed-dynamic-a.jsonl` and
`overwhelmed-dynamic-b.jsonl`:

```bash
rive experiments/bimo-rive/build/overwhelmed-validation \
  --data-dump=experiments/bimo-rive/build/overwhelmed-dynamic-a.jsonl \
  --data-dump-every=1 --data=useExternalLook=true --data=overload=1 \
  --key=3 --advance=120 --key=4 --advance=660 \
  --pointer=move@20,100 --advance=1 --pointer=move@680,800 --advance=89 \
  --key=3 --advance=60 --key=4 --advance=12 --key=3 --advance=12 \
  --key=4 --advance=12 --key=3 --advance=120
python3 experiments/bimo-rive/validation/validate_overwhelmed.py --check \
  experiments/bimo-rive/build/overwhelmed-dynamic-a.jsonl \
  experiments/bimo-rive/build/overwhelmed-dynamic-b.jsonl
```

The 1,104-frame replay covered a ten-second settled OVERWHELMED hold,
left/right/up/down target changes at 150 ms intervals, pointer movement, return,
and rapid state reversals. Identical replays produced identical telemetry.
Both foot anchors stayed within 0.00004 px, knees never moved inward from their
neutral separation, and ankle joint travel stayed under 4 px of shell overlap.

Relative to the painted reference, this remains a frontal 2D rig with parallax,
not true depth or perspective foreshortening. The existing capsule fingers use
restrained curling rather than the reference's individually articulated curved
digits. The mouth is smaller and no sweat/stress marks were added, keeping the
expression less theatrical. All added artwork remains editable vector geometry.
