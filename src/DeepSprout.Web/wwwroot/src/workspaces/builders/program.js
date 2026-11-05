import * as u from '../ui.js';
import {id} from '../domain.js';
import {draftFor,frame,parseChecks,checkList,itemControls,reorder} from './engine.js';
import {programGroups,completionPolicyText,COMPLETION_RULES,DEFAULT_CONSENT} from '../coach-rules.js';
/**
 * Independent Coach Program Builder (master §13.2): five steps on the shared
 * builder engine. Groups are created *under* the Program (one parent each);
 * policies are declared here so completion and invitations never rely on
 * invented thresholds. Publishing pins this version; it never admits anyone.
 */
export function programBuilder(ctx,existing){
 const d=draftFor(ctx,'program',existing?{...existing,newGroups:[]}:{title:'',description:'',purpose:'',focus:'Balanced technology use',duration:14,audience:'',eligibility:'',start:'2026-10-14',end:'2026-10-28',stages:[],activities:[],required:true,review:'Coach review',completion:{rule:'all-required',percent:100},invitationPolicy:{expiryDays:14},consentPolicy:DEFAULT_CONSENT,newGroups:[]});
 d.newGroups||=[];d.completion||={rule:'all-required',percent:100};d.invitationPolicy||={expiryDays:14};
 const current=existing?programGroups(ctx.s,existing):[];
 let body='';
 if(d.step===0)body=u.field('title','Program title',d.title,'text',true)+u.area('description','Description',d.description,true)+u.area('purpose','Objective',d.purpose,true)+`<div class="form-grid">${u.field('focus','Digital-wellbeing focus',d.focus,'text',true)}${u.field('duration','Expected duration in days',d.duration,'number',true,'min="1" max="365"')}</div><div class="form-grid">${u.field('audience','Audience (who it is for)',d.audience||'')}${u.field('eligibility','Eligibility (who may be invited)',d.eligibility||'')}</div>`+u.note('Independent Programs are invitation-only and never appear in public Explore.');
 if(d.step===1)body=`<div class="form-grid">${u.field('start','Start date',d.start,'date',true)}${u.field('end','End date',d.end,'date',true)}</div><p>Each group belongs to this Program only. Students join a group through your private invitations after you publish.</p>${current.length?`<ul class="iw-mini-list">${current.map(g=>`<li><span>${u.esc(g.name)}</span><span>${g.memberIds.length} member(s)</span></li>`).join('')}</ul>`:''}${d.newGroups.map((g,i)=>`<section class="item-editor"><h3><span>New group ${i+1}</span>${itemControls(i,d.newGroups.length).replace(/builder-item-/g,'builder-group-')}</h3>${u.field(`group-name-${i}`,'Group name',g.name,'text',true)}${u.area(`group-purpose-${i}`,'Purpose',g.purpose,true)}${u.field(`group-capacity-${i}`,'Capacity (your choice)',g.capacity||12,'number',true,'min="1" max="500"')}</section>`).join('')}${u.button('Add a group','builder-group-add',{},'button secondary')}${!current.length&&!d.newGroups.length?u.note('You can also publish first and add groups later from the Program page.'):''}`;
 if(d.step===2)body=`<p>Give the journey a few clear stages. Dates must fall inside the program period.</p>${d.stages.map((stage,i)=>`<section class="item-editor"><h3><span>Stage ${i+1}</span>${itemControls(i,d.stages.length)}</h3>${u.field(`title-${i}`,'Stage title',stage.title,'text',true)}${u.area(`objective-${i}`,'Objective / milestone',stage.objective,true)}${u.field(`date-${i}`,'Milestone date',stage.date,'date',true)}</section>`).join('')}${u.button('Add a stage','builder-stage-add',{},'button secondary')}`;
 if(d.step===3)body=`<p>Publishing creates one group task per stage and selected approved activity. These are Program tasks, separate from personal Recovery Plans.</p>${checkList('activities',ctx.s.activityCatalog.filter(a=>a.status==='Published').map(a=>a.title),d.activities)}${u.checkbox('required','These assignments are required',d.required)}${u.select('review','Evidence review',['Coach review'],d.review==='Mentor review'?'Coach review':d.review)}<fieldset class="iw-fieldset"><legend>Completion rule (configurable demo policy)</legend><div class="form-grid">${u.select('completionRule','Rule',COMPLETION_RULES,d.completion.rule)}${u.field('completionPercent','Share of required tasks (%)',d.completion.percent,'number',false,'min="1" max="100"')}</div></fieldset><fieldset class="iw-fieldset"><legend>Invitation & consent</legend>${u.field('expiryDays','Invitation links expire after (days)',d.invitationPolicy.expiryDays,'number',true,'min="1" max="90"')}${u.area('consentPolicy','Student consent shown on the invitation',d.consentPolicy||DEFAULT_CONSENT,true)}</fieldset>`;
 if(d.step===4)body=`<div class="builder-preview"><p class="eyebrow">PROGRAM · VERSION ${d.version||1} · INVITE-ONLY</p><h2>${u.esc(d.title||'Untitled draft')}</h2><p>${u.esc(d.description)}</p><small>${u.date(d.start)} — ${u.date(d.end)}</small></div>${u.timeline(d.stages)}<p class="static-info">${current.length+d.newGroups.length} group(s) · ${d.stages.length} stages · ${d.activities.length} activity type(s) · ${d.required?'Required':'Optional'} tasks · ${u.esc(completionPolicyText(d))} · invitations expire after ${d.invitationPolicy.expiryDays} days</p>${u.note('Publishing pins this version and creates stage tasks for every group. It does not admit anyone: students join only through your private invitations. Later edits add future work; they never rewrite submitted work.')}`;
 const config={kind:'program',command:'mentor.program',title:existing?'Edit program draft':'Build a meaningful journey.',eyebrow:'INDEPENDENT COACH PROGRAM BUILDER',description:'A clear intention, a few small stages, and room for real progress.',listPath:'mentor/programs',steps:['Program Basics','Groups & Schedule','Program Stages','Activities & Policies','Review & Publish'],
  capture(d,v,f){
   if(d.step===0)Object.assign(d,{title:v.title,description:v.description,purpose:v.purpose,focus:v.focus,duration:Number(v.duration),audience:v.audience||'',eligibility:v.eligibility||''});
   if(d.step===1){Object.assign(d,{start:v.start,end:v.end});d.newGroups=d.newGroups.map((g,i)=>({...g,name:v[`group-name-${i}`]??g.name,purpose:v[`group-purpose-${i}`]??g.purpose,capacity:Number(v[`group-capacity-${i}`]??g.capacity)||12}));}
   if(d.step===2)d.stages=d.stages.map((s,i)=>({...s,title:v[`title-${i}`],objective:v[`objective-${i}`],date:v[`date-${i}`]}));
   if(d.step===3)Object.assign(d,{activities:parseChecks(f,'activities'),required:f.elements.required.checked,review:v.review,completion:{rule:v.completionRule,percent:Number(v.completionPercent)||100},invitationPolicy:{expiryDays:Number(v.expiryDays)||14},consentPolicy:v.consentPolicy});
  },
  validate(d,step){const errors=[];if(step===1&&d.end<d.start)errors.push('The end date must follow the start date.');if(step===3&&d.completion.rule==='percent-required'&&!(d.completion.percent>=1&&d.completion.percent<=100))errors.push('Choose a completion share between 1 and 100%.');return errors;},
  itemAction(a,t,d){
   if(a==='builder-stage-add'){d.stages.push({id:id('stage'),title:'',objective:'',date:d.start});return true;}
   if(a==='builder-group-add'){d.newGroups.push({name:'',purpose:d.purpose||'',capacity:12});return true;}
   if(a.startsWith('builder-group-'))return reorder(a.replace('builder-group-','builder-item-'),t,d.newGroups);
   return reorder(a,t,d.stages);
  },
  payload(d){const {step,maxStep,errors,...record}=d;return record;}};
 return frame(ctx,config,d,body);
}
