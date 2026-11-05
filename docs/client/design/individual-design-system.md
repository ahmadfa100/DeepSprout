# DeepSprout — Individual design system reference

October 2026. Applies to the regular Individual pages. It extends the measured theme in `src/styles/style.css` and records what was actually chosen, not the provisional values in `DeepSprout-DESIGN.md`.

## Files and loading order

| File | Role | Loaded by |
| --- | --- | --- |
| `src/styles/style.css` | The one token source. The October additions are **append-only**: no earlier value changed. | Every page |
| `src/layouts/member-layout/member-layout.css` | Header, footer, demo chip, cross-page View Transitions | Individual pages only |
| `src/styles/individual-ui.css` | Opt-in `.ds-*` components. No bare element selectors, so it cannot restyle a page that does not use the classes. | Insights, Activities, Recovery Plan, Digital Shield, Explore |
| `src/js/ui/individual-ui.js` | Toggletips (`DeepSproutUI.help`) and one-time reveal (`data-reveal`) | Same five pages |
| Page stylesheet | Page composition only; consumes the tokens | Each page |

Partner workspaces, Admin, Register and onboarding load none of the new files. Pixel comparison against the pre-change tree showed no difference on the Partner workspace, Register or onboarding. Home, Garden, Community and Pricing were also unchanged apart from the smaller demo chip.

## Tokens (as chosen)

- **Fonts:** DM Sans everywhere. Fraunces is used only for Explore headings, as the existing rule requires, and never for numerals. Inter was not adopted.
- **Palette:** the measured ink `#173c33`, pine `#123f34`, leaf `#168557`, background `#f7f8f2`, surface `#fffefa` and mint `#dff2df`, plus these additions:
  - `--color-ivory` and `--color-surface-soft` for hero and well surfaces.
  - `--color-text-2` for secondary body text (AA on surface).
  - `--color-line-strong` and `--color-focus` for borders and focus rings.
  - Status pairs `--color-{success|warning|error|info}` and `-soft`. Each text colour meets AA on its own soft background.
- **Practice families:** `--practice-{depth|listening|practical|protected}` with `-tone` and `-soft` variants, measured from the Activities cards (amber, sky, lilac, peach). They are reused for Insights levels, History dots, Recovery previews and the Explore art panels, so a family looks the same everywhere.
- **Charts:**
  - `--chart-1…3`, `--chart-track` and `--chart-grid`.
  - A measured value is solid. A self-reported value is a ring or dashed line, never a new hue.
  - No data is the hatched `--pattern-no-data`, never a zero.
- **Type additions:**
  - `--text-small` (14px) and `--text-metric` (fluid 32–44px).
  - `--measure: 62ch` for reading lines.
  - Tabular numerals for every figure.
- **Depth:**
  - `--shadow-soft` for resting surfaces.
  - `--shadow-float` for popovers and menus.
  - Both are tinted pine with a single light source.
- **Motion:**
  - Easing: `--ease-out` for entrances, `--ease-in` for exits, `--ease-in-out` for state swaps.
  - Durations: `--dur-instant` (press), `--dur-reveal` (section), `--dur-page` (cross-page).
  - `--stagger` sets the per-item delay in a revealed group.
- **Layers:** `--z-sticky`, `--z-popover` and `--z-dialog`.

## Components (`.ds-*`)

| Pattern | Use |
| --- | --- |
| `.ds-btn` (+ `data-variant=secondary\|light`, `data-size=sm`) | One primary action per section. The arrow nudges on hover; buttons press down on `:active`. A `hidden` button really hides. |
| `.ds-link` | Quiet text action with an arrow |
| `.ds-chip` (+ `data-tone=quiet\|warning\|error\|info\|live`) | Provenance and status labels. `live` pulses gently and is used only for states the system has verified. |
| `.ds-empty` | Compact empty state: icon, one line, one action. Never a full-height blank panel. |
| `.ds-meter` | Numerator / denominator bar that grows once |
| `.ds-tabs` / `.ds-tab` | Pill segmented control |
| `.ds-disclosure` | Secondary detail, such as measurement method or raw records |
| `.ds-help` + `DeepSproutUI.help(label, text)` | Toggletip for secondary explanations. It opens on click, tap, Enter or Space; Escape, a second click or a click outside closes it. The text is announced through a polite live region, and the hit area is 44px. |

### Rules

1. **Say less, show more.** A section gives a short heading, the figure or visual, and one action. Methodology, thresholds and source identifiers go into a toggletip or disclosure, and are never deleted.
2. **Never hide consequences.** Price, consent, safety, cancellation and whole-site blocking scope stay visible before any consequential action.
3. **Verified states only.** "Protection active", "Connected" and live dots appear only after the extension or the engine confirms the state.
4. **Keep test hooks.** Redesigns keep existing IDs, names and `data-*` attributes; they may restyle or reorder them, not rename them.

## Motion language

- **Page to page:** cross-document View Transitions (`@view-transition { navigation: auto; }`) in `member-layout.css`. The old page fades and lifts away in 0.2s; the new one settles in over 0.32s while the header holds still.
  - This works in Chromium 126+. Other browsers navigate normally.
  - It is turned off under reduced motion.
  - Links, back/forward, deep links and fragments are unchanged. This was verified in the browser.
- **In page:**
  - Sections fade up once on entry.
  - Charts and meters grow once.
  - Tab and choice swaps use a 0.2–0.3s ease.
  - The Explore detail grows out of its card.
  - The Shield countdown ring drains each second from the extension's own expiry.
- **Reduced motion:** every animation and transition stops; content is shown immediately.

## Responsive

- Breakpoints: 1180, 980/930, 760 and 600 px (360 is the smallest checked width).
- Two-column compositions (For You, Shield cards, Explore detail article and glance panel) stack below 900–980 px. The Explore glance panel then follows the article, so safety and consent are read before the booking form.
- Checked at 390, 768, 1024 and 1440 px with no horizontal page scroll.

## How future pages should use this

1. Load the four shared files in the order shown above.
2. Build with tokens and `.ds-*` classes.
3. Add page-specific composition in the page stylesheet only.
4. If a pattern is needed on two pages, promote it to `individual-ui.css` with a `.ds-` prefix.

Partner workspaces keep their denser operational styles and should adopt tokens deliberately, page by page.

## Known exceptions

- Login reuses the Register experience stylesheet (`register/experience/experience.css`) and network module so its background is identical. `login.css` itself is untouched, because Register imports it.
- Garden, Home, Community and Pricing were not restyled.
