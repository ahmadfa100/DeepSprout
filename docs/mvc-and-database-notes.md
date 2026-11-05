# DeepSprout MVC website and database foundation

`src/DeepSprout.Web` is a runnable ASP.NET Core MVC website and the only web implementation in this repository. Its 46 pages are Razor views grouped under `Views/Home`, `Views/Auth`, `Views/Member`, `Views/Public`, `Views/Workspaces` and related folders. `Controllers/PagesController.cs` uses `Models/PageCatalog.cs` (fed by `page-routes.json`) to serve their historical `.html` URLs. CSS, JavaScript, images and fonts live in `wwwroot/assets` and `wwwroot/src`. The Chrome extension is in `extensions/digital-shield`. See the [current product guide](current-product-guide.md) for the page and workflow inventory.

**Visual Studio:** open `DeepSprout.sln` from the repository root, set `DeepSprout.Web` as the startup project and press **F5** (launch profile `http://127.0.0.1:8765/`). `DeepSprout.Database.slnx` remains for database-focused work.

```sh
dotnet run --project src/DeepSprout.Web/DeepSprout.Web.csproj
node tests/mvc-smoke.mjs   # with the site running: every page, the 404 and every local link/asset
```

Publish with `dotnet publish src/DeepSprout.Web/DeepSprout.Web.csproj -c Release`. The page-only demo stores framework keys under `.keys/`; before adding server sessions or authentication, configure a persistent protected key store through `DataProtection__KeyDirectory`.

The MVC conversion currently covers page rendering and routing. Existing page behavior and demo identities still run in browser JavaScript and browser storage. Authentication, resource authorization, server commands and durable product data have **not** been connected to EF Core. A database connection can be supplied as `ConnectionStrings__DeepSprout`; simply running the site does not migrate or write to the validation database.
The database work below implements the domain milestone:

The SQL Server implementation is arranged as:

- `src/DeepSprout.Domain`: domain records, with no persistence dependency.
- `src/DeepSprout.Application`: command contracts and DTOs, with no EF dependency.
- `src/DeepSprout.Infrastructure`: one EF Core SQL Server context, Code First
  migrations, and a transactional SQL command adapter.
- `tests/DeepSprout.DatabaseValidation`: executable SQL Server integration suite.

The design-time context and test harness target `DESKTOP-A4AL2KR` /
`DeepSprout_Validation` and guard the server and database name. Do not point the
validation harness at another database. As of 2026-11-01, the authorized validation database
contains all 129 v2.1 target tables and 23 applied additive migrations. The original
v1, v2, and v2.1 architecture documents and previously applied migrations remain
unchanged.

See the [final Arabic M1 sign-off](../docs/architecture/database/m1/04-final-m1-signoff-ar.md),
[Phase B validation report](../docs/architecture/database/phase-b/02-final-validation-ar.md),
and [executed regression results](../docs/architecture/database/phase-b/final-regression/summary.csv).
This validates database development, not production or authenticated MVC request authorization.


