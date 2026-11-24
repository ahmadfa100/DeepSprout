# Community server API — 11 November 2026

The ASP.NET Core Community API at `/api/community` uses the approved v5 `community.Post`, `Comment`, `PostInteraction`, and `ContentReport` tables. It uses the authenticated Identity user's `PersonId`; client-supplied person IDs are ignored. All endpoints require authentication. Unsafe methods require the antiforgery token returned by `GET /account/session` in the `RequestVerificationToken` header. Anonymous API requests return HTTP 401.

| Endpoint | Purpose |
|---|---|
| `GET /posts` | Published feed by default, newest first. Supports `category`, `search`, and `mine=true` for the caller's own posts in all states. Use the returned `next.before` and `next.beforeId` to continue. Maximum 50 per request. |
| `GET /posts/{publicId}` | Read a published post or one of the caller's own posts. Includes like and bookmark state for the current caller. |
| `POST /posts` | Body `{category,title,message,requestId?}`. Creates a `Draft` for Admin approval. Two-minute per-author cooldown. Supply a UUID request ID for safe retries. |
| `PATCH, DELETE /posts/{publicId}` | Owner-only. An edit to a draft or published post sends it to the approval queue and preserves the previous text in the audit. Withdrawal retains the post in `Removed` state. |
| `GET, POST /posts/{publicId}/comments` | Read (`after`, `limit`) or add (`body`, optional UUID `requestId`) comments on a published post. Five comments per ten minutes per author. |
| `PUT, DELETE /posts/{publicId}/interactions/like\|bookmark` | Idempotent personal reaction or bookmark. |
| `POST /posts/{publicId}/reports` | Report a published post with `{reason,details}`. At most one open report per reporter and post. |
| `POST /comments/{id}/reports` | Report a published comment under a published post. |
| `GET /moderation` | Platform Admin's draft and open-report queue by default. The console uses `view=posts\|reports\|live\|removed` and `page`. |
| `GET /moderation/posts/{publicId}`, `/moderation/reports/{id}`, `/moderation/history` | Admin-only content, report details and decision history. |
| `PATCH /moderation/posts/{publicId}` | Platform Admin decision `{status,reason,reportId?,expectedRevision?}`. The console sends the reviewed revision to detect intervening edits. Drafts may be published or removed, published posts may be hidden or removed, and hidden posts may be restored or removed. `Unchanged` dismisses an open report. Every decision writes an `ops.AuditEvent`. |
| `PATCH /moderation/comments/{id}` | The same moderation decision for a comment. |

The server stores a post's title and message in the existing `Post.Body` as `title + "\n\n" + message`; the API returns them separately. The title rejects line breaks. The `TopicCode` categories are `progress`, `tips`, `questions`, and `wins`. Only a Platform Admin can moderate. Reports use the five reasons offered by the member composer.

Signed-in Members use the SQL feed and My posts tab. The primary Platform Admin console (`admin.html#/community`) uses the same SQL records. Local sample posts and the legacy Admin demo stay separate from the live feed. The two-person quiz remains browser-local pending the [schema proposal](../architecture/community-quiz-backend-proposal.md).

**Current verification:** the [disposable V5 integration suite](../../tests/onboarding-integration.test.mjs) covers owner edit and withdrawal, private drafts and pagination, duplicate writes, comments, reactions, moderation state transitions, audit, and the Member/Admin browser workflow. Its quiz-room check uses browser-local data. The original 11 November API-only milestone predates this UI integration.
