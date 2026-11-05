import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const source = path.join(root, 'docs/architecture/database/v2.1/02-canonical-dictionary.md');
const target = path.join(root, 'docs/architecture/database/m1/01-corrected-dictionary.md');
const tables = new Set([
  'files.SecureFile', 'iam.ConsentRecord', 'iam.GlobalGrant', 'iam.OtpChallenge',
  'iam.PasswordCredential', 'iam.Person', 'iam.PersonEmail', 'institution.Initiative',
  'institution.InitiativeDraft', 'institution.InitiativeApplication',
  'institution.InitiativeApplicationDecision', 'institution.InitiativeMembership',
  'institution.InitiativeRevision', 'institution.InitiativeStaffAppointment',
  'institution.InitiativeStaffInvitation', 'institution.Institution',
  'institution.InstitutionVerificationCase', 'institution.RepresentativeMembership',
  'ops.AuditEvent',
]);
const added = {
  'iam.PersonEmail': ['VerifiedAtUtc datetime2(3) NULL'],
  'iam.OtpChallenge': ['ExpiresAtUtc datetime2(3) NOT NULL', 'Status nvarchar(24) NOT NULL', 'UsedAtUtc datetime2(3) NULL'],
  'iam.GlobalGrant': ['RevokedAtUtc datetime2(3) NULL'],
  'iam.ConsentRecord': ['DecidedAtUtc datetime2(3) NOT NULL'],
  'institution.RepresentativeMembership': ['RevokedAtUtc datetime2(3) NULL'],
  'institution.Initiative': ['StartsAtUtc datetime2(3) NULL', 'EndsAtUtc datetime2(3) NULL'],
  'institution.InitiativeApplication': ['SubmittedAtUtc datetime2(3) NOT NULL'],
  'institution.InitiativeMembership': ['AcceptedAtUtc datetime2(3) NOT NULL', 'EndedAtUtc datetime2(3) NULL'],
  'institution.InitiativeStaffInvitation': ['ExpiresAtUtc datetime2(3) NOT NULL'],
  'institution.InitiativeStaffAppointment': ['AcceptedAtUtc datetime2(3) NOT NULL', 'RevokedAtUtc datetime2(3) NULL'],
  'institution.InstitutionVerificationCase': ['DecidedAtUtc datetime2(3) NULL'],
  'ops.AuditEvent': ['AtUtc datetime2(3) NOT NULL'],
  'institution.InitiativeApplicationDecision': ['AtUtc datetime2(3) NOT NULL'],
};
const lines = [
  '# DeepSprout M1 — corrected 19-table SQL Server contract', '',
  'Source: v2.1 canonical dictionary and the 2026-11-01 test gate. This file is the M1 implementation contract; historical documents are unchanged.',
  'Every table has `Id bigint IDENTITY` PK. Mutable tables have UTC audit dates and `rowversion`; foreign keys use NO ACTION. Runtime business transitions use serialized commands.',
  '', '| Table · class/privacy | Final columns | Final keys, FKs, checks and indexes |', '|---|---|---|',
];
const found = new Set();
for (const line of fs.readFileSync(source, 'utf8').split(/\r?\n/)) {
  const match = /^\| `([a-z]+\.[A-Za-z0-9_]+)` [MHVP]\//.exec(line);
  if (!match || !tables.has(match[1])) continue;
  const table = match[1];
  const chunks = line.split('|');
  if (chunks.length !== 5) throw Error(`Unexpected source row: ${table}`);
  chunks[2] = chunks[2].trimEnd();
  for (const column of added[table] ?? []) chunks[2] += `, \`${column}\``;
  chunks[2] += ' ';
  if (table === 'institution.InitiativeMembership') {
    chunks[3] = chunks[3].replace(
      "(Status='Withdrawn' AND EndedAtUtc IS NOT NULL AND CapacityReleasedAtUtc IS NOT NULL AND CapacityReleasedAtUtc>=EndedAtUtc) OR (Status IN ('Removed','Completed') AND EndedAtUtc IS NOT NULL AND CapacityReleasedAtUtc IS NULL)",
      "(Status IN ('Withdrawn','Removed','Completed') AND EndedAtUtc IS NOT NULL AND CapacityReleasedAtUtc IS NOT NULL AND CapacityReleasedAtUtc>=EndedAtUtc)",
    );
    chunks[3] += " Approved 2026-11-01: removal and completion immediately release capacity. Suspended remains active and consumes capacity. Accepted withdrawal requires now strictly before its pinned cutoff. Rescheduling may not shorten an existing member's withdrawal entitlement. Same-initiative rejoining remains unapproved.";
  }
  if (table === 'institution.InitiativeApplication') {
    chunks[3] = chunks[3].replace('repeat submission is policy-blocked until owner decision', 'new AttemptNo allowed after ordinary Rejected while eligible/open; active Blocked rejects new attempts; pending may withdraw');
  }
  if (table === 'institution.Initiative') chunks[3] += ' Published status requires an existing matching revision in the same transaction; draft may omit title and stage values.';
  if (table === 'institution.InitiativeRevision') chunks[3] += ' Withdrawal cutoff is a UTC instant 120 hours before StartsAtUtc at initial publication.';
  chunks[3] = chunks[3].trimEnd() + ' ';
  lines.push(chunks.join('|'));
  found.add(table);
}
if (found.size !== tables.size) throw Error(`Missing M1 rows: ${[...tables].filter(x => !found.has(x))}`);
lines.push('', '## Scope and open rules', '',
  "This migration covers M1 only. Rejoining the same initiative after a former membership remains disabled. Waitlist offers, cancellation status transitions, Lab/Shield/Provider/Forms/Rewards tables and the full API remain later slices. A shorter rescheduled start never changes an existing membership's pinned withdrawal cutoff.");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, lines.join('\n') + '\n');
console.log(target);
