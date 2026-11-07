# Project documentation

**Current target:** [DeepSprout v4.1 master](../DeepSprout.md) and the [4 November P0 architecture, scope and deprecation map](architecture/p0-target-v4.1.md). The new decisions establish ASP.NET Core MVC + Identity/EF Core/SQL Server, one Platform Admin, Institution Representative-only public partner entry, Institution-owned outdoor activities, and invitation-only Initiative Coach/Supervisor appointments. They remove Supervisor self-request and the independent Coach/Outdoor Provider target cycles. These are specifications, not implementation claims.

**What runs now:** [3 November product and page guide](current-product-guide.md), [README](../README.md), and [implementation reports](implementation/). Those documents describe dated demo behavior, including legacy routes that require migration. The [cross-workspace audit](cycles/README.md) is a 15 October snapshot, not current authorization.

**Database design:** [architecture index](architecture/database/README.md) and its historical v4/v5 proposals must be reviewed against the v4.1 target. The old 87-table Atlas is a proposal, not an approved final count or an implemented schema. Inventory actual EF Core migrations and live data before designing a replacement dictionary/ERD.

**Design:** [DESIGN.md](../DESIGN.md) links the detailed visual guidance. Keep the ivory/sage identity and original Bimo assets. The one-main-plant Garden is separately scoped from this document update.

**Compatibility pointers:** [product-specification.md](product-specification.md) redirects to the master. [Repository organization](repository-organization.md) records historical structure.
