# DeepSprout four-cycle redesign — implementation log

**Date:** 6 November 2026 · **Scope:** partner workspaces (`workspaces.html`) of the ASP.NET Core MVC demo, plus the Explore/Home/Insights integration points the new ownership model touches. Personal Garden, Recovery, Shield and Lab mechanics were not changed.

This log records what was implemented, how it was verified, and what is still open. It supersedes the Outdoor Provider parts of older cycle audits (`docs/cycles/outdoor-provider.md`, Provider implementation reports) without rewriting them.

## 1. Product decision implemented

**Outdoor Provider is retired as a product actor.** Verified Institutions organize their own **Outdoor Activities** (trips, hikes, youth outdoor events, camps, community outdoor projects). An Institution now creates two top-level resource types:

| Type | Owner | Joins by | Key limits |
| --- | --- | --- | --- |
| **Initiative** (Online / Hybrid / Face-to-Face) | Institution | Application → admission | ≤ 135 accepted students, ≤ 3 active Supervisors |
| **Outdoor Activity** | Institution | Booking → (waiting list → seat offer) | Its own capacity (1–1000); not Initiative limits |

What changed structurally:

- Public Partner registration offers **Institution Representative** (and the existing Coach path); the Provider path, schema and `auth.application.save` for `provider` are refused. Old `#/auth/account/provider` links explain the change.
- The `provider` workspace is gone from navigation and access (`workspaces()` never returns it). `#/provider/*` renders a retirement notice that links only to destinations the person can open (`pages/retired-provider.js`).
- Owner commands are `activity.*` and are authorized in `store.js` against the Representative's **own Institution** (`p.ownerId` is injected after the check). Supervisor commands stay appointment-scoped (`supervisor.*`).
- **Field facts belong to the Supervisor.** The Representative can no longer record Outdoor check-in, close-out or corrections (`activity.attendance*` is refused); a session without an accepted Supervisor shows **Needs Supervisor**. The Representative still decides review-based completion and evaluations.
- Provider partnerships are retired; an Initiative now links one of the **same Institution's** Outdoor Activities as a component (`type:'Outdoor Activity'`). Linking never copies or creates bookings; another owner's activity is never projected.
- Admin no longer has a Provider queue (`admin/providers` explains the retirement) and gains **Outdoor Activities governance** (`admin/activities`).
- Explore, Home and Insights show **“Organized by <Institution>”** from the verified profile; Explore's chip reads “Outdoor Activities”.

### Data migration (no silent deletion)

`activity-rules.js → normalizeActivityData()` runs on read (after an untouched backup at `deepsprout-ecosystem-demo-v1:backup:before-activity-v2`):

1. Provider-owned activities move to an Institution only by explicit mapping: the documented fictional seed pair `prov-trails → org-horizon`, or the same verified person representing both a Provider and an approved Institution. The record keeps `legacyOwner` and a history entry.
2. Anything else is **archived read-only** with `archivedReason`; held seat offers are released. Bookings, attendance, completion and Garden sources keep their IDs.
3. Open partnerships become `Retired` with a history entry; Provider workspaces are removed from people (`retiredWorkspaces` records it); Provider applications are flagged `retired`.
4. A migration record is appended to `s.migrations`. The migration is idempotent (tested).

Storage collection names (`experiences`, `experienceSessions`, `bookings`, `offers`, `providerCompletions`) and Garden source keys are deliberately unchanged so no reward can duplicate. Module and selector names moved to the new model: `activity-rules.js`, `activity-completion.js`, `shared/activity-selectors.js` (`exploreOutdoorActivities`, `myActivityBookings`, `outdoorActivityCard`, `activityReport`), `builders/outdoor-activity.js`.

### Seed and demo clock

- Horizon Youth Center now owns *Weekend Nature Reset* (camp, full, one waiting), *Dana Valley Day Hike* (published, one session without a Supervisor) and *Neighbourhood Planting Morning* (draft). Sami Nasser is a scoped Outdoor Activity Supervisor appointed by the Representative.
- A fresh seed starts the demo clock at the seeded story date (**16 Oct 2026, Asia/Amman**) so windows, offers and sessions agree; the demo panel's “Use real time” returns to wall-clock time. Tests pin their own clock as before.

## 2. Shared design system (P1)

| File | Contents |
| --- | --- |
| `workspaces/ds-system.css` | Tokens on top of the existing ivory/sage `--ws-*`/`--iw-*` variables (DM Sans kept), sidebar groups and identity block, breadcrumb topbar, panels, KPI tiles, meters, sparkline, line/area chart, donut, bars, stacked bars, funnel, chips with shape cues, banners, segmented control and tabs with sliding indicators, search/filter row, responsive tables (card layout under 600 px), empty states, the timeline, the four scenes, the Create New chooser, builder rail/progress, Outdoor Activity cards/detail, initiative cards, dashboards, reduced-motion and forced-colors rules. |
| `workspaces/ds.js` | String components (`pageHead`, `panel`, `banner`, `kpi`, `trendChart`, `donut`, `bars`, `stackBars`, `funnel`, `segmented`, `tabs`, `filterRow`, `empty`, `chip`) and `mountMotion()` (indicator positioning, keyboard/hover tooltips, chart reveal via IntersectionObserver). Period helpers count real dated records only. |
| `workspaces/timeline.js` | The one **Operational Timeline**: `timelineEvents(s, scope)` + `renderTimeline()`. |

**Charts** use a validated categorical palette (green `#2f8051`, slate blue `#4c74b9`, ochre `#b97c0e`; validator: all checks pass, adjacent CVD ΔE 7.3 in the warn band → every multi-series chart carries a legend and direct/text labels). Status tones always travel with a label. Every chart has a text summary and a “Show as table” twin; one y-axis only; empty states instead of fake lines.

**Motion:** page-to-page View Transitions (content region only, 140–320 ms, skipped for same-view refreshes and reduced motion, never blocking navigation); staggered reveals already in the app; chart draw-in; sliding tab/segment indicators; builder step transitions; scene crossfades. All transform/opacity; `prefers-reduced-motion` disables scene loops, reveals and transitions.

**Shared timeline:** events are projected from original records with IDs derived from the source (`admission:<id>:h2`, `submission:<id>:r0`, `booking:<id>:created` …), so the Coach and Representative see the *same* event IDs. Three lanes never mix: **Needs action** (pending), **Coming up** (scheduled, not yet happened) and **History** (recorded facts, grouped by day). Scopes: Institution (own resources), Supervisor (active grants + accepted appointments, sessions limited to the appointment), Coach (own groups only; Coach feedback text appears only in the Coach view), Admin (verification, publication and moderation records only).

## 3. Cycle 1 — Institution Representative

- **Create New** (`#/organization/create`): two large selectable cards (real radios, keyboard operable). Initiative → delivery mode (Online / Hybrid / Face-to-Face) with what each mode will ask for; Outdoor Activity → kind of experience. A layered SVG scene crossfades between *neutral / online / hybrid / face-to-face / outdoor* compositions (network lines and floating screens; a seed connecting screens and people; a warm table circle with botanical branches; drifting hills, trees and a path). DOM-only updates keep the transition continuous; “Continue where you left off” lists unsaved and saved drafts.
- **Initiative builder** (six stages kept): delivery mode is chosen on Create New and editable in stage 2; conditional sections — *Online access* (platform, link policy, how to join, online accessibility), *Venue & on-site logistics* (venue, address, city, check-in method, venue access), *Hybrid participation*. Session formats are constrained by the overall mode (Online → Online; Face-to-Face → On-site; Hybrid → either, per session). Publish blockers for missing join details and mismatched sessions. Scene banner, progress bar, saved-at indicator, Preview at any stage, success banner after publish.
- **Outdoor Activity builder** (seven stages): Basic information · Location & logistics · Eligibility & safety · Dates & seats · Booking policies · Staffing & schedule · Review & publish. Step-named blockers, Needs Supervisor warnings (not blockers), Explore-identical preview, revisions with a reason.
- **Outdoor Activities** area: card grid (kind, booking window, Needs Supervisor, capacity meter, waiting/offers), and a tabbed detail: Overview (booking→attendance→completion funnel, schedule coverage, logistics, safety, scoped timeline), Bookings, Waiting list (queue, held offers, offer-hold policy), Schedule & attendance (owner read-only, Needs Supervisor banner), Completion, Staff (appoint/resend/revoke/copy link), Reports (attendance donut, booking states, per-participant table, closing reports, CSV), History.
- **Bookings & waitlist** hub across activities with capacity bars.
- **Dashboard**: greeting with verification, scope selector (all / one initiative / one activity) and 14/30/90-day range that drive every panel: KPIs (accepted students vs seats, applications to review with sparkline, outdoor places vs capacity, staffing gaps), a participation trend (applications vs bookings), an action queue covering both resource types, application-outcome and booking-state donuts, *Coming up*, resource lists with capacity meters, Create New band and the shared timeline.
- **Initiatives list**: cover or mode scene, delivery mode, phase, seats meter, staff, pending/waiting, review shortcut.

## 4. Cycle 2 — Platform Admin

- Dashboard rebuilt on the design system: decisions waiting (verifications, posts, reports), KPIs (verified institutions, pending verifications, published initiatives and Outdoor Activities, accounts), weekly platform activity (resources published vs institution requests, 8/13/26 weeks), people by role, initiatives by phase, Outdoor Activities by state, and the governance timeline (pending + history).
- **Outdoor Activities governance** (`#/admin/activities`): tabs Live / Suspended / Drafts / Ended / All, owner verification, places, staffing coverage, View (definition + aggregates only) and Suspend/Restore with a reason; suspension hides it from Explore, keeps every booking and notifies booked participants and the Institution.
- Requests copy states the rule: Admin verifies the Institution and Representative authority; verified institutions then publish without per-resource approval. Provider requests are retired (approval refused in the command).
- People: roles include *Individual*; the person dialog lists **scoped grants** (Representative membership, Initiative Coach/Supervisor grants, Outdoor Activity appointments) with who granted them — a workspace switch is never a grant.
- Institution detail lists its Outdoor Activities.
- The legacy `admin.html` application was **not** consolidated in this pass (see open items).

## 5. Cycle 3 — Supervisor

- Context model renamed from “Provider appointment” to **Outdoor Activity appointment** (`?mode=activity`; old `mode=provider` links still resolve). All copy, labels and the attendance desk refer to the organizing Institution.
- Single-initiative desk gains an insights band: **attendance by started session** (Present / Late / Absent / Not recorded from the confirmed roster — excuses never change these facts), **excuses by state** (you recommend · the Representative decides), **task progress by group** (states only, not submitted work) and the scoped timeline.
- Unified dashboard gains **Outdoor sessions on your duty** (started sessions only) and the scoped timeline. Revoked grants immediately drop out of scope (tested).
- Existing capabilities verified in the browser suite: QR/booking-code check-in, replay protection, Needs Supervisor gate before duty, absent → excuse → recommend → decide.

## 6. Cycle 4 — Coach

- Invited-Coach dashboard gains: **task progress by group**, **review outcomes** (approved / needs revision / not accepted / waiting), **submissions and reviews per week** (all attempts, from submission history), **deadlines & sessions** and the Coach-scoped timeline (own groups only).
- Independent Coach Programs were **kept as they are** (still reachable by `?scope=own`); see the open conflict below.

## 7. Verification (6 Nov 2026, local)

| Check | Result |
| --- | --- |
| `node --check` on every workspace module | Pass |
| New `tests/client/four-cycle.test.mjs` (Provider retirement, legacy migration, Outdoor Activity lifecycle with Supervisor-only attendance, delivery-mode blockers, Admin suspension effects, Coach revision loop with shared timeline IDs and privacy, Supervisor revocation scope) | **7/7 pass** |
| `tests/client/outdoor-activity-cycle.test.mjs` (converted from the retired Provider suite: offers/expiry, blockers, revisions/reconfirmation, paid consent, appointment replacement, completion rules, corrections, linked component, legacy completion migration, time zones) | **14/14 pass** |
| partner-store, institution-cycle, supervisor-cycle, coach-cycle, round0-lifecycle, round0-identity | All pass except the **4 pre-existing** “Choose remote or on-site” fixture failures (they create Hybrid sessions through `initiative.session.save`, which an earlier change limited to remote or on-site) |
| round2a–2d personal suites + demo-scenario | 61/62; the failure is the pre-existing Digital Shield manifest host-count test (extension untouched) |
| Playwright Cycle 1 acceptance (scratch script): Create New scenes incl. keyboard, Online builder conditional fields, Online-only session formats, Preview, publish → regular Explore projection and page, Outdoor builder → publish → Explore, Individual books, capacity → waitlist, cancellation offers the seat, reload persistence, owner check-in refused, `#/provider/*` retired | Pass, no page errors |
| Existing `institution-browser.test.cjs` (updated for the new greeting, delivery-mode control and the Reports inbox) | 17/18 steps pass; F2 fails on the Institution Group Garden page that was already “temporarily hidden” in the last commit |
| Existing `supervisor-browser.test.cjs` | S1a–S2e pass (surveys, competitions, new Supervisor invite, approvals, QR check-in window and replay, excuse attachments, summaries); stops at S3a, which drives the retired Provider pages and needs rewriting |
| Existing `coach-browser.test.cjs` | C1–C7 pass; C8 fails on the Invited Student group page (`student.js` and mentorship commands untouched — pre-existing) |
| `partner-browser.test.cjs` | Not run: it hard-codes a macOS Chrome path |
| `tests/mvc-smoke.mjs` after rebuilding the views | Pass: home, 46 views, 161 local resources, custom 404 |
| Domain total (13 suites) | 129/134; the 5 failures are the pre-existing ones listed above |
| Visual review of Representative, Create New, Outdoor Activities, Admin, Supervisor and Coach pages at 1440 px | Reviewed; issues found were fixed (focus ring on the main region, duplicate headings, misleading “not recorded” on future sessions, legend layout) |

Not verified: assistive-technology runs, full mobile/tablet visual passes for every page (responsive rules exist; spot checks only), cross-browser View Transitions behaviour beyond Chromium, real email/payment/authentication (all simulated, as before).

## 8. Open items and conflicts

1. **Independent Coach Programs.** The owner-approved v4.1 target (`docs/architecture/p0-target-v4.1.md`) retires independent Programs; the redesign brief asked to keep the Program/Initiative distinction “where applicable”. Programs were left unchanged (not expanded, not removed). Decide before the next pass.
2. **Two Admin applications.** `admin.html` (legacy) still holds separate capabilities (subscriptions, some catalog/CMS views). The workspace Admin console was redesigned; capability-by-capability consolidation remains.
3. **Pre-existing test debt:** the four Hybrid-session fixtures; `provider-browser.test.cjs` and parts of `partner-browser.test.cjs` exercise retired Provider pages and need rewriting or removal; the Digital Shield manifest test.
4. **Deeper page passes not done in this run:** Applications/participants roster, Team & Groups, Sessions, Forms, Competitions, Settings and the Coach's tasks/reviews pages keep their previous (already styled) layouts; they inherit the new shell, tokens and transitions but were not individually redesigned.
5. **Razor view change:** `Views/Workspaces/Index.cshtml` now links `ds-system.css`; `app.js` also injects it when an older compiled view is running, so a restart is not strictly required. `Views/Member/Explore.cshtml` copy changed (“Outdoor Activities” chip) and needs a rebuild to show.
6. Server-side enforcement, durable audit, concurrency for capacity/caps and real notifications remain production work (unchanged).
