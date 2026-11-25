using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
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
public sealed partial class CommunityController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    private static readonly HashSet<string> Topics = ["progress", "tips", "questions", "wins"];
    private static readonly HashSet<string> Reasons =
        ["Spam or advertising", "Harassment or abuse", "Harmful or misleading content", "Privacy concern", "Other concern"];

    private DateTime Now => PersonalRecords.Now(clock);

    private Task<long?> ActorId(CancellationToken ct) => PersonalRecords.PersonId(db, User, ct);

    private Task<Person> LockActor(long personId, CancellationToken ct) => db.Set<Person>()
        .FromSqlInterpolated($"SELECT * FROM [iam].[Person] WITH (UPDLOCK) WHERE [Id] = {personId}").SingleAsync(ct);

    private Task<Post?> LockPost(Guid id, CancellationToken ct) => db.Set<Post>()
        .FromSqlInterpolated($"SELECT * FROM [community].[Post] WITH (UPDLOCK) WHERE [PublicId] = {id}").SingleOrDefaultAsync(ct);

    private Task<Comment?> LockComment(long id, CancellationToken ct) => db.Set<Comment>()
        .FromSqlInterpolated($"SELECT * FROM [community].[Comment] WITH (UPDLOCK) WHERE [Id] = {id}").SingleOrDefaultAsync(ct);

    private Task<long?> AdminId(CancellationToken ct) => PersonalRecords.PlatformAdminId(db, User, ct);

    private static object PostView(Post post, string author, long actorId, int likes = 0, int comments = 0,
        bool liked = false, bool saved = false) => new
    {
        id = post.PublicId, category = post.TopicCode, title = Title(post.Body), message = Message(post.Body),
        author, status = post.Status, createdAt = Utc(post.CreatedAtUtc), publishedAt = Utc(post.PublishedAtUtc),
        likes, comments, liked, saved, own = post.AuthorPersonId == actorId,
        canEdit = post.AuthorPersonId == actorId && post.Status is ("Draft" or "Published"),
        canDelete = post.AuthorPersonId == actorId && post.Status != "Removed"
    };
    private static DateTime? Utc(DateTime? date) => date is { } value ? DateTime.SpecifyKind(value, DateTimeKind.Utc) : null;

    private static string Title(string body) => body.Split("\n\n", 2, StringSplitOptions.None)[0];
    private static string Message(string body)
    {
        var parts = body.Split("\n\n", 2, StringSplitOptions.None);
        return parts.Length == 2 ? parts[1] : "";
    }

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpGet("posts")]
    public async Task<IActionResult> Posts([FromQuery] string? category, [FromQuery] string? search,
        [FromQuery] DateTimeOffset? before, [FromQuery] Guid? beforeId, [FromQuery] int limit = 30,
        [FromQuery] bool mine = false, CancellationToken ct = default)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (category is not null && !Topics.Contains(category)) return BadRequest("Unknown category.");
        if (search?.Length > 100) return BadRequest("Search is too long.");
        limit = Math.Clamp(limit, 1, 50);

        var query = db.Set<Post>().AsNoTracking().Where(post => mine ? post.AuthorPersonId == actorId : post.Status == "Published");
        if (category is not null) query = query.Where(post => post.TopicCode == category);
        var rowsWithDate = query.Select(post => new { Post = post, SortDate = mine ? post.CreatedAtUtc : post.PublishedAtUtc ?? post.CreatedAtUtc });
        if (before is { } boundary)
        {
            var date = boundary.UtcDateTime;
            var key = beforeId is { } cursor
                ? await rowsWithDate.Where(row => row.Post.PublicId == cursor && row.SortDate == date)
                    .Select(row => (long?)row.Post.Id).SingleOrDefaultAsync(ct)
                : null;
            rowsWithDate = rowsWithDate.Where(row => row.SortDate < date || row.SortDate == date && row.Post.Id < key);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            rowsWithDate = rowsWithDate.Where(row => row.Post.Body.Contains(term) || db.Set<Person>()
                .Any(person => person.Id == row.Post.AuthorPersonId && person.DisplayName.Contains(term)));
        }
        var rows = await rowsWithDate.OrderByDescending(row => row.SortDate).ThenByDescending(row => row.Post.Id)
            .Take(limit + 1).ToArrayAsync(ct);
        var page = rows.Take(limit).ToArray();
        var posts = await ViewPosts(page.Select(row => row.Post).ToArray(), actorId.Value, ct);
        return Ok(new { posts, next = rows.Length > limit
            ? new { before = Utc(page[^1].SortDate), beforeId = page[^1].Post.PublicId } : null });
    }

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpGet("posts/{id:guid}")]
    public async Task<IActionResult> ReadPost(Guid id, CancellationToken ct)
    {
        if (await ActorId(ct) is not { } actorId) return Unauthorized();
        var post = await db.Set<Post>().AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == id &&
            (item.Status == "Published" || item.AuthorPersonId == actorId), ct);
        return post is null ? NotFound() : Ok((await ViewPosts([post], actorId, ct))[0]);
    }

    private async Task<object[]> ViewPosts(Post[] posts, long actorId, CancellationToken ct)
    {
        var ids = posts.Where(post => post.Status == "Published").Select(post => post.Id).ToArray();
        var authorIds = posts.Select(post => post.AuthorPersonId).Distinct().ToArray();
        var authors = await Names(authorIds, ct);
        var counts = await db.Set<Comment>().Where(item => ids.Contains(item.PostId) && item.Status == "Published")
            .GroupBy(item => item.PostId).ToDictionaryAsync(group => group.Key, group => group.Count(), ct);
        var likes = await db.Set<PostInteraction>().Where(item => ids.Contains(item.PostId) && item.Kind == "Reaction" && item.ReactionCode == "Like")
            .GroupBy(item => item.PostId).ToDictionaryAsync(group => group.Key, group => group.Count(), ct);
        var own = await db.Set<PostInteraction>().AsNoTracking()
            .Where(item => ids.Contains(item.PostId) && item.PersonId == actorId).ToArrayAsync(ct);
        return posts.Select(post => PostView(post, authors.GetValueOrDefault(post.AuthorPersonId, "Member"), actorId,
            likes.GetValueOrDefault(post.Id), counts.GetValueOrDefault(post.Id),
            own.Any(item => item.PostId == post.Id && item.Kind == "Reaction" && item.ReactionCode == "Like"),
            own.Any(item => item.PostId == post.Id && item.Kind == "Bookmark"))).ToArray();
    }

    private Task<Dictionary<long, string>> Names(long[] ids, CancellationToken ct) => db.Set<Person>().AsNoTracking()
        .Where(person => ids.Contains(person.Id)).ToDictionaryAsync(person => person.Id, person => person.DisplayName, ct);

    public sealed record NewPost(string? Category, string? Title, string? Message, Guid? RequestId = null);

    private static string? PostBody(NewPost input)
    {
        var title = input.Title?.Trim();
        var message = input.Message?.Trim();
        if (input.Category is null || !Topics.Contains(input.Category) || string.IsNullOrWhiteSpace(title)
            || title.Length > 100 || title.Contains('\n') || title.Contains('\r')
            || string.IsNullOrWhiteSpace(message) || message.Length > 600) return null;
        return title + "\n\n" + message;
    }

    private const string PostInputError = "Choose a category, title (1–100 characters), and message (1–600 characters).";

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost([FromBody] NewPost input, CancellationToken ct)
    {
        if (await ActorId(ct) is not { } actorId) return Unauthorized();
        if (PostBody(input) is not { } body) return BadRequest(PostInputError);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await LockActor(actorId, ct);
        if (await Submission(actorId, "community.Post", input.RequestId, ct) is { } existing &&
            await db.Set<Post>().FindAsync([existing], ct) is { } previous)
            return previous.TopicCode == input.Category && previous.Body == body
                ? Ok(new { id = previous.PublicId, status = previous.Status }) : Conflict("This request was already used.");
        var now = Now;
        if (await db.Set<Post>().AnyAsync(post => post.AuthorPersonId == actorId && post.CreatedAtUtc > now.AddMinutes(-2), ct))
            return StatusCode(StatusCodes.Status429TooManyRequests, "Please wait two minutes before posting again.");
        var post = new Post { AuthorPersonId = actorId, TopicCode = input.Category,
            Body = body, Status = "Draft", CreatedAtUtc = now };
        db.Set<Post>().Add(post);
        await db.SaveChangesAsync(ct);
        await SaveSubmission(actorId, "community.Post", post.Id, input.RequestId, ct);
        await transaction.CommitAsync(ct);
        return StatusCode(StatusCodes.Status201Created, new { id = post.PublicId, status = post.Status });
    }

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpPatch("posts/{id:guid}")]
    public async Task<IActionResult> EditPost(Guid id, [FromBody] NewPost input, CancellationToken ct)
    {
        if (await ActorId(ct) is not { } actorId) return Unauthorized();
        if (PostBody(input) is not { } body) return BadRequest(PostInputError);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var post = await LockPost(id, ct);
        if (post is null || post.AuthorPersonId != actorId) return NotFound();
        if (post.Status is not ("Draft" or "Published")) return Conflict("This post can no longer be edited.");
        if (post.Body == body && post.TopicCode == input.Category) return NoContent();
        Audit(actorId, "Member", "community.Post", post.Id, "Edit", post.Status, "Draft", null,
            JsonSerializer.Serialize(new { previousCategory = post.TopicCode, previousBody = post.Body,
                category = input.Category, body }));
        post.Body = body;
        post.TopicCode = input.Category;
        post.Status = "Draft";
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return NoContent();
    }

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpDelete("posts/{id:guid}")]
    public async Task<IActionResult> DeletePost(Guid id, CancellationToken ct)
    {
        if (await ActorId(ct) is not { } actorId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var post = await LockPost(id, ct);
        if (post is null || post.AuthorPersonId != actorId) return NotFound();
        if (post.Status == "Removed") return NoContent();
        Audit(actorId, "Member", "community.Post", post.Id, "Withdraw", post.Status, "Removed", null);
        post.Status = "Removed";
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return NoContent();
    }

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpGet("posts/{id:guid}/comments")]
    public async Task<IActionResult> Comments(Guid id, [FromQuery] long after = 0,
        [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        if (await ActorId(ct) is not { } actorId) return Unauthorized();
        limit = Math.Clamp(limit, 1, 100);
        var post = await db.Set<Post>().AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == id, ct);
        if (post is null || post.Status != "Published") return NotFound();
        var comments = await db.Set<Comment>().AsNoTracking()
            .Where(item => item.PostId == post.Id && item.Status == "Published" && item.Id > after)
            .OrderBy(item => item.Id).Take(limit + 1).ToArrayAsync(ct);
        var authorIds = comments.Select(item => item.AuthorPersonId).Distinct().ToArray();
        var authors = await Names(authorIds, ct);
        return Ok(new { comments = comments.Take(limit).Select(item => CommentView(item, authors[item.AuthorPersonId], actorId)),
            next = comments.Length > limit ? (long?)comments[limit - 1].Id : null });
    }

    public sealed record NewComment(string? Body, Guid? RequestId = null);

    private static object CommentView(Comment item, string author, long actorId) => new
    {
        id = item.Id, body = item.Body, author, createdAt = Utc(item.CreatedAtUtc), own = item.AuthorPersonId == actorId
    };

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpPost("posts/{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] NewComment input, CancellationToken ct)
    {
        if (await ActorId(ct) is not { } actorId) return Unauthorized();
        var body = input.Body?.Trim();
        if (string.IsNullOrWhiteSpace(body) || body.Length > 2000) return BadRequest("Comment must be 1–2000 characters.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var actor = await LockActor(actorId, ct);
        var post = await LockPost(id, ct);
        if (post is null || post.Status != "Published") return NotFound();
        if (await Submission(actorId, "community.Comment", input.RequestId, ct) is { } existing &&
            await db.Set<Comment>().FindAsync([existing], ct) is { } previous)
            return previous.PostId == post.Id && previous.Body == body && previous.Status == "Published"
                ? Ok(CommentView(previous, actor.DisplayName, actorId)) : Conflict("This request was already used.");
        var now = Now;
        if (await db.Set<Comment>().CountAsync(item => item.AuthorPersonId == actorId && item.CreatedAtUtc > now.AddMinutes(-10), ct) >= 5)
            return StatusCode(StatusCodes.Status429TooManyRequests, "Please wait before commenting again.");
        var comment = new Comment { PostId = post.Id, AuthorPersonId = actorId,
            Body = body, Status = "Published", CreatedAtUtc = now };
        db.Set<Comment>().Add(comment);
        await db.SaveChangesAsync(ct);
        await SaveSubmission(actorId, "community.Comment", comment.Id, input.RequestId, ct);
        await transaction.CommitAsync(ct);
        return Ok(CommentView(comment, actor.DisplayName, actorId));
    }

    private Task<long?> Submission(long actorId, string kind, Guid? requestId, CancellationToken ct)
    {
        if (requestId is null) return Task.FromResult<long?>(null);
        var detail = SubmissionDetail(requestId.Value);
        return db.Set<AuditEvent>().Where(item => item.ActorPersonId == actorId && item.Action == "Submit" &&
            item.ResourceKind == kind && item.DetailJson == detail).Select(item => (long?)item.ResourceId).FirstOrDefaultAsync(ct);
    }

    private static string SubmissionDetail(Guid requestId) => JsonSerializer.Serialize(new { requestId });

    private async Task SaveSubmission(long actorId, string kind, long id, Guid? requestId, CancellationToken ct)
    {
        if (requestId is null) return;
        Audit(actorId, "Member", kind, id, "Submit", null, null, null, SubmissionDetail(requestId.Value));
        await db.SaveChangesAsync(ct);
    }

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpPut("posts/{id:guid}/interactions/{kind}")]
    public async Task<IActionResult> AddInteraction(Guid id, string kind, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (kind is not ("like" or "bookmark")) return BadRequest("Unknown interaction.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var post = await LockPost(id, ct);
        if (post is null || post.Status != "Published") return NotFound();
        var dbKind = kind == "like" ? "Reaction" : "Bookmark";
        var code = kind == "like" ? "Like" : null;
        if (await db.Set<PostInteraction>().AnyAsync(item => item.PostId == post.Id && item.PersonId == actorId
            && item.Kind == dbKind && item.ReactionCode == code, ct)) return NoContent();
        db.Set<PostInteraction>().Add(new PostInteraction { PostId = post.Id, PersonId = actorId.Value,
            Kind = dbKind, ReactionCode = code, CreatedAtUtc = Now });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && sql.Number is 2601 or 2627)
        { return NoContent(); }
        await transaction.CommitAsync(ct);
        return NoContent();
    }

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpDelete("posts/{id:guid}/interactions/{kind}")]
    public async Task<IActionResult> RemoveInteraction(Guid id, string kind, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (kind is not ("like" or "bookmark")) return BadRequest("Unknown interaction.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var post = await LockPost(id, ct);
        if (post is null || post.Status != "Published") return NotFound();
        var dbKind = kind == "like" ? "Reaction" : "Bookmark";
        var code = kind == "like" ? "Like" : null;
        await db.Set<PostInteraction>().Where(item => item.PostId == post.Id && item.PersonId == actorId
            && item.Kind == dbKind && item.ReactionCode == code).ExecuteDeleteAsync(ct);
        await transaction.CommitAsync(ct);
        return NoContent();
    }

    public sealed record NewReport(string? Reason, string? Details);

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpPost("posts/{id:guid}/reports")]
    public async Task<IActionResult> ReportPost(Guid id, [FromBody] NewReport input, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (input.Reason is null || !Reasons.Contains(input.Reason) || input.Details?.Length > 1000)
            return BadRequest("Choose a valid reason and keep details under 1000 characters.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var post = await LockPost(id, ct);
        if (post is null || post.Status != "Published") return NotFound();
        if (post.AuthorPersonId == actorId) return BadRequest("You cannot report your own post.");
        if (await db.Set<ContentReport>().AnyAsync(item => item.PostId == post.Id && item.ReporterPersonId == actorId
            && item.Status != "Resolved", ct)) return Conflict("You already have an open report for this post.");
        db.Set<ContentReport>().Add(new ContentReport { PostId = post.Id, ReporterPersonId = actorId.Value,
            ReasonCode = input.Reason, Details = input.Details?.Trim(), Status = "Submitted", CreatedAtUtc = Now });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && sql.Number is 2601 or 2627)
        { return Conflict("You already have an open report for this post."); }
        await transaction.CommitAsync(ct);
        return Accepted();
    }

    [Authorize(Policy = PersonalRecords.IndividualPolicy)]
    [HttpPost("comments/{id:long}/reports")]
    public async Task<IActionResult> ReportComment(long id, [FromBody] NewReport input, CancellationToken ct)
    {
        var actorId = await ActorId(ct);
        if (actorId is null) return Unauthorized();
        if (input.Reason is null || !Reasons.Contains(input.Reason) || input.Details?.Length > 1000)
            return BadRequest("Choose a valid reason and keep details under 1000 characters.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var postId = await (from target in db.Set<Comment>() join post in db.Set<Post>() on target.PostId equals post.Id
            where target.Id == id select (Guid?)post.PublicId).SingleOrDefaultAsync(ct);
        if (postId is null || (await LockPost(postId.Value, ct))?.Status != "Published") return NotFound();
        var comment = await LockComment(id, ct);
        if (comment is null || comment.Status != "Published")
            return NotFound();
        if (comment.AuthorPersonId == actorId) return BadRequest("You cannot report your own comment.");
        if (await db.Set<ContentReport>().AnyAsync(item => item.CommentId == id && item.ReporterPersonId == actorId
            && item.Status != "Resolved", ct)) return Conflict("You already have an open report for this comment.");
        db.Set<ContentReport>().Add(new ContentReport { CommentId = id, ReporterPersonId = actorId.Value,
            ReasonCode = input.Reason, Details = input.Details?.Trim(), Status = "Submitted", CreatedAtUtc = Now });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql && sql.Number is 2601 or 2627)
        { return Conflict("You already have an open report for this comment."); }
        await transaction.CommitAsync(ct);
        return Accepted();
    }
}
