/** Weekly Review previews and confirms only future schedules. */
(()=>{
 const Account=window.DeepSproutAccount;if(!Account)return;
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const show=name=>document.querySelectorAll('.wr-stage').forEach(s=>s.hidden=s.dataset.stage!==name);
 const questions={manageable:[['too-light','Too light'],['about-right','About right'],['a-stretch','A stretch'],['too-much','Too much']],fit:[['good-fit','Yes, they fit'],['mixed','Some did'],['poor-fit','Not really']]};
 const typeInfo={depth:['Depth Practice','i-book'],listening:['Listening & Recall','i-headphones'],'visual-observation':['Visual Observation & Analysis','i-shapes'],'digital-judgment':['Reasoning & Digital Judgment','i-evidence'],practical:['Practical Micro-Challenge','i-spark'],'protected-work':['Protected Work','i-monitor'],rest:['Rest day','i-leaf'],review:['Weekly Review','i-clipboard']};
 const planDetail={depth:'Reading and comprehension practice planned.',listening:'Listening and recall practice planned.','visual-observation':'A scene analysis practice planned.','digital-judgment':'An evidence evaluation practice planned.',practical:'A short practical challenge planned.','protected-work':'A focused work session planned.'};
 const icon=name=>{const fallback={'i-headphones':'i-clock','i-leaf':'i-sprout','i-spark':'i-compass'};return `<svg aria-hidden="true"><use href="#${document.getElementById(name)?name:fallback[name]||name}"/></svg>`;};
 const parseDay=key=>/^\d{4}-\d{2}-\d{2}$/.test(key||'')?new Date(`${key}T12:00:00Z`):null;
 const dayNumber=key=>{const day=parseDay(key);return day?Date.UTC(day.getUTCFullYear(),day.getUTCMonth(),day.getUTCDate())/86400000:NaN;};
 const dateLabel=(key,weekday='short')=>{const day=parseDay(key);return day?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday,month:'short',day:'numeric'}).format(day):'Date unavailable';};
 const relativeDay=(key,today)=>{const days=dayNumber(key)-dayNumber(today);return days===0?'Today':days===1?'Tomorrow':days>1?`In ${days} days`:`${Math.abs(days)} day${days===-1?'':'s'} ago`;};
 const safeDetail=value=>{const text=String(value||'').trim();return /^(legacy|source\s|valid practice|undefined|null)/i.test(text)||!text?null:text;};
 function renderEvidence(e){
  const record=account.exportRecord(),actions=new Map((account.recovery()?.actions||[]).map(a=>[a.id,a]));
  const attempts=new Map((e.attempts||[]).map(a=>[a.scheduledActionId,a]));
  const fullAttempts=new Map((record.activityAttempts||[]).map(a=>[a.id,a]));
  const rows=e.practices ? e.practices.map(row=>{
   const info=typeInfo[row.activityType]||['Scheduled practice','i-calendar'];
   const detail=row.result?`${row.result.correctCount} of ${row.result.questionCount} correct · ${row.evidenceTier}`:row.evidenceTier;
   return {date:row.date,title:row.title||info[0],icon:info[1],status:row.status==='Upcoming'?'Not yet due':row.status,detail};
  }) : (e.actionIds||[]).map(id=>{const action=actions.get(id);if(!action)return null;const attempt=attempts.get(id);const full=attempt&&fullAttempts.get(attempt.id);const run=[...(record.practiceRuns||[]),...(record.scheduledDrafts||[])].find(r=>r.scheduledActionId===id&&r.status!=='Completed');const status=attempt||action.status==='Completed'?'Completed':run?'Partial':action.date<account.todayKey?'Missed':'Not yet due';const info=typeInfo[full?.activityType||action.activityType]||['Scheduled practice','i-calendar'];const title=safeDetail(full?.title)||safeDetail(action.title)||info[0];const result=action.activityType==='protected-work'?(attempt?'Work session recorded.':null):safeDetail(full?.outcome);const score=Number.isFinite(attempt?.score)&&attempt.score>=0&&attempt.score<=1?`${Math.round(attempt.score*100)}% question score`:null;return {date:action.date,title,icon:info[1],status,detail:result||score||null};}).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));
  const percent=e.due?Math.round(e.completed/e.due*100):null;
  const summary=e.due===0?'No due practices with reliable schedule records.':e.completed===e.due?'You completed the practices due this week.':e.completed/e.due>=.75?'You completed most of your planned practices this week.':e.completed>0?'You completed some of your planned practices this week.':'No due practices have a valid completion recorded yet.';
  $('ledger').innerHTML=`<div class="wr-week-summary"><span class="wr-summary-art">${icon('i-clipboard')}</span><h3>${e.due?`${e.completed} of ${e.due} due practices completed`:'Scheduled practice progress'}</h3><p>${esc(summary)}</p>${percent===null?'':`<div class="wr-progress" role="progressbar" aria-label="Scheduled practice completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="--wr-progress:${percent}%"></span></div><div class="wr-progress-label"><span>${e.completed} / ${e.due} completed</span><strong>${percent}%</strong></div>`}${e.missed?`<p class="wr-missed-count">${e.missed} scheduled ${e.missed===1?'practice':'practices'} missed</p>`:''}${e.unavailable?`<p>${e.unavailable} with unavailable evidence</p>`:''}</div><div class="wr-history"><div class="wr-history-head"><span>${icon('i-calendar')}</span><div><h3>This week’s activity history</h3><p>Scheduled practices and their recorded outcomes.</p></div></div>${rows.length?`<ul class="wr-activity-list">${rows.map(row=>`<li class="wr-activity"><time datetime="${esc(row.date)}">${esc(dateLabel(row.date))}</time><span class="wr-activity-icon">${icon(row.icon)}</span><div class="wr-activity-copy"><strong>${esc(row.title)}</strong>${row.detail?`<p>${esc(row.detail)}</p>`:''}</div><span class="wr-activity-status" data-status="${esc(row.status)}">${esc(row.status)}</span></li>`).join('')}</ul>`:'<p class="wr-empty-history">No eligible scheduled practice records are available for this week.</p>'}</div>`;
  if(e.practices){
   const browser=e.browser?`${(e.browser.observedSeconds/60).toFixed(1)} minutes observed on ${dateLabel(e.browser.date)} with ${(e.browser.coverageSeconds/60).toFixed(1)} minutes of supported browser coverage.`:'Unknown for this week. No supported browser observation was saved.';
   $('supporting-evidence').innerHTML=`<p><strong>Offline routine:</strong> ${e.routine.doneDays} of ${e.routine.scheduledDays} scheduled days self-reported done${e.routine.skippedDays?` · ${e.routine.skippedDays} skipped`:''}.</p><p><strong>Lab:</strong> Optional and separate from Weekly Review.</p><p><strong>Browser usage:</strong> ${esc(browser)}</p><p>Only linked, valid attempts count as completed practices. Missing evidence stays unknown.</p>`;
   return;
  }
  const browser=e.shield.periods?.length?`${(e.shield.totalSeconds/60).toFixed(1)} eligible browser minutes observed with partial coverage.`:'No supported browser observation for this week.';
  $('supporting-evidence').innerHTML=`<p><strong>Offline routine:</strong> ${e.routine.done} of ${e.routine.scheduled} scheduled days self-reported.</p><p><strong>Lab:</strong> ${esc(e.lab.state)}. ${esc(e.lab.note)}</p><p><strong>Browser usage:</strong> ${esc(browser)} ${esc(e.shield.note)}</p><p>${esc(e.coverage)}</p>${e.invalid.length?`<p>${e.invalid.length} invalid ${e.invalid.length===1?'attempt was':'attempts were'} excluded from the completion count.</p>`:''}`;
 }
 function renderTimeline(actions){
  previewActions=actions||[];
  renderedDay=account.todayKey;
  const days=(actions||[]).filter(a=>a.kind!=='routine').sort((a,b)=>a.date.localeCompare(b.date)||((a.kind==='review')-(b.kind==='review')));
  const next=days.findIndex(a=>a.date>=account.todayKey);
  $('next-week-preview').classList.toggle('is-first-render',!timelineAnimated);
  timelineAnimated=true;
  $('next-week-preview').innerHTML=days.length?days.map((a,index)=>{const info=typeInfo[a.kind==='practice'?a.activityType:a.kind]||['Planned day','i-calendar'];const title=a.kind==='practice'?`${info[0]}${Number.isInteger(a.level)?` · Level ${a.level}`:''}`:info[0];const detail=a.kind==='practice'?(planDetail[a.activityType]||'A practice planned for this day.'):a.kind==='rest'?'No practice scheduled today.':'Reflect on your week and review the next plan.';const status=a.date<account.todayKey?'Past':a.kind==='rest'?'Rest day':a.kind==='review'?'Scheduled':'Planned';return `<li class="wr-timeline-item${index===next?' is-next':''}" style="--wr-order:${index}"><span class="wr-timeline-node" aria-hidden="true"></span><div class="wr-timeline-card"><span class="wr-timeline-icon">${icon(info[1])}</span><div class="wr-timeline-date"><strong>${esc(relativeDay(a.date,account.todayKey))}</strong><time datetime="${esc(a.date)}">${esc(dateLabel(a.date,'long'))}</time></div><div class="wr-timeline-copy"><strong>${esc(title)}</strong><p>${esc(detail)}</p></div><span class="wr-timeline-status">${esc(status)}</span></div></li>`;}).join(''):'<li class="wr-timeline-empty">This is the final week of the current cycle. No next week has been proposed.</li>';
 }
 function selectRadio(container,value,callback){const buttons=[...container.querySelectorAll('[role="radio"]')];buttons.forEach((button,index)=>{const selected=button.dataset.value===value||button.dataset.choice===value;button.setAttribute('aria-checked',String(selected));button.tabIndex=selected||(!value&&index===0)?0:-1;});buttons.forEach((button,index)=>{button.onclick=()=>callback(button.dataset.value||button.dataset.choice);button.onkeydown=event=>{const offset=event.key==='ArrowRight'||event.key==='ArrowDown'?1:event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:0;if(!offset)return;event.preventDefault();const target=buttons[(index+offset+buttons.length)%buttons.length];target.focus();callback(target.dataset.value||target.dataset.choice);};});}
 let account,week,proposal,choice=null,answers={manageable:null,fit:null},timelineAnimated=false,previewActions=[],renderedDay=null;
 let previewSequence=0,reviewWindow,proposalToken,saving=false;
 const reviewInput=()=>({week,manageable:choice==='continue'?null:answers.manageable,fit:choice==='continue'?null:answers.fit,
   choice:choice||'accept',adjustment:choice==='adjust'
   ? {days:Number($('review-days').value),minutes:Number($('review-minutes').value),activityType:$('review-mix').value}
   : null});
 async function renderProposal(){
  if(saving)return;
  const answered=!!(answers.manageable&&answers.fit);
  if(!answered&&!reviewWindow?.canContinue)return;
  if(choice==='keep'&&answers.manageable==='too-much'&&account.serverPlan())choice=null;
  const sequence=++previewSequence;
  try{
   const server=account.serverPlan();
   if (!server) proposal=account.weeklyProposal(week,answers);
   const options=answered?[['accept','Accept Next Week','Apply the proposed future schedule.'],['keep','Keep Current Pace','Use the prior cadence without increasing difficulty.'],['adjust','Adjust','Preview your chosen days, time and activity mix before saving.']]:[];
   if(reviewWindow?.canContinue)options.push(['continue','Continue without answering','Preview a conservative schedule for the remaining days.']);
   $('outcome-options').innerHTML=options.filter(([value])=>!server||value!=='keep'||answers.manageable!=='too-much').map(([v,t,n])=>`<button type="button" class="wr-option" data-choice="${v}" role="radio" aria-checked="${choice===v}"><span class="wr-radio-mark" aria-hidden="true"></span><span><strong>${t}</strong><small>${n}</small></span></button>`).join('');
   selectRadio($('outcome-options'),choice,value=>{choice=value;renderProposal();$('outcome-options').querySelector('[aria-checked="true"]')?.focus();});
   $('review-adjustment').hidden=choice!=='adjust';$('save-review').disabled=!choice;
   $('save-review').firstChild.nodeValue=choice==='continue'?'Save continuation ':'Save my review ';
   if (server) {
    proposalToken=null;
    $('save-review').disabled=true;
    if(!answered&&choice!=='continue'){
     $('save-note').textContent='Answer the questions or preview a conservative continuation.';
     return;
    }
    $('save-note').textContent='Preparing your preview…';
    const preview=await account.serverWeeklyReview(reviewInput());
    if(sequence!==previewSequence)return;
    proposalToken=preview.proposalToken;
    const count=preview.actions.filter(action=>action.kind==='practice').length;
    $('rec-text').textContent=preview.actions.length?`Week ${preview.nextWeek}: ${count} practices with a ${preview.preferences.minutes}-minute time preference.`:'You can record your review and keep the saved schedule.';
    $('rec-why').innerHTML=preview.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('');
    renderEvidence(preview.evidence);
    renderTimeline(preview.actions);
    $('save-review').disabled=!choice;
    $('save-note').textContent='Preview only. Save explicitly to confirm this review.';
    return;
   }
   $('rec-text').textContent=proposal.nextWeek?`Proposed next week: ${proposal.preferences.days} practices, ${proposal.preferences.minutes} minute preference. Independent difficulty levels stay unchanged.`:'This is the final weekly review. Record your choices for a future continuation; no fifth week is added to this cycle.';
   $('rec-why').innerHTML=proposal.why.map(t=>`<li>${esc(t)}</li>`).join('');
   renderTimeline(proposal.preview);
   if(choice==='adjust'){const config=adjustments();proposal=account.weeklyProposal(week,answers,config);renderTimeline(proposal.preview);}
   if(choice==='keep'){const keep=account.weeklyProposal(week,{},proposal.previousPreferences);renderTimeline(keep.preview);}
   $('save-note').textContent='Preview only. Save explicitly to create the next week once.';
  }catch(error){if(sequence===previewSequence){$('save-note').textContent=error.message;$('save-review').disabled=true;}}
 }
 function adjustments(){return {days:Number($('review-days').value),minutes:Number($('review-minutes').value),mix:[$('review-mix').value]};}
 // A running MVC process can keep an older compiled Razor view while static
 // assets update immediately. Upgrade the small mount points until it restarts.
 const oldLedger=$('ledger');
 if(oldLedger?.tagName==='UL'){const mount=document.createElement('div');mount.id='ledger';mount.className='wr-ledger';oldLedger.replaceWith(mount);}
 if(!$('supporting-evidence')&&$('ledger')){const details=document.createElement('details');details.className='wr-source-details';details.innerHTML='<summary>Other evidence from this week</summary><div id="supporting-evidence"></div>';$('ledger').after(details);}
 $('next-week-preview')?.classList.add('wr-timeline');
 $('outcome-options')?.setAttribute('role','radiogroup');
 $('outcome-options')?.setAttribute('aria-label','Choose how to set next week');
 Account.load().then(a=>{
  account=a;if(!a.plan()){$('none-text').textContent='Review and activate your Week 1 plan to begin weekly reviews. Lab assessments are optional.';show('none');return;}
  a.visitRecovery();const s=a.recovery();week=Number(new URLSearchParams(location.search).get('week')||s.nextReview||a.plan().week);
  if(!a.serverPlan()&&s.status==='Cycle Review Due'&&!new URLSearchParams(location.search).has('week')){$('none-text').textContent='This cycle has ended. Review its actual outcomes and choose Next Cycle or Maintenance in your Recovery Plan.';show('none');return;}
  if(a.reviews().history.some(r=>r.week===week&&r.decision!=='auto')){$('none-text').textContent=`Week ${week} is already reviewed. Its decision and source evidence remain in History.`;show('none');return;}
  if(a.serverPlan()){
   reviewWindow=a.serverRecovery().reviewWeeks.find(item=>item.week===week);
   if(!reviewWindow||reviewWindow.status==='Unavailable'){$('none-text').textContent='This week does not have an open review. Check your Roadmap for the next scheduled review.';show('none');return;}
   proposal=reviewWindow;
  }else proposal=a.weeklyProposal(week);
  if(a.todayKey<proposal.opensOn){$('none-text').textContent=`Week ${week} review opens ${proposal.opensOn} and is due ${proposal.dueOn}. Lab remains independently available.`;show('none');return;}
  $('review-eyebrow').textContent=`Week ${week} · ${a.todayKey>proposal.dueOn?'late review':a.todayKey===proposal.dueOn?'due today':'opens before the weekly boundary'}`;
  const e=proposal.evidence;
  renderEvidence(e);
  const summaryRows=[['i-cycle','Cycle',a.plan().cycleNumber],['i-calendar','Week',week],['i-list','Scheduled practices',e.scheduled],['i-list','Practices due',e.due],['i-check','Completed',e.completed],['i-minus','Missed',e.missed],['i-clock','Time preference',s.preferences.minutes+' min']];
  const levels=e.levels||a.training().map(item=>({type:item.id,level:item.level}));
  $('cycle-summary').innerHTML=summaryRows.map(([icon,k,v])=>`<div class="wr-summary-row"><dt><svg><use href="#${icon}"/></svg>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')+`<div class="wr-summary-row wr-levels"><dt><svg><use href="#i-levels"/></svg>Current levels</dt><dd>${levels.map(t=>`${esc(typeInfo[t.type]?.[0]||'Practice')}: ${esc(t.level||'unrecorded')}`).join(', ')}</dd></div>`;
  $('review-days').value=String(s.preferences.days);$('review-minutes').value=String(s.preferences.minutes);$('review-mix').value=s.preferences.mix[0];
  if(a.serverRecovery()?.kind==='Maintenance')$('review-days').disabled=true;
  for(const [key,id]of [['manageable','q1'],['fit','q2']]){$(id).innerHTML=questions[key].map(([v,t])=>`<button type="button" class="choice" data-value="${v}" role="radio" aria-checked="false"><span class="wr-radio-mark" aria-hidden="true"></span>${t}</button>`).join('');const choose=value=>{answers[key]=value;selectRadio($(id),value,choose);renderProposal();};selectRadio($(id),answers[key],choose);}
  $('review-adjustment').onchange=renderProposal;
  setInterval(()=>{if(renderedDay&&renderedDay!==account.todayKey)renderTimeline(previewActions);},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&renderedDay&&renderedDay!==account.todayKey)renderTimeline(previewActions);});
  $('save-review').onclick=async()=>{
   if(a.serverPlan()){
    if(saving||!proposalToken||!choice)return;
    saving=true;
    $('save-review').disabled=true;
    const selected=choice;
    try{
     const result=await a.serverWeeklyReview({...reviewInput(),proposalToken},true),r=result.review;
     document.querySelector('.wr-saved .eyebrow').textContent=selected==='continue'?'Continuation saved':'Review saved';
     $('saved-title').textContent=result.scheduled?'Your next schedule is set.':'Your review is recorded.';
     $('saved-text').textContent=selected==='continue'?'Your remaining days are available in the Roadmap. You can still return to answer the review.':
      result.scheduled?`Week ${week} recorded. Your upcoming days are available in the Roadmap.`:`Week ${week} recorded. Existing schedules stay in place.`;
     $('revision-summary').innerHTML=[['Review',r.id],['Decision',r.decision],['Recorded',r.completedOn],...(r.revisionId?[['Revision',r.revisionId]]:[])].map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
     show('saved');
     await Account.load(true);
    }catch(error){$('save-note').textContent=error.message;$('save-review').disabled=false;}
    finally{saving=false;}
    return;
   }
   try{const result=a.reviewWeek(week,answers,choice,choice==='adjust'?adjustments():null,proposal.sourceRevision),r=result.recoveryTransaction.review;$('saved-title').textContent=result.recoveryTransaction.actions.length?'Next week is set.':'Your review is recorded.';$('saved-text').textContent=`Week ${week} recorded. ${r.adjustment.label}. ${result.recoveryTransaction.actions.length?'Future scheduled actions were saved.':'No historical or elapsed week was rescheduled. Use Adjust for eligible future changes, or cycle review when the interval ends.'} No historical result changed.`;$('revision-summary').innerHTML=[['Review',r.id],['Decision',choice],['Revision',r.revisionId],['Source attempts',r.evidence.attemptIds.join(', ')||'No valid linked attempts'],['Recorded',r.completedOn]].map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');show('saved');}
   catch(error){$('save-note').textContent=error.message;}
  };
  if(reviewWindow?.canContinue)renderProposal();
  show('review');
 }).catch(error=>{$('none-text').textContent='Your review could not be loaded: '+error.message;show('none');});
})();
