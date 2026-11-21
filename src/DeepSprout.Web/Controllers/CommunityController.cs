using System.IdentityModel.Tokens.Jwt;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

/// <summary>Server-owned community records. Browser demo records are never imported implicitly.</summary>
[ApiController]
[Authorize]
[Route("api/community")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class CommunityController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    private static readonly HashSet<string> Topics = ["progress", "tips", "questions", "wins"];
    private static readonly HashSet<string> Reasons =
        ["Spam or advertising", "Harassment or abuse", "Harmful or misleading content", "Privacy concern", "Other concern"];

    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    private async Task<long?> ActorId(CancellationToken ct)
    {
        if (!long.TryParse(User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var userId)) return null;
        return await db.Set<ApplicationUser>().Where(user => user.Id == userId)
            .Select(user => (long?)user.PersonId).SingleOrDefaultAsync(ct);
    }

    private async Task<long?> AdminId(CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return null;
        return await db.Set<Person>().Where(person => person.Id == actorId && person.PlatformRole == "Admin")
            .Select(person => (long?)person.Id).SingleOrDefaultAsync(ct);
    }

    private static object PostView(Post post, string author, int likes, int comments, bool liked, bool saved) => new
    {
        id = post.PublicId, category = post.TopicCode, title = Title(post.Body), message = Message(post.Body),
        author, status = post.Status, createdAt = post.CreatedAtUtc, publishedAt = post.PublishedAtUtc,
        likes, comments, liked, saved
    };

    private static string Title(string body) => body.Split("\n\n", 2, StringSplitOptions.None)[0];
    private static string Message(string body)
    {
        var parts = body.Split("\n\n", 2, StringSplitOptions.None);
        return parts.Length == 2 ? parts[1] : "";
    }

    [HttpGet("posts")]
    public async Task<IActionResult> Posts([FromQuery] string? category, [FromQuery] string? search,
        [FromQuery] DateTime? before, [FromQuery] int limit = 30, CancellationToken ct = default)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (category is not null && !Topics.Contains(category)) return BadRequest("Unknown category.");
        if (search?.Length > 100) return BadRequest("Search is too long.");
        limit = Math.Clamp(limit, 1, 50);

        var query = db.Set<Post>().AsNoTracking().Where(post => post.Status == "Published");
        if (category is not null) query = query.Where(post => post.TopicCode == category);
        if (before is not null) query = query.Where(post => post.PublishedAtUtc < before.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(post => post.Body.Contains(term) || db.Set<Person>()
                .Any(person => person.Id == post.AuthorPersonId && person.DisplayName.Contains(term)));
        }
        var posts = await query.OrderByDescending(post => post.PublishedAtUtc).ThenByDescending(post => post.Id)
            .Take(limit).ToListAsync(ct);
        var ids = posts.Select(post => post.Id).ToArray();
        var authorIds = posts.Select(post => post.AuthorPersonId).Distinct().ToArray();
        var people = await db.Set<Person>().AsNoTracking().Where(person => authorIds.Contains(person.Id))
            .ToDictionaryAsync(person => person.Id, person => person.DisplayName, ct);
        var interactions = await db.Set<PostInteraction>().AsNoTracking()
            .Where(item => ids.Contains(item.PostId)).ToListAsync(ct);
        var commentCounts = await db.Set<Comment>().AsNoTracking()
            .Where(comment => ids.Contains(comment.PostId) && comment.Status == "Published")
            .GroupBy(comment => comment.PostId).Select(group => new { id = group.Key, count = group.Count() })
            .ToDictionaryAsync(item => item.id, item => item.count, ct);
        return Ok(new { posts = posts.Select(post => PostView(post, people.GetValueOrDefault(post.AuthorPersonId, "Member"),
            interactions.Count(item => item.PostId == post.Id && item.Kind == "Reaction" && item.ReactionCode == "Like"),
            commentCounts.GetValueOrDefault(post.Id),
            interactions.Any(item => item.PostId == post.Id && item.PersonId == actorId && item.Kind == "Reaction" && item.ReactionCode == "Like"),
            interactions.Any(item => item.PostId == post.Id && item.PersonId == actorId && item.Kind == "Bookmark"))) });
    }

    public sealed record NewPost(string? Category, string? Title, string? Message);

    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost([FromBody] NewPost input, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        var title = input.Title?.Trim();
        var message = input.Message?.Trim();
        if (input.Category is null || !Topics.Contains(input.Category) || string.IsNullOrWhiteSpace(title)
            || title.Length > 100 || title.Contains('\n') || title.Contains('\r')
            || string.IsNullOrWhiteSpace(message) || message.Length > 600)
            return BadRequest("Choose a category, title (1–100 characters), and message (1–600 characters).");
        var now = Now;
        if (await db.Set<Post>().AnyAsync(post => post.AuthorPersonId == actorId && post.CreatedAtUtc > now.AddMinutes(-2), ct))
            return StatusCode(StatusCodes.Status429TooManyRequests, "Please wait two minutes before posting again.");
        var post = new Post { AuthorPersonId = actorId.Value, TopicCode = input.Category,
            Body = title + "\n\n" + message, Status = "Draft", CreatedAtUtc = now };
        db.Set<Post>().Add(post);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, new { id = post.PublicId, status = post.Status });
    }

    [HttpGet("posts/{id:guid}/comments")]
    public async Task<IActionResult> Comments(Guid id, CancellationToken ct)
    {
        var post = await db.Set<Post>().AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == id, ct);
        if (post is null || post.Status != "Published") return NotFound();
        var comments = await db.Set<Comment>().AsNoTracking().Where(item => item.PostId == post.Id && item.Status == "Published")
            .OrderBy(item => item.CreatedAtUtc).Take(100).ToListAsync(ct);
        var authorIds = comments.Select(item => item.AuthorPersonId).Distinct().ToArray();
        var authors = await db.Set<Person>().AsNoTracking().Where(item => authorIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.DisplayName, ct);
        return Ok(new { comments = comments.Select(item => new { id = item.Id, body = item.Body,
            author = authors.GetValueOrDefault(item.AuthorPersonId, "Member"), createdAt = item.CreatedAtUtc }) });
    }

    public sealed record NewComment(string? Body);

    [HttpPost("posts/{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] NewComment input, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        var body = input.Body?.Trim();
        if (string.IsNullOrWhiteSpace(body) || body.Length > 2000) return BadRequest("Comment must be 1–2000 characters.");
        var post = await db.Set<Post>().AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == id && item.Status == "Published", ct);
        if (post is null) return NotFound();
        var now = Now;
        if (await db.Set<Comment>().CountAsync(item => item.AuthorPersonId == actorId && item.CreatedAtUtc > now.AddMinutes(-10), ct) >= 5)
            return StatusCode(StatusCodes.Status429TooManyRequests, "Please wait before commenting again.");
        var comment = new Comment { PostId = post.Id, AuthorPersonId = actorId.Value,
            Body = body, Status = "Published", CreatedAtUtc = now };
        db.Set<Comment>().Add(comment);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = comment.Id, body = comment.Body, createdAt = comment.CreatedAtUtc });
    }

    [HttpPut("posts/{id:guid}/interactions/{kind}")]
    public async Task<IActionResult> AddInteraction(Guid id, string kind, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (kind is not ("like" or "bookmark")) return BadRequest("Unknown interaction.");
        var post = await db.Set<Post>().AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == id && item.Status == "Published", ct);
        if (post is null) return NotFound();
        var dbKind = kind == "like" ? "Reaction" : "Bookmark";
        var code = kind == "like" ? "Like" : null;
        if (await db.Set<PostInteraction>().AnyAsync(item => item.PostId == post.Id && item.PersonId == actorId
            && item.Kind == dbKind && item.ReactionCode == code, ct)) return NoContent();
        db.Set<PostInteraction>().Add(new PostInteraction { PostId = post.Id, PersonId = actorId.Value,
            Kind = dbKind, ReactionCode = code, CreatedAtUtc = Now });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && sql.Number is 2601 or 2627)
        { return NoContent(); }
        return NoContent();
    }

    [HttpDelete("posts/{id:guid}/interactions/{kind}")]
    public async Task<IActionResult> RemoveInteraction(Guid id, string kind, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (kind is not ("like" or "bookmark")) return BadRequest("Unknown interaction.");
        var postId = await db.Set<Post>().Where(item => item.PublicId == id && item.Status == "Published")
            .Select(item => (long?)item.Id).SingleOrDefaultAsync(ct);
        if (postId is null) return NotFound();
        var dbKind = kind == "like" ? "Reaction" : "Bookmark";
        var code = kind == "like" ? "Like" : null;
        await db.Set<PostInteraction>().Where(item => item.PostId == postId && item.PersonId == actorId
            && item.Kind == dbKind && item.ReactionCode == code).ExecuteDeleteAsync(ct);
        return NoContent();
    }

    public sealed record NewReport(string? Reason, string? Details);

    [HttpPost("posts/{id:guid}/reports")]
    public async Task<IActionResult> ReportPost(Guid id, [FromBody] NewReport input, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (input.Reason is null || !Reasons.Contains(input.Reason) || input.Details?.Length > 1000)
            return BadRequest("Choose a valid reason and keep details under 1000 characters.");
        var post = await db.Set<Post>().AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == id && item.Status == "Published", ct);
        if (post is null) return NotFound();
        if (post.AuthorPersonId == actorId) return BadRequest("You cannot report your own post.");
        if (await db.Set<ContentReport>().AnyAsync(item => item.PostId == post.Id && item.ReporterPersonId == actorId
            && item.Status != "Resolved", ct)) return Conflict("You already have an open report for this post.");
        db.Set<ContentReport>().Add(new ContentReport { PostId = post.Id, ReporterPersonId = actorId.Value,
            ReasonCode = input.Reason, Details = input.Details?.Trim(), Status = "Submitted", CreatedAtUtc = Now });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && sql.Number is 2601 or 2627)
        { return Conflict("You already have an open report for this post."); }
        return Accepted();
    }

    [HttpPost("comments/{id:long}/reports")]
    public async Task<IActionResult> ReportComment(long id, [FromBody] NewReport input, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (input.Reason is null || !Reasons.Contains(input.Reason) || input.Details?.Length > 1000)
            return BadRequest("Choose a valid reason and keep details under 1000 characters.");
        var comment = await db.Set<Comment>().AsNoTracking().SingleOrDefaultAsync(item => item.Id == id && item.Status == "Published", ct);
        if (comment is null || !await db.Set<Post>().AnyAsync(item => item.Id == comment.PostId && item.Status == "Published", ct))
            return NotFound();
        if (comment.AuthorPersonId == actorId) return BadRequest("You cannot report your own comment.");
        if (await db.Set<ContentReport>().AnyAsync(item => item.CommentId == id && item.ReporterPersonId == actorId
            && item.Status != "Resolved", ct)) return Conflict("You already have an open report for this comment.");
        db.Set<ContentReport>().Add(new ContentReport { CommentId = id, ReporterPersonId = actorId.Value,
            ReasonCode = input.Reason, Details = input.Details?.Trim(), Status = "Submitted", CreatedAtUtc = Now });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && sql.Number is 2601 or 2627)
        { return Conflict("You already have an open report for this comment."); }
        return Accepted();
    }

    [HttpGet("moderation")]
    public async Task<IActionResult> Moderation(CancellationToken ct)
    {
        if (await AdminId(ct) is null) return Forbid();
        var posts = await db.Set<Post>().AsNoTracking().Where(item => item.Status == "Draft")
            .OrderBy(item => item.CreatedAtUtc).Take(100).ToListAsync(ct);
        var reports = await db.Set<ContentReport>().AsNoTracking().Where(item => item.Status != "Resolved")
            .OrderBy(item => item.CreatedAtUtc).Take(100).ToListAsync(ct);
        var reportPostIds = reports.Where(item => item.PostId is not null).Select(item => item.PostId!.Value).Distinct().ToArray();
        var publicIds = await db.Set<Post>().AsNoTracking().Where(item => reportPostIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.PublicId, ct);
        var reportCommentIds = reports.Where(item => item.CommentId is not null).Select(item => item.CommentId!.Value).Distinct().ToArray();
        var commentBodies = await db.Set<Comment>().AsNoTracking().Where(item => reportCommentIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.Body, ct);
        return Ok(new { posts = posts.Select(item => new { id = item.PublicId, category = item.TopicCode,
            title = Title(item.Body), message = Message(item.Body), createdAt = item.CreatedAtUtc }),
            reports = reports.Select(item => new { id = item.Id,
                postId = item.PostId is long postId ? publicIds.GetValueOrDefault(postId) : Guid.Empty,
                commentId = item.CommentId,
                commentBody = item.CommentId is long commentId ? commentBodies.GetValueOrDefault(commentId) : null,
                reason = item.ReasonCode, details = item.Details, status = item.Status, createdAt = item.CreatedAtUtc }) });
    }

    public sealed record ModerationDecision(string? Status, string? Reason, long? ReportId);

    [HttpPatch("moderation/posts/{id:guid}")]
    public async Task<IActionResult> ModeratePost(Guid id, [FromBody] ModerationDecision input, CancellationToken ct)
    {
        var adminId = await AdminId(ct);
        if (adminId is null) return Forbid();
        if (input.Status is not ("Published" or "Hidden" or "Removed" or "Unchanged") || string.IsNullOrWhiteSpace(input.Reason)
            || input.Reason.Length > 1000) return BadRequest("Choose a status and reason (1–1000 characters).");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var post = await db.Set<Post>().SingleOrDefaultAsync(item => item.PublicId == id, ct);
        if (post is null) return NotFound();
        if (post.Status == "Removed" || (post.Status == input.Status && input.ReportId is null)
            || (input.Status == "Unchanged" && input.ReportId is null))
            return Conflict("The post is already in that state or there is no report to dismiss.");
        ContentReport? report = null;
        if (input.ReportId is not null)
        {
            report = await db.Set<ContentReport>().SingleOrDefaultAsync(item => item.Id == input.ReportId
                && item.PostId == post.Id && item.Status != "Resolved", ct);
            if (report is null) return Conflict("The report is no longer open for this post.");
            report.Status = "Resolved";
            report.Resolution = input.Status switch { "Unchanged" => "Dismiss",
                "Published" => post.Status == "Hidden" ? "Restore" : "Dismiss",
                "Hidden" => "Hide", _ => "Remove" };
            report.ResolutionReason = input.Reason.Trim();
            report.ResolvedByPersonId = adminId;
            report.ResolvedAtUtc = Now;
        }
        var previous = post.Status;
        if (input.Status != "Unchanged") post.Status = input.Status;
        if (post.Status == "Published" && post.PublishedAtUtc is null) post.PublishedAtUtc = Now;
        db.Set<AuditEvent>().Add(new AuditEvent { ActorPersonId = adminId, ActorCapacity = "Admin",
            ResourceKind = "community.Post", ResourceId = post.Id,
            Action = input.Status == "Unchanged" ? "DismissReport" : "Moderate",
            BeforeStatus = previous, AfterStatus = post.Status, Reason = input.Reason.Trim(),
            AtUtc = Now, CreatedAtUtc = Now });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return NoContent();
    }

    [HttpPatch("moderation/comments/{id:long}")]
    public async Task<IActionResult> ModerateComment(long id, [FromBody] ModerationDecision input, CancellationToken ct)
    {
        var adminId = await AdminId(ct);
        if (adminId is null) return Forbid();
        if (input.Status is not ("Published" or "Hidden" or "Removed" or "Unchanged") || string.IsNullOrWhiteSpace(input.Reason)
            || input.Reason.Length > 1000) return BadRequest("Choose a status and reason (1–1000 characters).");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var comment = await db.Set<Comment>().SingleOrDefaultAsync(item => item.Id == id, ct);
        if (comment is null) return NotFound();
        if (comment.Status == "Removed" || (comment.Status == input.Status && input.ReportId is null)
            || (input.Status == "Unchanged" && input.ReportId is null))
            return Conflict("The comment is already in that state or there is no report to dismiss.");
        if (input.ReportId is not null)
        {
            var report = await db.Set<ContentReport>().SingleOrDefaultAsync(item => item.Id == input.ReportId
                && item.CommentId == comment.Id && item.Status != "Resolved", ct);
            if (report is null) return Conflict("The report is no longer open for this comment.");
            report.Status = "Resolved";
            report.Resolution = input.Status switch { "Unchanged" => "Dismiss",
                "Published" => comment.Status == "Hidden" ? "Restore" : "Dismiss",
                "Hidden" => "Hide", _ => "Remove" };
            report.ResolutionReason = input.Reason.Trim();
            report.ResolvedByPersonId = adminId;
            report.ResolvedAtUtc = Now;
        }
        var previous = comment.Status;
        if (input.Status != "Unchanged") comment.Status = input.Status;
        db.Set<AuditEvent>().Add(new AuditEvent { ActorPersonId = adminId, ActorCapacity = "Admin",
            ResourceKind = "community.Comment", ResourceId = comment.Id,
            Action = input.Status == "Unchanged" ? "DismissReport" : "Moderate",
            BeforeStatus = previous, AfterStatus = comment.Status, Reason = input.Reason.Trim(),
            AtUtc = Now, CreatedAtUtc = Now });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return NoContent();
    }
}
