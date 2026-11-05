# DeepSprout v5 — Lean Validation Strategy (Section F)

Goal: prove the things that can hurt people or data, cheaply. Not one test per constraint.

## 1. Principles

1. **Test behavior through the application service or the HTTP API**, not by poking tables. A few tests hit SQL Server directly, only where the database is the guard (unique indexes, concurrency).
2. **Three layers, in this order of value:**
   - **L1 API authorization tests** (each role × each protected resource): the cheapest way to catch cross-user exposure.
   - **L2 service integration tests on a real SQL Server** (LocalDB or a container; EF migrations applied): transitions, capacity, duplicates, notifications.
   - **L3 concurrency tests** (parallel tasks against the same row): seats, duplicate commands.
   Pure unit tests only for rule calculators (Garden, tier progression, withdrawal cutoff, comparability).
3. **Priority tags:** P0 must pass before any release; P1 before a feature ships; P2 nice to have.
4. **No generated constraint-per-table suite.** The generator already checks that every FK target exists and that 87 v4 tables reconcile (`validation-report.txt`). One migration smoke test (apply all migrations to an empty database, run the seed) replaces the old "table count / schema shape" checks.

## 2. Scenario list (about 70; most are one short test)

### Authentication and authorization (P0)
| ID | Scenario | Layer |
|---|---|---|
| AUTH-01 | Sign-in with wrong password increments `FailedLoginCount`; the Nth failure locks until `LockedUntilUtc`; success resets | L2 |
| AUTH-02 | OTP: wrong code increments attempts; expired or consumed code rejected; code for another purpose rejected | L2 |
| AUTH-03 | Invited student can set a password only with the matching verified email | L2 |
| AUTH-04 | Workspace switcher lists only workspaces backed by an active row; switching never grants a role | L1 |
| AUTH-05 | Role matrix: every endpoint × {anonymous, individual, student, coach, representative, supervisor, provider member, provider supervisor, moderator, admin} returns 401/403/404 as defined (generated from the permissions matrix) | L1 |
| AUTH-06 | `PasswordHash`, `TokenHash`, `CredentialHash`, `JoinTokenHash`, `PrivateNote` never appear in any response DTO (reflection test over all DTOs) | unit |
| AUTH-07 | Actor identity comes from the session; a client-supplied `ActorPersonId` is ignored | L1 |

### Ownership and privacy (P0)
| ID | Scenario | Layer |
|---|---|---|
| OWN-01 | A person cannot read another person's attempts, plan, Shield data, consent, or files by changing an id | L1 |
| OWN-02 | A representative of institution A cannot read or change institution B's initiative, applications, groups, reports | L1 |
| OWN-03 | A Provider cannot own an Initiative; an Institution cannot own an Experience (`Organization.Kind` checked on create) | L2 |
| OWN-04 | Coach sees only own assigned groups; a student never sees another student's submission or the coach's `PrivateNote` | L1 |
| OWN-05 | Supervisor sees only own initiative; provider supervisor only own cohort when `CanManageCohorts` is false | L1 |
| OWN-06 | File download is authorized through the owning record (excuse, incident, submission, verification proof), never by `OwnerPersonId` alone | L1 |
| OWN-07 | Group Garden shows aggregates only, never another member's Lab or Shield details | L1 |
| OWN-08 | Consent withdrawal for Shield stops accepting usage batches | L2 |

### Initiative membership, capacity and cancellation (P0)
| ID | Scenario | Layer |
|---|---|---|
| INI-01 | Two approvals race for the last seat → exactly one Accepted, the other Queued | L3 |
| INI-02 | Seat count = Offered + Accepted + Suspended; Pending/Queued hold no seat; Withdrawn, Removed, Completed, Cancelled, OfferDeclined, OfferExpired free it | L2 |
| INI-03 | The same person accepted into two initiatives at once → second fails on the unique index with a friendly error | L3 |
| INI-04 | Capacity cannot exceed 135 (CHECK); cannot be reduced below seats in use (service) | L2 |
| INI-05 | A fourth active supervisor is refused, including under concurrent acceptance | L3 |
| INI-06 | Withdraw: allowed before start − 120 h, refused at and after the boundary; waitlist/pending withdraw always allowed | L2 |
| INI-07 | Reschedule extends an accepted member's cutoff and never shortens it | L2 |
| INI-08 | Cancel: every open application and membership ends with `EndReason = InitiativeCancelled`, audit rows written, notifications created, seats freed — all or nothing | L2 |
| INI-09 | Reapply after Withdrawn or Removed while open → new row `AttemptNo + 1`; after Rejected allowed; while Blocked refused; after the initiative ended, cancelled or the member Completed refused | L2 |
| INI-10 | Representative removes a participant → status change, audit row and notification created in one transaction (and email in outbox) | L2 |
| INI-11 | Offer expiry job: expired offer moves to the next queued person atomically; running the job twice changes nothing | L3 |
| INI-12 | Each transition writes exactly one `AuditEvent` with before/after status and reason (reasons mandatory for Reject/Suspend/Remove/Block) | L2 |
| INI-13 | Invalid transitions (for example Accepted → Pending) are rejected by the transition table | unit |

### Attendance, excuses and completion (P0)
| ID | Scenario | Layer |
|---|---|---|
| ATT-01 | Only an active supervisor of the session may record attendance; "Needs Supervisor" sessions refuse check-in | L1 |
| ATT-02 | QR/typed credential accepted only for on-site registrations; replay or another person's credential refused | L2 |
| ATT-03 | Double check-in is idempotent (unique `(SessionId, PersonId)`) | L3 |
| ATT-04 | Correction writes before/after and a reason to `AuditEvent` in the same transaction; no path edits attendance without it | L2 |
| ATT-05 | Closeout turns NotRecorded into Absent and is repeatable | L2 |
| ATT-06 | Excuse: student → supervisor recommends → representative decides; acceptance does not turn Absent into Present | L2 |
| ATT-07 | Completion is evaluated from attendance/criteria by a person; one completion per application / program member / booking | L2 |
| ATT-08 | Session registration capacity per mode under concurrent registration | L3 |

### Provider booking and capacity (P0)
| ID | Scenario | Layer |
|---|---|---|
| PRV-01 | Concurrent bookings on the last seat → one Confirmed, one Queued | L3 |
| PRV-02 | Approval-required experience: booking is `Pending`, takes no seat, approval fails if full | L2 |
| PRV-03 | Cancel → next queued gets a 24 h offer; accept/decline/expire all consistent; job idempotent | L3 |
| PRV-04 | One live booking per person per experience | L3 |
| PRV-05 | Cohort capacity and join token: wrong token, full cohort, unconfirmed booking all refused | L2 |
| PRV-06 | Price/place/time change creates a new revision and notifies bookers; the booking shows the revision it was made on | L2 |

### Assessment result consistency (P0)
| ID | Scenario | Layer |
|---|---|---|
| LAB-01 | Activation requires four valid baselines (one per instrument); a second valid baseline is rejected by the unique index | L2 |
| LAB-02 | One valid official attempt per week and instrument | L3 |
| LAB-03 | Pause/resume: `ResponsesJson` accumulates; submitting twice does not double-score | L2 |
| LAB-04 | Scores recompute from `ResponsesJson` with the stored `ScoringVersion`; comparison across different versions returns "not comparable", never a number | unit |
| LAB-05 | Practice attempts never enter comparisons | unit |

### Garden and rewards (P1)
| ID | Scenario | Layer |
|---|---|---|
| GRD-01 | Personal Garden counts only valid practices, done routine days (capped per week), completed weekly reviews, confirmed attendance, completed camp | unit |
| GRD-02 | Correcting an attendance or invalidating a practice reduces the Garden with no manual reversal | L2 |
| GRD-03 | Group Garden counts approved reviews, session attendance and initiative completion of that group/initiative only | L2 |
| GRD-04 | Nothing a user or AI writes can grow the Garden directly | L1 |

### Coach, tasks, forms, community (P1)
| ID | Scenario | Layer |
|---|---|---|
| TSK-01 | Reschedule keeps the earlier version; a recipient who already started keeps the version they were given | L2 |
| TSK-02 | Resubmission increments `AttemptNo`; double submit refused; review needs a person; correcting a review supersedes, never edits | L2 |
| GRP-01 | Group capacity and `RequiresApproval` (`Pending` → Active); one active group membership per person per group | L2 |
| GRP-02 | Invitation: wrong email stays pending; token single use; expired refused | L2 |
| FRM-01 | A response is tied to its `FormVersion`; editing the form never changes earlier respondents' questions | L2 |
| FRM-02 | Identified responses only; one response per person unless the version allows more | L2 |
| FRM-03 | A judge cannot judge their own entry; one judgment per judge per entry; ranking computed | L2 |
| COM-01 | One reaction/bookmark per person per post and kind; moderation hide/restore writes audit | L2 |

### Notifications and reliable state changes (P0)
| ID | Scenario | Layer |
|---|---|---|
| NTF-01 | State change, `AuditEvent`, `Notification` and `OutboxMessage` are committed together or not at all (fault injected after the first write) | L2 |
| NTF-02 | Retried command does not create a duplicate notification (`RecipientPersonId + EventPublicId + TemplateCode`) | L2 |
| NTF-03 | Outbox sender: crash after send, before marking delivered, sends at most once per provider key; failed sends retry with back-off | L2 |

### Duplicate consequential operations (P0)
Replaces `IdempotencyRecord`. Each consequential command has a natural duplicate guard:

| Command | Guard |
|---|---|
| Register | unique normalized email |
| Apply | one live row per person per initiative; `AttemptNo` |
| Approve / accept offer | status transition check + `RowVersion` |
| Submit task | `(RecipientId, AttemptNo)` |
| Check in | `(SessionId, PersonId)` |
| Complete | one `Completion` per subject |
| Book / register session | live-row unique index |
| Shield usage batch | `(InstallationId, SequenceNo)` |
| Activate plan | open-cycle unique index + `RowVersion` |
| Send email | `OutboxMessage.EventPublicId` |

Test: each command executed twice (sequentially and in parallel) changes state once (`DUP-01..10`).

## 3. What happens to the 330 legacy checks

`legacy-checks-disposition.csv` classifies every v4 check mechanically from its recorded result.

| Disposition | Count | Meaning |
|---|---:|---|
| RETIRE | 171 | Environment/count/schema-shape checks of the old database; immutability triggers; composite ownership FKs; status-versus-timestamp CHECKs; checks of tables that no longer exist. Reasons are in the CSV. |
| RETAIN-AS-SCENARIO | 137 | Business behavior that still exists. These are **not** ported one-to-one: they feed the scenarios above (several legacy checks per scenario). |
| DEFER | 22 | Features still deferred (commercial subscriptions, Joint Goals, standalone sessions). |

Retired because the guard no longer exists is not the same as untested: the behavior behind an ownership FK or an immutability trigger is covered by AUTH-05, OWN-01..07 and the "no path edits this row" design rule.

## 4. Gates

- **Gate A (before any v5 table is created):** this strategy and the approval items are accepted.
- **Gate B (per module):** its P0 scenarios are green on a real SQL Server.
- **Gate C (before release):** AUTH-05 matrix, INI-01/03/05/08/09/10, ATT-03/04, PRV-01/03, NTF-01, DUP-01..10 all green; parallel tests run 50 times without a failure.

## 5. Areas that still deserve implementation-time testing

1. Seat accounting under load (INI-01, PRV-01, ATT-08): the one place a lock-and-count design can be wrong silently.
2. `AuditEvent` completeness: a transition path that forgets the audit write would hide history the UI now depends on. A test walks every transition in the transition tables and asserts one audit row each.
3. Garden query cost for a person with a year of data (a cached projection can be added later without a table).
4. JSON size and shape: `ResponsesJson` (long sustained-attention trials), `AnswersJson`, `DomainsJson`; verify they stay small and validate on write with typed DTOs.
5. Whether practice `DifficultyTier` is fixed per definition (assumed) or varies per version (would change the Practice merge).
