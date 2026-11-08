# P0 target architecture and scope — 4 November 2026

**Status:** Owner-approved target direction. This document records requirements, not completed application or database work. It reconciles the 4 November consolidated owner notes with older v4.0 clauses in the [master specification](../../DeepSprout.md) and proposed database atlases. Existing routes, migrations, and demo data require inspection before changes.

## Authority and boundaries

The 4 November owner decisions supersede conflicting v4.0 product text, the 3 November proposed 87-table Atlas, and current demo behavior. The retained v4.0 material remains useful for unaffected personal-product requirements and dated implementation evidence. No replacement table count had been approved on 4 November; the 58-table design was approved afterwards (see the addendum below).

| Area | Approved P0 target | Still requires engineering or policy design |
|---|---|---|
| Server | ASP.NET Core MVC, C#, ASP.NET Core Identity, EF Core, SQL Server. Use Identity for credentials, hashing, lockout, reset, confirmation, and supported tokens. | One coherent Person/Identity mapping; any justified custom OTP or invitation persistence. |
| Platform authority | One Platform Admin. Scoped appointments and organization membership are separate from platform account status. | Reassess `iam.GlobalGrant`; document a justified remaining use before retaining it. |
| Partner entry | Public Register has `Join as Individual` and `Join as Partner`; Partner goes directly to Institution Representative registration. | Exact form fields and verification evidence. |
| Institution | A human Representative creates and manages a typed Institution profile. The Institution has no login. Public Initiative and Outdoor Activity cards name the verified Institution as organizer without exposing private verification data. | Representative replacement/transfer and typed field inventory. |
| Coach | Invitation-only appointment to an Institution Initiative. Assigned Initiative groups, students, tasks, reviews, reports and the Initiative Group Garden only. | Final route and migration names. |
| Supervisor | Invitation-only scoped Initiative appointment, or explicit Institution Outdoor Activity/Session scope. No self-request or `Requested` state. | Exact standalone-activity staffing model. |
| Outdoor Activity | Institution owns trips, camps and activities, including capacity, bookings, waiting list, attendance, safety, completion and eligible rewards. | Standalone versus Initiative-linked policy and final entity/route names; both are recommended for flexibility, not yet approved as an exact schema. |

## Identity, invitations and access

- Use one human account across authorized workspaces. A Representative may invite a Coach or Supervisor by verified email to a named Initiative and may send an email or copy a secure link. The invitee signs in or creates a human account, proves control of the matching email, and accepts.
- The invitation is unguessable, expiring, revocable and single use where applicable. Store a token verifier, keep secrets out of logs, and recheck invitation state, resource ownership, appointment eligibility and actor authority on the server. A pending invitation grants no appointment access. Institution-invited staff need no second Admin approval.
- Appointment states may include `Pending`, `Active`, `Declined`, `Expired`, `Cancelled`, `Revoked`. Omit `Requested`, `RequestedByPersonId`, `RequestNote`, self-request UI/API and transitions. Revocation ends future scoped access while retaining attributable history. Account suspension denies protected access through existing sessions as well as new sign-ins.
- An Institution Initiative has at most **three active Supervisors** and **135 accepted students**. Protect both limits under concurrency. Student invitations and shared links never bypass application, admission, eligibility or capacity rules.
- Representatives do not set another person's password. Institution email domains are not mandatory unless an approved organization policy requires one. Keep sensitive Lab, Recovery and Shield data outside unrelated staff scope.

## Workspace and public page map

| Surface | Target navigation or behavior |
|---|---|
| Register | Individual or Partner; Partner opens Institution Representative details only. Coach and Supervisor enter through scoped links. |
| Institution | Dashboard, Institution Profile, Initiatives, Outdoor Activities / Trips / Camps, New Outdoor Activity, Bookings & Waiting List, Groups & Staff, Sessions, Attendance, Safety / Incidents, Completion / Reports. Creation may offer `Create Initiative` and `Create Outdoor Activity`. |
| Coach | Assigned Initiative groups and students, assignments, reviews, reports, and the single owning Initiative Group Garden. No independent Programs, Program Builder, group ownership, direct student invite or Coach subscription tier. |
| Supervisor | Assigned Institution Initiative and any explicitly appointed Institution Activity/Session. No self-request. |
| Admin | Institution/Representative verification and governance of published Institution resources. No Coach or Provider application queue; routine verified Institution publication does not require repeat Admin approval. |
| Explore / Individual | Initiative, Session/Workshop, Competition and Institution Outdoor Activity/Trip/Camp cards with `Organized by <Institution Name>`. Own application, bookings, waitlist, attendance and completion appear in authorized personal views. Qualified camp completion may yield one bounded Personal Garden birdhouse. One Group Garden per Initiative. |

For an Outdoor Activity, design typed title, kind, description, dates/time zone, venue, eligibility/consent, capacity, registration window, organizer, safety/contact, any approved price disclosure, supervisor/attendance and completion policy. A linked activity must have one booking identity and one completion source.

## Data-model review and deprecation inventory

> **8 November 2026 addendum: approved database.** The product owner approved the 58-table v5 lean design as the target database. Its revision v5-lean-2 applies the dispositions below inside those 58 tables (Institution-only organizations and Institution-owned outdoor activities, invitation-only staff appointments without `Requested`, retired independent Programs and partnerships kept as read-only history). Table names in the inventory below refer to the older proposals; see the [database index](database/README.md) and [persistence contract](database/persistence-contract.md) for the current mapping and the items still open.

The proposed 87-table/19-schema/234-FK Atlas is a historical proposal, not an implemented or approved target count. Do not execute blanket drops. Inventory actual schema, routes, DTOs, data, fixtures and foreign keys; map source IDs and retention before migrating. Produce a reviewed replacement ERD/dictionary and count afterward.

| Old area | Target disposition |
|---|---|
| `iam.Person`, `iam.PasswordCredential`, `iam.OtpChallenge` | Keep one human identity; integrate Identity and remove redundant credential/lockout state unless a specific need justifies it. Keep necessary consent history. |
| `iam.GlobalGrant` | Reassess against one Admin; do not invent a global delegate chain. |
| `org.Organization`, `OrganizationMember`, `VerificationCase` | Institution-only typed profile, authorized human Representative membership, Institution/Representative verification and decision history. Reassess `Kind`, generic JSON bags and Provider composite FKs. |
| `org.StaffAppointment` | Direct email-bound Initiative Coach/Supervisor invitation; optional Activity/Session Supervisor scope after review. Remove Requested fields/state; retain meaningful history and enforce cap. |
| `coach.CoachProgram`, `ProgramRevision` and `mentor/programs/*` | Retire independent Program lifecycle and active authorization; assess historical records before archive/migration. |
| `coach.OperationalGroup`, membership and Coach assignment | Initiative is the mandatory owner; remove Program XOR owner branch. Admission precedes membership; assigned Coach has active scoped grant. |
| `provider.Experience*`, `ExperienceBooking`, incidents and `provider/*` | Re-home trips/camps, booking, capacity, waitlist and protected safety records under Institution Outdoor Activity. Preserve one booking/completion identity and historical source mapping. |
| `provider.ProviderCohort*` | Retire provider-only cohort; retain a participant grouping only if actual Institution camp operations justify it. |
| `session.*`, `task.*`, `forms.*`, `evidence.*` | Preserve valid shared functions and history, retarget owner/permissions, remove Provider/Program branches and duplicate rewards. |
| `partnership.PartnershipLink` | Reassess; former independent Coach/Provider cross-owner partnership is out of scope. No speculative replacement. |
| `ops.*` | Keep attributable audit, notifications and outbox where justified; avoid duplicating facts. |

Review typed profile, verification, activity and policy fields before choosing columns. Prefer application services for workflows, EF Core for mapping/migrations/concurrency, Identity for credential concerns, and SQL Server for durable data, referential integrity, essential constraints, indexes and transactions.

## Acceptance and migration checks

1. Partner Register has only Institution Representative entry; obsolete independent Coach/Provider direct URLs cannot grant privileged access.
2. Institution profile is a real organizer. Published Initiative and standalone or linked Outdoor Activity resolve to the same public Institution identity without duplicate booking or reward.
3. Coach accepts only a matching verified-email Initiative invitation and sees only assigned groups/students. No independent Program or direct Coach enrollment.
4. Supervisor cannot self-request. Pending links have no authority; concurrent fourth active Initiative Supervisor is rejected.
5. Admission and concurrent acceptance preserve the 135-student cap. Waiting-list `Queued → Offered → Accepted/Declined/Expired` and notices work in Institution and Individual views.
6. Check-in, completion and eligible birdhouse are separate source facts. Incident details remain restricted. Revocation/suspension changes future access without erasing history.
7. Wrong-email, expired/reused/revoked token, cross-Institution access, stale session, duplicate booking/reward and private Lab/Shield/Recovery disclosure are rejected.

**Implementation boundary:** These checks are requirements for future code and schema work. This documentation update does not assert that they pass today.
