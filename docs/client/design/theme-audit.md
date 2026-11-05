# Theme audit — measured values from the existing pages

Measured with `getComputedStyle` on every visible element at 1440px, on Home, Roadmap,
Activities, Garden, Explore and Community. The new Community sidebar, the dev switch and
Insights were excluded. "×n" = number of elements using the value.

Recommendations marked **(rec)**. Where pages disagree, every variant is listed.

## 1. Font family

| Page | Body | Headings | Notes |
|---|---|---|---|
| Home | DM Sans | DM Sans | Kalam ×2 (handwritten accents) |
| Roadmap | DM Sans | DM Sans | |
| Activities | DM Sans | DM Sans | Kalam ×1 |
| Garden | DM Sans | DM Sans | |
| Explore | DM Sans | **Fraunces** (serif) ×12 | section and card titles |
| Community | **Nunito Sans** ×46 | DM Sans (hero only) | Comic Neue also loaded |
| Header/footer | DM Sans | DM Sans | |

**Inter is not used anywhere.** (rec) **DM Sans** as the single family; remove Fraunces (Explore)
and Nunito Sans / Comic Neue (Community). Keep Kalam only as a decorative accent, or drop it.

## 2. Headings

| Role | Variants measured | (rec) |
|---|---|---|
| Page H1 (shared hero) | 45.6px/800, ls −0.045em, lh 1.04 — Roadmap, Activities, Explore, Community · Home 58.3/800 · Garden 54.4/800 | **45.6px (clamp 2rem–3.3vw–2.85rem) / 800**, Home keeps its own hero |
| Section H2 | 38/800 ls −0.05em (Home) · 32.8/800 ls −0.04em (Activities) · 30.4/800 ls −0.035em (Roadmap) · 24/800 (Garden) · 24/600 Fraunces (Explore) | **30.4px / 800, ls −0.035em, lh 1.12** (Roadmap) |
| Panel H2 | 24/700 (Garden, Roadmap "This week in numbers") · 23.2/700 | **24px / 700** |
| Card H3 | 22.4/800 (Roadmap) · 20.48/800 ls −0.03em (Activities) · 19.5/800 · 18.24/600 Fraunces (Explore) · 15.4/800 Nunito (Community posts) | **20.48px / 800, ls −0.03em** |

## 3. Body, secondary, caption, eyebrow

| Role | Variants measured | (rec) |
|---|---|---|
| Body | 16/400 (Activities ×10) · 16.32/400 lh 1.5 (hero text, all pages) · 15.68/400 lh 1.5 (Roadmap, Activities) | **16px / 400, lh 1.5** |
| Secondary text | 13 · 13.12 · 13.5 · 13.6 · 13.76 · 14 · 14.08 · 14.4 · 14.72 · 15 · 15.04 · 15.2 · 15.36 · 15.68 — fourteen values, no tier | see decision D1 |
| Caption | 12/400–600 (Home, Community) · 12.16/600 (Explore ×20) · 11.84 | **12px** |
| Eyebrow | 11.84/700 ls .16em uppercase, leaf green (shared hero ×4 pages) · 12/800 ls .14em (Home) · 13.12/700 ls .1em (Roadmap week labels) | see decision D2 |
| Large numerals | 36.8/800 (Roadmap) · 32/500 (Garden) · 27.2/800 (Garden) · 20/800 (Home) | **DM Sans 800, tabular-nums** |

Weights in use: 400 body · 600/700 labels · **800 headings and numerals**. Nothing uses 500 for
headings (Insights does — wrong).

## 4. Colour

| Role | Variants measured | (rec) |
|---|---|---|
| Ink (headings/text) | #173c33 (theme.css `--ink`; Roadmap, Activities, Explore) · #102b2d (Home) · #102a50 navy (Community) · #071d55 navy (shared header/footer) | **#173c33** |
| Deep green | #123f34 (`--pine`) · #0b2f28 (`--deep`) | **#123f34** |
| Muted text | #5d7469 (Roadmap, Activities ×48) · #637b70 (`--muted`, Explore ×52) · #66716e (Home) · #6b7f74 (Garden) · #6b89ae blue-grey (Community) | **#5d7469** |
| Primary / leaf | #168557 (`--leaf`; Roadmap, Activities, Explore) · #17693f (Home) · #159c63 (Community buttons) | **#168557** |
| Page background | #f7f8f2 (Roadmap, Activities) · #faf9f3 (Home) · #fbfbf6 (Garden) · #f9fcf5 (Explore) · #f9faf4 (`--cream`) | **#f7f8f2** |
| Surface | #fffefa ×20 · #fffdf6 (`--paper`) · #ffffff | **#fffefa** |
| Line / border | #e2e9de (`--line`) · #e3eadf (hero) · #e7e1d7 (Community) | **#e2e9de** |
| Mint tint | #dff2df (`--mint`) · #e9f5ed · #e8f3e2 | **#dff2df** |
| Gold | #e9b956 (`--gold`) · #f1d48c · #8f5d0b text | **#e9b956** — the over-limit accent |
| Other accents | purple #5a4796/#ece7f8 · blue #2a5f8c/#eef5fb · orange #a54a2e/#fdf1ec — Activities practice types, Home space cards | see decision D3 |

Your Insights brief's values (cream #faf8f3, ink #292d2a, sage #82ab80/#4e7759) occur on **no**
existing page. Proposed mapping of the Insights colour language onto the app's own colours:
measured value = leaf #168557 and its tints · context = muted #5d7469 / line #e2e9de ·
no data = hatch · over limit = gold #e9b956 border · missed = existing red border.

## 5. Shape, depth, layout

| Token | Variants measured | (rec) |
|---|---|---|
| Radius — hero/section | 28px (hero, Activities block) · 26px (Roadmap journey) | **28px** |
| Radius — card | 22px (Roadmap ×10) · 24px (Activities practice cards) · 20px (Explore cards, `--ds-radius`) · 15px (Community posts) | **22px** |
| Radius — inner tile | 14–15px · 12px · 8px | **14px** |
| Radius — pill | 999px · 40px | **999px** |
| Shadow — card | 0 14px 34px #123f34 @6.3% (Roadmap ×9) · 0 12px 32px @8% (`--ds-shadow`, Explore ×11) | **0 14px 34px rgba(18,63,52,.063)** |
| Shadow — hero | 0 18px 44px #123f34 @7% (all pages) | **0 18px 44px rgba(18,63,52,.07)** |
| Shadow — primary button | 0 10–12px 22–24px #168557 @19–21% | **0 10px 22px rgba(22,133,87,.2)** |
| Container | **1180px** centred (Roadmap, Activities, Garden, Explore, shared hero) · 1312px (Home) · 1310px (Community) | **1180px**, gutter `calc(100% − 72px)` |
| Section card padding | 32px (Roadmap) · 34px (Activities) · 30px · 22–26px (Garden) | **32px** |
| Spacing values | 4 6 8 10 12 14 16 18 20 22 24 26 30 32 34 (even values dominate) | see decision D4 |

## 6. Breakpoints and motion

| Token | Variants measured | (rec) |
|---|---|---|
| Breakpoints (shared layout) | 1180 · 930 · 650 | **1180 / 930 / 760 / 650 / 480** |
| Page-specific | 1080, 1000, 900, 860, 760 (Roadmap, Activities, Explore) · 520, 480 · Community 1350 / 1050 / 700 / 390 | fold into the five above |
| Easing — standard | cubic-bezier(.2,.7,.2,1) (Home, Roadmap, Activities, Garden) · (.2,.8,.2,1) (recent additions) · ease ×70 | **cubic-bezier(.2,.7,.2,1)** |
| Easing — playful | cubic-bezier(.3,1.4,.5,1) (Home, Garden) | **keep as `--ease-spring`** |
| Durations | .2s ×47 · .25s ×19 · .3s ×21 · .35s · .5s · .7s (reveals) | **.2s / .3s / .7s** |
| Properties animated | existing pages transition background, border-color, color and box-shadow, not just transform/opacity | see decision D5 |

## Decisions needed

- **D1 Secondary text.** (a) Your rule: body 16, eyebrow 13, caption 12, nothing between. (b) Keep a
  14px secondary tier. **(rec) (a)** — the measured 13–15.7px band is fourteen different values, not
  a tier, so collapsing it costs nothing systematic.
- **D2 Eyebrow.** (a) 13px as you specified · (b) 11.84px as the shared hero uses today.
  **(rec) (a) 13px**, keeping the measured 700 weight, .16em tracking and leaf colour.
- **D3 Purple, blue and orange accents** on Activities and Home. (a) Keep them as-is — the real pages
  win · (b) remap to the green/gold palette. **(rec) (a) for now**, and decide on each page's own part
  (they label practice types, so they carry meaning).
- **D4 Spacing.** (a) Tokens exactly equal to the measured values, so existing pages don't move ·
  (b) a 4-pt scale with values snapped (visible small shifts). **(rec) (a)**, honouring "no visual
  regressions".
- **D5 Hover transitions** on existing pages that animate colour, background or shadow. (a) Leave
  them, and apply transform/opacity-only to new and redesigned work · (b) convert all of them now.
  **(rec) (a)** — converting changes how every existing page feels.
- **D6 Community's navy and Nunito.** It is the outlier on font, ink and muted colour. (rec) Move it
  to DM Sans and #173c33 / #5d7469 when style.css is applied. This will visibly change Community.
- **D7 Header/footer navy (#071d55).** It differs from every page's ink. (rec) Switch to #173c33 in
  Part 2, the footer rebuild.
