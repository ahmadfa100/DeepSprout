# SQL execution and static-check evidence

Captured **2026-10-30 16:02:39 UTC** in the DeepSprout checkout. The preserved v1 and v2 files were read only. No SQL Server statement was executed. The local sandbox did not expose `sqlcmd`, `docker`, `podman`, `colima`, `nerdctl`, `tsql` or `isql` through `command -v`; no environment variable name matching `SQLSERVER`, `MSSQL`, `SQLCMD`, `DATABASE_URL` or `ODBC` was present. Python packages `pyodbc` and `pymssql` were absent. A loopback socket probe to `127.0.0.1:1433` returned `PermissionError` in the sandbox, and `ps` returned `operation not permitted`. These observations establish **no usable SQL execution path in this session**, not that no server exists anywhere.

## Source fingerprints (SHA-256)

| File | SHA-256 |
|---|---|
| v1 `07-database-schema.md` | `267d9316befdf028f33a35097037e66c8b3a341f8452c7910c9ee76fa6b40c35` |
| v2 `03-target-dictionary.md` | `8eb5d9af9bcb2b6a39fde669dc8849b9016a973a913eb575b2e4f004098603ad` |
| v2 `sql/001-first-slice.sql` | `38fa492f5865df64668694ffc8b780944bd12bafe29b85de827e3127e9860bdb` |
| v2 `sql/002-first-slice-validation.sql` | `cacb5929415f4869de95c0234ca19ba64f50209b3e2e6a9ce89000fccd2ab763` |
| v2 `sql/003-isolated-invariants-proof.sql` | `103addcf0b1a514c44993c552647fcb4b521d808762ca1d4cde0912157a4cc62` |
| v2.1 `02-canonical-dictionary.md` | `aecfe267dab2ffbcd213e5c407f2caab502ae27e4015cc0ee863ba00c256e636` |
| v2.1 `03-composite-key-audit.md` | `198b086c3a4acb333f1c7b39120e7876a3e759ba9412c0db60b7eacc773ee72b` |

## Reproducible checks completed

`python3 docs/architecture/database/v2.1/generate_dictionary.py` returned `129 tables; 59 composite FK targets verified` with exit code 0. The generator asserts source row count, local/target column existence, FK column arity, and an exact unfiltered target `PK`/`UQ` for each of 59 declared composite relationships. A second script checked that every explicit `UQ` token refers to a column in its table and found zero missing columns. A search of the generated dictionary found no `CurrentRevisionId`, `CurrentVersionId`, `SubmissionId`, or old override row text. These checks are static and do not parse or execute T-SQL.

## SQL Server execution status

| Case | Status | Result artifact |
|---|---|---|
| Original v2 `001` against fresh disposable database | **NOT EXECUTED** | No SQL transcript, server version, database id or result rows. |
| Original v2 `002` after `001` | **NOT EXECUTED** | No SQL transcript or PASS output. |
| Original v2 `003` against separate disposable database | **NOT EXECUTED** | No SQL transcript. |
| Corrected v2.1 DDL and negative FK tests | **NOT EXECUTED** | Dictionary only; DDL not yet materialized. |
| Two-connection races | **NOT EXECUTED** | No concurrent connections or barrier transcript. |

No SQL Server failure was observed. Static defects in the original scripts are identified in the Arabic gate report; they are not labeled runtime failures.

## Required next execution record

On a disposable SQL Server 2019+ instance, create separate empty databases for `001/002` and `003`; run with `sqlcmd -b`, save stdout/stderr and exit codes, capture `SELECT @@VERSION`, `sys.databases` compatibility and `READ_COMMITTED_SNAPSHOT` settings, script fingerprints, object counts, and all expected error numbers. After correcting the first-slice DDL, repeat in a new database and run independent two-connection last-seat, cross-Initiative, and Supervisor limit races. Do not overwrite this evidence record with inferred PASS results.
