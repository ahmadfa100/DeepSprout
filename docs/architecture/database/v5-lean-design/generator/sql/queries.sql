
-- PART 4 ---------------------------------------------------------------------------------------------
/*=====================================================================================================
  DEMONSTRATION QUERIES
  Read-only SELECTs for the presentation. Run each block on its own (highlight, F5).
  Roles are not stored in a "roles" table: a person's capacity comes from the row that links them to something.
=====================================================================================================*/

-- Q1. All people and the roles they hold ------------------------------------------------------------
SELECT p.Id, p.DisplayName, p.NormalizedEmail,
       CONCAT_WS(N', ',
         p.PlatformRole,
         CASE WHEN p.IndividualEnabledAtUtc IS NOT NULL THEN N'Individual' END,
         (SELECT STRING_AGG(r, N', ') FROM (
              SELECT DISTINCT N'Representative of ' + o.Name AS r FROM org.OrganizationMember m JOIN org.Organization o ON o.Id = m.OrganizationId WHERE m.PersonId = p.Id AND m.Status = N'Active'
              UNION SELECT DISTINCT N'Coach (verified)' FROM org.VerificationCase v WHERE v.ApplicantPersonId = p.Id AND v.Kind = N'Coach' AND v.Status = N'Approved'
              UNION SELECT DISTINCT sa.Role + N' (' + CASE WHEN sa.InitiativeId IS NOT NULL THEN N'initiative' ELSE N'experience' END + N')' FROM org.StaffAppointment sa WHERE sa.PersonId = p.Id AND sa.Status = N'Active'
              UNION SELECT DISTINCT N'Participant (' + a.Status + N')' FROM institution.InitiativeApplication a WHERE a.PersonId = p.Id AND a.Status IN (N'Accepted', N'Suspended', N'Offered', N'Queued', N'Pending')
          ) x)) AS Roles
FROM iam.Person p
ORDER BY p.Id;

-- Q2. Organizations and their representatives, with verification state ------------------------------------
SELECT o.Name, o.Kind, o.Status AS OrgStatus, p.DisplayName AS Representative, m.Status AS MembershipStatus,
       v.Status AS VerificationStatus, adm.DisplayName AS VerifiedBy
FROM org.Organization o
LEFT JOIN org.OrganizationMember m ON m.OrganizationId = o.Id
LEFT JOIN iam.Person p ON p.Id = m.PersonId
LEFT JOIN org.VerificationCase v ON v.OrganizationId = o.Id
LEFT JOIN iam.Person adm ON adm.Id = v.DecidedByPersonId;

-- Q3. Initiatives and their CURRENT published terms (root -> current revision) -------------------------------
SELECT i.Id AS InitiativeId, org.Name AS Institution, i.Status, r.RevisionNo, r.Title, r.OperatingMode, r.ParticipationMode,
       r.Capacity, r.WaitlistEnabled, r.StartsAtUtc, r.EndsAtUtc, r.CostKind
FROM institution.Initiative i
JOIN institution.InitiativeRevision r ON r.Id = i.CurrentRevisionId
JOIN org.Organization org ON org.Id = i.InstitutionId;

-- Q4. Applications by status: participants, waitlist, pending, history (attempts) ----------------------------
SELECT r.Title AS Initiative, p.DisplayName, a.AttemptNo, a.Status, a.ParticipationMode,
       a.AcceptedAtUtc, a.WithdrawalCutoffAtUtc, a.EndReason
FROM institution.InitiativeApplication a
JOIN institution.Initiative i ON i.Id = a.InitiativeId
JOIN institution.InitiativeRevision r ON r.Id = i.CurrentRevisionId
JOIN iam.Person p ON p.Id = a.PersonId
ORDER BY CASE a.Status WHEN N'Accepted' THEN 1 WHEN N'Suspended' THEN 2 WHEN N'Offered' THEN 3 WHEN N'Queued' THEN 4 WHEN N'Pending' THEN 5 ELSE 6 END, p.DisplayName, a.AttemptNo;

-- Q5. Remaining seats (seats in use = Offered + Accepted + Suspended; Pending/Queued hold no seat) -----------
SELECT r.Title, r.Capacity,
       SUM(CASE WHEN a.Status IN (N'Offered', N'Accepted', N'Suspended') THEN 1 ELSE 0 END) AS SeatsInUse,
       r.Capacity - SUM(CASE WHEN a.Status IN (N'Offered', N'Accepted', N'Suspended') THEN 1 ELSE 0 END) AS SeatsRemaining,
       SUM(CASE WHEN a.Status = N'Queued' THEN 1 ELSE 0 END) AS OnWaitlist
FROM institution.Initiative i
JOIN institution.InitiativeRevision r ON r.Id = i.CurrentRevisionId
LEFT JOIN institution.InitiativeApplication a ON a.InitiativeId = i.Id
GROUP BY r.Title, r.Capacity;

-- Q6. Operational groups with coach and members (including pending approval and open invitations) ------------
SELECT g.Name AS GroupName, CASE WHEN g.InitiativeId IS NOT NULL THEN N'Initiative group' ELSE N'Program group' END AS GroupKind,
       coach.DisplayName AS Coach, g.Capacity, g.RequiresApproval,
       COALESCE(mp.DisplayName, gm.NormalizedEmail + N' (not registered)') AS MemberOrInvitee, gm.Status AS MembershipStatus
FROM coach.OperationalGroup g
LEFT JOIN iam.Person coach ON coach.Id = g.CoachPersonId
LEFT JOIN coach.GroupMembership gm ON gm.GroupId = g.Id
LEFT JOIN iam.Person mp ON mp.Id = gm.PersonId
ORDER BY g.Id, gm.Status, MemberOrInvitee;

-- Q7. Sessions with attendance (registration -> attendance, supervisors on duty) ---------------------------
SELECT s.Title, s.Mode, s.Status AS SessionStatus, s.StartsAtUtc,
       p.DisplayName AS Person, at.Status AS Attendance, rec.DisplayName AS RecordedBy,
       CASE WHEN ex.Id IS NOT NULL THEN CONCAT(N'Excuse: ', ex.Status) END AS Excuse
FROM session.Session s
LEFT JOIN session.Attendance at ON at.SessionId = s.Id
LEFT JOIN iam.Person p ON p.Id = at.PersonId
LEFT JOIN iam.Person rec ON rec.Id = at.RecordedByPersonId
LEFT JOIN session.AbsenceExcuse ex ON ex.AttendanceId = at.Id
ORDER BY s.StartsAtUtc, p.DisplayName;

-- Q8. Assignments, submissions and reviews (the coach's PrivateNote is never shown to students) -------------
SELECT a.Title AS Assignment, g.Name AS GroupName, st.DisplayName AS Student, rc.Status AS RecipientStatus,
       sa.AttemptNo, sa.SubmittedAtUtc, rd.Decision, rv.DisplayName AS Reviewer, rd.Feedback
FROM task.Assignment a
JOIN coach.OperationalGroup g ON g.Id = a.GroupId
JOIN task.AssignmentRecipient rc ON rc.AssignmentId = a.Id
JOIN iam.Person st ON st.Id = rc.PersonId
LEFT JOIN task.SubmissionAttempt sa ON sa.RecipientId = rc.Id
LEFT JOIN task.ReviewDecision rd ON rd.AttemptId = sa.Id
LEFT JOIN iam.Person rv ON rv.Id = rd.ReviewerPersonId
ORDER BY st.DisplayName, sa.AttemptNo;

-- Q9. Lab attempts and results -------------------------------------------------------------------------
SELECT p.DisplayName, at.InstrumentCode, at.Kind, at.Status, at.WindowKey, at.PrimaryScore, at.ScoringVersion, at.FinishedAtUtc
FROM lab.AssessmentAttempt at
JOIN iam.Person p ON p.Id = at.PersonId
ORDER BY at.Kind, at.InstrumentCode;

-- Q10. Practice, recovery plan and offline routine activity -------------------------------------------------
SELECT N'Practice' AS Activity, d.Title + N' v' + CAST(v.VersionNo AS nvarchar(10)) AS Item, pa.Status, CAST(pa.ScoreValue AS nvarchar(20)) AS Detail, pa.StartedAtUtc AS AtUtc, p.DisplayName
FROM activity.PracticeAttempt pa
JOIN activity.PracticeVersion v ON v.Id = pa.PracticeVersionId
JOIN activity.PracticeDefinition d ON d.Id = v.DefinitionId
JOIN iam.Person p ON p.Id = pa.PersonId
UNION ALL
SELECT N'Routine check-in', r.Title, c.State, NULL, c.RecordedAtUtc, p.DisplayName
FROM activity.RoutineCheckIn c JOIN activity.OfflineRoutine r ON r.Id = c.RoutineId JOIN iam.Person p ON p.Id = c.PersonId
UNION ALL
SELECT N'Plan action', sa.ActionKind, sa.Status, CONCAT(N'plan revision ', pr.RevisionNo), CAST(sa.LocalDate AS datetime2(3)), p.DisplayName
FROM recovery.ScheduledAction sa JOIN recovery.PlanRevision pr ON pr.Id = sa.PlanRevisionId JOIN iam.Person p ON p.Id = sa.PersonId
UNION ALL
SELECT N'Digital Shield', CONCAT(N'usage on ', bu.LocalDate), N'ObservedMinutes', CAST(bu.ObservedSeconds / 60 AS nvarchar(20)), bu.ReceivedAtUtc, p.DisplayName
FROM shield.BrowserUsagePeriod bu JOIN iam.Person p ON p.Id = bu.PersonId
ORDER BY AtUtc;

-- Q10b. Digital Shield usage per site family, read from DomainsJson ----------------------------------------
SELECT bu.LocalDate, d.[d] AS SiteFamily, d.[s] AS Seconds
FROM shield.BrowserUsagePeriod bu
CROSS APPLY OPENJSON(bu.DomainsJson) WITH ([d] nvarchar(40) '$.d', [s] int '$.s') d
ORDER BY bu.LocalDate, d.[s] DESC;

-- Q11. Provider experiences, remaining seats, cohorts and bookings -----------------------------------------
SELECT r.Title, e.Status, r.Capacity,
       SUM(CASE WHEN b.Status IN (N'Offered', N'Confirmed') THEN 1 ELSE 0 END) AS SeatsInUse,
       r.Capacity - SUM(CASE WHEN b.Status IN (N'Offered', N'Confirmed') THEN 1 ELSE 0 END) AS SeatsRemaining,
       p.DisplayName AS Booker, b.Status AS BookingStatus, c.Name AS Cohort, sup.DisplayName AS CohortSupervisor
FROM provider.Experience e
JOIN provider.ExperienceRevision r ON r.Id = e.CurrentRevisionId
LEFT JOIN provider.ExperienceBooking b ON b.ExperienceId = e.Id
LEFT JOIN iam.Person p ON p.Id = b.PersonId
LEFT JOIN provider.ProviderCohort c ON c.Id = b.CohortId
LEFT JOIN org.StaffAppointment sa ON sa.Id = c.SupervisorAppointmentId
LEFT JOIN iam.Person sup ON sup.Id = sa.PersonId
GROUP BY r.Title, e.Status, r.Capacity, p.DisplayName, b.Status, c.Name, sup.DisplayName;

-- Q12. Notifications, outbox (one event, many recipients) and audit history ----------------------------------
SELECT n.Id AS NotificationId, p.DisplayName AS Recipient, n.TemplateCode, n.Status AS NotificationStatus, ob.Channel, ob.Status AS EmailStatus
FROM ops.Notification n
JOIN iam.Person p ON p.Id = n.RecipientPersonId
LEFT JOIN ops.OutboxMessage ob ON ob.EventPublicId = n.EventPublicId AND ob.DedupKey = CONCAT(n.RecipientPersonId, N':', n.TemplateCode)
ORDER BY n.Id;

SELECT ae.AtUtc, ae.ResourceKind, ae.ResourceId, ae.Action, ae.BeforeStatus, ae.AfterStatus, actor.DisplayName AS Actor, ae.ActorCapacity, ae.Reason
FROM ops.AuditEvent ae
LEFT JOIN iam.Person actor ON actor.Id = ae.ActorPersonId
ORDER BY ae.AtUtc;

-- Bonus Q13. Schema summary by module (tables, columns) for the presentation ------------------------------------
SELECT s.name AS [Schema], COUNT(DISTINCT t.object_id) AS Tables, COUNT(c.column_id) AS Columns
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id JOIN sys.columns c ON c.object_id = t.object_id
WHERE t.is_ms_shipped = 0
GROUP BY s.name ORDER BY s.name;
GO
