# DeepSprout Admin frontend

> **Historical implementation report.** This file records behavior and verification at its original milestone. The [authoritative DeepSprout v4.0 specification](../../../DeepSprout.md) governs the approved target; see [§29](../../../DeepSprout.md#29-current-implementation-versus-agreed-target-15-october-2026) for the current-versus-target boundary.

Open `login.html` and choose **Continue as Admin (Demo)**. The shortcut sets `deepsprout-admin-demo-session` in local storage and opens `admin.html#/dashboard`. The route check in `src/admin/app.js` sends visitors without that demo flag back to Login. Log out removes the flag. This is only a client-side development convenience, not production authorization.

## Structure

- `admin.html` is the Admin shell. Hash routes keep the sidebar, top bar, profile, and dialogs consistent across screens.
- `src/admin/store.js` seeds linked fictional records once, writes them to `deepsprout-admin-demo-v1`, and records administrative audit events. It is the seam to replace with ASP.NET services later.
- `src/admin/ui.js` owns shared tables, sorting, filtering, pagination, fields, dialogs, confirmation, and feedback.
- `src/admin/core.js` renders Overview, Users, Groups, and Activities.
- `src/admin/operations.js` renders Recovery Plans, Assessments, Digital Shield, and Garden Rules.
- `src/admin/platform.js` renders Content Studio, Community, Reports, Settings, and Audit Log.
- `src/admin/admin.css` applies the existing cream, pine, and leaf palette in a denser Admin layout.

## Connected demo journeys

- User and group records share stable IDs. Adding or removing students updates group counts, user detail, and Overview counts after refresh.
- Activities have structured fields, draft/published/archived status, goal tags, evidence, mode, and eligibility. Published records appear in the existing Training page's additional activity preview section. Training completion tracking for these new resources awaits a backend.
- Plan Simulator uses selected published and eligible activities, goal, profile, preference, and time to create a deterministic preview. It does not call an AI engine.
- Content Studio supports four explicit landing-page regions: hero introduction, features introduction, focus card title, and focus card image. Draft and published values are separate. Publishing stores a previous version. `src/js/services/published-content.js` applies only published values to those landing-page selectors with `textContent` and allowlisted asset paths. The existing layout and animation markup remain intact.
- Changes to groups, accounts, activities, assessment content, Shield presets, Garden rule status, moderation, settings, and content add local audit events.

## Demo boundaries

The member Login form remains a preview and does not send or save credentials. The Admin session and all Admin data are local browser state. Community moderation does not affect a server feed. Digital Shield extension telemetry and actual browser blocking are unavailable. Garden previews do not grant rewards. Assessment scoring rules remain outside this editor. Admin roles are shown for future authorization but the frontend has one Super Admin demo. Production requires ASP.NET authentication and authorization, APIs and database persistence, trustworthy analytics and audit records, extension integration, and shared content/activity delivery.

Use **Settings → Reset demo data** to restore the seeded dataset. This resets Admin data and published demo content but keeps unrelated member-page local preferences.

## Approved Admin destination

This is the **legacy** current Admin implementation. One conceptual Platform Admin will retain its activity guide publishing, landing Content Studio, Community moderation, member preview, plan templates/simulator, Shield presets, Garden rule previews, groups and subscription views while incorporating the partner workspace's approval, resource oversight, reports, CMS and audit capabilities. The partner Admin is the migration destination only after each legacy capability has a verified replacement. Institution Initiatives require Institution/Representative approval, **not per-Initiative Admin approval**; invited Initiative Coaches/Supervisors need no separate Admin approval. The demo shortcut is permitted as an explicitly simulated login, with no production-security claim. See [master §19](../../../DeepSprout.md#19-one-platform-admin-governance-publishing-and-migration).
