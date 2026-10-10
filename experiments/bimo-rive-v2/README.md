# Bimo Rive V2

A separate, editable vector rig for Rive CLI **1.5.1**. V1 remains in
`../bimo-rive/` and was not edited. This experiment does not change the website.

## Preview

From the DeepSprout repository root:

```sh
rive experiments/bimo-rive-v2 --fit=contain --viewport=700x860
```

The native preview watches source changes. Focus its window to use the keys.
The temporary corner label shows the requested state, received movement/key
counts, and the pointer lock. The pose eases toward that state.

| Key | Action |
| --- | --- |
| 1 | INTRO / IDLE FOCUS |
| 2 | DEEP FOCUS; permanently lock pointer tracking |
| 3 / N | NOTICE |
| 4 | CONCERNED |
| 5 | OVERWHELMED |
| D | Toggle DEEP FOCUS / INTRO; returning does not unlock the pointer |
| M | Mirror 3/4 staging and the gesture chains |
| H / L | Supply an external left / right gaze target |
| K / J | Supply an external up / down gaze target |
| C | Supply an external centered gaze target |
| R | Explicit preview reset: INTRO, centered gaze, external ownership off, pointer on |
| Click | Cycle the five states when external gaze ownership is off |

Mouse movement affects INTRO only before the lock. Entering any story state
also locks the pointer, so launching directly in NOTICE cannot accidentally
start mouse tracking. Returning to INTRO preserves the lock. R is an explicit
local testing reset. Once H/L/K/J/C enables external gaze ownership, clicks
stop cycling the state; number keys remain available for testing.

## Public inputs

The artboard is `Bimo V2`, view model `BimoV2`, default instance `INTRO`, state
machine `Bimo V2 narrative states`.

| Input | Values / default | Purpose |
| --- | --- | --- |
| `emotionStage` | integer 0–4 / 0 | 0 INTRO, 1 DEEP FOCUS, 2 NOTICE, 3 CONCERNED, 4 OVERWHELMED |
| `lookX` | −1…1 / 0 | External or initial pointer gaze; negative is screen left |
| `lookY` | −1…1 / 0 | Gaze; negative is up |
| `facing` | −1…1 / 0.85 | Authored body/head staging; positive faces screen right, negative mirrors |
| `overload` | 0…1 / 0.65 | OVERWHELMED settling difficulty; 0 is damped, 1 has more inertia |
| `useExternalLook` | boolean / false | Give a future host ownership of `lookX` / `lookY` |
| `pointerLookEnabled` | boolean / true | Initial pointer permission; controller latches it false at the story lock |

**V2 has a new state mapping.** V1 used stages 0–3 plus `deepFocus`; V2 gives
DEEP FOCUS its own stage 1 and moves NOTICE/CONCERNED/OVERWHELMED to 2/3/4.
Do not copy V1 stage numbers into V2. All other numeric view-model properties
are controller outputs for shape bindings, not inputs a host should overwrite.

A host later sets `useExternalLook=true`, supplies normalized `lookX/lookY`,
and sets `emotionStage`. Staging stays independent through `facing`, so changing
a gaze target does not swap the chest gesture. DEEP FOCUS always centers gaze,
even when external targets are supplied. Without external targets, narrative
states use deterministic authored targets from the pose library. There is no
random gaze, jitter, or autonomous target selection.

Example standalone CONCERNED preview, looking up and left:

```sh
rive experiments/bimo-rive-v2 --fit=contain --viewport=700x860 \
  --data=emotionStage=3 --data=useExternalLook=true \
  --data=lookX=-0.7 --data=lookY=-0.4 --data=facing=0.85
```

## Source and hierarchy

- `scene.rml`: editable ceramic shells, face, ears, sprout, torso, emblem,
  mechanical joints, tapered limbs, domed boots, and curved hand contours.
  Five Rive states blend editable facial shapes and control forearm draw depth.
- `pose_library.luau`: five full-body pose records in radians and artboard pixels.
  Each record coordinates root, torso, pelvis, thighs, shoulders, elbows, wrists,
  head attitude, target gaze, and respiration.
- `bimo_controller.luau`: gaze ownership, pointer lock, ordered pose blending,
  damped follow-through, 2.5D projection, hand variants, fixed-foot compensation,
  and preview shortcuts.
- `rive.yaml`: CLI project configuration.
- `JetBrainsMono.ttf` and its OFL license: temporary debug typography only.
- `validation/validate_v2.py`: real CLI input replay and captures.
- `validation/contact_sheet.py`: optional Pillow review sheets from captures.
- `build/`: ignored local builds, telemetry, screenshots and validation report.

```text
Character root — weight transfer
├── Upper body — translation, lean, breathing
│   ├── Neck → head attitude → head gaze turn
│   │   ├── Face projection → eyes, lids, brows, mouths
│   │   ├── Ceramic shell + clipped side plane
│   │   ├── Near / far ear pods
│   │   └── Sprout spring → stem, two leaves
│   ├── Left shoulder → upper arm → elbow → forearm → wrist
│   │   └── Opaque palm core + relaxed / palm-up / open / guarded / tense digits
│   ├── Torso shell + side plane → projected chest emblem
│   └── Right shoulder → upper arm → elbow → forearm → wrist → hand variants
└── Pelvis — counter-shift
    ├── Left hip → thigh → knee → shin → fixed ankle → boot
    └── Right hip → thigh → knee → shin → fixed ankle → boot
```

3/4 staging uses face displacement/compression and counter-rotation, a clipped
ceramic side plane, wider near/narrower far ears, chest projection, a recessed
far shoulder, shortened far arm, and opposed hip heights. Negative facing mirrors
the pose chains rather than mirroring the entire drawing or the external gaze.

Head reacts first, then torso, hips, shoulders, forearms, and hand treatment;
the sprout settles last. Pose blends last 420–650 ms. Reversals snapshot the
current visible blend; there is no queued transition or reset to neutral. Quiet
joint springs add settling. Feet aim at fixed artboard anchors (287,798) and
(413,798), with knee/ankle compensation and counter-rotated boots.

## Reference fidelity and V1 comparison

The actual supplied `Client/references/rive-v2/` directory contained two sheets:
`Bimo V2 Plant-Robot Reference Pack.png` and
`Eco Robot Character Turnaround.png`. Both were inspected, including turnaround,
3/4 parts, hands, head attitudes, expressions, and emotional poses. The five
separately named high-resolution images in the brief were not present.

V2 replaces the block-like V1 head/face, upper arms, forearms, thighs and toes
with curved contours. The near ear has visibly more volume; the far ear and arm
recede. Curved ceramic fingers, dark knuckles and palm bearings replace V1's
flat palm and straight capsule fingers. NOTICE raises one arm, CONCERNED guards
the chest with the opposite palm open, and OVERWHELMED raises both guarded hands.
These silhouettes differ with the face excluded. DEEP FOCUS follows the explicit
brief's symmetric palms-up direction even though the small reference poses show
more relaxed arms.

## Validation and screenshots

```sh
rive experiments/bimo-rive-v2 --verify
rive inspect experiments/bimo-rive-v2 --summary
python3 experiments/bimo-rive-v2/validation/validate_v2.py
# Optional; requires Pillow:
python3 experiments/bimo-rive-v2/validation/contact_sheet.py
```

Validation passed with 0 errors, 0 warnings, and no inspect problems. Two identical
real-input replays produced identical telemetry across 4,104 sampled frames.
Every state ran for at least ten seconds. The replay covers initial pointer
tracking, the DEEP FOCUS lock, return-to-INTRO lock persistence, explicit reset,
scripted directions, rapid target/state reversals, mirrored staging, finite
transforms, normalized hand weights, and fixed foot anchors. Maximum measured
foot anchor error was 0.000036 px; knee separation stayed above 118 px.

The harness also renders opposing gaze extremes, diagonal gaze, both staging
directions, and intermediate CONCERNED → OVERWHELMED frames. Pixel review showed
readable hand attachments and no detached limb joints at the captured extremes.

Five requested renders:

- `build/intro-focus.png`
- `build/deep-focus.png`
- `build/notice.png`
- `build/concerned.png`
- `build/overwhelmed.png`

Review sheets: `build/states-v2.png`, `build/body-silhouettes.png` (head excluded),
`build/gaze-extremes.png`, `build/mirrored-staging.png`,
`build/transition-review.png`, and `build/v1-v2-concerned.png`.

## Remaining limitations

This is a stylized 2.5D rig, not a full turnaround: there is no true side/back
view, volumetric foreshortening, or perspective hand mesh. The small reference
sheet limits tiny hand-detail fidelity. Fingers are editable curved contours;
hand transitions briefly crossfade the digit variants while the palm/bearing
remain opaque, rather than morphing an anatomical mesh. Near/far projection is
restrained to avoid shell clipping under opposite gaze targets. Knee/ankle
compensation changes the hidden joint overlap slightly; it does not stretch
ceramic shells. No optional sweat marks were added.

The local `.riv` carries unsigned scripts and is intended for CLI preview.
A later website runtime build needs the documented authenticated signing/publish
workflow. No account upload, publish, or homepage integration was performed.
