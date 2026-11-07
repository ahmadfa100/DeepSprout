/**
 * Shared multi-step builder frame: a step rail with progress, contextual
 * step titles, persistent labels, inline blockers, Save draft, Back/Next,
 * Preview and Publish. Drafts persist per person, kind and record
 * (`builderDrafts`), so a reload or a later visit resumes the same step.
 */
import * as u from '../ui.js';
import {dispatch} from '../store.js';
export function draftFor(ctx,kind,initial){ctx.localUI.builders??={};const key=`${ctx.person.id}:${kind}:${ctx.route.id||'new'}`;return ctx.localUI.builders[key]??=(structuredClone(ctx.s.builderDrafts[`${ctx.person.id}:${kind}:${ctx.route.id||'new'}`]||{...initial,step:0}));}
export function frame(ctx,config,draft,body){
 ctx.localUI.activeBuilder={config,draft};draft.maxStep=Math.max(draft.maxStep||0,draft.step);
 const total=config.steps.length,pct=Math.round((draft.step+1)/total*100);
 const stepItem=(title,i)=>{const state=i===draft.step?'current':i<=draft.maxStep?'done':'';const label=`<span class="builder-step-num">${i<draft.step&&i<=draft.maxStep?u.icon('check'):i+1}</span><em class="builder-step-text">${u.esc(title)}${config.stepNotes?.[i]?`<small>${u.esc(config.stepNotes[i])}</small>`:''}</em>`;return `<li class="${state}" ${i===draft.step?'aria-current="step"':''}>${config.jump&&i!==draft.step&&i<=draft.maxStep?`<button type="button" class="builder-jump" data-action="builder-goto" data-step="${i}">${label}</button>`:label}</li>`;};
 const saved=draft.savedAt?`<span class="builder-saved">${u.icon('check')}Draft saved ${u.esc(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Amman'}).format(new Date(draft.savedAt)))}</span>`:'<span class="builder-saved is-quiet">Not saved yet</span>';
 const publishBtn=config.publishDisabled?.(draft)?`<button type="button" class="button primary" disabled aria-describedby="builder-blockers-note">${u.esc(config.publishLabel||'Publish')}</button><small id="builder-blockers-note" class="sr-only">Fix the publish blockers listed above first.</small>`:u.button(config.publishLabel||'Publish','builder-publish',{},'button primary');
 return u.header(config.eyebrow,config.title,config.description,(config.headerActions||'')+u.link('Back to list',config.listPath))
  +(config.banner?config.banner(draft):'')
  +`<div class="builder-layout ${config.layoutClass||''}"><nav class="builder-rail" aria-label="Creation steps"><div class="builder-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${draft.step+1}" aria-valuetext="Step ${draft.step+1} of ${total}: ${u.esc(config.steps[draft.step])}"><i style="--w:${pct}%"></i></div><ol class="builder-steps">${config.steps.map(stepItem).join('')}</ol>${saved}</nav>`
  +`<form class="builder-card" data-form="builder"><div class="builder-card-head"><p class="eyebrow">STEP ${draft.step+1} OF ${total}</p><h2>${u.esc(config.steps[draft.step])}</h2>${config.stepIntro?.[draft.step]?`<p class="builder-intro">${u.esc(config.stepIntro[draft.step])}</p>`:''}</div><div class="builder-body" data-step="${draft.step}">${body}</div><p class="form-error" role="alert" tabindex="-1">${draft.errors?.length?u.esc(draft.errors.join(' · ')):''}</p><div class="builder-actions"><div>${draft.step?u.button('Back','builder-back',{},'button quiet'):''}</div><div class="actions">${u.button('Save draft','builder-save',{},'button quiet')}${config.preview?u.button('Preview','builder-preview',{},'button quiet'):''}${draft.step<total-1?u.button('Continue','builder-next',{},'button primary'):publishBtn}</div></div></form>${config.aside?config.aside(draft):''}</div>`;
}
export function persistDraft(ctx,config,draft){draft.savedAt=new Date().toISOString();dispatch('builder.save',{kind:config.kind,id:ctx.route.id||'new',draft:structuredClone(draft)});}
export function builderAction(action,target,ctx){
 if(!action.startsWith('builder-'))return false;const active=ctx.localUI.activeBuilder;if(!active)return false;const {config,draft}=active,form=document.querySelector('[data-form=builder]');
 if(action==='builder-next'&&!form.reportValidity())return true;
 config.capture(draft,u.formValues(form),form);
 if(action==='builder-preview'){u.modal(`Preview · ${draft.title||'Untitled'}`,config.preview(draft),()=>{},'Close preview',{readonly:true,wide:true});return true;}
 if(config.itemAction?.(action,target,draft,ctx)){persistDraft(ctx,config,draft);ctx.render();return true;}
 if(action==='builder-next'&&config.validate){const errors=config.validate(draft,draft.step);draft.errors=errors;if(errors.length){persistDraft(ctx,config,draft);ctx.render();requestAnimationFrame(()=>document.querySelector('[data-form=builder] .form-error')?.focus());return true;}}
 draft.errors=[];
 if(action==='builder-goto'){draft.step=Number(target.dataset.step);persistDraft(ctx,config,draft);ctx.render();focusStep();return true;}
 if(action==='builder-next')draft.step++;else if(action==='builder-back')draft.step--;
 else if(action==='builder-save'||action==='builder-publish'){
  const recordId=ctx.run(`${config.command}.save`,config.payload(draft),'Draft saved privately. It is not visible in Explore.');draft.id=recordId;
  if(action==='builder-publish')ctx.run(`${config.command}.publish`,{id:recordId},config.publishedMessage||'Published. It is now visible in the regular Explore page.');
  delete ctx.localUI.builders[`${ctx.person.id}:${config.kind}:${ctx.route.id||'new'}`];dispatch('builder.clear',{kind:config.kind,id:ctx.route.id||'new'});
  ctx.go(`${config.listPath}/${recordId}${action==='builder-publish'?'?published=1':''}`);return true;
 }
 persistDraft(ctx,config,draft);if(['builder-next','builder-back'].includes(action)){ctx.render();focusStep();}return true;
}
/** After a step change, move focus to the new step heading (keyboard and screen-reader continuity). */
function focusStep(){requestAnimationFrame(()=>{const h=document.querySelector('.builder-card-head h2');if(h){h.tabIndex=-1;h.focus({preventScroll:false});}});}
export const parseChecks=(form,name)=>Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(x=>x.value);
export const checkList=(name,items,selected=[])=>`<div class="stack">${items.map(item=>{const [value,label]=Array.isArray(item)?item:[item,item];return u.checkbox(name,label,selected.includes(value),value);}).join('')}</div>`;
export const itemControls=(index,total)=>`<div class="actions">${index?u.button('Move up','builder-item-up',{index},'button quiet small'):''}${index<total-1?u.button('Move down','builder-item-down',{index},'button quiet small'):''}${u.button('Remove','builder-item-remove',{index},'button quiet small')}</div>`;
export function reorder(action,target,list){const i=Number(target.dataset.index);if(action==='builder-item-remove'){list.splice(i,1);return true;}if(action==='builder-item-up'){[list[i-1],list[i]]=[list[i],list[i-1]];return true;}if(action==='builder-item-down'){[list[i+1],list[i]]=[list[i],list[i+1]];return true;}return false;}
