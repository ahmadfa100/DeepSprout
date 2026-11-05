import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const file = path.join(root, 'docs/architecture/database/m1/01-corrected-dictionary.md');
const required = new Map([
  ['iam.PersonEmail', ['VerifiedAtUtc']],
  ['iam.OtpChallenge', ['ExpiresAtUtc']],
  ['iam.GlobalGrant', ['RevokedAtUtc']],
  ['iam.ConsentRecord', ['DecidedAtUtc']],
  ['institution.RepresentativeMembership', ['RevokedAtUtc']],
  ['institution.Initiative', ['StartsAtUtc', 'EndsAtUtc']],
  ['institution.InitiativeApplication', ['SubmittedAtUtc']],
  ['institution.InitiativeMembership', ['EndedAtUtc']],
  ['institution.InitiativeStaffInvitation', ['ExpiresAtUtc']],
  ['ops.AuditEvent', ['AtUtc']],
  ['institution.InitiativeApplicationDecision', ['AtUtc']],
]);
const rows = new Map();
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const table = /^\| `([a-z]+\.[A-Za-z0-9_]+)` [MHVP]\//.exec(line)?.[1];
  if (table) rows.set(table, line.split('|')[2]);
}
let failures = 0;
for (const [table, columns] of required) {
  for (const column of columns) {
    const pass = new RegExp('`' + column + String.raw`\s+(?:datetime2\(3\)|[A-Za-z]+)`).test(rows.get(table) ?? '');
    console.log(`${table},${column},${pass ? 'PASS' : 'FAIL'}`);
    if (!pass) failures++;
  }
}
console.error(`M1_TABLES=${rows.size} REQUIRED_COLUMNS=12 FAIL=${failures}`);
if (rows.size !== 19 || failures) process.exitCode = 1;
