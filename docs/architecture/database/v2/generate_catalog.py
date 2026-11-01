"""Regenerate the v2 review matrix and target dictionary from the preserved v1 rows."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent
source = root.parent / "07-database-schema.md"
rows = []
for line_no, line in enumerate(source.read_text().splitlines(), 1):
    match = re.match(r"^\| `([a-z]+)\.([A-Za-z]+)` ([MHPV])/([USROI]) \| (.*?) \| (.*?) \|$", line)
    if match:
        schema, name, kind, privacy, purpose, rules = match.groups()
        rows.append(dict(line=line_no, schema=schema, name=name, kind=kind,
                         privacy=privacy, purpose=purpose, rules=rules))
assert len(rows) == 136, len(rows)

removed = {
    "personal.OnboardingProgress": ("MERGE", "personal.IndividualProfile", "Stage, last attempt and completion time belong to the single setup profile."),
    "institution.InitiativeSeat": ("REMOVE", "parent-locked membership/offer counts", "No physical seat identity is approved; serialized counts enforce numeric capacity."),
    "task.Submission": ("MERGE", "task.AssignmentRecipient", "Recipient stores review-loop state; attempts keep immutable history."),
    "session.SessionSeat": ("REMOVE", "parent-locked registration count", "Mode pool capacity is numeric, with no numbered seat."),
    "provider.ExperienceSeat": ("REMOVE", "parent-locked booking/offer counts", "Provider capacity is numeric, with no numbered seat."),
    "evidence.PersonalGardenState": ("REMOVE", "ledger query", "Four typed tree stages are derived from source-backed personal entries."),
    "evidence.PersonalGardenSummary": ("REMOVE", "ledger query", "Decoration totals are derived under published caps."),
    "evidence.GroupGardenState": ("REMOVE", "ledger query", "Collective milestones derive from group entries; GroupGarden identity remains."),
    "evidence.ReportSnapshot": ("REMOVE", "authorized source query", "Report cache is optional after measured load."),
}
assert len(removed) == 9
conditional = {
    "session.StandaloneSessionSupervisorAppointment",
    "provider.ProviderCohort", "provider.ProviderCohortMember", "provider.ProviderIncident",
    "coach.CoachApproval",
}

renamed = {"forms.SecureFile": "files.SecureFile"}
first = {
    "iam.Person", "iam.PersonEmail", "iam.PasswordCredential", "iam.OtpChallenge",
    "iam.GlobalGrant", "iam.ConsentRecord", "institution.Institution",
    "institution.InstitutionVerificationCase", "institution.RepresentativeMembership",
    "institution.Initiative", "institution.InitiativeRevision",
    "institution.InitiativeApplication", "institution.InitiativeApplicationDecision",
    "institution.InitiativeMembership", "institution.InitiativeStaffInvitation",
    "institution.InitiativeStaffAppointment", "files.SecureFile", "ops.AuditEvent",
}
assert len(first) == 18

source_ref = {
    "iam": "DeepSprout.md §2.2, D14–D16, D45, §24.1",
    "personal": "DeepSprout.md §4.1–4.5, D04",
    "lab": "DeepSprout.md §4.4, §10.2–10.3, D05, D42–D43",
    "recovery": "DeepSprout.md §5, D04, D06",
    "activity": "DeepSprout.md §7, D08–D11",
    "shield": "DeepSprout.md §6, §10.2, D44",
    "institution": "DeepSprout.md §15, D17–D30; new owner one-membership/five-day rule",
    "coach": "DeepSprout.md §13, D19, D24, D29–D34",
    "task": "DeepSprout.md §13.3, D31–D34",
    "session": "DeepSprout.md §15.2, §17.1, D35–D39",
    "provider": "DeepSprout.md §16, D27, D40",
    "forms": "DeepSprout.md §15.4, D41",
    "partnership": "DeepSprout.md §18, D40",
    "community": "DeepSprout.md §12, D44",
    "governance": "DeepSprout.md §19, D14",
    "commercial": "DeepSprout.md §20, §26.2(7)",
    "evidence": "DeepSprout.md §9–10, D07–D13, D46",
    "ops": "DeepSprout.md §23.3, §24.6",
}
milestone = {
    "iam": "M1", "personal": "M2", "lab": "M2", "recovery": "M2",
    "activity": "M2", "shield": "M2", "institution": "M3", "coach": "M4",
    "task": "M4", "session": "M5", "provider": "M6", "forms": "M7",
    "partnership": "M7", "community": "M8", "governance": "M8",
    "commercial": "M9 conditional", "evidence": "M2/M4/M5/M6", "ops": "M1/M2",
}
overrides = {
    "personal.IndividualProfile": "Add `OnboardingStage nvarchar(40) NOT NULL`, nullable `LastAssessmentAttemptId bigint` FK, `OnboardingCompletedAtUtc datetime2(3)`; keep one row per Person.",
    "recovery.RecoveryJourney": "Drop unfiltered unique PersonId; create filtered unique `(PersonId) WHERE Status='Active'`. Archived journeys remain. New journey eligibility is policy-gated.",
    "recovery.RecoveryCycle": "`JourneyId` remains FK; prevent multiple Active/ReviewDue cycles per active journey with filtered unique index.",
    "institution.Initiative": "Add `WithdrawalCutoffAtUtc datetime2(3) NULL` (required when Published), earlier than StartsAtUtc. Drop circular revision FK. `Capacity` CHECK 1..135; current published terms = highest published `RevisionNo`. Lock this row for all capacity transitions. Cutoff interpretation/reschedule effect requires owner decision.",
    "institution.InitiativeApplication": "Add `AttemptNo int NOT NULL`; replace unique `(InitiativeId,PersonId)` with `(InitiativeId,PersonId,AttemptNo)` and filtered unique `(InitiativeId,PersonId) WHERE Status IN ('Pending','Queued','Offered')`. Drop mutable DecidedByPersonId/DecisionReason; decisions move to child history. Current status is a transactional summary. Reapply policy remains open.",
    "institution.InitiativeSeatOffer": "Hold consumes numeric capacity while `Status='Offered'`, including expired-but-unprocessed offer. Transition to Expired under Initiative lock; do not derive capacity from wall clock alone. Composite application/Initiative FK retained.",
    "institution.InitiativeMembership": "Add `CapacityReleasedAtUtc datetime2(3) NULL` and `WithdrawalCutoffAtUtc datetime2(3) NOT NULL`. Filtered unique `PersonId WHERE Status IN ('Accepted','Suspended')`. `EndedAtUtc` required for Withdrawn/Removed/Completed, null for effective states. Composite `(ApplicationId,InitiativeId,PersonId)` FK to Application alternate key. Capacity count uses unreleased claims, not effective-status count alone.",
    "institution.InitiativeStaffAppointment": "Active Supervisor count max three under Initiative owner lock and privileged acceptance procedure. Unique active `(InitiativeId,PersonId,Role)`; filtered unique alone cannot enforce aggregate three.",
    "coach.CoachProgram": "Drop `CurrentRevisionId`; current published revision = highest published `RevisionNo` for this Program.",
    "coach.ProgramGroupInvitation": "Drop `UseLimit` and `Uses`; one email-bound verified Person consumes invitation once. Token hash and status/expiry remain.",
    "coach.ProgramGroupMembership": "Add composite `(GroupId,ProgramId)` FK and `(PersonId,ProgramId)` access path; avoid cross-Program placement.",
    "task.Assignment": "Drop `CurrentRevisionId`; current published revision = highest published `RevisionNo` for Assignment.",
    "task.AssignmentRecipient": "Absorb Submission review-loop `Status` and `LastAttemptNo int NOT NULL DEFAULT 0`; derive current decision from latest valid DecisionNo, with no circular pointer. UQ `(Id,AssignmentId)` supports attempt composite FK. Preserve assigned revision and transfer provenance.",
    "task.SubmissionAttempt": "Replace `SubmissionId` with `RecipientId bigint NOT NULL`; add `AssignmentId bigint NOT NULL`; unique `(RecipientId,AttemptNo)`; composite FKs `(RecipientId,AssignmentId)→AssignmentRecipient(Id,AssignmentId)` and `(AssignmentRevisionId,AssignmentId)→AssignmentRevision(Id,AssignmentId)` pin the same Assignment.",
    "task.ReviewDecision": "Append-only. UQ `(Id,AttemptId)` and composite FK `(SupersedesId,AttemptId)→ReviewDecision(Id,AttemptId)` bind supersession to one Attempt; one DecisionNo per Attempt. Actor grant validated at transaction time.",
    "task.CoachReport": "Remove reference to ReportSnapshot. Persist authorship/narrative; compute source counts with definition version, period and watermark in authorized report query.",
    "task.SupervisorReport": "Remove reference to ReportSnapshot. Persist authored summary; compute source counts from authorized Initiative facts.",
    "session.Session": "Drop `CurrentRevisionId`; current published revision = max published `RevisionNo`; retain registration's pinned revision.",
    "session.SessionCapacityPool": "Positive numeric capacity; lock Pool row for all Confirmed registration transitions; count confirmed registrations under lock.",
    "session.SessionRegistration": "No seat FK; composite `(PoolId,SessionId)` and `(SessionRevisionId,SessionId)`; one Person/session. Confirmed consumes pool capacity.",
    "provider.Experience": "Drop `CurrentRevisionId`; current published revision = max published `RevisionNo`; lock owner row for booking/offer/cancellation.",
    "provider.ExperienceBooking": "Add `CapacityReleasedAtUtc datetime2(3) NULL`. No seat FK. Count Confirmed/CheckedIn/Completed bookings with unreleased capacity claim; Queued/Offered booking itself does not consume separately from Offered hold. Cancellation/release policy is published and serialized.",
    "provider.SeatOffer": "Offered hold consumes capacity until serialized Accept/Decline/Expire/Cancel transition. Composite `(BookingId,ExperienceId)` FK and one live offer per Booking.",
    "provider.ProviderCohortMember": "Add `ExperienceId bigint NOT NULL`; add UQ `(Id,ExperienceId)` on ProviderCohort; composite FKs `(CohortId,ExperienceId)` and `(BookingId,ExperienceId)` prevent cross-Experience placement.",
    "provider.ProviderIncident": "If BookingId present, composite `(BookingId,ExperienceId)` FK; retention/safety policy gate before production collection.",
    "forms.Form": "Drop `CurrentVersionId`; current published version = max published VersionNo. Response pins FormVersionId.",
    "forms.FormAnswerChoice": "Add `QuestionId bigint NOT NULL`; UQ `(Id,QuestionId)` on FormAnswer and FormQuestionOption; composite FKs `(AnswerId,QuestionId)` and `(OptionId,QuestionId)` ensure selected option belongs to the answer's question.",
    "forms.SecureFile": "Move unchanged columns to `files.SecureFile`; add explicit owning-resource scope or purpose-bound ACL metadata before use. Never authorize download from OwnerPersonId alone.",
    "evidence.EvidenceEvent": "Source uniqueness uses source context/key/version; invalidation is append-only. Source-to-subject ownership is validated in source transaction.",
    "evidence.PersonalRewardEntry": "Grant uniqueness excludes policy version; reversal target unique. Lock Person for caps and write synchronously with source fact.",
    "evidence.GroupRewardEntry": "Grant uniqueness excludes policy version; one Garden owner; write synchronously with source fact.",
    "ops.OutboxMessage": "Only external delivery/integration events, inserted in the source transaction. Not the default mechanism for local reward projection.",
}

def esc(value):
    return value.replace("|", "\\|").replace("\n", " ")

matrix = [
    "# 02 — Every original table, disposition and milestone",
    "",
    "The matrix is generated from every exact table row in `../07-database-schema.md`. Source line references refer to that preserved file. `M/H/V/P` retain the original class; `S/R/O/I/U` retain privacy. Original column/key detail is in the target dictionary for retained tables. Consequence describes the data or boundary lost if removed without the named replacement. `KEEP` means necessary for the complete approved target; `REDESIGN` keeps the table identity with changed relationship/ownership; `DEFER` means conditionally needed after a policy gate, not deleted. Later-stage `KEEP`/`REDESIGN` means defer *implementation*, not capability.",
    "",
    "| Original table | Responsibility and source | Owner/links; kind | Removal or merge consequence | Destination and reason | Stage |",
    "|---|---|---|---|---|---|",
]
target = [
    "# 03 — Revised complete-target SQL Server dictionary",
    "",
    "**128 proposed target tables.** This dictionary copies the original 136 row definitions (`../07-database-schema.md`) for all retained rows, replaces nine removed/merged rows, moves SecureFile, and adds one decision-history row. The **v2 override** column is normative wherever it changes original wording. Column definitions in the source row and override together are the complete proposed target logical/physical dictionary; no SQL Server execution has validated all 128 tables. `M` mutable, `H` append-only, `V` immutable published version; privacy `S` sensitive personal, `R` restricted, `O` scoped operational, `I` internal, `U` public projection. Every retained table has `Id bigint IDENTITY PK`; outward roots have unique immutable GUID PublicId as in original preface. Mutable rows have CreatedAtUtc, UpdatedAtUtc and rowversion; history/version rows have CreatedAtUtc. All FK deletes NO ACTION. Use explicitly named PK/FK/AK/CK/UXF/IX in migrations. The M1 SQL file is executable physical DDL for its 18 tables; the other rows are implementation-ready specifications that require generated migrations and SQL validation before release.",
    "",
    "## Global v2 rules",
    "",
    "* Drop all six `CurrentRevisionId`/`CurrentVersionId` root pointers and their circular FKs; select highest published RevisionNo/VersionNo. A root becomes public only in the same transaction as a valid published child. Never mutate a published child to mark it current.",
    "* Normalize verified email before uniqueness; do not identify a Person from unverified email. All UTC timestamps use `datetime2(3)` and server time for cutoffs. Local policies retain a zone identifier and published UTC cutoff snapshot.",
    "* Capacity is authoritative source-row count under an owner row lock and stored-procedure DML boundary. No slot tables or allocated counters. For retained historical claims, `CapacityReleasedAtUtc` is explicit; never infer release from a status not covered by approved policy.",
    "* Parent-child equality is enforced by composite alternate keys/FKs wherever both IDs are present. A nullable FK is not permission; authorization checks current scoped grants for every read/write. Published versions and histories are protected from update/delete by runtime permissions.",
    "* Financial, minors' privacy, AI, safety and open completion parameters remain conditional on policy approval; a table in the complete target is not permission to collect that data now.",
    "* Target outward `PublicId` set is the original explicit set **minus `Submission`**. The new ApplicationDecision is internal through its Application. `files.SecureFile` remains internal. EvidenceEvent and ExtensionInstallation keep their explicit public GUID fields.",
    "",
    "| Target table · class/privacy | Final purpose and columns (original row unless override says otherwise) | Final indexes/checks/lifecycle (original row unless override says otherwise) | V2 override and source |",
    "|---|---|---|---|",
]

for row in rows:
    original = f"{row['schema']}.{row['name']}"
    spec = f"`../07-database-schema.md:{row['line']}`; {source_ref[row['schema']]}"
    links = ", ".join(dict.fromkeys(re.findall(r"→(?:[a-z]+\.)?([A-Za-z]+)", row["purpose"]))) or "root/scoped owner"
    class_text = f"{row['kind']}/{row['privacy']}; {esc(links)}"
    summary = row["purpose"].split(". ")[0].strip(". ")
    if original in removed:
        action, destination, why = removed[original]
        consequence = f"Without replacement: lose {summary.lower()}."
        recommendation = f"**{action}** → `{destination}`. {why}"
        stage = "M1" if destination in first else milestone[row['schema']]
    else:
        destination = renamed.get(original, original)
        action = "DEFER" if original in conditional or row['schema'] in {"community", "commercial"} else ("REDESIGN" if original in overrides or original in renamed else "KEEP")
        consequence = f"Lose {summary.lower()} and its source-linked history/ownership."
        if row['kind'] == "P":
            consequence = "Lose a cache only; authoritative data is preserved."
        recommendation = f"**{action}** → `{destination}`. " + (overrides.get(original, "Retain source-backed boundary and original keys."))
        stage = "M1" if destination in first else milestone[row['schema']]
        if row['schema'] in {"community", "commercial"}:
            stage += "; policy-gated"
        override = overrides.get(original, "None; original columns and constraints carry forward.")
        final_purpose, final_rules = row['purpose'].replace('forms.SecureFile', 'files.SecureFile'), row['rules']
        if original in {"institution.Initiative", "coach.CoachProgram", "task.Assignment", "session.Session", "provider.Experience", "forms.Form"}:
            final_purpose = re.sub(r",? `Current(?:Revision|Version)Id bigint\?[^`]*`", "", final_purpose)
            final_rules = re.sub(r"Composite FK[s]? `\(Current(?:Revision|Version)Id[^;]*?when set; ?", "", final_rules)
            final_rules = final_rules.replace("CurrentRevision FK configured after initial migration to avoid creation cycle. ", "")
        if original == "institution.InitiativeApplication":
            final_purpose = final_purpose.replace(", `DecidedByPersonId bigint?→Person`, `DecisionReason nvarchar(800)?`", "")
            final_rules = final_rules.replace("UQ `(InitiativeId,PersonId)`", "UQ `(InitiativeId,PersonId,AttemptNo)`")
            final_rules = final_rules.replace("reapply policy handled by new versioned decision on same application, not duplicate row.", "new attempts retain old decisions; reapplication policy open.")
        if original == "coach.ProgramGroupInvitation":
            final_purpose = final_purpose.replace(", `UseLimit smallint!`, `Uses smallint!`", "")
            final_rules = final_rules.replace("CK uses≤limit; ", "")
        if original == "task.SubmissionAttempt":
            final_purpose = final_purpose.replace("SubmissionId bigint!→Submission", "RecipientId bigint!→AssignmentRecipient")
            final_rules = final_rules.replace("SubmissionId", "RecipientId")
        if original == "session.SessionCapacityPool":
            final_rules = final_rules.replace("changing capacity cannot remove allocated seats", "capacity shrink is denied while confirmed registrations exceed new limit")
        if original in {"task.CoachReport", "task.SupervisorReport"}:
            final_rules = final_rules.replace("source IDs/definition in ReportSnapshot", "source IDs/definition in authorized query")
        target.append(f"| `{destination}` {row['kind']}/{row['privacy']} | {esc(final_purpose)} | {esc(final_rules)} | {esc(override)} Source: {esc(spec)} |")
    matrix.append(f"| `{original}` (`{row['line']}`) | {esc(summary)}; {esc(source_ref[row['schema']])} | {class_text} | {esc(consequence)} | {esc(recommendation)} | {stage} |")

target.append("| `institution.InitiativeApplicationDecision` H/O | `ApplicationId bigint!`, `InitiativeId bigint!`, `DecisionNo int!`, `Action nvarchar(24)!`, `ActorPersonId bigint!`, `Reason nvarchar(800)?`, `AtUtc datetime2(3)!`, `TermsRevisionId bigint!` | UQ `(ApplicationId,DecisionNo)`; composite FKs to Application and InitiativeRevision; IX `(InitiativeId,AtUtc)`; append-only | New owner §2.3; `DeepSprout.md` D25–D26. Full definition below. |")

matrix.extend([
    "", "## New table", "",
    "| New table | Responsibility and source | Owner/links; kind | Removal consequence | Destination | Stage |",
    "|---|---|---|---|---|---|",
    "| `institution.InitiativeApplicationDecision` | Append-only Approve/Reject/Pending-Withdraw/Queue/Offer/Block decision with actor, reason, effective time and application attempt; new owner §2.3, `DeepSprout.md` D25–D26 | `ApplicationId` FK plus actor Person; H/O | Reapplication and overwritten decisions lose provenance. | **ADD** | M1 |",
    "", "## Count audit", "",
    "Original rows: **136**. Removed/merged originals: **9** (the exact nine `REMOVE`/`MERGE` rows above). Added: **1**. Complete target: **128**. First slice: **18** names in `sql/001-first-slice.sql`, also selected by `M1` above. A retained table marked later stage is deferred **implementation**, not deleted capability.",
])

target.extend([
    "", "## New table: `institution.InitiativeApplicationDecision` H/O", "",
    "`Id bigint IDENTITY PK`; `ApplicationId bigint NOT NULL` FK to Application; `InitiativeId bigint NOT NULL` for composite same-owner FK `(ApplicationId,InitiativeId)`; `DecisionNo int NOT NULL`; `Action nvarchar(24) NOT NULL` CHECK in Approved, Rejected, Withdrawn, Queued, Offered, Blocked; `ActorPersonId bigint NOT NULL` FK Person; `Reason nvarchar(800) NULL`; `AtUtc datetime2(3) NOT NULL`; `TermsRevisionId bigint NOT NULL` composite FK to InitiativeRevision; `CreatedAtUtc datetime2(3) NOT NULL`. UQ `(ApplicationId,DecisionNo)`, IX `(InitiativeId,AtUtc)`. Append-only, `NO ACTION` deletes. Current Application status changes in the same transaction. Administrative authority must be checked against current grant and action. Accepted-membership withdrawal/discipline is a Membership transition audited by Membership PublicId, not another Application decision.",
    "", "## Exact first-slice list", "",
    ", ".join(f"`{name}`" for name in sorted(first)) + ".",
])

assert len(target) - target.index("|---|---|---|---|") - 1 > 128
(root / "02-table-disposition.md").write_text("\n".join(matrix) + "\n")
(root / "03-target-dictionary.md").write_text("\n".join(target) + "\n")
print(f"generated {len(rows)} original rows, {len(rows)-len(removed)+1} target tables, {len(first)} M1 tables")
