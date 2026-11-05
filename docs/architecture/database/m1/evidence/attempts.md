# Execution attempts and observed failures

These entries transcribe the command output observed during this milestone. They are retained so a corrected final run does not hide earlier failures.

| Attempt | Observed result | Follow-up |
|---|---|---|
| First `dotnet-ef database update` for `InitialM1` | SQL Server error **113**, `Missing end comment mark '*/'`. The SQL resource separator appeared inside its opening comment. | Read-only check found one user table (`dbo.__EFMigrationsHistory`) and **zero** migration-history rows; no M1 table remained. Corrected the comment and reapplied successfully. |
| First C# validation harness run | `System.InvalidCastException`: `@@SPID` returned `Int16`, harness cast to `Int32`. | Corrected the scalar conversion; no SQL test was claimed from this run. |
| Second C# validation harness run | SQL Server error **334**: direct `OUTPUT` used on `institution.Initiative`, which has an enabled trigger. | Fixture insert now uses `SCOPE_IDENTITY()`. The complete harness later returned zero failures. |
| Final EF migration update | Three rows in `dbo.__EFMigrationsHistory`: `InitialM1`, `RescheduleInvariant`, `AdmissionDenialAudit`; all version `10.0.0`. | [Integrity output](integrity.txt). |
| Final validation harness | 41 `PASS` log records including 39 assertions plus environment and summary; zero `FAIL`. | [Raw JSONL](validation-results.jsonl). |

Expected negative-test SQL errors are individual PASS results only when the exact error and relevant constraint or command were checked; see the raw JSONL for `547`, `2601`, `229`, `51033`, `51034`, `51105`, `51107`, `51204`, `51205`, `51209`, `51211`, `51212`, `51303`, and `51501`.
