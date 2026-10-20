# DeepSprout — Premium Individual experience, design system and presentation demo

Date: 17 October 2026. Status: **complete for this task**. No commit was made, and no later round (2E, Admin consolidation, Community, full-site redesign) was started.

Companion documents:
- [Demo presentation guide](deepsprout-demo-presentation-guide.md)
- [Individual design-system reference](../../Client/docs/design/individual-design-system.md)

## 1. Executive summary

**Five Individual pages redesigned on one shared foundation.** Insights, Activities, Recovery Plan, Digital Shield and Explore were redesigned on a single append-only token set plus an opt-in `.ds-*` component layer.
- Each page keeps every engine call, ID, `name` and `data-*` hook its regression suites use.
- Technical source strings, policy paragraphs and raw identifiers moved behind accessible toggletips and disclosures. Nothing was deleted.

**Login** now uses the same living-network field as the Individual path of Register. **The layout changed, not only the background:**
- the card moved to the right, where Register's card sits;
- the Register header was added (brand plus a "Create account" pill), and the in-card brand is hidden;
- the Individual editorial copy is shown on the left.

The form's fields, IDs, buttons (including the original green gradient submit), validation and sign-in logic are unchanged. The only form-level style override is the subtitle colour, for readability. If you prefer a centred card on the network background, that is a one-line revert in `login-world.css` plus removing the copy host.

**Page-to-page motion.** Individual pages use cross-document View Transitions: a short fade out and settle in, with the header held still.
- Browsers without support navigate normally.
- Reduced motion turns it off.

**Presentation-ready demo identity: Rania Yasin**, built by driving the real engines on her person-bound demo clock:
- valid baselines, and weekly Lab results that are deliberately mixed or flat (no improvement story) and visibly labelled **Demo scenario**;
- an active week-3 plan, with attempt-linked completions and one missed day;
- two weekly reviews and an eligibility-based level-up;
- Garden growth;
- her original Start Today admission and Weekend Nature Reset waiting-list place.

A presenter page (`Client/demo.html`) prepares, enters and restores identities, with confirmation and backups. A presenter guide documents a 6–8 minute walkthrough.

**Regression status: unchanged from the pre-edit baseline.**
- Command tests: 125/125 (117 original + 8 new).
- Every browser suite that passed before still passes.
- The two suites that failed before still fail identically: Product Journey (deferred source-regex error) and the Round 2D extension suite (environment-dependent observation sampling at step 09; steps 01–08, covering real pairing and blocking, pass).

## 2. Previous design findings

| Page | What regressed during the functional rounds | Evidence |
| --- | --- | --- |
| Insights | The browser-usage heatmap became a dense diagnostic table. The section meta showed `Browser-observed · local extension · active-domain-1`. Legacy Lab rows printed long protocol sentences. Beyond-the-screen cards gained paragraphs and raw booking IDs. | `before/default`, `before/rania` |
| Activities | **For You** showed four rows of `0/3 distinct qualifying examples · 0/3 separate days` with twelve mostly disabled buttons. History was raw `<details>` with JSON dumps. | Same |
| Recovery Plan | A bare "Active · Cycle 1" card with stacked lifecycle buttons and long paragraphs. Stale "Prototype preferences only; website blocking is not implemented". The Adjust tab described an obsolete "preview" mode. | Same |
| Digital Shield | Two oversized form columns, a legacy evening-preference form open at the top, policy paragraphs and visible disabled controls. | Same |
| Explore | Each listing type had a different detail layout. The Provider detail was a raw table with ISO dates, "version 1" and a policy paragraph. The sticky action bar covered content. A badge collided with the close button. **Pre-existing CSS defects:** `.ex-form{display:grid}` overrode `hidden`, so collapsed survey/entry forms rendered open in My Initiatives, and the sticky sheet footer overlapped those cards. | `before/details` |
| All member pages | The fixed "Demo data" chip covered the left edge of content. | — |

## 3. Original design references used

- The pre-rounds tree, commit `58b94e6`, served read-only from a scratch extraction:
  - Insights heatmap and Lab scales, which were restored;
  - Activities composition, which was preserved;
  - the Shield hero, ring timer and focus-basket composition (composition and craft only; the rejected app-grid features were not revived);
  - the Recovery overview, which was preserved.
- Existing art: Bimo heroes for every page; listing photos for Explore. No new imagery was generated.
- Register's current Individual path for Login.

## 4. Chosen visual direction

**Editorial calm.** The established ivory/sage palette and DM Sans are kept, with Fraunces only on Explore headings (the existing rule). Hierarchy comes from:
- one strong heading and one figure or visual per section;
- tabular numerals;
- tinted single-light-source shadows;
- generous but not inflated spacing;
- the four practice-family colours used consistently as identity everywhere.

Provisional Inter and the alternative hex values in `DeepSprout-DESIGN.md` were **not** adopted.

## 5. Tokens and component approach

These are documented in the design-system reference.

- **`style.css`** gained append-only tokens:
  - ivory and soft surfaces, secondary text, focus;
  - AA status pairs;
  - practice families (measured from the Activities cards);
  - chart tokens, a 14px small size, fluid metric size and 62ch measure;
  - soft and float shadows, the motion easing/duration set, and z-layers.
- **`individual-ui.css`** contains only `.ds-*` selectors.
- **`individual-ui.js`** adds:
  - the toggletip (one shared bubble with a polite live region; Escape returns focus; 44px hit area);
  - an IntersectionObserver reveal that is a no-op under reduced motion or jsdom.
- **`member-layout.css`** adds View Transitions and the compact demo chip.

Pixel comparison against the pre-edit tree at 1440 and 390 px, with reduced motion and clock pinned:

| Page | Result |
| --- | --- |
| Partner workspace | 0 changed pixels |
| Register | 0 changed pixels |
| Onboarding | 0 changed pixels |
| Home, Garden, Community, Pricing | Only the demo chip region differs (12–200 × 950–990 px), plus 378 px of image-decode antialiasing on Home at 390 px |

## 6. Pages redesigned

Insights, Activities (including the practice player and result), Recovery Plan, Digital Shield and Explore (cards, My Initiatives fixes, View Details), plus the Login background.

## 7. Insights

**Restored**
- The calendar-orientation heatmap (weekdays across, one row per week) and the per-site meters.
- It is drawn **only** from real extension periods. Days without observation are hatched "unknown", never zero. The detailed observation table moved into "How this was measured".
- The coverage tick bar in the hero.

**Concise labels, detail on demand**
- "Browser-observed" chip with a toggletip.
- Legacy Lab results show the number and "Earlier version", with the reason in a toggletip. The required "Comparison unavailable: version" status stays visible.
- Level reasons became short labels ("You moved up", "Starting level").
- Beyond-the-screen notes are one line plus a toggletip.

**Empty states**
- Compact empty states replace large wells.
- The obsolete "Your plan starts after your first check-in / Go to Check-in" now follows the current first-run contract: "No active Recovery Plan yet → Continue setup".
- A contradictory "You haven't joined an initiative" card no longer appears when a verified Institution initiative exists.

## 8. Activities

**For You** shows one actionable recommendation chosen from what the engine allows: today's scheduled practice first, then a goal-tagged optional example. It shows:
- title, family, level and estimated minutes;
- the reason it was chosen;
- a three-step "what you'll do" strip;
- one Start button that opens the player with that example preselected.

**Your levels**
- Four compact rows with segmented meters and plain status ("2 of 3 examples · 2 of 3 days", "Ready for Level 2").
- Try / Stay buttons render **only when eligible**, and Step down only above Level 1. The disabled-button grid is gone.
- The policy is in a toggletip.

**Elsewhere on the page**
- Browse cards show the person's own level.
- The Protected Work copy was corrected: blocking now exists, separately, in Shield.
- History is a dated timeline with family dots and status chips. Evidence, content version and record ID are inside each row, and raw responses sit in a nested disclosure. The first six items show, with "Show N earlier attempts".
- The player has a readable passage measure, card-style answer options with a checked state, a pill status line without the internal content ID, and a result card (check mark, evidence tier, Garden eligibility, Retry / Back).

**Levels were not changed.** "Not initialized" now reads "Not started — starts when your plan is active" only where `t.level` is genuinely null (a person without an active plan). No level was invented.

## 9. Recovery Plan

**Journey status bar**
- Shows the status, cycle and "3 of 4 due practices done this week", with a toggletip explaining that elapsed days are not progress.
- Contextual Weekly Review / Resume / Next Cycle actions appear only when valid.
- Pause, Resume and Archive stay one click away as quiet links. Cancel (with reason) and the personal demo clock are in compact popover disclosures.
- Browser support is shown as one line.

**Adjust** is now three numbered steps — focus, your week, why — and the preview is a visual card per future day, coloured by practice family. The "Effective <date> · N future days replaced · past work stays intact" banner stays first. Once previewed, Confirm becomes the only primary action.

**History** shows the latest eight days, with "Show N earlier days".

**Copy fixes**
- Support tools now read "Block chosen websites for a set time" and "Shared usage reminder", linking to Shield.
- **Read-model label fix** (`account.js history()`): the Digital Habits questionnaire was labelled "measured" and weekly Lab results "Cycle N". Lab results now read "Weekly Lab · week N" and the questionnaire "self-reported". This has regression coverage.

## 10. Digital Shield

**Status band** comes from the real bridge view:
- an orb coloured by state;
- the exact state string in `#connection-state`;
- a plain-language detail;
- a three-step setup path (Install → Pair → Protect / remind) highlighting the current step, with the guide and pairing form shown only while not connected.

**Manual Website Protection**
1. Choose websites (chips: IG / YT / TT).
2. Duration (15 / 25 / 45 / 60 presets plus a custom field).
3. Review: a live sentence, e.g. "Blocks all of Instagram and YouTube for 25 minutes in this browser", whole-site scope stated in visible text, consent, then Start.

After the extension confirms an Active session, a live panel shows a countdown ring drained from the extension's own `expiresAt`. Only then does "Stop protection early…" appear; it keeps its native confirmation.

**Shared Usage Reminder** shows today's observed figure and a meter against the threshold, site chips, threshold presets, an observation switch, and Configure.

Limits, privacy and local history are in a disclosure. The legacy evening preference (kept for Round 0's atomic-save check) is a small dashed card at the end.

**Extension internals untouched.** The genuine Connected and Protection Active states were captured by the real MV3 suite (`connected.png`, `protection-active.png`).

## 11. Explore and View Details

**One detail layout for Initiatives, Provider Experiences/Camps and sample listings**
- A hero photo, or a tinted kind banner when there is no approved photo.
- Kind and trust badge, a Fraunces title, and organiser.
- A readable article: lead, What it's for, Who can join, Schedule/parts as a dated timeline, a safety and consent callout, cancellation/completion terms, and participation rules in a disclosure.
- A sticky **At a glance** panel: When, Where, How, Places, Cost and Applications, plus the single next action or your booking/application status. The QR credentials, offer and cancel actions live here too.
- Dates are formatted (no ISO). The Provider Garden-policy paragraph is a toggletip on "Completion".
- Below 900 px the panel follows the article, so safety and consent are read before any booking form.

**Cards** without an approved photo get a kind-tinted art panel instead of a void, and the Provider cost became a fact row.

**Fixed**
- `[hidden]` now wins, so collapsed forms in My Initiatives stay collapsed.
- The sheet's sticky footer style no longer applies inside My Initiatives.
- Section explanations moved into toggletips.

**Checked:**
- Initiative with Accepted application;
- Camp with waitlisted booking (1440 and 390 px);
- full session;
- competition;
- the Provider booking flow (Provider suite);
- the Institution apply → confirm flow (Institution suite).

## 12. Login background

Login loads `register/experience/experience.css` and mounts `createLivingWorld(host, 'individual')` through a new `login-world.js`. Both are imported read-only; those files have another agent's uncommitted edits and were not modified (hashes match the baseline).

- **What changed beyond the background — so you can decide**
- The card moved from centre to the right, where the Register card sits, so it does not collide with the editorial copy. `register-card` was added to it so the network routes around it.
- The Register header was added (brand plus a "Create account" pill), and the in-card brand is hidden.
- The Individual editorial copy ("A place to become / A little intention. A new beginning.") is shown on the left.

**What stays the same**
- `login.css` (imported by Register) is untouched.
- `login-world.css` holds only three rules: card alignment, the hidden in-card brand, and the subtitle colour and alignment. The legacy blue `#6280b4` is about 4:1 on white; it is now the field's AA sage text.
- An earlier pine restyle of the submit button and other cosmetic tweaks were reverted. The original green gradient button, inputs, social buttons and admin demo entry render as before.
- Form fields, IDs, validation, routing and the admin demo entry are unchanged.
- Reduced motion stops the network (handled by the module).

## 13. Motion system

- **Cross-document:** `@view-transition { navigation: auto; }` on Individual pages only.
  - The old page fades and lifts away in 0.2s; the new one settles in over 0.32s; the header has its own transition name with zero duration.
  - Browser check: transitions fired on link and back/forward navigations and not under reduced motion.
  - Deep links (`#history` selects the History tab) and fragments (`#usage` scrolls) work; history back/forward works; no console errors.
- **In page:** one-time reveals, meter and segment growth, chip and switch state ease, the Explore sheet growing from its card, the Shield ring, a live-dot pulse only on verified states, and the result-card check pop.
- **Reduced motion:** every animation and transition stops. On all five pages, Login and Home, zero hidden sections and zero running animations were measured.

## 14. Demo accounts discovered and reused

| Identity | Notes |
| --- | --- |
| Ahmad (`p-ahmad`, journal `demo`) | Kept as the original seeded story |
| **Rania Yasin (`p-rania`)** | An existing verified Individual with an original accepted admission (`adm-rania`, Circle A, Coach Karim's task) and an original waitlisted booking (`b-rania`) — chosen as the main presentation person |
| Maya, Hala, Karim, Sami, Noor, Leen | Partner roles, unchanged |
| Fresh first run | Sign out → Register |

No new people, operational records or seed files were added. `demo-account.json` and `workspaces/data/*` are unchanged.

## 15. Fixtures added

**`Client/src/js/data/demo-scenarios.js`** — scenario `rania-active-journey`, day by day from Mon 28 Sep to Thu 15 Oct 2026, with the clock pinned at Fri 16 Oct 10:00 Amman. Events in order:
1. Setup.
2. Four baseline instruments (`beginAssessment`, then `assessment.add` with in-range raw responses; presentation `demo-scenario`; details "Synthetic presentation scenario").
3. `plan.activate`, with a chosen first-week schedule and the tour recorded as completed.
4. Each scheduled practice through `beginPractice` / `submitPractice` — **listening in transcript mode**, so no audio playback is claimed — plus one optional extra.
5. A skipped day on Thu 8 Oct.
6. Weekly Lab pairs on 5 and 12 Oct, with deliberately non-improving values (Digital Habits 18 → 18 → 19, where lower is better; Sustained Attention 83 → 79; Inhibitory Control 70 → 70).
7. Accepted weekly reviews on 4 and 11 Oct.
8. A Depth `practice.level next` once eligible.
9. Routine logs.

**Visible labelling.** A register key (`deepsprout-demo-scenarios-v1`) makes the demo chip read *Demo · Scenario*. On Insights, every synthetic Lab row and the section header show a **Demo scenario** chip, with a toggletip saying the results are synthetic and not evidence of improvement. The Lab attempt history marks them "Demo scenario · synthetic result". The marker is the attempt's own `measurementContext.presentation` or `details`, so real results are never labelled.

**Presenter page (`Client/demo.html` → `src/pages/demo/presenter.*`)**
- Prepare/restore asks for confirmation first, saves Rania's current private keys to a dated backup, and touches only `…:person:p-rania` keys.
- It optionally pins the shared demo clock (local server only).
- It also restores Ahmad's seeded story (with backup) and can reset shared records (local only, confirmed).
- It builds on a fresh page load so the journal binds to the correct person.

## 16. Record and source integrity checks

`Client/tests/demo-scenario.test.mjs` has 8 cases, all passing. They check that:
- the plan is active (week 3, day 19) on the person-bound clock;
- all four baselines plus four weekly results are valid, carry every contract field, belong to Rania, are labelled synthetic, and match the plan's `baselineIds`;
- every completed day references a valid attempt of the same person, type, date and `scheduledActionId`, one attempt per obligation, the skipped day is *missed*, today is due, and listening is transcript-tier;
- reviews reference the plan's cycle and journey for weeks 1 and 2;
- the Depth level decision was preceded by three distinct examples on three days;
- no Protected Work evidence was fabricated;
- every Garden source key is a reward-eligible attempt;
- no Shield telemetry exists;
- `b-rania` (Waitlisted) and `adm-rania` (Accepted) are unchanged;
- the scenario cannot be built over existing records, and Person B (Yara) cannot read it;
- history labels the questionnaire as self-reported and names weekly Lab windows;
- no repeat Lab result is better than its baseline, and every repeat carries the synthetic marker.

## 17. Presentation walkthrough

See the [demo presentation guide](deepsprout-demo-presentation-guide.md):
- a 6–8 minute route: Home → Recovery Plan → Activities (complete today's practice) → Insights → Garden → Shield → Explore details;
- a cross-role coda: Sami's waiting list, Karim's assignment, Maya's admissions — verified in the browser;
- resets, what to avoid, and the port 8897 requirement for the extension.

## 18. Files changed

**Modified**
- `Client/src/styles/style.css` (append-only tokens)
- `Client/src/layouts/member-layout/member-layout.{css,js}`
- `Client/src/js/data/account.js` (history label only)
- `Client/src/pages/member/insights/insights.{html,css,js}`
- `Client/src/pages/member/training/training.{html,css,js}`
- `Client/src/pages/member/recovery-plan/recovery-plan.{html,css,js}`
- `Client/src/pages/member/shield/shield.{html,css,js}`
- `Client/src/pages/member/explore/explore.{html,css,js}`
- `Client/src/pages/auth/login/login.html`
- `Client/src/pages/member/lab/lab.js` (one line: the synthetic-result label)

**New**
- `Client/src/styles/individual-ui.css`
- `Client/src/js/ui/individual-ui.js`
- `Client/src/js/data/demo-scenarios.js`
- `Client/src/pages/demo/presenter.{html,css,js}`
- `Client/demo.html`
- `Client/src/pages/auth/login/login-world.{css,js}`
- `Client/tests/demo-scenario.test.mjs`
- `Client/docs/design/individual-design-system.md`
- `docs/implementation/deepsprout-demo-presentation-guide.md`
- this report

## 19. Screenshots and viewports

All captures are outside the repository, under the session scratchpad (`…/scratchpad/`):

| Folder | Contents |
| --- | --- |
| `before/default`, `before/rania` | Five pages, Login, Register; 1440 and 390 |
| `before/details` | View Details |
| `old-shots` | Pre-rounds references |
| `after/final` | Five pages and Login; 1440 and 390 |
| `after/final-ahmad` | Legacy story |
| `after/states` | Fresh person, review due, practice completed; 768 and 1024 for all five pages |
| `after/details` | Initiative, Camp at 1440 and 390, session, competition |
| `diff/` | Preserved-page pixel comparisons |
| `runs/*/round2d-extension/` | Genuine Connected and Protection Active |

No page showed horizontal overflow at 390, 768, 1024 or 1440 px.

## 20. Issues found in the browser and corrected

- Heatmap left a large void at 7/14 days → calendar orientation.
- Glance label wrap ("PLAN / ADHERENCE").
- Coincident Lab marks collided when a repeat equalled the baseline; they are now one mark with both dates and "same".
- Synthetic Lab results were not visibly labelled, and the first scenario values improved week on week. Both are corrected (§15).
- Toggletip far from its text on mobile.
- Two jsdom/page-wiring regressions (missing `matchMedia`; a dynamic `getElementById`).
- Status chip stretched in the glance panel.
- The no-media glyph was clipped.
- The For You empty card stretched; empty For You area in the pick card.
- Duplicated "this browser only" text.
- Shield stop button visible while nothing was active.
- The Explore hidden-form and sticky-footer overlaps.
- Demo chip covering content.
- Product tour modal greeting the presenter.
- Obsolete check-in prerequisite copy.

## 21. Functional regression results (final run, after all edits)

| Suite | Before edits | After edits |
| --- | --- | --- |
| Command tests | 117/117 | **125/125** (+8 demo-scenario) |
| Round 0 browser | Pass | Pass |
| Round 2A browser | 16/16 | 16/16 |
| Round 2B browser | 17/17 | 17/17 |
| Round 2C browser | 17/17 | 17/17 |
| Round 2D extension (port 8897) | Fail at step 12, then 09 (8 steps pass) | Fail at 09 (8 steps pass), twice — same assertion `periods.at(-1).seconds['instagram.com']>1` |
| Provider | 20/20 | 20/20 |
| Coach | 38/38 | 38/38 |
| Institution | 25/25 | 25/25 |
| Supervisor | 18/18 | 18/18 |
| Partner | 100 routes, 0 errors | 100 routes, 0 errors |
| Registration experience | Pass | Pass |
| Member journey | 14/14 | 14/14 |
| Page wiring | Pass | Pass |
| Admin dashboard | Pass | Pass |
| Admin–member integration | Pass | Pass |
| Product Journey | Fail before launch (deferred source regex) | Same, unchanged |

**About the Round 2D extension suite**
- The step-09 failure is in extension observation sampling under this machine's headless Chromium (Playwright 1.64.1, `chromium-1248`). It reproduces on the unmodified tree, and the extension source was not changed.
- The original Round 2D report used Chrome for Testing 156; that runtime is not available here.
- The UI assertions of the unreached steps (14, 17, 19: Insights observed/empty states, cross-page Shield text, 390 px layout, `[data-feature]` count, no overflow) were re-run directly and pass. Step 14 used a stubbed read model, because real observation is what fails here.

All browser outputs went to the scratchpad. Partner, Product Journey and the Admin suites ran through the existing output-redirect wrapper.

## 22. Accessibility and reduced motion

- **Toggletips:** keyboard Enter opens with `aria-expanded=true` and the text in a live region; Escape closes and restores focus; touch tap opens within the viewport and closes on an outside tap.
- **Contrast:** every new token pair is AA (text-2 7.5, muted 5.0, warning 5.2, error 5.6, info 4.8, leaf 4.6, family inks ≥ 5.2).
- **Controls:** visible focus rings on all new controls; 44px targets on chips, presets and toggletips; native inputs kept under styled chips (Playwright `check()` passes).
- **Reduced motion:** no hidden content or running animations on any audited page.

## 23. Preservation of historical and concurrent work

- The baseline status, diff and 1,059 file hashes were captured before editing.
- Register's concurrent uncommitted files (`entry.js`, `experience.css`, `living-world.js`, `workspace-entry.js`, `register.html`, the untracked `glyphs.js`, `living-registration.md`) and `login.css` / `login.js` are byte-identical to the baseline.
- 421 protected files are unchanged: `Client/docs/validation/**`, all earlier reports and audits, `DeepSprout.md`, the `DESIGN` files, `AGENTS.md` and `Client/src/data/*`.
- No reset, clean, stash or checkout; no commit; the user's browser profile was never opened.

## 24. Remaining limitations

**Shield and extension**
- A populated Insights website-time view requires real extension observations. It was checked with a QA-only stub of the read model in a disposable context, never shipped.
- Live Shield blocking needs the unpacked extension and the `127.0.0.1:8897` origin.

**Demo scope**
- The shared demo clock and shared reset only work on a local server.
- Presenting on a non-local host shows the scenario but cannot pin the shared clock.
- Ahmad's legacy story legitimately shows "0 of 3 examples" and legacy labels; Rania is the intended presentation identity.

**Not redesigned in this task**
- Weekly Review, Lab and Profile.
- The Partner workspaces have tokens available but were deliberately not restyled.

**Measurement**
- Cross-document View Transitions apply in Chromium 126+ only.
- Toggletip positioning uses viewport math rather than CSS anchor positioning.

## 25. Recommendations for later rounds

- Restore a stable Round 2D runtime (Chrome for Testing 156) for the observation steps.
- Bring Weekly Review, Lab and Profile onto `.ds-*`.
- Consider making the scenario builder data-driven for a second persona, for example a Student who upgraded.
- Teach the Institution Applications view to filter by status from a URL, so presenters can deep-link Rania's accepted application.
- Retire the legacy evening-preference card once Round 0's atomic-save check targets a current preference.
