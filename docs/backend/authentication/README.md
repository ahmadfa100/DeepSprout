# DeepSprout authentication implementation guide

**Audience:** the student developer implementing this code personally. **Scope:** one ASP.NET Core MVC application with Razor views, Identity, EF Core, and SQL Server. This guide describes work to do; it does not claim that authentication works today. Read [AGENTS.md](../../../AGENTS.md), the [v4.1 owner decisions](../../architecture/p0-target-v4.1.md), the [database index](../../architecture/database/README.md), and the [persistence contract](../../architecture/database/persistence-contract.md) before changing the schema or an existing workflow. The approved database has 58 **application** tables; Identity's framework tables are outside that count. Never target `DeepSprout_V5_Demo`, `DeepSprout_Validation`, or `DeepSprout_Task` while learning this flow.

## 1. Starting point verified on 9 November 2026

| Item | Classification | Evidence and next step |
|---|---|---|
| `src/DeepSprout.Infrastructure/Identity/ApplicationUser.cs` | **EXISTS BUT REQUIRES MODIFICATION/VERIFICATION** | `ApplicationUser : IdentityUser<long>` has `long PersonId`. It has no navigation or custom credential code, which is appropriate. Verify the chosen one-to-one key strategy and migration output; do not add a second password property. |
| `src/DeepSprout.Infrastructure/V5/DeepSproutV5DbContext.cs` | **EXISTS BUT REQUIRES MODIFICATION** | It now inherits `IdentityDbContext<ApplicationUser, IdentityRole<long>, long>`, calls `base.OnModelCreating`, applies the generated V5 mapping, then maps required `ApplicationUser.PersonId` to `Person` with `WithOne()` and `Restrict`. That is a reasonable starting relationship. Its previous `DeepSproutV5DesignTimeFactory` was removed in the current uncommitted edit. Restore safe design-time creation in a separate non-generated file before scaffolding. |
| `src/DeepSprout.Infrastructure/DeepSprout.Infrastructure.csproj` | **EXISTING AND READY** | Identity EF Core, EF Core SqlServer, and EF Core Design are referenced at 10.0.14. `dotnet ef` 10.0.0 runs, but warns that it is older than the runtime; align the tool later if convenient. |
| `src/DeepSprout.Web/Program.cs` | **EXISTS BUT REQUIRES MODIFICATION** | Registers V5 context only when `ConnectionStrings:DeepSprout` exists, but has no `AddIdentity`, authentication/authorization services or middleware. Preserve its existing Data Protection, page routing, cache behavior, and current uncommitted work. |
| `src/DeepSprout.Web/appsettings.Development.json` | **EXISTING AND READY FOR LOCAL USE** | Windows Authentication connection targets `localhost` / `DeepSprout_Development`; no password is committed. Confirm the effective connection before each migration. Production must use protected configuration and HTTPS. |
| `src/DeepSprout.Web/Views/Auth/{Register,Login}.cshtml` | **EXISTS BUT REQUIRES MODIFICATION** | Full existing Razor page designs have forms but no server post/antiforgery integration. Preserve the visual experience. `Views/Entry/{Register,Login}.cshtml` are redirect entry pages, not the forms. |
| `src/DeepSprout.Web/wwwroot/src/pages/auth/{register/register,login/login}.js` | **EXISTS BUT REQUIRES MODIFICATION** | Current scripts intercept submit and call the browser-local `DeepSproutRepo`; login ignores the password. Remove those paths for the real routes when server forms are ready, retaining non-auth visual interaction. |
| `src/DeepSprout.Web/page-routes.json` and `Controllers/PagesController.cs` | **EXISTS BUT REQUIRES MODIFICATION/VERIFICATION** | `PagesController` serves GET/HEAD pages from the manifest. `/login.html` and `/register.html` redirect to the nested form URLs, which are also in the manifest. When an `AccountController` owns those GET URLs, remove the two nested manifest entries to avoid competing routes. Preserve other page routes. |
| `src/DeepSprout.Infrastructure/V5/Migrations/` | **EXISTING AND READY AS BASELINE** | Contains `20261108112907_V5Baseline` and `20261108112954_V5Lean2Onboarding2AndV41`, plus their snapshot. No Identity migration exists in source or in the development DB. Do not change these applied files. |
| `localhost` / `DeepSprout_Development` | **EXISTS; REQUIRES IDENTITY MIGRATION** | Read-only SQL check found 58 application tables, the two V5 history entries, and zero `AspNet%` tables. No Identity tables have been applied. |
| V5 `Person` and `IndividualProfile` | **EXISTING AND READY; RULES REQUIRE VERIFICATION** | Generated POCOs and mappings exist. `Person.Status` allows `Active/Suspended/Closed`; normalized email has a filtered unique index. `IndividualProfile.PersonId` is unique, stage includes `Started`, and `JourneyLevel >= 1`. Keep generated files unchanged. |
| Account controller, view models, services, server auth tests | **MISSING** | Only `PagesController` is present. `tests/DeepSprout.DatabaseValidation` is historical M1, and `tests/client` exercises the browser demo. Add focused server tests. |

**Important diagnostic:** `dotnet build DeepSprout.sln -c Release --no-restore` passed. `dotnet ef dbcontext info --configuration Release --no-build --project src/DeepSprout.Infrastructure --startup-project src/DeepSprout.Infrastructure --context DeepSproutV5DbContext` failed because the current context has no design-time factory and the Infrastructure class library cannot supply `DbContextOptions`. An older Debug build can misleadingly report the removed factory; use the same configuration for build and EF commands. This is the first coding task, not an Identity migration to apply blindly.

## 2. Choose cookies for MVC

| Mechanism | Fit here | Cost |
|---|---|---|
| Identity with an authentication cookie | **Use now.** Browser submits the Razor form, `SignInManager` validates credentials and writes a protected cookie, and the browser sends it automatically on later MVC requests. | Protect unsafe requests with antiforgery tokens; configure cookie lifetime, HTTPS, and server revalidation. |
| JWT bearer token | Useful for an independently deployed API or non-browser client. The present MVC pages do not require it. | Token storage, refresh/revocation, and browser CSRF/XSS choices add work. A JWT is not a role-permission system. |
| Both | Possible later if a separately authorized Chrome Extension needs server endpoints. | Design the extension's own narrowly scoped token flow then; never reuse an MVC cookie as an extension secret or add JWT merely for popularity. |

**How it works:** `UserManager<ApplicationUser>` creates and manages Identity accounts, password hashes, confirmation tokens, security stamps, and lockout state. `SignInManager<ApplicationUser>` checks a password and issues/revokes the cookie. Authentication middleware reads the cookie and builds `HttpContext.User` (`ClaimsPrincipal`); authorization middleware evaluates endpoint policy. Claims identify the signed-in user and can carry stable, minimal facts. Do **not** put mutable Institution membership or staff scope in a long-lived claim as the sole authority: query current database state for a resource action. Configure `UseAuthentication()` before `UseAuthorization()` after routing and before endpoints. MVC forms need antiforgery validation, because the browser automatically attaches cookies to requests. See [Identity](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity?view=aspnetcore-10.0), [resource authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resource-based?view=aspnetcore-10.0), and [MVC antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0).

Cookie expiry/renewal is configuration, not permanent authority. A valid cookie must still fail protected requests after `Person.Status` becomes `Suspended` or an appointment is revoked. Use server-side status checks (for example cookie principal validation plus a DB-backed authorization check) and security-stamp refresh/invalidation as appropriate; test the maximum revocation delay. `SignOutAsync` ends the current browser session; a security-stamp change or equivalent account-wide policy is needed to invalidate other sessions. Do not promise immediate revocation until the test proves it.

## 3. Identity and data ownership

```
AspNetUsers.Id (Identity PK, long) -- AspNetUsers.PersonId (required unique FK) --> iam.Person.Id (canonical human PK)
                                                                     |
                                                                     +--> personal.IndividualProfile.PersonId (unique FK)
                                                                     +--> org.OrganizationMember.PersonId
                                                                     +--> org.StaffAppointment.PersonId
```

`ApplicationUser` is an Identity storage record. Its inherited `Id` identifies the **credential account**, and its `PersonId` points to the one canonical `iam.Person`. These two `long` values are different concepts; never assume they are equal. `IdentityRole<long>` and `AspNetRoles` hold coarse framework roles if ever justified; they do not express “Representative for Institution 42” or “Supervisor for Initiative 7.” `Person` holds human identity and account status. `IndividualProfile` exists only when the Individual workspace is enabled; its `PersonId` is a separate unique FK. Institution memberships and staff appointments grant scoped workspaces after verification/acceptance. Merely selecting “Partner” or signing in grants no such membership.

The current `WithOne().HasForeignKey<ApplicationUser>(u => u.PersonId).IsRequired().OnDelete(Restrict)` should produce a required FK and a unique index on `AspNetUsers.PersonId`. Confirm both in the generated migration and SQL Server. A unique FK guarantees at most one Identity user per Person; registration also needs a matching Person row and should prevent orphaned records transactionally. Do not add a second navigation or configure a second mapping until inspecting the resulting migration.

**Credential owner:** Identity owns password hash, failure count, lockout, email confirmation, reset tokens, and security stamp. Do not read or write `Person.PasswordHash`, `Person.FailedLoginCount`, or `Person.LockedUntilUtc` for new logins. Keep those approved/generated columns unused for now, document their eventual disposition, and avoid duplicating Identity state. Keep `iam.OtpChallenge` historical/unused unless a separately approved custom OTP need exists. `Person.EmailVerifiedAtUtc` may mirror an actual successful Identity confirmation transactionally; it must never be set from a button click or a demo choice.

**Registration order matters:** the required `ApplicationUser.PersonId` FK means create `Person` first to obtain its database-generated `Id`, then call `UserManager.CreateAsync(user, password)` with that `PersonId`, and create `IndividualProfile` for an Individual. All three writes must share the same scoped `DeepSproutV5DbContext` and explicit database transaction, including the `UserManager` store. Roll back on any Identity validation failure, duplicate key, profile failure, or cancellation; do not issue a cookie before commit. `IdentityResult` failure does not throw automatically. Catch only expected unique/concurrency/database failures, log safely, and return a recoverable error. Make concurrent duplicate registration rely on both Identity's normalized-email uniqueness and V5 `Person.NormalizedEmail` uniqueness, not a preceding `AnyAsync` alone.

For a new Individual, `Person.Status = Active`, `IndividualEnabledAtUtc` records enabling, `IndividualProfile.OnboardingStage = Started`, and `JourneyLevel = 1`; leave setup answers null until the six questions are answered. Do not create a plan or Lab result during account creation. For a Partner applicant, create the human account and an unverified Institution/verification case through a **later** scoped workflow; do not create an active `OrganizationMember` or privileged role merely because the form says Partner. Exact representative proof and email-delivery policy remain owner decisions.

## 4. File-by-file implementation map

Legend: **[EXISTS]** leave or inspect; **[CREATE]** write personally; **[MODIFY]** edit personally; **[VERIFY ONLY]** do not edit in this phase. Paths are repository-relative. “Initial” means required for the first persistent Individual register/login/profile slice; “later” means implement when the corresponding workflow is ready.

| File and project | Contents, dependencies, and acceptance |
|---|---|
| **[EXISTS / VERIFY]** `src/DeepSprout.Infrastructure/Identity/ApplicationUser.cs` · Infrastructure | Contains `ApplicationUser : IdentityUser<long>` and `long PersonId`. Keep inherited `Email`, `NormalizedEmail`, `PasswordHash`, `EmailConfirmed`, lockout and security fields. No extra password or `Person` copy. Acceptance: compiles and maps to exactly one Person. |
| **[MODIFY]** `src/DeepSprout.Infrastructure/V5/DeepSproutV5DbContext.cs` · Infrastructure | Existing `IdentityDbContext<ApplicationUser, IdentityRole<long>, long>` and `OnModelCreating` mapping. Keep `base.OnModelCreating` before `V5ModelConfiguration.Apply`. Review FK/index output; correct only non-generated Identity mapping if necessary. Never edit `V5ModelConfiguration.g.cs`. Acceptance: model changes are limited to Identity framework objects. |
| **[CREATE]** `src/DeepSprout.Infrastructure/V5/DeepSproutV5DesignTimeFactory.cs` · Infrastructure · **first coding task** | `IDesignTimeDbContextFactory<DeepSproutV5DbContext>` with `CreateDbContext(string[] args)`. Read `DEEPSPROUT_V5_CONNECTION`, reject a missing value for connection commands, construct `DbContextOptionsBuilder<DeepSproutV5DbContext>().UseSqlServer(...)`, and return the context. Validate that parsed server/database are exactly the intended development target before any migration application; do not embed a production or demo connection. For model-only commands, an unreachable placeholder can work, but an explicit local development connection is simpler and safer here. Acceptance: Release `dotnet ef dbcontext info` reports `localhost` / `DeepSprout_Development`. |
| **[CREATE, reviewed]** `src/DeepSprout.Infrastructure/V5/Migrations/<timestamp>_IdentityFramework.cs` and its designer; update snapshot · Infrastructure | Generated by `dotnet ef migrations add`, then **inspect**, not hand-invent. Expect seven standard `AspNet*` tables, a unique `PersonId` index, and FK to `iam.Person`. Keep applied V5 migrations unchanged. Acceptance: migration SQL contains no unexpected alteration of the 58 application tables. |
| **[MODIFY]** `src/DeepSprout.Web/Program.cs` · Web | Configure the existing V5 context, `AddIdentity<ApplicationUser, IdentityRole<long>>().AddEntityFrameworkStores<DeepSproutV5DbContext>().AddDefaultTokenProviders()`, password/lockout/confirmation options, cookie paths/settings, authentication and authorization middleware, and MVC antiforgery filter. Keep connection failure explicit in environments that require auth. Constructor-free composition root; no registration business logic. Acceptance: DI resolves `UserManager`, `SignInManager`, and V5 context; protected route challenges unauthenticated requests. |
| **[CREATE]** `src/DeepSprout.Web/Models/Account/RegisterViewModel.cs` · Web | `DisplayName:string`, `Email:string`, `Password:string`, `ConfirmPassword:string`, `AcceptTerms:bool`, `ReturnUrl:string?` (if needed). Data annotations for required/length/email/compare, plus server-side checks; never expose `PersonId`, role, status, or `EmailConfirmed` as client-writable fields. Acceptance: bad input never reaches `UserManager`. |
| **[CREATE]** `src/DeepSprout.Web/Models/Account/LoginViewModel.cs` · Web | `Email:string`, `Password:string`, `RememberMe:bool` (only if supported), `ReturnUrl:string?`; validate required inputs. Never bind a Person ID or workspace permission. Acceptance: invalid model returns the form without signing in. |
| **[CREATE]** `src/DeepSprout.Web/Models/Account/ProfileViewModel.cs` · Web | Display-only `DisplayName:string`, `Email:string?`, `EmailConfirmed:bool`, and appropriate onboarding/workspace status labels. No password hash, tokens, private membership IDs, or editable authority flags. Acceptance: current user sees only their own SQL-derived data. |
| **[CREATE]** `src/DeepSprout.Web/Controllers/AccountController.cs` · Web | Constructor: `UserManager<ApplicationUser>`, `SignInManager<ApplicationUser>`, `DeepSproutV5DbContext`, logger, and any justified email sender. Explicit GET/POST register/login routes, POST logout, `[Authorize]` GET profile; use `ModelState`, `IdentityResult`, server actor, transaction, local return URL, and `RedirectToAction`/`LocalRedirect`. Keep HTTP binding and responses here; move repeated workflow logic into a service only when needed. No raw SQL, browser-local identity, or Institution authorization inferred from a form. Acceptance: account endpoints use real SQL/Identity, return safe outcomes, and reject anonymous profile access. |
| **[CREATE when reused]** `src/DeepSprout.Web/Services/CurrentPersonAccessor.cs` · Web | A small scoped helper such as `Task<long?> GetActivePersonIdAsync(ClaimsPrincipal principal, CancellationToken ct)`: resolve Identity user from principal, verify `PersonId` exists and `Person.Status == Active`, return canonical ID. Use direct controller logic initially if this is the only consumer. Never take PersonId from query/body or use a claim as the sole mutable status check. Acceptance: suspended/missing Person cannot pass. Do not add an interface merely for this one class. |
| **[CREATE later]** `src/DeepSprout.Application/Accounts/IAccountEmailSender.cs` and a provider implementation in `src/DeepSprout.Infrastructure/Identity/` · Application port / Infrastructure adapter | Define only when email confirmation/reset is implemented: `Task SendConfirmationAsync(string email, Uri link, CancellationToken ct)` and `Task SendPasswordResetAsync(...)`. The port contains no Identity type; the adapter sends through a chosen provider. Development may use a local test mailbox, never a fake production confirmation. No token logging or SMTP secrets in source. Acceptance: generated Identity token reaches intended mailbox and expired/tampered tokens fail. |
| **[MODIFY]** `src/DeepSprout.Web/Views/Auth/Register.cshtml` and `Login.cshtml` · Web | Reuse exact existing designs; bind MVC view models, set `method="post"` and account action, render validation summary/field errors and antiforgery token. Keep client checks as usability only. Acceptance: disabling JavaScript still permits genuine registration/login. |
| **[MODIFY]** `src/DeepSprout.Web/page-routes.json` · Web | Remove only the two nested auth form routes once `AccountController` GET actions own those exact URLs. Keep `/login.html` and `/register.html` redirect entries or adapt their targets safely. Acceptance: no ambiguous GET endpoint and existing links still reach the real forms. |
| **[MODIFY]** `src/DeepSprout.Web/wwwroot/src/pages/auth/login/login.js` and `register/register.js` · Web asset | Stop intercepting real form posts, discarding password, and calling `DeepSproutRepo` as authentication. Retain password visibility and decorative behavior. Demo Admin shortcut must be explicitly isolated from protected Admin access. Acceptance: server can receive credentials even with scripts disabled, and localStorage cannot grant a server cookie. |
| **[CREATE]** `src/DeepSprout.Web/Views/Account/Profile.cshtml` · Web | Minimal server-backed proof page using `ProfileViewModel`, with an antiforgery-protected POST logout form. The existing `Views/Member/Profile.cshtml` is a browser-local product page; do not label it SQL-backed merely because it renders. Acceptance: profile survives restart and shows only the signed-in Person. |
| **[CREATE]** `tests/DeepSprout.Web.Integration/DeepSprout.Web.Integration.csproj` plus `AccountFlowTests.cs` · tests | .NET test project with `Microsoft.AspNetCore.Mvc.Testing` and a chosen test framework; use a separate disposable V5 test database, not M1 or named development/demo databases. Exercise HTTP cookies, antiforgery, Identity tables, `iam.Person`, and profile. Acceptance: tests can create and dispose their own data and never rely on browser demo seeds. |
| **[VERIFY ONLY]** `src/DeepSprout.Domain/V5/V5Entities.g.cs`, `src/DeepSprout.Infrastructure/V5/V5ModelConfiguration.g.cs`, `src/DeepSprout.Infrastructure/V5/DeepSproutV5DbContext.Sets.g.cs` · Domain/Infrastructure | Generated approved model. Read constraints; never hand-edit. |

**Small signature sketches, not an implementation:**

```csharp
// AccountController: explicit HTTP verbs; choose routes that preserve existing links.
[HttpGet("src/pages/auth/register/register.html")]
public IActionResult Register(string? returnUrl = null);

[HttpPost("src/pages/auth/register/register.html")]
[ValidateAntiForgeryToken]
public Task<IActionResult> Register(RegisterViewModel input, CancellationToken ct);

[HttpPost("account/logout")]
[Authorize]
[ValidateAntiForgeryToken]
public Task<IActionResult> Logout();

[HttpGet("account/profile")]
[Authorize]
public Task<IActionResult> Profile(CancellationToken ct);
```

Do not copy the sketch mechanically: choose consistent attribute routes for login as well, bind validation errors, and test the actual redirect path. If account operations outgrow the controller, introduce an Application `RegisterIndividual` use case and a narrow Infrastructure adapter at that point; avoid referencing Infrastructure from Application or inventing generic repositories now.

## 5. Complete workflows and boundaries

### A. Individual registration

1. Existing two-choice entry selects **Individual**; the Razor form posts name, email, password, confirmation, and consent to the server with antiforgery token.
2. Validate model, normalize email consistently with Identity, validate terms/notice version, and check duplicates as a friendly precheck. The database unique indexes remain authoritative under concurrency.
3. Begin a V5 transaction. Insert `iam.Person` with `Status=Active`, canonical normalized email, and `IndividualEnabledAtUtc`; save to obtain `Person.Id`. Call `UserManager.CreateAsync(new ApplicationUser { PersonId=..., UserName=..., Email=... }, password)` in the same scoped context. Check `IdentityResult`; insert `IndividualProfile` with `Started`, `JourneyLevel=1`, and supported timezone; commit. Never write Person's legacy password/lockout fields.
4. If confirmation is required, issue an Identity confirmation token and send a real link after commit through a configured delivery service; show a neutral “check your email” result, **not** a signed-in session. Confirmation verifies token, updates Identity `EmailConfirmed` and, if used, `Person.EmailVerifiedAtUtc`, then permits sign-in. If delivery is not ready, keep the feature explicitly development-only and do not pretend the address was verified. Choose this policy before calling the flow production-ready.
5. Once allowed to sign in, `SignInManager` issues the cookie. **Target product flow:** Meet Bimo → six Quick Setup questions → HeroReels story (watch or skip) → Home at Journey Level 1 → explicit plan review/activation. Current onboarding is browser-local; until its server persistence is wired, direct the initial authentication milestone to the SQL-backed `/account/profile` proof page or clearly label the handoff as demo. Do not silently merge a new SQL person with `p-*` browser IDs.

### B. Institution Representative registration

Reuse the **same** human Identity/Person registration. Partner intent leads to an Institution application and verification case, not a privileged `IdentityRole`. Keep Institution `Status=Applied` until authorized Admin verification; only then grant/manage an active `OrganizationMember` according to the approved workflow. This is the next Institution phase, not required for the first Individual slice. Coach/Supervisor must enter through email-bound, expiring, single-use Institution invitations; no public privileged registration choice.

### C. Login

POST normalized email/password to Identity with antiforgery. Look up the Identity user and check its linked Person is `Active` **before** calling `SignInManager.PasswordSignInAsync`; handle `Succeeded`, `IsLockedOut`, `IsNotAllowed`, and failure without revealing account existence. Cookie validation must recheck Person status on subsequent requests and reject a suspension after login. A missing/broken FK is a server error, not a new account. Validate any `returnUrl` with `Url.IsLocalUrl`/`LocalRedirect`. Choose destination from **current** Individual enablement, verified Institution membership, or active appointment—not from a submitted workspace string. If confirmation is required, unconfirmed accounts cannot obtain protected access.

### D. Logout and E. Profile

POST logout with antiforgery; call `SignInManager.SignOutAsync`, then redirect to a public page. A GET link may open a confirmation page but must not mutate authentication. Profile has `[Authorize]`, obtains the Identity user from `HttpContext.User`, uses `ApplicationUser.PersonId` to query `Person` and own `IndividualProfile`, checks active status, and returns a display-only view. Never accept a PersonId parameter to select someone else's profile.

### F. Email confirmation and reset

Identity generates purpose-specific, protected, time-limited tokens. Send an encoded callback URL through a provider configured outside source control. Confirm/reset endpoints validate token and account, update Identity via `UserManager`, and return neutral outcomes. Password reset request returns the same visible response whether or not the email exists; enforce rate limits. A reset should invalidate relevant old sessions using the security-stamp policy and be tested. For the first local slice, a controlled development mailbox can verify the whole link; without delivery, mark confirmation/reset **pending**, not simulated production functionality.

### G. Multiple workspaces and H. suspension/revocation

One `Person` may have an Individual profile, Institution Representative membership, and scoped Coach/Supervisor appointments. Workspace switch changes navigation only. Every server operation queries the relevant current grant and resource owner. `Person.Status=Suspended` denies protected access even with an old valid cookie: revalidate the linked Person on cookie validation and/or each protected use case, reject, sign out, and update the security stamp where appropriate. Revoking a staff appointment removes its scope immediately at the resource authorization check but need not log the person out of unrelated workspaces. Test both with an already-issued cookie.

## 6. Security rules to implement and test

**Source labels:** **P** = approved product rule, **S** = security recommendation for implementation, **D** = decision still to approve. Numeric settings below are examples only where expressly called examples; do not treat them as approved policy.

| Rule | Behavior / mechanism / location | Test; first slice? |
|---|---|---|
| Email normalization and uniqueness **S** | Identity `ILookupNormalizer`/`UserManager`; set Identity `UserName` to the canonical email so its default unique `NormalizedUserName` index helps, set `RequireUniqueEmail`, and store the same normalized value in `Person` (whose filtered unique index is the database backstop). Identity's default `NormalizedEmail` index is **not unique**; configure a unique email index explicitly only if your reviewed model needs one. Registration handles unique violations. | Case-variant and concurrent duplicate; **yes**. |
| Password policy **S/D** | Configure `IdentityOptions.Password` in `Program.cs`; choose length/complexity deliberately rather than treating current HTML `minlength=8` as policy. Hash only through `UserManager`. | Weak password and no plaintext; **yes**. |
| Model validation **S** | Data annotations plus server `ModelState`; never trust JavaScript or bind authority fields. | Missing/malformed inputs; **yes**. |
| Confirmation **P/D** | Identity token and real delivery; decide whether unconfirmed users may sign in to limited pages. Never mark verified without proof. | Invalid/expired/reused link; **required before production**, policy decision for initial local slice. |
| Failed login and lockout **S/D** | Identity lockout via `SignInManager`, with approved thresholds; leave Person legacy fields inactive. | Repeated failures, recovery; **yes** once thresholds chosen. |
| Rate limit / enumeration **S** | ASP.NET Core rate limiter on register/login/reset and neutral failure messages. | Burst and unknown email; **yes** for public login, reset later. |
| Cookie security **S** | Identity application cookie: `HttpOnly`, `Secure` over HTTPS, appropriate `SameSite` (normally Lax for MVC), finite expiration/sliding renewal, protected Data Protection keys. | Inspect cookie, expiry, restart, logout; **yes**. |
| HTTPS **S** | HTTPS in deployed host, redirect/HSTS as environment appropriate; do not claim local HTTP preview is production secure. | HTTP redirect/deployment check; **yes before deployment**. |
| Antiforgery **S** | MVC `AutoValidateAntiforgeryToken` or explicit `[ValidateAntiForgeryToken]` on every unsafe cookie-authenticated action; form token emitted by Razor. | Missing/tampered token returns 400; **yes**. |
| Return URL **S** | `Url.IsLocalUrl` and `LocalRedirect` only. | External `https://...` rejected; **yes**. |
| Active account **P** | Check `Person.Status` on login and protected requests; invalid linked Person fails closed. | Suspend with existing cookie; **yes**. |
| Scoped permission **P** | DB-backed `OrganizationMember`, `StaffAppointment`, and resource ownership; use policy/handler or application service after loading resource. `IdentityRole` alone cannot grant scope. | Cross-Institution/revoked appointment; **next phase**. |
| Secrets and logs **S** | Windows Auth only in local config; production connection/provider secrets from protected configuration. Never log password, token, full reset URL, or cookie. | Inspect config/logs; **yes**. |
| Atomic registration **S** | Shared V5 transaction across Person, Identity user, profile; check `IdentityResult`; commit before sign-in. | Inject failure after Person write; **yes**. |
| Error messages **S** | User-readable validation; generic authentication/reset failure; detailed exception only in protected logs. | Unknown email matches bad-password response; **yes**. |
| Dev versus production **S** | Local mailbox/dev SQL may differ; do not auto-confirm in Production or ship demo Admin shortcut as authorization. | Production configuration check; **yes before release**. |

### Minimal permission matrix for this phase

| Action | Anonymous | Individual | Partner applicant | Verified Representative | Invited Coach/Supervisor | Admin |
|---|---|---|---|---|---|---|
| Register human account / request reset | Yes | Already has account | Already has account | Already has account | Invitation may lead to same account flow | Privately provisioned |
| Login / logout / own profile | Login only | Own | Own | Own | Own | Own |
| Complete Individual onboarding | No | Own enabled profile | Only if Individual enabled | Only if Individual enabled | Only if Individual enabled | Only if Individual enabled |
| Submit Institution verification | No | May initiate Partner path | Own application | Own Institution changes subject to state | No authority from invite alone | Governance |
| Manage Institution / Initiative | No | No | No | Only own verified Institution | Only active named scope and duty | Governance, not ordinary owner |

These rows describe target authorization, **not current server behavior**. `[Authorize]` establishes login only; controller/policy/handler checks should reject anonymous or suspended users, while a resource-aware Application service must recheck current ownership, membership, invitation/appointment status, and state before a write. Resource-based checks occur after loading the resource; do not place all business decisions in controller attributes. Invited Students retain the same human identity and only the scope granted by accepted participation. Public Register choices are Individual and Partner; Coach/Supervisor do not self-register into privileged roles. Platform Admin is private, not a public registration choice.

## 7. Work one task at a time

Each task has a stopping point. Run the stated verification before continuing. No separate tutorial project is needed.

### Task 1 — restore safe design-time creation

**Goal/prerequisite:** make the already-edited V5 context constructible by EF tools. **Files:** create `src/DeepSprout.Infrastructure/V5/DeepSproutV5DesignTimeFactory.cs`; inspect `ApplicationUser.cs` and `DeepSproutV5DbContext.cs`. **Write:** explicit `IDesignTimeDbContextFactory<DeepSproutV5DbContext>` and `CreateDbContext(string[] args)` using a connection from `DEEPSPROUT_V5_CONNECTION`; no hard-coded demo/prod target. **Verify:** Release build and `dotnet ef dbcontext info` with the exact development connection; expect SQL Server, `localhost`, `DeepSprout_Development`. **Common mistakes:** trusting an old Debug DLL, omitting `base.OnModelCreating`, or using M1 context. **Done:** EF tool resolves the current Release model. **Learn:** inheritance, generics, DbContext options, design time versus runtime DI. **Interview:** Why does IdentityDbContext require `base.OnModelCreating`? Why can a class library need a design-time factory?

### Task 2 — generate and review Identity migration

**Prerequisite:** Task 1 and verified target. **Files:** create one migration under `V5/Migrations/`; generated snapshot updates. **Write:** scaffold with `--context DeepSproutV5DbContext`, inspect C# and SQL, correct model mapping before regenerating if it touches unrelated tables. **Verify:** seven Identity tables, required unique `PersonId`, FK to `iam.Person`; no 58-table drift; then apply only to `DeepSprout_Development` and inspect history. **Common mistakes:** pointing EF at M1, applying before SQL review, editing generated V5 model, using stale `--no-build`. **Done:** Identity schema exists only in development DB. **Learn:** migrations, FKs, unique indexes, relational model. **Interview:** What protects against two users linking one Person? Why is a migration review necessary even if compilation passes?

### Task 3 — configure runtime Identity and cookies

**Prerequisite:** migration reviewed. **Files:** modify `Program.cs`; verify Development config and key directory. **Write:** Identity and EF stores, token providers, chosen options, cookie settings, `UseAuthentication` then `UseAuthorization`, antiforgery policy. Keep existing routes and services. **Verify:** start Development host; DI resolves managers; anonymous protected test route challenges. **Common mistakes:** registering a second DbContext, middleware after endpoints, claiming browser store grants authority. **Done:** services/middleware are ready without a registration handler. **Learn:** DI service lifetimes, middleware, cookies versus JWT. **Interview:** Why is DbContext scoped? What is authentication versus authorization?

### Task 4 — create form models and server routes

**Prerequisite:** Task 3. **Files:** create three Web Account view models and `AccountController`; modify `page-routes.json` for the two nested form URLs only. **Write:** GET actions returning the existing `Auth` views; POST action signatures and validation paths, initially no side effects. **Verify:** GET routes 200, invalid POST preserves errors, no ambiguous routes. **Common mistakes:** writing domain logic in the view model, leaving a duplicate PageCatalog route. **Done:** server owns auth form URLs. **Learn:** model binding, validation, routing. **Interview:** Why validate on server if the form validates in JavaScript? What does a 400 antiforgery response mean?

### Task 5 — implement Individual registration

**Prerequisite:** Tasks 2–4; decide confirmation behavior. **Files:** `AccountController`, `RegisterViewModel`, existing Register view, optional email sender only if real delivery is ready. **Write:** validate, begin transaction, Person → Identity user → IndividualProfile, inspect `IdentityResult`, commit, then confirmation/send or approved sign-in path. **Verify:** SQL rows link correctly and survive restart; duplicate/weak-password/failure rollback tests. **Common mistakes:** Identity user before required Person FK, cookie before commit, Person legacy password hash, automatic email verification. **Done:** one durable person/account/profile, no partial rows on failure. **Learn:** async/await, transactions, EF tracking, Identity generic types. **Interview:** Why is a duplicate-email precheck insufficient? What does `IdentityResult` return on validation failure?

### Task 6 — implement login

**Prerequisite:** Task 5 and decided confirmation policy. **Files:** `AccountController`, `LoginViewModel`, Login view. **Write:** checked `SignInManager` flow, Person active check, neutral errors, safe local return URL, correct destination. **Verify:** correct password signs in; wrong password, lockout, unconfirmed/missing Person, and external return URL fail safely. **Common mistakes:** calling `SignInAsync` before checking Person, trusting browser workspace state, returning different unknown-email errors. **Done:** protected profile recognizes cookie after restart. **Learn:** claims, cookie ticket, lockout. **Interview:** What does `ClaimsPrincipal` represent? Why is an Identity role not enough for Initiative scope?

### Task 7 — implement logout and own profile

**Prerequisite:** Task 6. **Files:** `AccountController`, `ProfileViewModel`, create `Views/Account/Profile.cshtml`; optional `CurrentPersonAccessor` if reused. **Write:** `[Authorize]` profile query by Identity `PersonId`, active status check, POST logout with antiforgery. **Verify:** anonymous redirect/challenge, cross-person ID ignored, logout cookie invalid, GET cannot log out. **Common mistakes:** profile ID from URL, logout by GET, showing private fields. **Done:** real server-backed profile and session termination. **Learn:** authorization, HTTP verbs, CSRF. **Interview:** How does antiforgery complement SameSite? What is the difference between deleting a cookie and invalidating all sessions?

### Task 8 — enforce account state and prepare scoped authorization

**Prerequisite:** Tasks 6–7. **Files:** `Program.cs`, AccountController or a focused status validator; current-person helper only if multiple endpoints use it. **Write:** reject suspended/closed Person from existing cookies; check account-wide security stamp and revocation timing. Defer detailed Institution handlers to the next phase. **Verify:** suspend while signed in; old cookie loses protected access; revoked appointment cannot act on its resource while other workspaces remain. **Common mistakes:** relying on stale claims or only checking at login. **Done:** account suspension is enforced server-side. **Learn:** authentication ticket validation, resource authorization. **Interview:** Why can a valid cookie still be unauthorized? When should an authorization handler load a resource?

### Task 9 — connect the existing UI and email lifecycle

**Prerequisite:** working server actions. **Files:** existing Auth views and auth JavaScript; email sender files only if provider selected. **Write:** form post, antiforgery, server validation display, remove demo auth interception while preserving decorative scripts; real confirmation/reset only with delivery. **Verify:** browser flow with and without JavaScript; no localStorage identity can access server profile; reset does not enumerate users. **Common mistakes:** leaving `event.preventDefault()` on the real form or showing “email sent” without a sender. **Done:** UI visibly uses the server; pending email features are honestly labelled. **Learn:** progressive enhancement, token lifecycle, separation of concerns. **Interview:** Why can a UI demo not establish authentication? How are reset tokens different from passwords?

### Task 10 — integration tests and release gate

**Prerequisite:** previous tasks. **Files:** create `tests/DeepSprout.Web.Integration/` project and tests; do not use M1 validation. **Write:** HTTP + SQL tests with isolated V5 test DB, cookie jar, antiforgery token, fault injection for transaction rollback, concurrent registration. **Verify:** Release build, test suite, migration status, manual restart, no secret in source or logs. **Common mistakes:** using in-memory EF to prove SQL constraints or testing only controller methods. **Done:** evidence meets the definition below. **Learn:** integration testing, debugging, Clean Architecture tradeoffs. **Interview:** What can an in-memory provider fail to test? How would you reproduce a registration race?

## 8. Exact migration safety procedure

The V5 context has already had two migrations applied to `DeepSprout_Development`. Do **not** re-run baseline on another existing database, and do not run `dotnet ef database update` before reviewing the new SQL. From the repository root in **PowerShell**, after Task 1:

```powershell
$env:DEEPSPROUT_V5_CONNECTION = 'Server=localhost;Database=DeepSprout_Development;Trusted_Connection=True;Encrypt=True;TrustServerCertificate=True'
dotnet build DeepSprout.sln -c Release --no-restore
dotnet ef dbcontext info --context DeepSproutV5DbContext --project src/DeepSprout.Infrastructure --startup-project src/DeepSprout.Infrastructure --configuration Release --no-build
dotnet ef migrations has-pending-model-changes --context DeepSproutV5DbContext --project src/DeepSprout.Infrastructure --startup-project src/DeepSprout.Infrastructure --configuration Release --no-build
```

The third command must say **Database name: DeepSprout_Development; Data source: localhost**. A pending-model result is expected before the Identity migration. Check the SQL database itself before scaffolding:

```powershell
sqlcmd -S localhost -E -C -b -d DeepSprout_Development -Q "SELECT DB_NAME() AS Target; SELECT MigrationId FROM dbo.__EFMigrationsHistory ORDER BY MigrationId; SELECT name FROM sys.tables WHERE name LIKE N'AspNet%';"
```

Expect only `V5Baseline` and `V5Lean2Onboarding2AndV41` in history and no `AspNet%` tables **before** Task 2. Then scaffold, review the new files, and generate SQL between the already-applied V5 migration and the new migration:

```powershell
dotnet ef migrations add IdentityFramework --context DeepSproutV5DbContext --project src/DeepSprout.Infrastructure --startup-project src/DeepSprout.Infrastructure --output-dir V5/Migrations --configuration Release
dotnet ef migrations script 20261108112954_V5Lean2Onboarding2AndV41 IdentityFramework --context DeepSproutV5DbContext --project src/DeepSprout.Infrastructure --startup-project src/DeepSprout.Infrastructure --configuration Release
```

Inspect the generated `Up`/`Down`, designer, snapshot, and SQL. Expect `AspNetUsers`, `AspNetRoles`, `AspNetUserClaims`, `AspNetUserLogins`, `AspNetUserRoles`, `AspNetUserTokens`, and `AspNetRoleClaims` (framework tables), plus `AspNetUsers.PersonId` `NOT NULL`, a **unique** index on it, and a FK to `iam.Person(Id)`. Identity's normal unique normalized-user-name index should also exist; configure/check normalized email uniqueness explicitly if your chosen Identity model requires it. **Stop** if the migration unexpectedly drops/renames/alters any of the 58 application tables, changes `Person` credential columns, creates a second Person table, or touches M1 objects. Diagnose model/snapshot drift instead of hand-deleting unexplained operations. Review `Down` for safe reversal of only the Identity additions.

After review, reconfirm target and apply only there:

```powershell
dotnet ef dbcontext info --context DeepSproutV5DbContext --project src/DeepSprout.Infrastructure --startup-project src/DeepSprout.Infrastructure --configuration Release --no-build
dotnet ef database update IdentityFramework --context DeepSproutV5DbContext --project src/DeepSprout.Infrastructure --startup-project src/DeepSprout.Infrastructure --configuration Release
sqlcmd -S localhost -E -C -b -d DeepSprout_Development -Q "SELECT DB_NAME() AS Target; SELECT MigrationId FROM dbo.__EFMigrationsHistory ORDER BY MigrationId; SELECT COUNT(*) AS IdentityTables FROM sys.tables WHERE name LIKE N'AspNet%';"
```

Expect three history rows and seven Identity tables. Verify the precise FK/index with SQL Server catalog queries or SSMS: `sys.foreign_keys` should link `dbo.AspNetUsers(PersonId)` to `iam.Person(Id)`, and `sys.indexes`/`sys.index_columns` should show a unique `PersonId` index. Check that the application table count remains 58. Never use a connection value copied from a different project or a stale terminal. `--no-build` is safe only after building the **same** configuration; the previous Debug artifact once gave a false impression that the removed factory still existed.

## 9. Tests: which level proves what

| Test | Unit | SQL/HTTP integration | Manual browser |
|---|---:|---:|---:|
| Success: Person, Identity user, profile linked; cookie works after restart |  | **Yes** | **Yes** |
| Duplicate normalized email, including concurrent requests |  | **Yes** | One case |
| Weak password/model validation | Optional validator unit | **Yes** | Yes |
| Wrong password, lockout, unconfirmed account |  | **Yes** | Yes |
| Login, logout, anonymous profile |  | **Yes** | **Yes** |
| Cross-person profile attempt / client-supplied PersonId ignored |  | **Yes** | Optional |
| External return URL rejected; antiforgery missing/tampered |  | **Yes** | Optional |
| Suspended account with existing cookie; revoked staff scope | Policy unit if isolated | **Yes** | Yes |
| Failure after Person insert rolls back all registration rows |  | **Yes** |  |
| Missing/invalid Person FK and incorrect workspace claim |  | **Yes** |  |
| Confirmation/reset token expiry, tampering, replay |  | **Yes when implemented** | Yes |

Use a disposable SQL Server database for FK, uniqueness, transactions, and concurrency tests; EF InMemory cannot prove SQL Server behavior. Existing `tests/client` covers browser-local demo behavior, not the new cookie/SQL boundary. The historical `tests/DeepSprout.DatabaseValidation` must remain tied to `DeepSprout_Validation` and must never be used here. A useful release command after adding the new test project is `dotnet test tests/DeepSprout.Web.Integration/DeepSprout.Web.Integration.csproj -c Release`, with its connection explicitly pointed at the test database.

## 10. Definition of done and next boundary

**Initial Individual authentication is done** when a person can register through the existing Razor design, produce one linked Identity user/Person/IndividualProfile in SQL Server, satisfy the chosen real confirmation policy, sign in with a verified password, access only their own protected profile, sign out via POST, and repeat after an application restart. Weak/duplicate credentials, bad tokens, missing antiforgery, external redirects, suspended accounts, broken links, and partial transactions fail safely. Tests prove the server behavior; a localStorage identity cannot grant an MVC cookie. The development database has the reviewed Identity migration and 58 unchanged application tables.

**Next Authorization/Institution phase:** Partner verification, actual Representative membership, scoped Coach/Supervisor invitations, Initiative resource handlers, seat limits, cross-workspace data migration, and the browser-local onboarding/plan persistence bridge. Do not claim those are solved by Identity registration. Current onboarding Home/Garden visuals and historical M1 data remain protected by the repository guidance.
