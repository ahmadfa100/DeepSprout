# Role and resource permissions

**Target:** [DeepSprout v4.1](../../DeepSprout.md) and the [4 November P0 map](p0-target-v4.1.md). This matrix is a documentation target, not evidence that browser guards or server authorization implement it. The retired Coach/Provider demo routes are dated evidence only. Database mapping: [persistence contract](database/persistence-contract.md).

`Own` means an authorized resource grant, never every record of that type. One human account can hold several scoped appointments. A platform account suspension denies protected access through existing sessions; revoking one appointment ends only that appointment's future access. A pending invitation grants nothing.

| Action/resource | Institution Representative | Initiative Supervisor | Assigned Coach | Student / Individual | Activity/Session Supervisor | Platform Admin |
|---|---|---|---|---|---|---|
| Institution profile and verification | Create/manage own typed profile and submit evidence | — | — | Public approved organizer fields only | — | Verify Institution/Representative with audit |
| Initiative publication | Create/revise/publish for verified Institution | Operate assigned Initiative | Assigned metadata | Read eligible published detail | Assigned metadata only | Govern, unpublish/suspend; no routine repeat approval |
| Initiative application | Approve/reject/remove/suspend/restore/block with reason | Approve same eligible application once; flag | Assigned roster after admission | Apply/withdraw own | — | Platform sanction separately |
| Staff appointment and group | Invite/cancel/revoke Coach/Supervisor; allocate accepted students and active Coaches | Allocate accepted students and active Coaches; no revoke | Own assigned group, tasks and reviews | Own authorized group/task | Explicit appointed scope only | Govern identity, not routine allocation |
| Institution Outdoor Activity | Create/publish; manage booking, capacity, queue, safety, completion and reports | Only if explicitly assigned | No operational authority merely from Coach role | Read public organizer; own booking/queue/attendance/completion | Assigned attendance/safety duties only | Govern resource, not booking owner |
| Session attendance and excuse | Set rules, final excuse decision, correction oversight | Active assigned check-in and recommendation | Limited task consequence | Own registration/pass/excuse/status | Active appointed check-in only | Govern only |
| Assignment/review/report | Authorized Institution summary | Initiative progress and Coach reports | Assigned group/student work; authored review/report | Own tasks, attempts, feedback | — | Catalog governance only |
| Gardens and private wellbeing | Initiative collective summary; no private Lab/Shield/Recovery | Initiative collective summary; no private Lab/Shield/Recovery | Assigned Initiative Group Garden; no unrelated personal data | Own Personal Garden and authorized Initiative Group Garden | No standalone Activity Garden | Rule governance; private data denied by default |
| Identified forms and incidents | Purpose-bound authorized records | Operational minimum | Minimum task consequence | Own response/report | Assigned safety minimum | Audited, purpose-bound governance |

**Limits:** at most 135 accepted students and three active Supervisors per Initiative, protected under concurrency. Pending/queued students do not occupy accepted seats; a valid offered hold counts for its activity capacity. The suspension-seat and 24-hour offer-expiry rules are interim configurable defaults. No Coach group count or Coach-to-student ratio is approved.

**Invitation checks:** Representative issues an unguessable, expiring, revocable, email-bound Initiative Coach/Supervisor link. Recipient signs in or registers as one human, proves the matching verified email, and accepts after server revalidation. No Supervisor `Requested` state, self-request path, independent Coach/Provider grant or extra Admin approval. Wrong email, expired/reused token, cross-Institution scope, stale session and fourth concurrent Supervisor cannot grant authority.

**Migration boundary:** existing `mentor/programs/*` and `provider/*` pages, stores and tests require route/data/retention mapping. Their current visibility is not active authorization. The server must enforce each action; UI hiding and browser-local checks are demonstration aids only.
