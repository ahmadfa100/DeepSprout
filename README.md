# DeepSprout

DeepSprout helps Individuals manage unintentional short-form scrolling through a personal Recovery Plan, four Meaningful Practice types, Digital Shield, Offline Routine, Garden and source-based Insights. Institutions, independent Coaches, Invited Students, Outdoor Providers and Supervisors also have connected program, initiative and experience workflows. One Platform Admin governs the platform.

The **[authoritative product specification](DeepSprout.md)** is v4.0, dated 15 October 2026. It defines the approved target and distinguishes it from the present implementation. The current application is a static HTML/CSS/JavaScript demonstration with browser-local state. As of 16 October 2026 the **Institution cycle is connected end to end**: one canonical person and scoped staff grants, publication into the regular `explore.html`, one shared Application, groups, Coach tasks in Activities → Assigned, Supervisor attendance with QR/code, excuses, reports and Gardens — see the [implementation report](docs/implementation/institution-cycle-implementation-report.md). Since 16 October the Supervisor cycle (Institution and Provider contexts), Individual-side forms/competitions, stored excuse attachments and an explicit check-in window are also implemented — see the [Supervisor report](docs/implementation/supervisor-cycle-implementation-report.md). Provider bookings are not yet connected to the regular Individual pages. Login/OTP/email, payments, QR security, permissions and capacity concurrency are simulated or incomplete; no Angular or backend application exists yet. The eventual target is Angular with ASP.NET Core/C#, EF Core and SQL Server.

## Run locally

From the repository root, using the checked-in preview server:

```sh
python3 Client/serve.py --port 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). The regular Individual entry is `Client/index.html`; partner entry is `Client/partners.html` or `Client/workspaces.html#/auth/login`. `Client/admin.html#/dashboard` is the legacy Admin demo. These are separate current implementations of one intended platform. See the [client guide](Client/README.md) for routes and tests.

## Documentation hierarchy and next work

1. [DeepSprout.md](DeepSprout.md) is the only target specification and decision register; [the former spec path](docs/product-specification.md) redirects here.
2. [Cycle audits](docs/cycles/README.md) and [client architecture reports](Client/docs/README.md) record dated current behavior and prior validation. Treat old open-question lists as historical where the master has a newer approval.
3. [§30 of the master](DeepSprout.md#30-implementation-dependency-roadmap-and-handoff) slices 1–4 are implemented for the Institution cycle (16 Oct 2026; [report](docs/implementation/institution-cycle-implementation-report.md), with test evidence and remaining gaps). Next: Provider publication/booking into regular Explore (slice 5), then Admin parity and weekly Lab (slice 6).

| Location | Purpose |
|---|---|
| [Client/](Client/README.md) | Static website, partner workspace, Admin demos, assets and tests |
| [Client/docs/](Client/docs/README.md) | Architecture, historical implementation reports and validation evidence |
| [docs/](docs/README.md) | Documentation index, dated cycle audit and repository record |
| [Server/](Server/README.md) | Reserved backend location; no implementation yet |
| [experiments/](experiments/README.md) | Independent Bimo authoring experiments |

Runtime media lives in `Client/assets/`; source in `Client/src/`. See the [repository organization record](docs/repository-organization.md) for historical cleanup details.
