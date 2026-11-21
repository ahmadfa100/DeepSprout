# Community quiz rooms — backend proposal for owner review

**Status:** proposal, 11 November 2026. No schema or migration has been changed for quiz rooms. The approved database remains 58 application tables (v5-lean-2).

## Decision requested

Approve two new application tables, `community.QuizRoom` and `community.QuizParticipant`, for the current two-person scheduled quiz. This would change the application table count from 58 to 60. The existing `community.Post` and `forms.*` tables cannot represent a room with two reserved seats, per-player timed answers, and a shared result without storing unrelated facts in the wrong entities. The old Joint Goal tables stay retired.

## Data contract

| Table | Columns | Constraints and purpose |
|---|---|---|
| `community.QuizRoom` | `Id` bigint PK; `PublicId` uniqueidentifier unique; `CreatorPersonId` FK `iam.Person`; `Title` nvarchar(80); `StartsAtUtc` datetime2(3); `QuestionSetVersion` nvarchar(40); `Status` nvarchar(16) (`Open`, `Cancelled`, `Completed`); `CreatedAtUtc`; `CompletedAtUtc` nullable; `RowVersion` rowversion | Index `(Status, StartsAtUtc)` for room discovery. Start must be later than creation. The room is never a post and never affects Recovery, Lab, or Garden. |
| `community.QuizParticipant` | `Id` bigint PK; `RoomId` FK `QuizRoom`; `PersonId` FK `iam.Person`; `Seat` tinyint (`1`, `2`); `AnswersJson` nvarchar(max); `QuestionStartedAtUtc` nullable; `FinishedAtUtc` nullable; `RowVersion` rowversion | Unique `(RoomId, PersonId)` and `(RoomId, Seat)`. JSON is a versioned ordered array of `{questionIndex, choice, startedAtUtc, answeredAtUtc, points}`. The service validates order, timing, choices, and points. A participant can see only their own unsubmitted answers; after both finish, both can see scores. |

The creator occupies seat 1 in the same transaction as room creation. Joining claims seat 2 with a transaction and a uniqueness constraint, so concurrent joins cannot create a third player. The room stores the version of the five-question set; published question versions remain available until all rooms using them finish. Correct answers and scores are computed on the server; the current `challenge-board.js` answer key must move out of the client. Each question has a 15-second response window measured by server time. A timed-out question scores zero. A correct answer scores 1,000 plus up to 500 speed points, matching the current UI.

## Server behavior

- Authenticated Individual members can list scheduled/open rooms, create a future room, join an open seat, enter only at or after the scheduled time, submit one answer per question, and read their own progress and the shared result.
- `GET /api/community/quiz-rooms` is bounded and ordered. `POST /api/community/quiz-rooms`, `POST /{id}/join`, `POST /{id}/begin`, and `POST /{id}/answers` use the same cookie authentication and antiforgery protection as the Community API.
- SignalR broadcasts seat changes, start availability, and completion to the room group. A polling `GET /{id}` fallback keeps the feature usable if a live connection drops. Notifications remain opt-in and are separate from the quiz result.
- The service caps open rooms and creation frequency per person; it rejects self-join, a third seat, early play, duplicate or out-of-order answers, expired question windows, and client-provided points. Audit events cover cancellation and administrative intervention.
- The result remains a Community activity. It grants no Garden Growth, Journey Level, Recovery score, or Lab result.

## Implementation after approval

1. Change only `docs/architecture/database/v5-lean-design/generator/model.mjs` as the schema source, then regenerate the dictionary, SQL, and EF Core files with `build.mjs`, `emit-sql.mjs`, and `emit-efcore.mjs`.
2. Add a migration for `DeepSproutV5DbContext`. Verify it and the negative tests on a fresh disposable database. Do not migrate `DeepSprout_V5_Demo` or `DeepSprout_Validation` without a verified backup and the owner's go-ahead.
3. Implement the quiz service, API, SignalR hub, and browser client. Replace the current browser-local room store only after the server flow passes two-account and concurrent-join tests.

## Open product choices

- How long completed rooms and answer details remain visible and retained.
- Whether a creator can cancel a room after another person has joined.
- Whether anonymous display names are allowed in public room discovery; the current UI shows player names.
