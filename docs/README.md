# Project documentation

**Start here for the current project:** [DeepSprout today: product, pages and connected cycles](current-product-guide.md) (3 November 2026). It inventories the working client and the separate database milestone, with current limitations.

**Target rules and decisions:** [DeepSprout.md](../DeepSprout.md), v4.0 (15 October 2026), with an updated architecture note for the owner's ASP.NET Core MVC direction. Its §29 is a dated implementation snapshot. The old [product-specification.md](product-specification.md) remains a compatibility pointer, not another requirements copy. The later [design direction](../DESIGN.md) calls for a one-main-plant Garden in a separately scoped task; the current scene still has four trees.

**Implementation evidence:** [client architecture/validation index](../Client/docs/README.md), [implementation reports](implementation/) and [database validation](architecture/database/phase-b/02-final-validation-ar.md). The [cross-workspace cycle audit](cycles/README.md) is a 15 October snapshot and contains gaps closed by later work.

**Repository history:** [organization record](repository-organization.md) and [organization manifest](organization-manifest.json).

**Client milestones:** connected [Institution](implementation/institution-cycle-implementation-report.md), [Supervisor](implementation/supervisor-cycle-implementation-report.md), [Independent Coach](implementation/independent-coach-cycle-implementation-report.md), [Outdoor Provider](implementation/deepsprout-round1-outdoor-provider-report.md), [individual onboarding/Lab](implementation/deepsprout-round2a-individual-onboarding-lab-report.md), [practices](implementation/deepsprout-round2b-meaningful-practices-report.md), [Recovery](implementation/deepsprout-round2c-adaptive-recovery-report.md) and [Digital Shield](implementation/deepsprout-round2d-digital-shield-report.md). Each report is evidence for its own date and test scope.

**Server milestone:** [Server/README.md](../Server/README.md) and the [1 November validation report](architecture/database/phase-b/02-final-validation-ar.md) describe the EF Core/SQL Server solution. The [3 November database review](architecture/database/review/README.md) is a read-only recommendation set. The client does not yet use an ASP.NET Core MVC server.
