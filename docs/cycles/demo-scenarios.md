# Repeatable graduation-demo scenarios

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

These are **acceptance scripts**, not a presentation speech. Each uses fictional people and a clean local demo seed. The current Partner Participant route is listed as a diagnostic intermediate, but the final pass condition uses the regular Individual pages. Browser state is per profile; reset `deepsprout-ecosystem-demo-v1`, the Individual account choice/change log and relevant Admin keys in a controlled fixture, preserving unrelated user data. Do not use a preseeded record as proof that a new action propagated. Current result labels: **local pass** means supported by partner domain tests or code; **boundary fail** means the regular Individual consequence is absent; **not retested** means no fresh UI run in this audit. See [test log](README.md).

## A. Institution → Individual

**Accounts/seed:** Maya, approved Horizon Institution; a fresh regular Individual account; one active team member. Use a unique Initiative title. Initial Institution can be empty; no seeded registration with the test person.

| Step — exact page/action | Expected visible result after click | Current outcome |
|---|---|---|
| `#/organization/initiatives/new`: fill six steps (title/objective/summary/dates; audience/coverage/modes; one Session; enrollment/consent; team; Review) → Save Draft | Draft in Institution list; reopen restores every field; absent from public Explore | Local builder save supported; draft recovery code-inspected. |
| Builder → Publish | `Published` detail, local Initiative ID, component draft warning; regular `explore.html` shows listing when eligible | **Boundary fail browser-tested** with unique Initiative: partner discovery match 1, regular Explore 0. |
| `#/organization/sessions/:id` complete schedule/formats/capacity → Publish | Separate eligible Online/In-person/Hybrid session detail and CTA in Individual Explore | Partner Participant only, code-inspected. |
| `explore.html` → initiative detail → Join; then session detail → choose mode/Register | Independent enrollment and session confirmation in Profile/registrations; Institution `participants` and session roster show same person/IDs | Current regular account writes separate records; Institution does not see them. |
| Institution session detail → mark attendance then completion | Reports count registration, attendance, completion separately; Individual Profile/Insights show participation; Garden only if qualified | Partner report local; regular Individual evidence absent. |

**Final pass:** a fresh Individual can traverse all pages, reload between steps, cancel/retry within rules, duplicate registration is rejected, dates/mode/capacity are accurate, no health improvement is invented. **Blockers:** P0-1/P0-2/P0-4. **Reset:** remove test Initiative and all referenced component/participation records as one fixture, not just listing text.

## B. Mentor → Invited Student → optional full Individual

**Accounts/seed:** approved Maya Mentor; new Student email not in partner seed; one published activity in partner catalog. Initial Mentor group empty.

| Step — page/action | Expected visible result | Current outcome |
|---|---|---|
| `#/mentor/groups` Create Group; detail Invitations → Create/Copy link | Owned group and valid scoped invite with expiry/use count | Local domain suite pass; browser UI not rerun here. |
| `join.html?token=…` preview → name/email/consent → demo OTP → Join | Same person ID, membership or Pending Approval, limited Student dashboard | Local domain suite pass; real email delivery absent by design. |
| `#/mentor/programs/new` five steps → Publish; or `mentor/assignments` Create | Versioned program/assignment appears in Student My Tasks, distinct from Recovery Plan | Local domain suite pass. |
| `#/student/tasks/:id` Submit → Mentor `reviews/:id` Needs Revision → Student resubmit → Mentor Approve | Feedback/history and one source-linked achievement; duplicate approval does not farm reward | Local domain suite pass. |
| `#/student/account` Upgrade to Full Individual → onboarding/Individual Profile/tasks | Same identity and prior group/submission/reward retained, personal four-assessment path offered separately | **Boundary fail:** handoff flag and link do not transfer account identity/records. |

**Final pass:** invalid/revoked/expired/full invite denied; unrelated Student cannot open task; approved review appears in both permitted views; no private Lab/Shield/plan shown to Mentor. **Blockers:** P0-3/P0-4. **Reset:** group/invite/program/assignment/submission/reward fixture together.

## C. Provider → Individual booking/waitlist

**Accounts/seed:** approved Sami Provider, fresh regular Individual plus a second eligible person; an Experience capacity of one with waitlist enabled and one scheduled session. Use unique title.

| Step — page/action | Expected visible result | Current outcome |
|---|---|---|
| `#/provider/experiences/new` six steps → Save Draft/reopen → Publish | Provider detail Published; regular Explore listing with truthful venue/date/capacity | Partner discovery only; boundary fail by code, not separate runtime test. |
| `explore.html` → details → Book with consent | Individual confirmed status/reference; Provider Registrations same person; seat 0 | Separate account booking, invisible to Provider. |
| Second person → Join Waiting List; first cancels | Waitlisted state, then held offer/deadline and availability state | Partner-domain offer algorithm passes tests, regular path disconnected. |
| Second person Accept / Decline / let expire | Acceptance confirms exactly one seat; decline/expiry offers next eligible; reload stable | Partner local tests pass; no cross-device guarantee; Individual notice missing. |
| Supervisor attendance/evaluation | Provider report and Individual participation history; Garden qualification source check | Partner only. |

**Final pass:** no duplicate booking/offer or over-capacity state in one demo profile; published cancellation withdraws listing and notifies affected accounts. **Blockers:** P0-1/P0-2/P0-4. **Reset:** book/offer/attendance references and test listing.

## D. Provider → Supervisor → participant

**Accounts/seed:** Sami Provider; accepted or newly invited Supervisor; one published two-session Camp; two confirmed test bookings. Start with no cohort/attendance/evaluation.

| Step — page/action | Expected visible result | Current outcome |
|---|---|---|
| Provider `supervisors` → Assign Supervisor for one Camp and selected sessions | Invitation card only for named person; no unrelated event | Local commands scoped; code-inspected. |
| Supervisor `dashboard` → Accept; `experiences/:id` → `cohorts` Create with confirmed people | Assigned schedule/roster and own cohort; unbooked person rejected | Local domain suite pass. |
| `attendance` → credential/manual reason; duplicate check-in; correction | One source record per person/session, reasoned correction; roster updates | Local domain suite pass; credential simulation only. |
| `evaluations` → criteria outcome; `reports` → summary/exceptions Submit | Provider Reports displays closing report, completion source; Individual history updates | Provider local path passes domain test; Individual absent. |
| Provider Revokes appointment → Supervisor retries operation on unrelated/old session | Denial while historical report remains | Command guard code-inspected; fresh UI test needed. |

**Final pass:** Participant sees validated status; no access to private Lab/Shield/plan; unrelated experience denied; corrections retract invalid reward. **Blockers:** P0-4, P1 scope/notifications. **Reset:** appointment, cohort, attendance, evaluation, closing report and rewards together.

## E. Platform Admin → Partner approval → Individual listing

**Accounts/seed:** new applicant Dana with unique email; Leen Platform Admin; fresh Individual. Choose Mentor, Institution or Provider as separate variants; Institution/Provider variant must publish a test resource.

| Step — page/action | Expected visible result | Current outcome |
|---|---|---|
| `#/auth/account/:type` → verify → application draft/review/submit | One person, Submitted application, no operational workspace | Partner domain suite pass; OTP simulated. |
| `#/admin/:queue/:id` Needs More Info → applicant status/respond → Admin Approve | Reason/message history and approved, empty scoped workspace | Partner domain suite pass. |
| Applicant `auth/workspaces` → create/publish owned resource | Only own institution/provider resources; Mentor only own groups; listing reaches regular Individual Explore if public | Partner workspace unlocks; public regular Explore does not update. |
| Admin suspends entity/resource | New signups blocked, resource withdrawn, existing history retained and affected Individual informed | Partner store status changes; regular Individual unaffected. |

**Final pass:** approval is a single governance decision, no accidental global Admin rights, records persist reload, rejected/suspended states deny operations. **Blockers:** P0-1/P0-2; resource role-grant gaps. **Reset:** applicant/entity/content and references together.

## F. Platform Admin → regular Individual content/policy

**Accounts/seed:** legacy Admin demo and/or Leen workspace Admin, seeded and fresh Individual. Use unique draft copy/activity label; preserve published prior version for rollback.

| Step — page/action | Expected visible result | Current outcome |
|---|---|---|
| `admin.html#/activities` Create/Publish guide → `training.html` | Published read-only guide appears; draft/archived does not; no automatic plan completion | Explicit legacy bridge exists; code-inspected, not rerun in browser. |
| `admin.html#/content` edit allowed region → Publish/Rollback → `landing.html` | Published four-region change appears; rollback restores prior version | Explicit legacy bridge exists; code-inspected. |
| `#/admin/cms` edit/publish → partner discovery and regular Explore/Home where targeted | Versioned target-specific content appears consistently | Partner discovery only; regular Individual unaffected. |
| Either Admin `assessments` or `policies` Publish metadata → `lab.html`, `recovery-plan.html`, `garden.html` | Validated instrument/policy effective version reaches pages; no unapproved reassessment/reward values | **Missing**: metadata stores do not control those pages. |
| Legacy Community moderation → `community.html` | Hidden report changes feed; dismissal keeps post visible | Explicit shared key connection exists; code-inspected. |

**Final pass:** each admin action states exact publication target/version, recipient page shows effect after reload, rollback and suspension are coherent, no private data is exposed. **Blockers:** P0-5 for policy/content demonstrations; P1 unified Admin. **Reset:** restore prior published content and all test member/partner state deliberately.

## Current approved graduation scripts

The A–F tables above remain the dated audit's prior scripts and actual outcomes. The current owner-approved scripts and negative tests are maintained only in [master §25](../../DeepSprout.md#25-end-to-end-demonstration-and-acceptance). Those scripts add the 135/3 **per-Initiative** caps, one-step Representative/Supervisor approval, active-Supervisor attendance gate, QR/typed/online methods, separate excuses, four Personal trees, Initiative/independent-Coach Group Gardens, no Provider Group Garden, and configurable 24-hour offer expiry with a demo clock. None is claimed Pass merely because the earlier partner-local tests passed.
