/**
 * Read model for one live quiz round, as seen by a player or the host
 * screen. The correct answer is only included once it has been revealed.
 */
import {isQuiz, quizPhase, quizSchedule, quizStandings, revealedThrough, quizStatus} from '../workspaces/competition-rules.js';
import {participationGuard} from '../workspaces/commands/institution.js';

const nameOf = (s, pid) => s.people.find(p => p.id === pid)?.name || 'Player';

/** Why this person cannot join right now, or '' when they can. */
export function quizJoinBlocker(s, c, personId, now) {
  if (!personId) return 'Sign in to join this competition.';
  if (c.status !== 'Published') return 'This competition is not open.';
  if (quizPhase(c, now).phase === 'podium') return 'This competition has finished.';
  try { participationGuard(s, c, personId, {consent: true}, 'competition'); return ''; }
  catch (error) { return error.message; }
}

export function quizView(s, competitionId, personId, now) {
  const c = (s.competitions || []).find(x => x.id === competitionId);
  if (!c || !isQuiz(c)) return null;
  const phase = quizPhase(c, now);
  const plan = quizSchedule(c);
  const entries = (s.entries || []).filter(e => e.competitionId === c.id);
  const names = pid => nameOf(s, pid);
  const through = revealedThrough(c, phase);
  const mine = personId ? entries.find(e => e.personId === personId) || null : null;
  const index = phase.index ?? -1;
  const q = index >= 0 ? c.questions[index] : null;
  const revealed = q && (phase.phase === 'reveal' || phase.phase === 'scores');
  const distribution = revealed ? q.options.map((_, choice) => entries.filter(e => e.answers?.[index]?.choice === choice).length) : null;
  const initiative = c.initiativeId ? s.initiatives.find(i => i.id === c.initiativeId) : null;
  const organizer = (s.organizations || []).find(o => o.id === c.ownerId)?.name || 'Institution';
  const standings = quizStandings(c, entries, names, through);
  return {
    id: c.id, title: c.title, description: c.description || '', status: c.status, label: quizStatus(c, now), version: c.version || 1,
    organizer, initiative: initiative ? {id: initiative.id, title: initiative.title} : null,
    createdBy: c.createdBy ? names(c.createdBy) : null, createdRole: c.createdRole || 'Representative',
    startAt: plan.start, endAt: plan.endAt, questionCount: c.questions.length,
    seconds: c.questions.map(x => x.seconds),
    phase,
    question: q ? {index, text: q.text, options: q.options, seconds: q.seconds, answer: revealed ? q.answer : null} : null,
    players: entries.map(e => ({id: e.personId, name: names(e.personId), joined: e.created})).sort((a, b) => String(a.joined).localeCompare(String(b.joined))),
    answeredCount: index >= 0 ? entries.filter(e => e.answers?.[index]).length : 0,
    distribution,
    standings,
    previous: through >= 0 ? quizStandings(c, entries, names, through - 1) : [],
    me: {
      personId: personId || null,
      name: personId ? names(personId) : null,
      joined: Boolean(mine),
      answers: mine ? mine.answers || {} : {},
      blocker: mine ? '' : quizJoinBlocker(s, c, personId, now)
    }
  };
}

/** Compact summary for lists (My Initiatives, workspace tables). */
export function quizSummary(s, c, personId, now) {
  const entries = (s.entries || []).filter(e => e.competitionId === c.id);
  const mine = personId ? entries.find(e => e.personId === personId) : null;
  const phase = quizPhase(c, now);
  const standings = phase.phase === 'podium' ? quizStandings(c, entries, pid => nameOf(s, pid), c.questions.length - 1) : [];
  return {
    id: c.id, format: 'Quiz', title: c.title, description: c.description || '', status: c.status, label: quizStatus(c, now), phase: phase.phase,
    startAt: c.startAt, questionCount: c.questions.length, players: entries.length,
    joined: Boolean(mine), canJoin: !mine && !quizJoinBlocker(s, c, personId, now),
    myRank: mine ? standings.find(r => r.personId === personId)?.rank || null : null,
    winner: standings[0] ? {name: standings[0].name, score: standings[0].score} : null
  };
}
