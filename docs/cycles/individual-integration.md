# Cross-cycle effects on the regular Individual

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

**Critical distinction:** `Client/workspaces.html#/participant/…` is a connected partner-side participation view (`pages/participant.js:1-26`) using `deepsprout-ecosystem-demo-v1`. The regular Individual uses `Client/explore.html`, `profile.html`, `garden.html`, `insights.html`, `training.html`, `lab.html`, `recovery-plan.html` and `community.html`; it reads `DeepSproutAccount`/`listings.json` and separate keys (`src/js/data/account.js:1-113,181-187,618-630,752-853,995-1044`). Calling the Partner Participant view “Individual integration” would mask the core failure. The runtime Initiative publication test in [README](README.md) proves this boundary: Published in partner store, visible in partner discovery, absent in regular Explore.

## The additional Partner Participant workspace (current, not the regular Individual)

The `participant` sidebar has **Explore opportunities**, **My Registrations**, **My Initiatives**, **My Account** (`navigation.js:10`). Its detail routes are linked from those pages or component cards, not the regular member navigation. All use `pages/participant.js:1-26`, `commands/institution.js:2-30`, `commands/outdoor.js:2-25` and ecosystem data; there is no separate Participant CSS beyond `workspaces.css`.

| Route under `workspaces.html#/participant/` | Sections/actions and fields | Functional classification |
|---|---|---|
| `discover` | Published Initiative/Session/Experience/Competition cards; Partner Admin CMS heading; search/kind filter, no-results. | **WC partner-local** publication and current capacity; **BR** as replacement for regular Explore. |
| `initiatives` | Own enrollment cards/empty state. | **WC partner-local**. |
| `initiatives/:id` | Organizer/status hero, objective/audience/coverage/eligibility, separate component links and Provider-linked experience. Join modal asks age* (blank, 0–120) and consent. | **WC partner-local** enrollment; does not reserve session/experience. |
| `sessions/:id` | Time/format/venue/eligibility, own registration and attendance/completion; form asks mode (Online/In-person for Hybrid) and consent; Cancel. | **WC partner-local** separate session capacity/mode. |
| `forms/:id` | Published version/privacy label, generated required/optional question controls, Submit. Types: short/long text, single/multiple choice, rating, number, date, file-name preview. | **WC partner-local** response/version; anonymous person ID null, file content absent. |
| `competitions/:id` | Rules/window/criteria, entry text* and originality/eligibility consent, results/feedback/scoring when published. | **WC partner-local** submission/judging path. |
| `experiences/:id` | Approved Provider hero, schedule, venue/safety/cancellation, available seats and Reserve/Waitlist. Modal age* and consent. | **WC partner-local** booking; no regular Explore listing. |
| `bookings/:id` | Offer deadline Accept/Decline, status/reference/demo credential, per-session attendance/evaluation, Cancel, voluntary feedback (rating 1–5 default 4, text*). | **WC partner-local**; credential and notices **MS**. |
| `registrations` | Own Experience and Institution Session rows with distinct state/attendance/completion and detail links. | **WC partner-local**; regular Individual profile uses other records. |
| `programs/:id` | Published Mentor program stages and Student workspace link. | **WL:** preview only; invitation required for assignment. |
| `cohorts/:token` | Scoped cohort preview and Join only with confirmed parent Experience booking. | **WC partner-local**, no booking bypass. |
| `account` | Shared partner person profile/access. | **WL** separate from regular Individual profile. |

The partner Participant code has meaningful empty/no-results/closed/missing-resource states; it does not make the ordinary Individual journey connected. A Provider `notifications` route does not exist as a separate page; Partner notifications are shared local records and regular member notices are not unified.

## Regular Individual destinations as currently implemented

| Destination | Current data and meaningful controls | Cross-cycle consequence today |
|---|---|---|
| Home `index.html` | Account-derived week/starting steps plus static real-world cards (`src/pages/public/home/home.js`). | No partner publication/task/attendance feed. |
| Explore `explore.html` | Account catalog loaded from `src/data/listings.json`, kind/mode filters, details, register/cancel/waitlist/calendar file (`src/pages/member/explore/explore.js:1-…`, `account.js:752-782,995`). | Works within Individual account but ignores partner initiative/experience records and their capacities/status. |
| Recovery Plan `recovery-plan.html` | Personal plan/adjust/history from account. | Mentor assignment must remain distinct; no partner operation should silently alter plan. The earlier audit found a first-run activation break across older/account stores; subsequent code needs fresh end-to-end verification. |
| Activities `training.html` | Built-in timer practices and local offline routine; reads legacy Admin published guides (`training.js:261`). | Legacy published guide visible; partner Admin activity catalog and Mentor assignment are not regular Individual activities. |
| Garden `garden.html` | Fixed Personal Garden scene reads account achievements/vitality (`garden.js:518-591`, `account.js:782-853`). | Partner `rewards` absent. Inactivity dims vitality, contrary to owner decision; approved target is exactly four trees, one per Meaningful Practice type, with no central fifth. |
| Insights `insights.html` | Account source-qualified personal domains. | Partner attendance/completion not imported; never infer cognitive improvement from participation. |
| Community `community.html` | Member local posts/reports/moderation key. | Legacy Admin moderation reaches it; workspace Admin moderation does not. |
| Lab `lab.html`, `assessment.html` | Four executable baseline tasks, account result records and practice windows. | Workspace/legacy metadata edits do not publish executable instrument versions; official reassessment interval undecided. |
| Profile `profile.html` | Member identity/preferences, account data; Explore registrations can be linked via member menu. | Partner person/membership/bookings absent; Student upgrade opens onboarding without proven identity continuity. |
| Notifications | Member navigation has no unified notification center; account-menu links and partner notice arrays are separate. | Partner publication, booking, offer, review and cancellation do not reach regular Individual. |

## Cross-cycle impact matrix

“Expected” is required demo behavior; “actual” is code-inspected unless marked **browser**. Changes that need an approval or evidence gate say so. `participant/…` is not the destination unless explicitly named.

| Source role | Action | Source page | Shared resource | Individual destination | Expected visible effect | Actual current effect | Missing connection |
|---|---|---|---|---|---|---|---|
| Institution | Apply and Admin approves | `auth/application/organization` → `admin/organizations/:id` | Application, Organization | Explore organizer trust/details | Approved organization may publish trusted listing | Partner workspace unlocks only | Identity/organization projection |
| Institution | Publish initiative | `organization/initiatives/:id` | Initiative | Explore grid/detail | Current title, dates, eligibility, mode, organizer | **Browser:** partner discovery 1, regular Explore 0 | Catalog projection and ID mapping |
| Institution | Revise/close/cancel initiative | initiative detail | Initiative version/status | Explore, registrations, notices | Updated/closed state; existing history retained | Partner-only status | Revision/withdrawal sync and notices |
| Institution | Publish session | `organization/sessions/:id` | Session | Explore detail/schedule | Independent date, mode, venue and seat CTA | Partner Participant only | Session projection/capacity |
| Institution | Confirm attendance/completion | session detail | Session Registration | Profile, Insights, Garden | Distinct attended/completed evidence and qualified reward | Partner report only | Participation evidence bridge |
| Institution | Publish form or competition | form/competition detail | Form/Competition | Explore detail | Eligible form/entry CTA and version | Partner Participant only | Component routing/identity |
| Institution | Link Provider experience | `organization/partners` | Partnership | Explore initiative detail | Provider-owned optional component | Partner initiative only | Cross-listing projection |
| Mentor | Invite group | `mentor/groups/:id?tab=invitations` | Invitation/Membership | Profile, tasks/notice | Existing Individual can join same identity; limited Student can use invite | Partner identity only | Shared person mapping and invite surfacing |
| Mentor | Publish program | `mentor/programs/:id` | Program/Assignment | Member tasks/group context | Assigned version and dates visible to authorized member | Student page only | Full Individual group task surface |
| Mentor | Assign/reschedule/cancel work | `mentor/assignments` | Assignment | Tasks/notice/history | Due/status and change notice, separate from Recovery Plan | Partner Student only | Assignment projection/notice |
| Mentor | Review/approve/request revision | `mentor/reviews/:id` | Submission/Review | Tasks, profile history, Garden | Feedback and qualifying unique evidence | Student progress/group plant only | Review/result bridge and reward policy |
| Provider | Publish experience/camp | `provider/experiences/:id` | Experience/Session | Explore grid/detail | Real capacity/date/safety/organizer | Partner discovery only | Experience projection |
| Provider | Change capacity/close/cancel | experience detail | Experience/Booking | Explore, registration, notice | Accurate availability and affected-user notice | Partner only | Availability projection/notice |
| Provider | Approve/cancel booking | `provider/registrations` | Booking | Profile/Explore status | Confirmed/cancelled state | Partner Participant only | Booking identity/status bridge |
| Provider | Issue seat offer | `provider/waitlist` | Offer | Registration/notification | Held seat, deadline, accept/decline | Partner booking detail only | Offer notice and regular CTA |
| Provider | Assign Supervisor | `provider/supervisors` | Appointment | Participation detail | Authorized operator can confirm presence | Supervisor local; no member change yet | Completion evidence pipeline |
| Provider | Enter voluntary feedback/report | `provider/evaluations`, `reports` | Feedback/Report | Profile, Insights | Own feedback status, participation metric only | Partner only | Reporting projection |
| Supervisor | Put person in cohort | `supervisor/cohorts` | Cohort | Participation detail/notice | Own cohort schedule and operator identity | Partner Participant cohort route only | Cohort visibility/identity |
| Supervisor | Record/correct attendance | `supervisor/attendance` | Attendance | Profile, Insights | Verified session presence/correction | Partner Provider/Supervisor reports only | Evidence bridge |
| Supervisor | Evaluate completion | `supervisor/evaluations` | Evaluation | Profile, Insights, Garden | Criteria-based result; reward only if qualified | Partner reward/group plant only | Completion policy/source ID bridge |
| Supervisor | Submit closing report | `supervisor/reports` | ClosingReport | Participation history where relevant | Operational completion context, no private report exposure | Provider report only (appropriately); member state absent | Public-safe summary projection |
| Platform Admin | Approve/suspend partner | `admin/organizations`/`providers` | Entity/Access | Explore listings | Approved shown; suspended unavailable, history retained | Partner routes only | Governance publication gate |
| Platform Admin | Publish legacy activity | `admin.html#/activities` | Legacy activity | Activities | Read-only guide appears | **Connected:** `training.js:261` | Completion/plan assignment still absent |
| Platform Admin | Publish partner catalog item | `admin/activity-catalog` | Partner catalog | Activities | Approved item/version available as appropriate | Mentor Builder only | Catalog unification/projection |
| Platform Admin | Publish Lab metadata | either Admin Assessments | Assessment definition | Lab | Validated instrument version/eligibility | Neither changes executable tasks | Instrument publishing contract |
| Platform Admin | Change Recovery/Garden policy | either Admin policy | Policy | Plan/Garden | Controlled future effective rule, truthful source effects | Separate metadata; account policy unchanged | Policy version/effective date bridge |
| Platform Admin | Publish legacy CMS | `admin.html#/content` | Legacy content | Public landing | Four allowlisted regions update | **Connected:** published-content service | Broader governed content target only if approved |
| Platform Admin | Publish workspace CMS | `admin/cms` | Partner CMS | Explore/Home | Approved content region updated where targeted | Partner discovery heading only | CMS target mapping |
| Platform Admin | Moderate member report | `admin.html#/community` | Member community report | Community | Hide/dismiss affects feed | **Connected** via shared community key | None for this local path; secure moderation later |
| Platform Admin | Moderate workspace report | `admin/moderation` | Partner moderation | Community | If same content, consistent state | Fictional partner records only | Unified report identity |
| Platform Admin | Change entitlements/subscription | `admin/entitlements` or legacy subscriptions | Plan/Subscription | Pricing/profile/access | Approved plan effects and correct access | Pricing shares legacy config; no checkout/enforcement; partner tiers separate | Entitlement contract |

## Reverse communication and timing

| Individual action | Expected recipient and timing | Actual current path |
|---|---|---|
| Join initiative, register session, cancel | Institution enrollments/registrations and capacity **immediately** after valid action | Individual account changes only; Institution reads ecosystem records. Partner Participant is locally connected. |
| Book/cancel experience, accept/decline offer | Provider list/capacity/queue **immediately**; expiry at deadline | Individual Explore account bookings separate; partner Participant path locally connected. |
| Submit Mentor task | Mentor review queue **immediately**; completion after Mentor approval | Limited Student path locally connected; full Individual has no task surface. |
| Attend session/experience | Institution/Provider report after authorized check-in; Individual history immediately after validated record | Partner reports update; regular Individual account does not. |
| Give feedback | Authorized Institution/Provider aggregate after submission; privacy rules apply | Partner Participant feedback exists, regular Individual feedback path disconnected. |
| Earn Garden achievement | After unique qualifying evidence and approved policy, not mere click/repeat | Partner rewards and Individual Garden use separate sources; owner policy incomplete. |

The correct shared demo record should be projected to each page; do not create unrelated copies or infer wellness from event participation. Drafts stay owner-only; publication follows relevant approval; booking is immediate after validation; attendance requires authorized check-in; completion requires stated criteria/review; Garden growth requires source-qualified achievement policy. See [data model](cross-cycle-data-flow.md).

## Approved target correction

The regular Individual, not only Partner Participant, must receive original published Initiative/Provider listings, own application/session/booking/waitlist/attendance/completion states, assigned Coach work and source-backed Insights/Garden outcomes. Four Personal practice trees and flower/rabbit/birdhouse effects follow [master §9](../../DeepSprout.md#9-personal-garden-and-group-garden); Initiative/Coach Program completion adds history/badge, no Personal object. Phase-1 forms are identified. Weekly Lab eligibility and same-identity upgrade are approved. The table above records historical local behavior, including its old anonymous form path. See [master §21](../../DeepSprout.md#21-information-architecture-page-states-and-visible-cross-workspace-effects).
