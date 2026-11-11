/**
 * Live quiz competitions. A Representative creates rounds for the
 * Institution (linked to one of its Initiatives or open to all verified
 * participants); an active Initiative Supervisor creates rounds inside an
 * Initiative they are assigned to. Players join, then answer each question
 * while it is open. The command clock decides timing and points, never the
 * screen.
 */
import {id, now, nowMs, requireThat, find, notify} from '../domain.js';
import {isActiveSupervisor, representativeOrg} from '../initiative-rules.js';
import {participationGuard} from './institution.js';
import {isQuiz, normalizeQuiz, quizPhase, quizPoints} from '../competition-rules.js';
import {demoRound} from '../data/quiz-demo.js';

const localDemo = () => typeof location === 'undefined' || location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

const memberLink = competitionId => `src/pages/member/explore/explore.html#competition=${competitionId}`;
const ENDED = ['Cancelled', 'Archived', 'Completed'];

/** Who may manage this round: the owning Representative, or an active Supervisor of its Initiative. */
function canManage(s, c, actor, role) {
  if (role === 'supervisor') return Boolean(c.initiativeId) && isActiveSupervisor(s, c.initiativeId, actor);
  return representativeOrg(s, actor)?.id === c.ownerId;
}

function save(s, p, actor, role) {
  const old = p.id ? find(s.competitions, p.id) : null;
  if (old) {
    requireThat(isQuiz(old), 'Written-entry competitions from the earlier format cannot be edited as a quiz.');
    requireThat(canManage(s, old, actor, role), 'You cannot edit this competition.');
    requireThat(old.status !== 'Cancelled', 'This competition was cancelled.');
    requireThat(old.status === 'Draft' || nowMs(s) < Date.parse(old.startAt), 'This competition has already started, so it can no longer be edited.');
  }
  // A round always belongs to one Initiative: forms.Form requires an owner (CK_Form_Owner).
  requireThat(p.initiativeId, role === 'supervisor' ? 'Choose one of your assigned initiatives.' : 'Choose the initiative this competition belongs to.');
  const initiative = find(s.initiatives, p.initiativeId);
  let ownerId;
  if (role === 'supervisor') {
    requireThat(initiative, 'Choose one of your assigned initiatives.');
    requireThat(isActiveSupervisor(s, initiative.id, actor), 'You are not an active Supervisor of this initiative.');
    ownerId = initiative.ownerId;
  } else {
    const org = representativeOrg(s, actor);
    requireThat(org, 'Only the Institution Representative can create this competition.');
    requireThat(initiative.ownerId === org.id, 'This initiative belongs to another Institution.');
    ownerId = org.id;
  }
  requireThat(!ENDED.includes(initiative.status), 'This initiative is not running.');
  const quiz = normalizeQuiz(p);
  const status = p.status === 'Draft' ? 'Draft' : 'Published';
  if (status === 'Published') requireThat(Date.parse(quiz.startAt) > nowMs(s) + 30000, 'Choose a start time at least one minute from now.');
  const record = {...quiz, format: 'Quiz', topic: 'Live quiz', initiativeId: initiative.id, ownerId, status, updated: now()};
  let target;
  if (old) {
    const changed = JSON.stringify(old.questions) !== JSON.stringify(record.questions) || old.startAt !== record.startAt;
    Object.assign(old, record, {version: changed ? (old.version || 1) + 1 : (old.version || 1)});
    target = old;
  } else {
    target = {...record, id: id('competition'), version: 1, createdBy: actor, createdRole: role === 'supervisor' ? 'Supervisor' : 'Representative', created: now()};
    s.competitions.push(target);
  }
  if (status === 'Published' && !target.announced) {
    const players = (s.admissions || []).filter(a => a.initiativeId === initiative.id && a.status === 'Accepted').map(a => a.personId);
    for (const pid of new Set(players)) notify(s, pid, `New live quiz “${target.title}” in ${initiative.title}. Join the room before it starts.`, memberLink(target.id), 'competition');
    target.announced = now();
  }
  return target.id;
}

function cancel(s, p, actor, role) {
  const c = find(s.competitions, p.id);
  requireThat(isQuiz(c) && canManage(s, c, actor, role), 'You cannot cancel this competition.');
  requireThat(c.status !== 'Cancelled', 'This competition is already cancelled.');
  requireThat(quizPhase(c, nowMs(s)).phase !== 'podium', 'This competition has finished; its results stay available.');
  c.status = 'Cancelled'; c.cancelled = now(); c.cancelledBy = actor;
  for (const e of s.entries.filter(x => x.competitionId === c.id && !x.demo)) notify(s, e.personId, `“${c.title}” was cancelled by the organizer.`, memberLink(c.id), 'competition');
  return c.id;
}

/** A verified participant takes a seat. Late joiners can still play the remaining questions. */
export function joinQuiz(s, p, actor) {
  const c = find(s.competitions, p.competitionId);
  requireThat(isQuiz(c), 'This competition takes written entries, not live answers.');
  participationGuard(s, c, actor, p, 'competition');
  requireThat(c.status === 'Published', 'This competition is not open.');
  requireThat(quizPhase(c, nowMs(s)).phase !== 'podium', 'This competition has finished.');
  requireThat(!s.entries.some(e => e.competitionId === c.id && e.personId === actor), 'You already joined this competition.');
  const entry = {id: id('entry'), competitionId: c.id, version: c.version || 1, consent: {version: c.version || 1, at: now()}, personId: actor, status: 'Joined', created: now(), answers: {}};
  s.entries.push(entry);
  return entry.id;
}

/** One answer per open question. Points come from the command clock. */
export function answerQuiz(s, p, actor) {
  const c = find(s.competitions, p.competitionId);
  requireThat(isQuiz(c) && c.status === 'Published', 'This competition is not open.');
  const entry = s.entries.find(e => e.competitionId === c.id && e.personId === actor);
  requireThat(entry, 'Join the competition first.');
  const t = nowMs(s), phase = quizPhase(c, t), index = Number(p.question);
  requireThat(phase.phase === 'answer' && phase.index === index, 'This question is closed.');
  requireThat(!(index in (entry.answers ||= {})), 'You already answered this question.');
  const q = c.questions[index], choice = Number(p.choice);
  requireThat(Number.isInteger(choice) && choice >= 0 && choice < q.options.length, 'Choose one of the answers.');
  const ms = Math.max(0, t - phase.openAt), correct = choice === q.answer;
  entry.answers[index] = {choice, ms, correct, points: quizPoints(correct, ms, q.seconds * 1000), at: now()};
  entry.status = Object.keys(entry.answers).length === c.questions.length ? 'Completed' : 'Playing';
  return {question: index, locked: true};
}

/** Local demo only: a practice round that starts in about a minute, against demo players who join and answer live. */
function demo(s, p, actor, role) {
  requireThat(localDemo(), 'Demo rounds are available only in the local demo.');
  const initiative = find(s.initiatives, p.initiativeId);
  requireThat(!ENDED.includes(initiative.status), 'This initiative is not running.');
  if (role === 'supervisor') requireThat(isActiveSupervisor(s, initiative.id, actor), 'You are not an active Supervisor of this initiative.');
  else requireThat(representativeOrg(s, actor)?.id === initiative.ownerId, 'This initiative belongs to another Institution.');
  const startAt = Math.ceil((nowMs(s) + 75000) / 15000) * 15000;
  const {competition, entries} = demoRound(s, {id: id('competition'), title: 'Practice Round vs. Demo Players', ownerId: initiative.ownerId, initiativeId: initiative.id, createdBy: actor, role: role === 'supervisor' ? 'Supervisor' : 'Representative', startAt});
  s.competitions.push(competition); s.entries.push(...entries);
  return competition.id;
}

export function competitionCommand(s, action, p, actor) {
  if (action === 'organization.quiz.demo') return demo(s, p, actor, 'organization');
  if (action === 'supervisor.quiz.demo') return demo(s, p, actor, 'supervisor');
  if (action === 'organization.quiz.save') return save(s, p, actor, 'organization');
  if (action === 'supervisor.quiz.save') return save(s, p, actor, 'supervisor');
  if (action === 'organization.quiz.cancel') return cancel(s, p, actor, 'organization');
  if (action === 'supervisor.quiz.cancel') return cancel(s, p, actor, 'supervisor');
  if (action === 'member.quiz.join' || action === 'participant.quiz.join') return joinQuiz(s, p, actor);
  if (action === 'member.quiz.answer' || action === 'participant.quiz.answer') return answerQuiz(s, p, actor);
  return false;
}
