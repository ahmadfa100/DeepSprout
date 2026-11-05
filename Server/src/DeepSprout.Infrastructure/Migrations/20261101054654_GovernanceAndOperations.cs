using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GovernanceAndOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "governance");

            migrationBuilder.CreateTable(
                name: "ContentRelease",
                schema: "governance",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TargetCode = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    VersionNo = table.Column<int>(type: "int", nullable: false),
                    PayloadRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    PublishedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    SupersedesId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentRelease", x => x.Id);
                    table.CheckConstraint("CK_ContentRelease_Version", "[VersionNo]>0");
                    table.ForeignKey(
                        name: "FK_ContentRelease_ContentRelease_SupersedesId",
                        column: x => x.SupersedesId,
                        principalSchema: "governance",
                        principalTable: "ContentRelease",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ContentRelease_Person_PublishedByPersonId",
                        column: x => x.PublishedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GovernanceAction",
                schema: "governance",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    ActionCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ResourcePublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    AtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GovernanceAction", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GovernanceAction_Person_ActorPersonId",
                        column: x => x.ActorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "IdempotencyRecord",
                schema: "ops",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    CommandCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    RequestHash = table.Column<byte[]>(type: "varbinary(32)", maxLength: 32, nullable: false),
                    ResponseRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdempotencyRecord", x => x.Id);
                    table.CheckConstraint("CK_IdempotencyRecord_Hash", "DATALENGTH([RequestHash])=32");
                    table.CheckConstraint("CK_IdempotencyRecord_Status", "[Status] IN (N'InProgress',N'Completed',N'Failed')");
                    table.ForeignKey(
                        name: "FK_IdempotencyRecord_Person_ActorPersonId",
                        column: x => x.ActorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Notification",
                schema: "ops",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    RecipientPersonId = table.Column<long>(type: "bigint", nullable: false),
                    EventPublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResourceKind = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ResourcePublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TemplateCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    ReadAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notification", x => x.Id);
                    table.CheckConstraint("CK_Notification_Status", "[Status] IN (N'Pending',N'Ready',N'Read',N'Withdrawn')");
                    table.ForeignKey(
                        name: "FK_Notification_Person_RecipientPersonId",
                        column: x => x.RecipientPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OutboxMessage",
                schema: "ops",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EventPublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PayloadRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Attempts = table.Column<int>(type: "int", nullable: false),
                    NextAttemptAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessage", x => x.Id);
                    table.CheckConstraint("CK_OutboxMessage_Attempts", "[Attempts]>=0");
                    table.CheckConstraint("CK_OutboxMessage_Status", "[Status] IN (N'Pending',N'Delivered',N'DeadLetter')");
                });

            migrationBuilder.CreateTable(
                name: "DeliveryAttempt",
                schema: "ops",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NotificationId = table.Column<long>(type: "bigint", nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    ProviderRef = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    Outcome = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    AttemptedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryAttempt", x => x.Id);
                    table.CheckConstraint("CK_DeliveryAttempt_Outcome", "[Outcome] IN (N'Attempted',N'Sent',N'Failed')");
                    table.ForeignKey(
                        name: "FK_DeliveryAttempt_Notification_NotificationId",
                        column: x => x.NotificationId,
                        principalSchema: "ops",
                        principalTable: "Notification",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContentRelease_PublishedByPersonId",
                schema: "governance",
                table: "ContentRelease",
                column: "PublishedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentRelease_SupersedesId",
                schema: "governance",
                table: "ContentRelease",
                column: "SupersedesId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentRelease_TargetCode_PublishedAtUtc",
                schema: "governance",
                table: "ContentRelease",
                columns: new[] { "TargetCode", "PublishedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentRelease_TargetCode_VersionNo",
                schema: "governance",
                table: "ContentRelease",
                columns: new[] { "TargetCode", "VersionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryAttempt_NotificationId_AttemptedAtUtc",
                schema: "ops",
                table: "DeliveryAttempt",
                columns: new[] { "NotificationId", "AttemptedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GovernanceAction_ActorPersonId",
                schema: "governance",
                table: "GovernanceAction",
                column: "ActorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_GovernanceAction_ResourceType_ResourcePublicId_AtUtc",
                schema: "governance",
                table: "GovernanceAction",
                columns: new[] { "ResourceType", "ResourcePublicId", "AtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_IdempotencyRecord_ActorPersonId_CommandCode_IdempotencyKey",
                schema: "ops",
                table: "IdempotencyRecord",
                columns: new[] { "ActorPersonId", "CommandCode", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IdempotencyRecord_ExpiresAtUtc",
                schema: "ops",
                table: "IdempotencyRecord",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Notification_PublicId",
                schema: "ops",
                table: "Notification",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notification_RecipientPersonId_CreatedAtUtc",
                schema: "ops",
                table: "Notification",
                columns: new[] { "RecipientPersonId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Notification_RecipientPersonId_EventPublicId_TemplateCode",
                schema: "ops",
                table: "Notification",
                columns: new[] { "RecipientPersonId", "EventPublicId", "TemplateCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessage_EventPublicId",
                schema: "ops",
                table: "OutboxMessage",
                column: "EventPublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessage_Status_NextAttemptAtUtc",
                schema: "ops",
                table: "OutboxMessage",
                columns: new[] { "Status", "NextAttemptAtUtc" });

            foreach (var batch in ModuleSql.Batches("OperationsGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContentRelease",
                schema: "governance");

            migrationBuilder.DropTable(
                name: "DeliveryAttempt",
                schema: "ops");

            migrationBuilder.DropTable(
                name: "GovernanceAction",
                schema: "governance");

            migrationBuilder.DropTable(
                name: "IdempotencyRecord",
                schema: "ops");

            migrationBuilder.DropTable(
                name: "OutboxMessage",
                schema: "ops");

            migrationBuilder.DropTable(
                name: "Notification",
                schema: "ops");
        }
    }
}
