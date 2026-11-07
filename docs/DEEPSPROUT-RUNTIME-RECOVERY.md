# Runtime recovery check, 6 November 2026

## Confirmed observations

- The process on port 8766 returned an older compiled `Views/Workspaces/Index.cshtml` without `ds-system.css`, while its static `app.js` and CSS came from the current tree. This mixed compiled view and current assets.
- The real project builds cleanly. A source-based Development launch on port 8782 renders the four redesigned workspaces. The content root is `src/DeepSprout.Web`; static assets come from its `wwwroot`.
- The active source module graph contains no static imports of removed `provider-rules.js`, `provider-completion.js`, or `provider-selectors.js`. A legacy completion collection remains intentionally in the data model.
- Browser HTTP caching kept an older transitive `store.js` in an already-open 8781 tab after its entry module changed. A fresh origin loaded the current module graph. Development responses now clear only the HTTP cache on the workspace view and send `no-store` for static assets; the entry module and redesign stylesheet have content-versioned URLs.
- The local partner store is scoped to its origin. Fresh port 8782 seeded the fictional Horizon, Start Today, Weekend Nature Reset, Dana Valley Day Hike, and Neighbourhood Planting Morning records. The original user browser stores on other origins were not copied or replaced.

## Run

From the repository root in PowerShell:

```powershell
dotnet build src/DeepSprout.Web/DeepSprout.Web.csproj
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --project src/DeepSprout.Web/DeepSprout.Web.csproj --no-build --no-launch-profile --urls http://127.0.0.1:8782
```

Open `http://127.0.0.1:8782/workspaces.html#/auth/login`. The development identities are Maya Haddad (Institution), Leen Salem (Admin), Sami Nasser or Hala Mansour (Supervisor), Karim Odeh (Coach), and Omar Saleh (participant). The demo clock starts on 16 October 2026, Asia/Amman. `Development demo` has an additive `Add rich demo data` control. It backs up the original partner store under `deepsprout-ecosystem-demo-v1:backup:before-rich-demo-v1`, preserves the signed-in identity, and adds the existing fictional busy-Initiative and Admin fixtures only once. `Load scenario` and `Reset partner demo data` still replace local partner progress after an explicit warning.

## Verification limits

The four dashboards, Create New, and regular Explore were rendered in a browser; the Institution mobile dashboard was inspected at 390 px. The new additive fixture populated Coach reviews, Institution action queues, and Admin requests. No original user records from an earlier browser origin were imported, and the full requested cross-workspace mutation matrix was not completed. Keep the old origin and its browser profile available for explicit data recovery.
