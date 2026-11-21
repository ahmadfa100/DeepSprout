/**
 * Online meeting setup: the links and setup details that the session form
 * (Representative) and the meeting form (Supervisor) save.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {read, dispatch} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {meetingUrl, meetingPlatform, parseMeetingLink, cleanMeetingSetup, meetingDetail, sessionAccess} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/session-access.js';

const PIN = '2026-10-15T09:00:00+03:00';
const as = personId => dispatch('demo.signin', {personId});
const reset = personId => { dispatch('demo.reset'); dispatch('demo.clock', {at:PIN}); if (personId) as(personId); };
const err = fn => { try { fn(); return 'allowed'; } catch (e) { return e.message; } };
const base = {initiativeId:'i-today', title:'Focus clinic', speaker:'Maya', date:'2026-12-01', time:'10:00', endTime:'11:00', onlineCapacity:20, supervisorIds:['p-hala']};

test('Links · Google Meet, Zoom and Teams are accepted over HTTPS; other hosts are not', () => {
  assert.equal(meetingPlatform('https://meet.google.com/abc-defg-hij'), 'meet');
  assert.equal(meetingPlatform('https://school.zoom.us/j/81234567890?pwd=x'), 'zoom');
  assert.equal(meetingPlatform('https://teams.microsoft.com/meet/3123456789012?p=Ab12Cd'), 'teams');
  assert.equal(meetingPlatform('https://teams.live.com/meet/9876543210123'), 'teams');
  assert.equal(meetingUrl('http://zoom.us/j/123456789'), '', 'plain HTTP is refused');
  assert.equal(meetingUrl('https://zoom.us.evil.example/j/1'), '', 'look-alike hosts are refused');
  assert.equal(meetingUrl('https://example.com/meet'), '');
  assert.deepEqual(parseMeetingLink('https://zoom.us/j/81234567890?pwd=abc'), {platform:'zoom', meetingId:'812 3456 7890', passcode:'', passcodeInLink:true});
  assert.equal(parseMeetingLink('https://teams.microsoft.com/meet/3123456789012?p=Ab12Cd').passcode, 'Ab12Cd');
  assert.equal(parseMeetingLink('https://meet.google.com/abc-defg-hij').meetingId, 'abc-defg-hij');
});

test('Setup · only known fields are kept, and the platform always comes from the link', () => {
  const clean = cleanMeetingSetup(JSON.stringify({platform:'meet', source:'generated', meetingId:'812 3456 7890', passcode:'4KD9QX', hostEmail:'maya@demo.example', opensEarly:10, timezone:'Asia/Amman', settings:{lobby:true, record:0, hack:true}, script:'<x>'}), 'https://zoom.us/j/81234567890?pwd=abc');
  assert.equal(clean.platform, 'zoom', 'a mismatched platform claim is ignored');
  assert.deepEqual(clean.settings, {lobby:true, record:false});
  assert.equal(clean.script, undefined);
  assert.equal(cleanMeetingSetup({opensEarly:99}, 'https://meet.google.com/abc-defg-hij').opensEarly, 0, 'room-opening time is limited to the offered choices');
  assert.equal(cleanMeetingSetup('not json', 'https://meet.google.com/abc-defg-hij').source, 'existing');
  assert.equal(cleanMeetingSetup({}, 'https://example.com'), null);
  assert.equal(meetingDetail(clean, 'https://zoom.us/j/81234567890'), 'Zoom · ID 812 3456 7890 · Passcode 4KD9QX');
});

test('Representative · an online session saves its link and setup; students’ notices name the platform', () => {
  reset('p-maya');
  assert.match(err(() => dispatch('initiative.session.save', {...base, format:'Online', meeting:''})), /Set up the online meeting/);
  assert.match(err(() => dispatch('initiative.session.save', {...base, format:'Online', meeting:'https://example.com/room'})), /Set up the online meeting/);
  const url = 'https://teams.microsoft.com/meet/3123456789012?p=Ab12Cd';
  const id = dispatch('initiative.session.save', {...base, format:'Online', timezone:'Asia/Amman', meeting:url, meetingSetup:JSON.stringify({source:'generated', meetingId:'312 345 678 901 2', passcode:'Ab12Cd', hostEmail:'maya@demo.example', opensEarly:5, settings:{lobby:true, attendance:true}})});
  const ss = read().sessions.find(x => x.id === id);
  assert.equal(ss.meeting, url);
  assert.equal(ss.meetingSetup.platform, 'teams');
  assert.equal(ss.meetingSetup.opensEarly, 5);
  assert.match(sessionAccess(ss).detail, /^Microsoft Teams · ID 312 345 678 901 2 · Passcode Ab12Cd$/);
  dispatch('initiative.session.publish', {id});
  assert.equal(read().sessions.find(x => x.id === id).status, 'Published');
  // Switching to on-site drops the online details.
  dispatch('initiative.session.save', {...base, id, format:'In-person', venue:'Hall 2', address:'2 Demo Street, Amman', inPersonCapacity:10, reason:'Moved on-site'});
  const moved = read().sessions.find(x => x.id === id);
  assert.equal(moved.meeting, ''); assert.equal(moved.meetingSetup, null);
});

test('Supervisor · an online meeting needs a link; an in-person meeting keeps its room', () => {
  reset('p-hala');
  const meeting = {initiativeId:'i-today', title:'Coaches check-in', audience:'coaches', date:'2026-10-20', time:'11:00', minutes:'30'};
  assert.match(err(() => dispatch('initiative.supervisor.meeting', {...meeting, format:'Online'})), /Set up the online meeting/);
  const url = 'https://meet.google.com/abc-defg-hij';
  const id = dispatch('initiative.supervisor.meeting', {...meeting, format:'Online', meeting:url, meetingSetup:JSON.stringify({source:'existing', opensEarly:10}), place:'ignored for online'});
  const m = read().supervisorMeetings.find(x => x.id === id);
  assert.equal(m.meeting, url); assert.equal(m.meetingSetup.platform, 'meet'); assert.equal(m.place, '');
  assert.ok(read().notifications.some(n => n.text?.includes('Coaches check-in') && n.text.includes(url)), 'invited people get the join link');
  const room = dispatch('initiative.supervisor.meeting', {...meeting, format:'In-person', place:'Room 2', meeting:url});
  const r = read().supervisorMeetings.find(x => x.id === room);
  assert.equal(r.place, 'Room 2'); assert.equal(r.meeting, ''); assert.equal(r.meetingSetup, null);
});
