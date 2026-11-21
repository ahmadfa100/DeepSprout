# Community server API — 11 November 2026

The ASP.NET Core Community API at `/api/community` uses the approved v5 `community.Post`, `Comment`, `PostInteraction`, and `ContentReport` tables. It uses the authenticated Identity user's `PersonId`; client-supplied person IDs are ignored. All endpoints require authentication. Unsafe methods require the antiforgery token returned by `GET /account/session` in the `RequestVerificationToken` header. Anonymous API requests return HTTP 401.

| Endpoint | Purpose |
|---|---|
| `GET /posts?category=&search=&before=&limit=` | Published posts only, newest first; maximum 50 per request. Returns author, interaction counts, and this person's like/bookmark state. |
| `POST /posts` | Body `{category,title,message}`. Creates a `Draft`; Admin approval publishes it. Two-minute per-author cooldown. |
| `GET, POST /posts/{publicId}/comments` | Read or add comments on a published post. Five comments per ten minutes per author. |
| `PUT, DELETE /posts/{publicId}/interactions/like|bookmark` | Idempotent personal reaction or bookmark. |
| `POST /posts/{publicId}/reports` | Report a published post with `{reason,details}`. At most one open report per reporter and post. |
| `POST /comments/{id}/reports` | Report a published comment under a published post. |
| `GET /moderation` | Platform Admin's draft and open-report queue. |
| `PATCH /moderation/posts/{publicId}` | Platform Admin decision `{status,reason,reportId?}`. Status is `Published`, `Hidden`, `Removed`, or `Unchanged` to dismiss a report. Writes an `ops.AuditEvent`. |
| `PATCH /moderation/comments/{id}` | The same moderation decision for a comment. |

The server stores a post's title and message in the existing `Post.Body` as `title + "\n\n" + message`; the API returns them separately. The title rejects line breaks. The `TopicCode` categories are `progress`, `tips`, `questions`, and `wins`. Only a Platform Admin can moderate. Reports use the five reasons offered by the member composer.

**Current integration boundary:** the existing Member and Admin Community pages still use browser-local stores and sample cards; they do not call this API. Their records are not silently copied into SQL Server. Connecting those pages requires an explicit migration/import decision for real member records and removal of sample people from the production feed. The two-person quiz remains browser-local pending the [schema proposal](../architecture/community-quiz-backend-proposal.md).

**Verification:** `dotnet build src/DeepSprout.Web/DeepSprout.Web.csproj --no-restore` and `tests/mvc-smoke.mjs` passed. A fresh uniquely named disposable SQL Server database was migrated and used to exercise registration, draft creation, Admin approval, published feed, like, and comment through HTTP; it was dropped afterward. The named development, demo, and historical databases were not migrated.
