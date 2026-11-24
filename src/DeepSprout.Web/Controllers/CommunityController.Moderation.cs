using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DeepSprout.Domain.V5;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

public sealed partial class CommunityController
{
    private const int QueueSize = 30;

    [HttpGet("moderation")]
    public async Task<IActionResult> Moderation([FromQuery] string view = "queue", [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        if (await AdminId(ct) is null) return Forbid();
        if (page is < 1 or > 100000) return BadRequest("Invalid page.");
        var posts = db.Set<Post>().AsNoTracking();
        var openReports = db.Set<ContentReport>().AsNoTracking().Where(row => row.Status != "Resolved");
        var offset = (page - 1) * QueueSize;
        Post[] postPage = [];
        ContentReport[] reportPage = [];
        switch (view)
        {
            case "queue":
            case "posts":
                postPage = await posts.Where(row => row.Status == "Draft").OrderBy(row => row.Id)
                    .Skip(offset).Take(QueueSize + 1).ToArrayAsync(ct);
                break;
            case "live":
            case "removed":
                postPage = await posts.Where(row => view == "live" ? row.Status == "Published" :
                    row.Status == "Removed" || row.Status == "Hidden").OrderByDescending(row => row.Id)
                    .Skip(offset).Take(QueueSize + 1).ToArrayAsync(ct);
                break;
            case "reports":
                break;
            default:
                return BadRequest("Unknown Community queue.");
        }
        if (view is "queue" or "reports")
            reportPage = await openReports.OrderBy(row => row.Id).Skip(offset).Take(QueueSize + 1).ToArrayAsync(ct);
        var postCounts = await posts.GroupBy(row => row.Status).ToDictionaryAsync(group => group.Key, group => group.Count(), ct);
        return Ok(new
        {
            posts = await AdminPosts(postPage.Take(QueueSize).ToArray(), ct),
            reports = await ReportViews(reportPage.Take(QueueSize).ToArray(), ct),
            hasMore = postPage.Length > QueueSize || reportPage.Length > QueueSize,
            counts = new { posts = postCounts.GetValueOrDefault("Draft"), live = postCounts.GetValueOrDefault("Published"),
                removed = postCounts.GetValueOrDefault("Removed") + postCounts.GetValueOrDefault("Hidden"),
                reports = await openReports.CountAsync(ct) }
        });
    }

    [HttpGet("moderation/posts/{id:guid}")]
    public async Task<IActionResult> ModerationPost(Guid id, CancellationToken ct)
    {
        if (await AdminId(ct) is null) return Forbid();
        var post = await db.Set<Post>().AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == id, ct);
        if (post is null) return NotFound();
        return Ok(new { posts = await AdminPosts([post], ct), history = await History("community.Post", post.Id, ct) });
    }

    [HttpGet("moderation/reports/{id:long}")]
    public async Task<IActionResult> ModerationReport(long id, CancellationToken ct)
    {
        if (await AdminId(ct) is null) return Forbid();
        var report = await db.Set<ContentReport>().AsNoTracking().SingleOrDefaultAsync(row => row.Id == id, ct);
        if (report is null) return NotFound();
        var history = report.CommentId is { } commentId
            ? await History("community.Comment", commentId, ct) : await History("community.Post", report.PostId, ct);
        return Ok(new { reports = await ReportViews([report], ct), history });
    }

    [HttpGet("moderation/history")]
    public async Task<IActionResult> ModerationHistory([FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (await AdminId(ct) is null) return Forbid();
        if (page is < 1 or > 100000) return BadRequest("Invalid page.");
        var history = await History(null, null, ct, (page - 1) * QueueSize);
        return Ok(new { history = history.Take(QueueSize), hasMore = history.Length > QueueSize });
    }

    private sealed record ModerationPostRow(Guid Id, string? Category, string Title, string Message, string Author,
        string Status, DateTime? CreatedAt, string Revision);

    private static ModerationPostRow AdminPostView(Post post, string author) => new(post.PublicId, post.TopicCode,
        Title(post.Body), Message(post.Body), author, post.Status, Utc(post.CreatedAtUtc), Revision(post));

    private async Task<ModerationPostRow[]> AdminPosts(Post[] posts, CancellationToken ct)
    {
        var names = await Names(posts.Select(post => post.AuthorPersonId).Distinct().ToArray(), ct);
        return posts.Select(post => AdminPostView(post, names[post.AuthorPersonId])).ToArray();
    }

    private async Task<object[]> ReportViews(ContentReport[] reports, CancellationToken ct)
    {
        var commentIds = reports.Where(row => row.CommentId.HasValue).Select(row => row.CommentId!.Value).ToArray();
        var comments = await db.Set<Comment>().AsNoTracking().Where(row => commentIds.Contains(row.Id))
            .ToDictionaryAsync(row => row.Id, ct);
        var postIds = reports.Where(row => row.PostId.HasValue).Select(row => row.PostId!.Value)
            .Concat(comments.Values.Select(row => row.PostId)).Distinct().ToArray();
        var posts = await db.Set<Post>().AsNoTracking().Where(row => postIds.Contains(row.Id)).ToDictionaryAsync(row => row.Id, ct);
        var names = await Names(reports.Select(row => row.ReporterPersonId).Concat(posts.Values.Select(row => row.AuthorPersonId))
            .Concat(comments.Values.Select(row => row.AuthorPersonId)).Distinct().ToArray(), ct);
        return reports.Select(report =>
        {
            var comment = report.CommentId is { } id ? comments.GetValueOrDefault(id) : null;
            var post = posts.GetValueOrDefault(report.PostId ?? comment?.PostId ?? 0);
            return (object)new { id = report.Id, postId = post?.PublicId, commentId = report.CommentId,
                commentBody = comment?.Body, commentAuthor = comment is null ? null : names[comment.AuthorPersonId],
                commentStatus = comment?.Status, post = post is null ? null : AdminPostView(post, names[post.AuthorPersonId]),
                reporter = names[report.ReporterPersonId], reason = report.ReasonCode, report.Details, report.Status,
                report.Resolution, report.ResolutionReason, createdAt = Utc(report.CreatedAtUtc), resolvedAt = Utc(report.ResolvedAtUtc) };
        }).ToArray();
    }

    private async Task<object[]> History(string? kind, long? resourceId, CancellationToken ct, int offset = 0)
    {
        var query = db.Set<AuditEvent>().AsNoTracking().Where(row =>
            (row.ResourceKind == "community.Post" || row.ResourceKind == "community.Comment") && row.Action != "Submit");
        if (kind is not null) query = query.Where(row => row.ResourceKind == kind && row.ResourceId == resourceId);
        var rows = await query.OrderByDescending(row => row.Id).Skip(offset).Take(QueueSize + 1).ToArrayAsync(ct);
        var names = await Names(rows.Where(row => row.ActorPersonId.HasValue).Select(row => row.ActorPersonId!.Value).Distinct().ToArray(), ct);
        return rows.Select(row => (object)new { row.Action, row.BeforeStatus, status = row.AfterStatus, row.Reason,
            actor = names.GetValueOrDefault(row.ActorPersonId ?? 0, "Unknown"), row.ResourceKind, createdAt = Utc(row.AtUtc) }).ToArray();
    }

    public sealed record ModerationDecision(string? Status, string? Reason, long? ReportId, string? ExpectedRevision = null);

    [HttpPatch("moderation/posts/{id:guid}")]
    public async Task<IActionResult> ModeratePost(Guid id, [FromBody] ModerationDecision input, CancellationToken ct)
    {
        if (await AdminId(ct) is not { } adminId) return Forbid();
        if (!ValidDecision(input)) return BadRequest(DecisionError);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if ((await LockActor(adminId, ct)).PlatformRole != "Admin") return Forbid();
        var post = await LockPost(id, ct);
        if (post is null) return NotFound();
        if (input.ExpectedRevision is not null && input.ExpectedRevision != Revision(post))
            return Conflict("The post changed. Reload it before deciding.");
        var error = await RecordDecision("community.Post", post.Id, post.Status, adminId, input, ct);
        if (error is not null) return error;
        if (input.Status != "Unchanged") post.Status = input.Status!;
        if (post.Status == "Published") post.PublishedAtUtc ??= Now;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return NoContent();
    }

    [HttpPatch("moderation/comments/{id:long}")]
    public async Task<IActionResult> ModerateComment(long id, [FromBody] ModerationDecision input, CancellationToken ct)
    {
        if (await AdminId(ct) is not { } adminId) return Forbid();
        if (!ValidDecision(input)) return BadRequest(DecisionError);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if ((await LockActor(adminId, ct)).PlatformRole != "Admin") return Forbid();
        var comment = await LockComment(id, ct);
        if (comment is null) return NotFound();
        var error = await RecordDecision("community.Comment", comment.Id, comment.Status, adminId, input, ct);
        if (error is not null) return error;
        if (input.Status != "Unchanged") comment.Status = input.Status!;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return NoContent();
    }

    private const string DecisionError = "Choose a status and reason (1–1000 characters).";

    private static bool ValidDecision(ModerationDecision input) =>
        input.Status is "Published" or "Hidden" or "Removed" or "Unchanged" &&
        !string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 1000 &&
        (input.ExpectedRevision is null || input.ExpectedRevision.Length == 64);

    private static string Revision(Post post) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
        JsonSerializer.Serialize(new { post.Status, post.TopicCode, post.Body }))));

    private async Task<IActionResult?> RecordDecision(string kind, long id, string before, long adminId,
        ModerationDecision input, CancellationToken ct)
    {
        var next = input.Status!;
        var allowed = next == "Unchanged" ? input.ReportId.HasValue : (before, next) switch
        {
            ("Draft", "Published" or "Removed") => true,
            ("Published", "Hidden" or "Removed") => true,
            ("Hidden", "Published" or "Removed") => true,
            _ => false
        };
        if (!allowed) return Conflict("This action is not available for the current state.");
        var reason = input.Reason!.Trim();
        if (input.ReportId is { } reportId)
        {
            var report = await db.Set<ContentReport>().SingleOrDefaultAsync(row => row.Id == reportId &&
                row.Status != "Resolved" && (kind == "community.Post" ? row.PostId == id : row.CommentId == id), ct);
            if (report is null) return Conflict("The report is no longer open for this content.");
            report.Status = "Resolved";
            report.Resolution = next switch { "Published" => "Restore", "Hidden" => "Hide", "Removed" => "Remove", _ => "Dismiss" };
            report.ResolutionReason = reason;
            report.ResolvedByPersonId = adminId;
            report.ResolvedAtUtc = Now;
        }
        Audit(adminId, "Admin", kind, id, next == "Unchanged" ? "DismissReport" : "Moderate", before,
            next == "Unchanged" ? before : next, reason,
            input.ReportId is { } target ? JsonSerializer.Serialize(new { reportId = target }) : null);
        return null;
    }

    private void Audit(long actorId, string capacity, string kind, long id, string action, string? before,
        string? after, string? reason, string? detail = null) =>
        db.Set<AuditEvent>().Add(new AuditEvent { ActorPersonId = actorId, ActorCapacity = capacity, ResourceKind = kind,
            ResourceId = id, Action = action, BeforeStatus = before, AfterStatus = after, Reason = reason,
            DetailJson = detail, AtUtc = Now, CreatedAtUtc = Now });
}
