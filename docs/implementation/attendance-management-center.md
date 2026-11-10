# Supervisor Attendance Management Center, 8 November 2026

This record covers the Supervisor attendance redesign. Owner decisions of 8 November 2026 took precedence over older attendance text in `DeepSprout.md` §16–§17.

## What changed for the Supervisor

**Supervisor → Attendance** now opens on the Supervisor's own sessions, never on a scanner or a roster.

- The list combines Initiative sessions on duty and Outdoor Activity appointment sessions.
- Filters: All Sessions, Needs Attention, Completed. There is also a search box.
- Each row shows:
  - title and parent;
  - mode and time;
  - verification method;
  - source status;
  - attendance summary;
  - pending exceptions.

Opening a session (`supervisor/attendance/<sessionId>`) shows an overview, then four tabs:

| Tab | Content |
|---|---|
| Attendance sources | Only the tools the format needs. **Online:** an honest "Meeting integration · Not connected" card and the three-step report import. **In person:** QR / booking-code check-in, plus a manual exception with a reason. **Hybrid:** both, grouped by each participant's registered mode. |
| Participants | Searchable roster with mode, registration, attendance, verification source and time. Actions: Correct, Review or Exception, plus **Add participant**. There are no Present / Late / Absent buttons. |
| Excuses & exceptions | Import rows that need review, and the session's excuses. The Supervisor recommends; the Representative decides. |
| History | Import history (file, source, SHA-256, counts, complete flag, actor, time) and an audit trail of check-ins, reviews, roster additions, corrections and finalization. |

The two earlier desks were removed: `renderAttendanceDesk` in `operations.js` and `renderActivityDesk` in `supervisor-context.js`.

## Canonical route and entry point

There is one attendance implementation. Every link in the app points to it.

| Layer | Where |
|---|---|
| HTTP route | `GET /workspaces.html`, mapped in `page-routes.json` to `PagesController.Show` |
| Razor entry point and layout | `Views/Workspaces/Index.cshtml`. It is the page shell for all partner workspaces and links one stylesheet, `src/workspaces/workspace-styles.css`, plus the `app.js` module. |
| Client route, overview | `#/supervisor/attendance` (with `?view=attention` or `?view=completed`) |
| Client route, one session | `#/supervisor/attendance/<sessionId>` (with `?tab=sources`, `participants`, `exceptions` or `history`) |
| Renderer | `wwwroot/src/workspaces/pages/supervisor/attendance-center.js` |
| Representative, read only | Outdoor Activity → Schedule & attendance tab: `pages/institution/activity-attendance.js`. It uses the same read model and has no write controls. Initiative sessions show the same records in the Institution session detail. |

The Razor view renders the shell; the module renders the content in the browser. It cannot be server-rendered yet, because attendance records live in browser `localStorage` (see the persistence contract). When server commands exist, the same view can render the page server-side.

`supervisor/attendance?session=<id>` still opens the details view, only so notifications already stored in browsers keep working. No code builds that URL anymore.

## Rendering fix, 9 November 2026

**Symptom.** The page rendered as plain text: "Upcoming1", "18Oct", "VerificationNo in-person registrations…". There were no cards and no spacing.

**Cause.** The markup was correct, but `attendance-center.css` was not applied.
- Razor views are compiled into `DeepSprout.Web.dll`, while CSS and JS are served live from `wwwroot`.
- The running site was built before the `<link>` for the new stylesheet was added to `Index.cshtml`. So the new modules rendered markup into an older page shell with no link to its stylesheet.
- Starting `DeepSprout.Web.exe` directly also runs in **Production**, which skipped the development no-store cache headers.
- `app.js` already had a one-off guard for the same failure, but it covered only `ds-system.css`.
- Rendering the page with only that stylesheet missing reproduces the reported screen exactly.

**Fix.**
1. `Index.cshtml` links one versioned stylesheet, `workspace-styles.css`, which `@import`s every workspace stylesheet in cascade order, with `ds-system.css` last. Adding a stylesheet no longer needs a rebuilt view.
2. `app.js` adds that link if a stale compiled view lacks it. This replaces the old `ds-system.css`-only guard.
3. Outside Development, `Program.cs` sends `Cache-Control: no-cache` for `.js`, `.mjs`, `.css` and `.json`. ES module imports cannot carry a version query, so the browser must revalidate them.
4. At startup, `Program.cs` logs a warning when any `.cshtml` file is newer than the running build, for example: "Razor views changed after this build and are not being served: Workspaces\Index.cshtml".

## Legacy code retired, 9 November 2026

| Removed | Why |
|---|---|
| `initiative.attendance.closeout` branch in `commands/initiative.js` and `supervisor.attendance.closeout` branch in `commands/outdoor.js` | Unreachable, because `attendanceCommand` handles both actions first. They still contained the old rule that wrote Absent at close without complete evidence. |
| `renderAttendance` in `shared.js`, plus its `attendance-manual`, `attendance-credential` and `attendance-correct` handlers | It was a second attendance screen in the Representative's Outdoor Activity tab. Its buttons dispatched `organization.attendance*`, which the command layer rejects, because only the assigned Supervisor records attendance. Replaced by the read-only `activity-attendance.js`. |
| `.iw-checkin`, `.iw-scanner`, `.iw-roster*` in `institution.css` | Styles of the removed desks. Nothing referenced them. |
| Individual stylesheet `<link>`s in `Index.cshtml` | Replaced by `workspace-styles.css`. |

Kept on purpose:
- `initiative.attendance.record` and `*.attendance.correct`: the canonical commands call them for check-in writes and corrections.
- `.attendance-toolbar` and `.attendance-person`: used by the Coach workspace.
- The Representative's **Attendance & excuses** page: it is the final excuse decision, not an attendance recorder.

## Business rules now enforced

| Rule | Where |
|---|---|
| A valid check-in records attendance immediately. It is Late after `lateAfterMinutes` (default 10). | `attendance.checkin` |
| Report rows become Present or Late only with at least `minimumPercent` (default 75%) of the scheduled time. Shorter attendance, name-only matches, mode mismatches and conflicts go to **Needs Review**. They never become Absent. | `buildPreview`, `reportOutcome` |
| No identity is created from a report. Unknown rows stay unmatched for review; staff rows are ignored. | `buildPreview` |
| The same file (by SHA-256) cannot be imported twice. A re-export adds no records and no duplicate reviews. Each person has one record across both modes. | `attendance.import.apply`, `buildPreview` |
| Adding a participant needs a reason. It requires an accepted admission (Initiative) or a confirmed booking (Outdoor Activity), respects capacity, and records **Not Recorded**. | `attendance.participant.add` |
| Absent is written only by **finalize**, only after the check-in window closes, and only where the evidence is complete. **In person:** the finalizer confirms check-in ran for the whole window. **Online:** a report marked complete was imported. Everything else stays Not Recorded. | `finalizeAttendance` |
| The earlier `initiative.attendance.closeout` and `supervisor.attendance.closeout` follow the same rule. | `attendanceCommand` |
| Manual exceptions, corrections and review resolutions require a reason and keep actor and time. | `attendance.exception`, `attendance.correct`, `attendance.review.resolve` |
| Excuse chain unchanged: Student → Supervisor recommends → Representative decides. An accepted excuse keeps the fact Absent and creates no reward. | existing `initiative.excuse.*` |
| Attendance commands accept the session's assigned Supervisor or the owning Representative. | `roleFor` |

All derived views read the same records, so changes appear in all of them: participant "My Initiatives", the Institution session roster and reports, Coach views and Personal Garden rewards.

## Code

| File | Purpose |
|---|---|
| `wwwroot/src/workspaces/attendance/model.js` | Read model shared by commands and UI: session adapter over both stores, roster, statuses, rules, import preview, session summary |
| `wwwroot/src/workspaces/attendance/report.js` | CSV parser, dependency-free `.xlsx` reader (zip + `DecompressionStream`), column detection (Zoom, Google Meet, Teams, generic), time and duration parsing, SHA-256 fingerprint |
| `wwwroot/src/workspaces/commands/attendance.js` | `attendance.*` commands and `finalizeAttendance`; first in the store's handler chain |
| `wwwroot/src/workspaces/pages/supervisor/attendance-center.js` | Overview, details, import wizard, modals, drag-and-drop |
| `wwwroot/src/workspaces/attendance-center.css` | Ivory/sage styles, responsive down to 390 px (tables become labelled cards on phones), reduced-motion aware. Loaded through `workspace-styles.css`. |
| `wwwroot/src/workspaces/pages/institution/activity-attendance.js` | Representative's read-only Outdoor Activity attendance, on the same read model |
| `tests/client/attendance-center.test.mjs` | 11 command and read-model tests |
| `tests/client/attendance-center-browser.test.cjs` | 14-step Playwright test against the running site |

New browser collections: `attendanceImports`, `attendanceReviews`, `attendanceLog`, plus `rosterAdditions` on Outdoor Activity sessions.

## Browser demo versus real integration

| Capability | In this demo | Needs before production |
|---|---|---|
| Zoom / Google Meet / Teams integration | **Not implemented.** The page says "Not connected". | Institution OAuth, meeting ID on the session, the platforms' report APIs or webhooks, secure token storage |
| Report import | Real parsing in the browser. Only parsed rows, file name, size and fingerprint are kept; the file itself is not stored. | Server-side parsing of the stored file (`files.SecureFile`), so a client cannot forge rows; retention policy for guest data |
| QR check-in | Supervisor scans the participant's booking QR (camera where `BarcodeDetector` exists) or types the code | Signed, short-lived credentials (`CredentialHash`) instead of plain booking codes |
| Venue QR self check-in | Not implemented | Rotating signed venue codes and a participant check-in page |
| Window closure | Supervisor or Representative finalizes manually | Scheduled server job and notifications |
| Storage | Browser `localStorage` | `session.Attendance` and related tables |

### Server QR foundation (9 November 2026)

`src/DeepSprout.Web/Services/AttendanceQrService.cs` now implements the V5 server-side credential and check-in operation without changing the 58-table schema. It uses `SessionRegistration.CredentialHash` or `ExperienceBooking.CredentialHash`, a random 100-bit readable code, and ASP.NET Core Data Protection for a session-bound QR payload that expires after 15 minutes or at check-in closure, whichever comes first. Only the hash is stored. A new pass rotates the booking credential; for a multi-session Outdoor Activity, an earlier pass must be refreshed after rotation.

The service issues passes only during the in-person check-in window for active participants with confirmed places. Check-in requires an active session duty and Supervisor appointment, an active verified Institution, and a live session. It writes one `session.Attendance` row (`Present` or `Late`) and one `ops.AuditEvent`; duplicate scans return the existing attendance ID. A typed code uses the same verified booking but remains valid until check-in closes. Online attendance still uses report evidence, and QR check-in does not create completion or a Garden reward directly.

This is a backend foundation, **not a live production endpoint**. The current browser demo still shows and checks its own local codes. Once server identity is adopted, a controller must derive the participant and Supervisor IDs from authenticated claims, add anti-forgery and rate limiting, then connect the participant pass and Supervisor scanner to these methods. It must not accept actor IDs from request bodies. The server service is registered only when the V5 connection is configured; no migration or protected database was touched in this change.

## Open owner decisions

1. **Import batches have no table in the approved 58.** Options: add `session.AttendanceImport` (needs owner approval under `AGENTS.md`), or store batches in `ops.AuditEvent` with `files.SecureFile`.
2. **Needs Review is stored as an open review item, not as a status.** The DB keeps `CK_Attendance_Status` (`Present`, `Late`, `Absent`, `NotRecorded`). Confirm, or approve a `NeedsReview` value.
3. **`session.Attendance.RecordedByPersonId` is required.** Automatic imports record the importing person today; a system actor needs a decision.
4. **Representatives create only Online or In-person Initiative sessions.** Hybrid exists in seed data and Outdoor Activities. Allowing Hybrid in the session form is a separate change.
5. **No Representative UI for this center yet.** The commands already accept the Representative, so sessions without a Supervisor work at command level.
6. **Defaults (10-minute Late, 75% minimum) are per session** (`attendanceRules`), but there is no editor yet.
