#!/usr/bin/env python3
"""Narrow source-dictionary regression check for known missing M1 columns.
No SQL connection; stdlib only. Exits 1 if required columns absent, 2 if source invalid.
Usage: python 03-reproducible-canonical-dictionary-check.py "02-canonical-dictionary.md"
"""
import csv
import re
import sys
from pathlib import Path

REQUIRED = {
    'iam.PersonEmail': ['VerifiedAtUtc'],
    'iam.OtpChallenge': ['ExpiresAtUtc'],
    'iam.GlobalGrant': ['RevokedAtUtc'],
    'iam.ConsentRecord': ['DecidedAtUtc'],
    'institution.RepresentativeMembership': ['RevokedAtUtc'],
    'institution.Initiative': ['StartsAtUtc','EndsAtUtc'],
    'institution.InitiativeApplication': ['SubmittedAtUtc'],
    'institution.InitiativeMembership': ['EndedAtUtc'],
    'institution.InitiativeStaffInvitation': ['ExpiresAtUtc'],
    'ops.AuditEvent': ['AtUtc'],
    'institution.InitiativeApplicationDecision': ['AtUtc'],
}
M1 = [
    'files.SecureFile','iam.ConsentRecord','iam.GlobalGrant','iam.OtpChallenge',
    'iam.PasswordCredential','iam.Person','iam.PersonEmail',
    'institution.Initiative','institution.InitiativeDraft','institution.InitiativeApplication',
    'institution.InitiativeApplicationDecision','institution.InitiativeMembership',
    'institution.InitiativeRevision','institution.InitiativeStaffAppointment',
    'institution.InitiativeStaffInvitation','institution.Institution',
    'institution.InstitutionVerificationCase','institution.RepresentativeMembership','ops.AuditEvent'
]

def extract(path):
    tables = {}
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        m = re.match(r'^\|\s*`([a-z]+\.[A-Za-z0-9_]+)`\s+[MHVP]/',line)
        if not m:
            continue
        # Only third-column (the columns cell) contains declared column type tokens.
        chunks = line.split('|')
        if len(chunks) < 4:
            raise ValueError('Malformed table row: '+m.group(1))
        col_text = chunks[2]
        typed = re.findall(r'`([A-Za-z_][A-Za-z0-9_]*)\s+(?:bigint|uniqueidentifier|datetime2\(\d+\)|rowversion|nvarchar\([^)]*\)|varbinary\([^)]*\)|smallint|tinyint|int|bit|char\([^)]*\)|decimal\([^)]*\)|date)\b', col_text, flags=re.I)
        # NOTE: closing-backtick regex and type matching are intentionally conservative.
        tables[m.group(1)] = set(typed)
    return tables

def main():
    if len(sys.argv)<2:
        print('Usage: python script.py 02-canonical-dictionary.md',file=sys.stderr);return 2
    p=Path(sys.argv[1]);
    if not p.exists():
        print('Missing input:',p,file=sys.stderr);return 2
    tables=extract(p)
    if not tables:
        print('No dictionary rows recognized; inspect source format.',file=sys.stderr);return 2
    rows=[]
    for t in M1:
        rows.append((t,'<table>', 'PASS' if t in tables else 'FAIL'))
    for t,cols in REQUIRED.items():
        for c in cols:
            rows.append((t,c,'PASS' if c in tables.get(t,set()) else 'FAIL'))
    writer=csv.writer(sys.stdout);writer.writerow(['table','required_column','result']);writer.writerows(rows)
    failures=sum(r[2]=='FAIL' for r in rows)
    print(f'CHECKED={len(rows)} FAIL={failures} TABLES_IN_DICTIONARY={len(tables)}',file=sys.stderr)
    return 1 if failures else 0

if __name__ == '__main__':sys.exit(main())
