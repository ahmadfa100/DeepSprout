# DeepSprout cross-workspace functional audit

> **Dated audit, not the target contract (15 October 2026).** Routes, fields, tests and code observations below describe the inspected working tree. The [authoritative v4.0 master](../../DeepSprout.md) and its [decision register](../../DeepSprout.md#26-decision-register-authoritative-interim-and-open) govern all implementation targets, including decisions approved after this audit.

**Audit date:** 15 October 2026. **Scope:** current working tree, including pre-existing uncommitted application changes. **Delivery phase:** functional static HTML/CSS/JavaScript demonstration. This audit changes documentation only. The [authoritative master specification](../../DeepSprout.md) defines desired behavior; code and the tests below establish current behavior. The owner's 15 October decisions in the audit brief govern interpretation, especially the single Platform Admin concept and fixed multi-tree Personal Garden.

## Read this set

| Area | Report |
|---|---|
| Institution | [institution.md](institution.md) |
| Mentor | [mentor.md](mentor.md) |
| Invited Student | [invited-student.md](invited-student.md) |
| Outdoor Provider | [outdoor-provider.md](outdoor-provider.md) |
| Supervisor | [supervisor.md](supervisor.md) |
| One Platform Admin, two implementations | [platform-admin.md](platform-admin.md) |
| Every Individual-facing handoff | [individual-integration.md](individual-integration.md) |
| Records, stores, producers and consumers | [cross-cycle-data-flow.md](cross-cycle-data-flow.md) |
| Current and proposed authorization | [permissions-matrix.md](permissions-matrix.md) |
| Six repeatable demonstrations | [demo-scenarios.md](demo-scenarios.md) |
| P0/P1/P2, future backend and owner decisions | [gaps-and-decisions.md](gaps-and-decisions.md) |

## Evidence and status language

Routes are `Client/workspaces.html#/…` unless a file is named. Page tables report visible implementation, then required behavior separately. **WC** = working and connected *inside the partner ecosystem store*; **WL** = working only in the page or store shown; **MS** = simulated local operation; **SN** = static/nonfunctional; **BR** = broken relative to the specified cross-workspace journey; **MI** = missing. A local partner workflow marked WC is still BR at the regular Individual boundary if that boundary is absent. “Code-inspected” means the handler and data path were read but the UI action was not rerun in this audit. No route-render result is treated as a workflow pass.

Source anchors use current physical lines; many partner renderers compress an entire page branch into one line, so a cited line can contain multiple controls. Primary evidence: `Client/workspaces.html`, `partners.html`, `join.html`, `admin.html`, `src/workspaces/navigation.js:1-11`, `app.js:1-48`, `store.js:1-43`, `pages/*.js`, `builders/*.js`, `commands/*.js`, `shared.js`, `workspaces.css`, `src/admin/*.js`, `src/admin/admin.css`, regular member HTML/CSS/JS and `src/js/data/account.js`, plus the then-current v3.1 specification, now superseded by [DeepSprout.md](../../DeepSprout.md). Existing implementation notes in `Client/docs/architecture/partner-workspaces.md` and `admin-cycle.md` are context, **not fresh verification**.

## Coverage and tests

| Check | Starting state; actions; expected; actual | Result |
|---|---|---|
| Partner domain suite | `node Client/tests/partner-store.test.mjs`; ten cases cover group/invite/review, initiative/session/form, booking/offer, appointments/attendance, approval and ownership. All ten passed on this working tree. This verifies local command/state behavior, not regular Individual UI. | Pass, local store only |
| New initiative → Individual Explore | Fresh Chrome context; reset partner demo; sign in as Maya; complete all six Institution builder steps and publish **Audit Bridge Initiative 2026**; switch to Noor; inspect `participant/discover`, then open `explore.html`. Expected the same published resource in both discoveries. Actual partner store status `Published`, partner discovery match `1`, regular Explore match `0`, no page errors. | **Fail**, runtime verified |
| Existing partner browser suite | Existing `Client/tests/partner-browser.test.cjs` describes seven local UI walkthroughs; its prior report is historical. This audit did not rerun it because it writes outside requested documentation and the targeted browser test above exercises the critical boundary. | Not rerun |
| Individual registration → partner owner list | Account registrations and partner enrollments/bookings use different keys and IDs (`account.js:181-187, 618-630, 752-782`; `workspaces/store.js:10,19-43`). | Code-inspected, not runtime-verified |
| Invalid/out-of-scope actions | Domain suite rejects unrelated Mentor group, Provider booking, stale offer and duplicate invitation/use. Frontend checks are inspectable and bypassable in browser storage. | Pass for local command checks; backend guarantee absent |

The browser walkthrough ran a local `python3 -m http.server` and a temporary Playwright script outside the repository. No application or master-specification file was changed. Other routes and actions are classified from code, seed data and existing test source, and are marked unverified where appropriate.

| Coverage item | Status and remaining verification |
|---|---|
| All discovered partner navigation pages, nested detail/edit/builder routes, entry and Partner Participant routes | Accounted for in page tables; code-inspected. Representative Institution publish boundary browser-tested. |
| Legacy Admin navigation plus hidden routable Groups/Garden/Audit and workspace Admin routes | Accounted for and compared; mutation dialogs code-inspected, not individually browser-clicked. |
| Fields, major actions and page states | Current builders/modals inventoried from renderers and command handlers. Conditional controls/state combinations were not exhaustively clicked; no claim of full visual QA. |
| Cross-cycle data and permission paths | Original records, readers/writers, separate stores and current local guards mapped; production authorization explicitly absent. |
| Six end-to-end scenarios | Exact proposed scripts and current blockers documented. None is marked fully passed across regular Individual pages. |
| Future browser work after implementation | Run each six-scenario script from a clean profile, including duplicate, empty, full, expired, cancelled, revoked and unauthorized cases. |

## Main implementation reality

`workspaces.html` is a substantial, browser-local **partner ecosystem** with one shared `deepsprout-ecosystem-demo-v1` record graph. Its Partner Participant workspace can discover partner publications, enroll, book, submit and see updates. The normal Individual pages use `DeepSproutAccount`, `listings.json`, account change logs and separate registrations. The partner Participant page is an alternative participation implementation, **not** regular Individual Explore. This is the main graduation-demo break. Legacy Admin has another store; selected legacy activity, landing CMS and community moderation changes do reach Individual pages. Workspace Admin governance/CMS reaches only partner data/discovery. See [data flow](cross-cycle-data-flow.md) and [Individual effects](individual-integration.md).

The provider and institution local lifecycles are richer than static mocks, but state is only browser-local. The earlier Individual first-run analysis identified broken assessment → Starting Point → Recovery Plan handoff; this audit did not repeat the timed assessment UI, and subsequent code changes require fresh verification. The Personal Garden currently derives achievement records from the Individual account and dims vitality after quiet days (`account.js:782-853`), contrary to the owner's no-punitive-missing-data decision. The later owner-approved target is exactly four practice-type Personal trees, neutral inactivity, one Group Garden per Institution Initiative and one per independent Coach group, and no Provider Group Garden. The earlier conflict is closed in master §26.

## Coverage boundary

Every route family discovered in the partner navigation and `pages/` branches is listed in its cycle document, including detail/edit routes, builder steps, hidden legacy Admin routes, entry and Partner Participant routes. Modal fields and controls are inventoried by workflow. The audit does **not** claim every visual state or click was executed in a browser. Pages with dynamic empty, failure, archived or permission states are marked code-inspected when no fresh runtime test was run. Full final-system authorization, durable audit, OTP, signed QR and booking concurrency belong to the later backend phase, while coherent visible demo handoffs are P0 now.

**Final target:** Use [master §25](../../DeepSprout.md#25-end-to-end-demonstration-and-acceptance) for current six-scenario acceptance; old route/result evidence below remains a dated snapshot.
