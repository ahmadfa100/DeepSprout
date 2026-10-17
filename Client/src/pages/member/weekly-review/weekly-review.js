/** Weekly Review decides actual future schedules in the original Person journal. */
(()=>{
 const Account=window.DeepSproutAccount;if(!Account)return;
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const show=name=>document.querySelectorAll('.wr-stage').forEach(s=>s.hidden=s.dataset.stage!==name);
 const questions={manageable:[['too-light','Too light'],['about-right','About right'],['a-stretch','A stretch'],['too-much','Too much']],fit:[['good-fit','Yes, they fitted'],['mixed','Some did'],['poor-fit','Not really']]};
 let account,week,proposal,choice=null,answers={manageable:null,fit:null};
 function renderProposal(){
  if(!answers.manageable||!answers.fit)return;
  try{
   proposal=account.weeklyProposal(week,answers);
   $('rec-text').textContent=proposal.nextWeek?`Proposed next week: ${proposal.preferences.days} practices, ${proposal.preferences.minutes} minute preference. Independent difficulty levels stay unchanged.`:'This is the final weekly review. Record your choices for a future continuation; no fifth week is added to this cycle.';
   $('rec-why').innerHTML=proposal.why.map(t=>`<li>${esc(t)}</li>`).join('');
   $('next-week-preview').innerHTML=proposal.preview.filter(a=>a.kind!=='routine').map(a=>`<li>${esc(a.date)} · ${esc(a.kind==='practice'?a.activityType+' · Level '+a.level:a.kind)}</li>`).join('');
   $('outcome-options').innerHTML=[['accept','Accept Next Week','Apply the proposed future schedule.'],['keep','Keep Current Pace','Use the prior cadence without increasing difficulty.'],['adjust','Adjust','Preview your chosen days, time and activity mix before saving.']].map(([v,t,n])=>`<button type="button" class="wr-option" data-choice="${v}" role="radio" aria-checked="${choice===v}"><span><strong>${t}</strong><small>${n}</small></span></button>`).join('');
   $('outcome-options').querySelectorAll('button').forEach(b=>b.onclick=()=>{choice=b.dataset.choice;renderProposal();});
   $('review-adjustment').hidden=choice!=='adjust';$('save-review').disabled=!choice;
   if(choice==='adjust'){const config=adjustments();proposal=account.weeklyProposal(week,answers,config);$('next-week-preview').innerHTML=proposal.preview.filter(a=>a.kind!=='routine').map(a=>`<li>${esc(a.date)} · ${esc(a.kind==='practice'?a.activityType:a.kind)}</li>`).join('');}
   $('save-note').textContent='Preview only. Save explicitly to create the next week once.';
  }catch(error){$('save-note').textContent=error.message;$('save-review').disabled=true;}
 }
 function adjustments(){return {days:Number($('review-days').value),minutes:Number($('review-minutes').value),mix:[$('review-mix').value]};}
 Account.load().then(a=>{
  account=a;if(!a.plan()){$('none-text').textContent='Activate your original plan after the four baselines to begin weekly reviews.';show('none');return;}
  a.visitRecovery();const s=a.recovery();week=Number(new URLSearchParams(location.search).get('week')||s.nextReview||a.plan().week);
  if(s.status==='Cycle Review Due'&&!new URLSearchParams(location.search).has('week')){$('none-text').textContent='This cycle has ended. Review its actual outcomes and choose Next Cycle or Maintenance in your Recovery Plan.';show('none');return;}
  if(a.reviews().history.some(r=>r.week===week)){$('none-text').textContent=`Week ${week} is already reviewed. Its decision and source evidence remain in History.`;show('none');return;}
  proposal=a.weeklyProposal(week);if(a.todayKey<proposal.opensOn){$('none-text').textContent=`Week ${week} review opens ${proposal.opensOn} and is due ${proposal.dueOn}. Lab remains independently available.`;show('none');return;}
  $('review-eyebrow').textContent=`Week ${week} · ${a.todayKey>proposal.dueOn?'late review':a.todayKey===proposal.dueOn?'due today':'opens before the weekly boundary'}`;
  const e=proposal.evidence;
  const browserNote=e.shield.periods?.length?`${(e.shield.totalSeconds/60).toFixed(2)} eligible minutes observed across ${e.shield.periods.length} partially covered period(s).`:'No browser data for this week from a supported live extension.';
  $('ledger').innerHTML=`<li><strong>${e.completed} of ${e.due} due practices completed</strong><p>${e.scheduled} scheduled · ${e.missed} missed · ${e.invalid.length} invalid attempts.</p><ul>${(e.attempts||[]).map(a=>`<li>${esc(a.on)} · ${esc(a.activityType)} · ${esc(a.evidenceTier)}${Number.isFinite(a.score)?` · ${Math.round(a.score*100)}% question score`:''} · source ${esc(a.id)}</li>`).join('')||'<li>No valid linked practice attempts recorded.</li>'}</ul></li><li><strong>Offline routine · self-reported</strong><p>${e.routine.done} of ${e.routine.scheduled} scheduled days reported.</p></li><li><strong>Lab · ${esc(e.lab.state)}</strong><p>${esc(e.lab.note)}</p></li><li><strong>Browser usage</strong><p>${esc(browserNote)} ${esc(e.shield.note)}</p></li><li><p>${esc(e.coverage)}</p></li>`;
  $('cycle-summary').innerHTML=[['Cycle',a.plan().cycleNumber],['Week',week],['Practices due',e.due],['Completed',e.completed],['Missed',e.missed],['Time preference',s.preferences.minutes+' min'],['Current levels',e.levels.map(t=>t.type+': '+(t.level||'unrecorded')).join(', ')]].map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  $('review-days').value=String(s.preferences.days);$('review-minutes').value=String(s.preferences.minutes);$('review-mix').value=s.preferences.mix[0];
  for(const [key,id]of [['manageable','q1'],['fit','q2']]){$(id).innerHTML=questions[key].map(([v,t])=>`<button type="button" class="choice" data-value="${v}" role="radio" aria-checked="false">${t}</button>`).join('');$(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{answers[key]=b.dataset.value;$(id).querySelectorAll('button').forEach(x=>x.setAttribute('aria-checked',String(x===b)));renderProposal();});}
  $('review-adjustment').onchange=renderProposal;
  $('save-review').onclick=()=>{
   try{const result=a.reviewWeek(week,answers,choice,choice==='adjust'?adjustments():null,proposal.sourceRevision),r=result.recoveryTransaction.review;$('saved-title').textContent=result.recoveryTransaction.actions.length?'Next week is set.':'Your review is recorded.';$('saved-text').textContent=`Week ${week} recorded. ${r.adjustment.label}. ${result.recoveryTransaction.actions.length?'Future scheduled actions were saved.':'No historical or elapsed week was rescheduled. Use Adjust for eligible future changes, or cycle review when the interval ends.'} No historical result changed.`;$('revision-summary').innerHTML=[['Review',r.id],['Decision',choice],['Revision',r.revisionId],['Source attempts',r.evidence.attemptIds.join(', ')||'No valid linked attempts'],['Recorded',r.completedOn]].map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');show('saved');}
   catch(error){$('save-note').textContent=error.message;}
  };
  show('review');
 }).catch(error=>{$('none-text').textContent='Your review could not be loaded: '+error.message;show('none');});
})();
