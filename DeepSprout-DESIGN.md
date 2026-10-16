---
version: alpha
name: DeepSprout
description: "Starter visual system for the DeepSprout Angular digital-wellbeing platform. Proposed numeric tokens must be reconciled with the existing UI before adoption."
colors:
  primary: "#305B48"
  primary-hover: "#254936"
  primary-soft: "#DDE9DD"
  secondary: "#7D9F8D"
  tertiary: "#B8CBAE"
  neutral: "#F8F7F2"
  ivory: "#FFFCF6"
  surface: "#FFFFFF"
  surface-soft: "#F3F7F0"
  on-surface: "#253730"
  text-muted: "#596B62"
  border: "#DCE5DB"
  error: "#AC3D3D"
  focus: "#285E4A"
typography:
  display:
    fontFamily: "Inter"
    fontSize: 48px
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: "Inter"
    fontSize: 32px
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-md:
    fontFamily: "Inter"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  body-md:
    fontFamily: "Inter"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.35
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px
  content-max: 1200px
rounded:
  sm: 8px
  md: 14px
  lg: 20px
  xl: 28px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 14px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 12px
---

# DeepSprout — DESIGN.md

## Overview

**Product:** DeepSprout, a digital-wellbeing platform that helps young people reduce unintentional short-form scrolling, regain agency over attention, and connect with meaningful real-world activity. There are several authorized workspaces: Individual, Mentor, Invited Student, Institution, Outdoor Provider, Supervisor, and Admin.

**Art direction:** calm, premium, friendly, credible, botanical and highly readable. Use warm ivory/cream, pastel sage, dark forest headings, generous whitespace, restrained original illustrations, and a clear hierarchy. Avoid gamified visual noise, repetitive generic cards, and unverifiable progress displays. English UI copy is the current product direction; support future Arabic RTL.

**Important status:** The visual direction is derived from the DeepSprout product specification. The exact hex values, sizes, Inter font choice, and radii above are **starter proposals**, NOT final approved brand tokens. Before changing the running Angular application, inspect its current fonts/assets/CSS variables and compare them with actual screenshots. Reconcile with the project owner or preserve the established implementation where it differs. Never replace original Bimo art with a generated imitation.

## Colors

- **Primary deep forest (`#305B48`):** primary CTA, active navigation, meaningful accents; avoid saturating large areas.
- **Soft sage (`#DDE9DD` / `#B8CBAE`):** subtle botanical accents, gentle backgrounds, supporting surfaces.
- **Warm ivory (`#FFFCF6`) and neutral (`#F8F7F2`):** calm page canvases, especially public/auth flows.
- **White (`#FFFFFF`):** major content surfaces and the clean, fixed Garden scene.
- **Dark forest (`#253730`):** text/headings; muted text `#596B62` with accessible contrast.
- Use errors only for actual problems. Never rely solely on green/red to convey status.
- Check WCAG AA contrast; if starter tokens fail in actual pairing, improve the pairing before release.

## Typography

- Calm editorial hierarchy. Headlines feel composed rather than oversized or loud.
- Default proposed font: Inter, subject to audit of the currently licensed/loaded project typeface. If the current UI already has an established coherent font, preserve it pending review.
- Do not mix unrelated font families or decorative text treatments. Use clear headings, legible body copy, readable labels, and restrained technical metadata.
- Establish typography with reusable Angular/CSS design tokens; mobile sizes should scale down without wrapping crucial buttons awkwardly.

## Layout

- Responsive grid with a desktop max width near 1200px (provisional), comfortable gutters, distinct section rhythm, and generous whitespace.
- Separate major homepage sections intentionally rather than compressing everything into a single crowded dashboard.
- Preserve semantic reading order on mobile, touch-friendly targets, keyboard access, and natural LTR English / future RTL Arabic adaptation.
- Prefer meaningful whitespace and lightweight boundaries over nested cards, arbitrary badges, excessive dividers or shadows.

## Elevation & Depth

- Quiet layers: warm canvas, soft tonal differences, subtle thin borders and very restrained shadows.
- Avoid dark gradients, glassmorphism, repeated glowing effects, deep drop shadows, and motion for its own sake.
- Motion should indicate meaningful transitions and honor `prefers-reduced-motion`.

## Shapes

- Approachable, softly rounded cards, forms and primary buttons. Consistent corner radius across features.
- Botanical details are reserved for suitable hero/illustration moments; do not scatter generic leaf icons everywhere.
- Focus states must be visible, not replaced with decorative shadow alone.

## Components

- **Navigation:** Individual uses a top-level navigation system with Home, Recovery Plan, Activities, Digital Shield, Garden, Lab, Insights, Explore and Community. Admin uses a functional sidebar instead; other workspaces have their own role-appropriate navigation. Authorized workspace switching is not a grant of permissions.
- **Buttons:** One state-aware primary action per section/screen; secondary actions visible but not competing. Disabled, loading, success and failure states must be accurate.
- **Cards:** content-first, succinct; avoid repeated card-within-card patterns. Use real data, not pretend live user counts, testimonials or fake scores.
- **Forms:** clear persistent labels, compact helpful validation, keyboard states, appropriate multi-step progress and save/resume where needed.
- **Register:** top-level exactly two entry cards: Join as Individual and Join as a Partner. Botanical personal scene for Individual; more interconnected people/organizations motifs for Partner, with gentle transitions. Partner then chooses Mentor / Institution Representative / Outdoor Provider.
- **Bimo:** only approved original mascot assets; use sparingly in onboarding and meaningful contextual moments. Do not regenerate a lookalike.
- **Home:** dedicated Hero, Your Goal, Your Garden, Offline Ideas, Outdoor Experiences, Join an Initiative, Community preview, How It Works, final CTA, Footer. One state-aware next-action CTA.
- **Recovery Plan:** calm four-week roadmap with Overview, This Week, Adjust, History. Never label elapsed time or adherence as medical recovery percentage.
- **Digital Shield:** visually distinguish only two main capabilities: Manual Website Protection and Shared Website Usage Reminder. Show extension coverage/connection honestly.
- **Activities:** clarify four practices (Depth Practice, Listening & Recall, Practical Micro-Challenge, Protected Work) plus simple My Offline Routine. No standalone Stillness & Reflection family.
- **Garden:** critical requirement: **ONE fixed clean white/ivory scene and ONE main plant**; small base/soil/pot, restrained growth, perhaps a tiny earned companion. No open world, landscape zones, four garden plots, roads, islands or manual XP watering button. Earned growth persists; current vitality can change; missing data is not failure. Whether plant matures into a small tree or remains a flowering plant is still undecided.
- **Insights:** source-labeled metrics, no invented percentages or seamless trend charts without real observations. Differentiate browser-observed, self-reported, system-scored and supervisor-confirmed evidence.
- **Explore:** real initiatives, sessions and provider-run events/camps with independent booking status and online/in-person/hybrid labels.
- **Partner workspaces:** denser operational layouts are acceptable while staying visually cohesive; prioritize tables, permissions, forms, registrations and evidence-backed status over decorative sections.

## Do's and Don'ts

- **Do** inspect the current Angular project and screenshots before editing style tokens; adapt proposals to existing brand decisions.
- **Do** keep existing Angular routing, state management, API contracts and ASP.NET Core workflow intact during visual refactors.
- **Do** compare small laptop, desktop and mobile viewport behavior; check contrast, focus states and reduced-motion behavior.
- **Do** preserve source distinctions: registration is not attendance, participation is not completion, and activity records are not a clinical recovery score.
- **Do** treat Garden as a deliberately minimal central one-plant composition.
- **Don't** rebuild the project in React/Next.js to match a generic skill example. DeepSprout uses Angular.
- **Don't** introduce invented Bimo art, paid-gated recovery, fake metrics, generic gamification, endlessly scrolling feed or arbitrary extra features.
- **Don't** transform every page into the same pastel bento dashboard; distinguish marketing/Individual vs professional/Admin information density.
- **Don't** apply a reference website's palette wholesale; references are inspiration, not DeepSprout's approved brand.
- **Don't** treat the provisional numeric tokens above as a final owner-approved decision. Record updates explicitly after visual review.
