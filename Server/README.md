# DeepSprout MVC website and database foundation

`src/DeepSprout.Web` is a runnable ASP.NET Core MVC website. Its 46 website pages are Razor views grouped under `Views/Home`, `Views/Auth`, `Views/Member`, `Views/Public`, `Views/Workspaces` and related folders. `Controllers/PagesController.cs` uses `Models/PageCatalog.cs` to serve their existing URLs. CSS, JavaScript and artwork keep their current paths. The Chrome extension documents and test fixture remain outside MVC. See the [current product guide](../docs/current-product-guide.md) for the page and workflow inventory.

**Visual Studio:** open [`../DeepSprout.sln`](../DeepSprout.sln) from the repository root. In Solution Explorer, expand `Server` → `src` → `DeepSprout.Web`, right-click `DeepSprout.Web`, choose **Set as Startup Project**, then press **F5**. The project has `Controllers`, `Models`, `Views`, `wwwroot`, `Program.cs`, `appsettings.json` and a launch profile for `http://127.0.0.1:8765/`. The older `DeepSprout.Database.slnx` remains for database-focused work.

Run from the repository root with .NET SDK 10:

```sh
dotnet run --project Server/src/DeepSprout.Web/DeepSprout.Web.csproj
```

Open `http://127.0.0.1:8765/`. To update views after changing a page in `Client/`, run `node Server/scripts/sync-mvc-views.mjs` and rebuild; `--check` verifies that generated views are current. In the source checkout, `wwwroot` links to existing `Client/assets` and `Client/src` through the project file rather than duplicating 130 MB of artwork and scripts. Publish with `dotnet publish Server/src/DeepSprout.Web/DeepSprout.Web.csproj -c Release`; the package includes those assets under `wwwroot` and needs no adjacent `Client/` folder. The page-only demo stores framework keys under `.keys/`; before adding server sessions or authentication, configure a persistent protected key store through `DataProtection__KeyDirectory` and deployment key protection.

The MVC conversion currently covers page rendering and routing. Existing page behavior and demo identities still run in browser JavaScript and browser storage. Authentication, resource authorization, server commands and durable product data have **not** been connected to EF Core. A database connection can be supplied as `ConnectionStrings__DeepSprout`; simply running the site does not migrate or write to the validation database.

The database work below implements the domain milestone:

The static client demonstration remains separate. The SQL Server implementation is arranged as:

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
