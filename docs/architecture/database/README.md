# DeepSprout database architecture — review package

**Status:** historical proposed design, 27 October 2026. It predates the [4 November v4.1 P0 scope change](../p0-target-v4.1.md). Inspect the actual EF Core model/migrations and database before implementation; this package is not the final schema or proof of production authorization.

## Reading order

1. [Repository assessment](01-repository-assessment.md) and [requirements traceability](02-requirements-traceability.md).
2. [Bounded contexts](03-bounded-contexts.md), [domain model](04-domain-model.md), [entity catalog](05-entity-catalog.md), and [invariants](06-relationships-and-invariants.md).
3. [Physical data dictionary](07-database-schema.md), [SQL Server choices](08-sqlserver-physical-design.md), [EF Core architecture](09-efcore-architecture.md), [authorization](10-authorization-and-data-ownership.md), [transactions](11-transactions-and-concurrency.md), and [evidence/rewards](12-evidence-rewards-and-auditing.md).
4. [Scenario validation](13-validation-scenarios.md), [ADRs](14-architecture-decisions.md), [questions/risks/conflicts](15-open-questions-and-risks.md), [roadmap](16-implementation-roadmap.md), and [diagrams](diagrams/context-map.md), including [supporting contexts](diagrams/supporting-contexts-erd.md).

## Authority and notation

`DeepSprout.md` v4.1 and its [P0 map](../p0-target-v4.1.md) supersede conflicting Provider, independent Coach, self-requested Supervisor and framework assumptions here. The older §26 D01–D48 register is history where v4.1 supersedes it. `DESIGN.md` and `DeepSprout-DESIGN.md` propose visual direction; Garden change remains separately scoped. Dated reports and source establish **observed demo behavior**, never production behavior. Labels used here: **A** approved, **G** agreed direction, **I** configurable interim default, **R** recommendation, **O** open, **C** current observation.

The proposed solution is one SQL Server database and an ASP.NET Core modular monolith with explicit schema/module ownership. Cross-context references are IDs and service contracts; relational foreign keys are retained where transactions share one database. Diagrams are conceptual and omit some audit columns; the data dictionary is normative for this proposal. The catalog covers the full target capability envelope; rollout slices create only the approved, needed tables in dependency order, and open commercial/community/safety details remain conditional. All status/code lists are application-owned, versioned where policy requires it; listed numeric examples are not new approved product limits.

## Review gates

Before implementation, approve the open policy decisions that affect consent, retention, assessment comparability, completion, and paid flows; validate the conflict register; prototype the three capacity transactions against SQL Server; and sign off the privacy threat model. The documentation is a design, not evidence that those controls have been implemented.
