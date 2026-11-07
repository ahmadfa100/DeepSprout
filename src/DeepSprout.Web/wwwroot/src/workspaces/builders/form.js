import * as u from '../ui.js';
import {id} from '../domain.js';
import {ownedInitiatives} from '../shared.js';
import {draftFor,frame,itemControls,reorder} from './engine.js';
import {builderChoice} from './controls.js';

const TYPES = ['Short text','Long text','Single choice','Multiple choice','Rating','Number','Date','File preview'];
const isChoice = type => ['Single choice','Multiple choice'].includes(type);

function questionErrors(questions) {
  const errors = [];
  if (!questions.length) errors.push('Add at least one question.');
  questions.forEach((q,i) => {
    if (!String(q.label || '').trim()) errors.push(`Question ${i+1}: add a title.`);
    if (isChoice(q.type) && (q.options || []).filter(x => String(x).trim()).length < 2) errors.push(`Question ${i+1}: add at least two choices.`);
  });
  return errors;
}
function questionEditor(q,i,total,showErrors) {
  const options = isChoice(q.type) ? (q.options?.length ? q.options : ['', '']) : [];
  const needsLabel = !String(q.label || '').trim(), needsChoices = isChoice(q.type) && options.filter(x=>String(x).trim()).length < 2;
  const status = needsLabel ? 'Add a title' : needsChoices ? 'Add two choices' : 'Ready';
  return `<section class="form-q-card${showErrors && (needsLabel || needsChoices) ? ' has-error' : ''}" data-form-question="${i}"><header class="form-q-head"><div><span class="form-q-number">${String(i+1).padStart(2,'0')}</span><strong>Question ${i+1}</strong></div><span class="form-q-status${needsLabel || needsChoices ? '' : ' is-ready'}">${status}</span></header>
    <div class="form-q-main">${u.field(`label-${i}`,'Question title',q.label,'text',false)}${builderChoice(`type-${i}`,'Answer type',TYPES,q.type)}
    ${isChoice(q.type) ? `<div class="form-q-options"><div class="form-q-options-head"><strong>${q.type === 'Multiple choice' ? 'Choices · select several' : 'Choices · select one'}</strong><small>At least two</small></div>${options.map((option,j)=>`<div class="form-q-option"><span class="form-q-option-mark ${q.type === 'Multiple choice' ? 'is-multi' : ''}" aria-hidden="true"></span><label><span class="sr-only">Choice ${j+1}</span><input name="option-${i}-${j}" value="${u.esc(option)}" placeholder="Choice ${j+1}" autocomplete="off"></label><button type="button" data-action="builder-option-remove" data-question="${i}" data-option="${j}" aria-label="Remove choice ${j+1}" ${options.length<=2?'disabled':''}>×</button></div>`).join('')}<button type="button" class="form-q-add" data-action="builder-option-add" data-question="${i}">+ Add choice</button></div>` : q.type === 'Rating' ? `<div class="form-q-rating-preview" aria-label="Five star rating preview"><span>★★★★★</span><small>Respondents choose 1–5 stars.</small></div>` : `<div class="form-q-answer-preview">${q.type === 'Long text' ? 'Long written answer' : q.type === 'Date' ? 'Date picker' : q.type === 'Number' ? 'Number field' : q.type === 'File preview' ? 'Local file preview' : 'Short written answer'}</div>`}
    <div class="form-q-foot">${u.checkbox(`required-${i}`,'Required',q.required)}<div class="form-q-controls">${itemControls(i,total)}</div></div><p class="form-q-inline-error" role="status">${showErrors && needsLabel ? 'Add a question title.' : showErrors && needsChoices ? 'Add at least two choices.' : ''}</p></div></section>`;
}

export function formBuilder(ctx,existing) {
  const d=draftFor(ctx,'form',existing||{title:'',purpose:'Survey',initiativeId:'',anonymous:false,status:'Draft',version:1,questions:[],versions:[]});
  let body='';
  if(d.step===0) body=u.field('title','Form title',d.title,'text',true)
    +builderChoice('purpose','Form purpose',['Registration','Survey','Post-event feedback','Competition submission'],d.purpose)
    +builderChoice('initiativeId','Linked initiative (optional)',[['','Independent form'],...ownedInitiatives(ctx).map(i=>[i.id,i.title])],d.initiativeId)
    +'<p class="form-privacy-note">Responses are identified and visible only to authorized Institution staff.</p>';
  if(d.step===1) body=`<div class="form-question-intro"><p>Build the questions people will answer.</p>${u.button('+ Add question','builder-question-add',{},'button secondary small')}</div>${d.questions.length ? d.questions.map((q,i)=>questionEditor(q,i,d.questions.length,!!d.errors?.length)).join('') : '<div class="builder-empty">No questions yet.</div>'}`;
  if(d.step===2) body=`<div class="builder-preview"><p class="eyebrow">${u.esc(d.purpose)} · VERSION ${d.version}</p><h2>${u.esc(d.title||'Untitled form')}</h2><p>Respondent preview</p></div>${respondentQuestions(d.questions,true)}`;
  const config={kind:'form',command:'organization.form',title:'Build a form.',eyebrow:'FORM & SURVEY BUILDER',description:'Create clear questions and preview the response experience.',listPath:'organization/forms',steps:['Purpose','Questions','Preview & publish'],stepNotes:['Name & context','Answers & choices','Check & go live'],layoutClass:'is-initiative',jump:true,
    validate(d,step){return step===1?questionErrors(d.questions):[];},
    publishDisabled:d=>questionErrors(d.questions).length>0||!String(d.title||'').trim(),
    capture(d,v,f){if(d.step===0)Object.assign(d,{title:v.title,purpose:v.purpose,initiativeId:v.initiativeId,anonymous:false});if(d.step===1)d.questions=d.questions.map((q,i)=>{const type=v[`type-${i}`]||q.type;const options=isChoice(type)?Array.from({length:Math.max((q.options||[]).length,2)},(_,j)=>v[`option-${i}-${j}`]??q.options?.[j]??''):q.options||[];return {...q,label:v[`label-${i}`]??q.label,type,options,required:!!f.elements[`required-${i}`]?.checked};});},
    itemAction(a,t,d){if(a==='builder-question-add'){d.questions.push({id:id('question'),label:'',type:'Short text',required:true,options:[]});return true;}if(a==='builder-option-add'){const q=d.questions[Number(t.dataset.question)];q.options ||= [];q.options.push('');return true;}if(a==='builder-option-remove'){const q=d.questions[Number(t.dataset.question)];if(q.options?.length>2)q.options.splice(Number(t.dataset.option),1);return true;}return reorder(a,t,d.questions);},
    payload(d){const {step,maxStep,errors,...record}=d;return record;}};
  return frame(ctx,config,d,body);
}

export function respondentQuestions(questions,preview=false){return questions.map(q=>{const name=`answer-${q.id}`,req=q.required&&!preview,label=`${u.esc(q.label)}${q.required?' <span class="required">*</span>':''}`;let control='';
  if(['Short text','Number','Date','File preview'].includes(q.type))control=u.field(name,q.label,'',q.type==='Number'?'number':q.type==='Date'?'date':q.type==='File preview'?'file':'text',req);
  if(q.type==='Long text')control=u.area(name,q.label,'',req);
  if(q.type==='Single choice'||q.type==='Multiple choice'){const multiple=q.type==='Multiple choice';control=`<fieldset class="response-choice"><legend>${label}</legend><div class="response-choice-list">${(q.options||[]).map((option,j)=>`<label class="response-choice-option"><input type="${multiple?'checkbox':'radio'}" name="${u.esc(name)}" value="${u.esc(option)}" ${req&&!multiple&&j===0?'required':''} ${preview?'disabled':''}><span class="response-choice-mark"></span><span>${u.esc(option)}</span></label>`).join('')}</div>${multiple?'<small>Choose all that apply.</small>':''}</fieldset>`;}
  if(q.type==='Rating')control=`<fieldset class="response-rating"><legend>${label}</legend><div class="response-rating-stars">${[5,4,3,2,1].map(n=>`<label><input type="radio" name="${u.esc(name)}" value="${n}" ${req&&n===1?'required':''} ${preview?'disabled':''}><span aria-hidden="true">★</span><span class="sr-only">${n} star${n===1?'':'s'}</span></label>`).join('')}</div><small>1 is low · 5 is high</small></fieldset>`;
  return `<div class="form-question">${control}${q.type==='File preview'?'<small>Local file name preview only. No upload.</small>':''}</div>`;}).join('');}
